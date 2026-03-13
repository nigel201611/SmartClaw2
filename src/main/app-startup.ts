/**
 * SmartClaw App Startup Manager
 * 
 * 管理 Electron 应用启动流程：Docker 检测 → 容器启动 → Matrix 初始化 → 显示主窗口
 */

import { app, BrowserWindow, dialog } from 'electron';
import { DockerDetector, DockerStatus } from './docker-detector';
import { DockerManager } from './docker-manager';
import * as path from 'path';

/**
 * 应用启动状态
 */
export enum StartupState {
  INITIALIZING = 'initializing',
  CHECKING_DOCKER = 'checking-docker',
  STARTING_CONTAINERS = 'starting-containers',
  WAITING_HEALTHY = 'waiting-healthy',
  INITIALIZING_MATRIX = 'initializing-matrix',
  READY = 'ready',
  ERROR = 'error'
}

/**
 * 启动结果
 */
export interface StartupResult {
  success: boolean;
  state: StartupState;
  error?: string;
  dockerStatus?: DockerStatus;
}

/**
 * 应用启动管理器
 */
export class AppStartupManager {
  private dockerDetector: DockerDetector;
  private dockerManager: DockerManager;
  private mainWindow: BrowserWindow | null = null;
  private startupWindow: BrowserWindow | null = null;
  private currentState: StartupState = StartupState.INITIALIZING;
  private matrixClient: any = null;

  constructor() {
    this.dockerDetector = new DockerDetector();
    this.dockerManager = new DockerManager({
      containerName: 'smartclaw-matrix',
      composeFilePath: path.join(__dirname, '../../docker-compose.yml'),
      startupTimeout: 60000,
      stopGracePeriod: 30
    });
  }

  /**
   * 应用启动主流程
   */
  async onAppReady(): Promise<StartupResult> {
    try {
      // Step 1: 检测 Docker 环境
      this.currentState = StartupState.CHECKING_DOCKER;
      const dockerStatus = await this.dockerDetector.detectDocker();

      if (!dockerStatus.installed || !dockerStatus.running) {
        // Docker 未就绪，显示首次运行向导
        await this.showFirstRunWizard(dockerStatus);
        return {
          success: false,
          state: StartupState.ERROR,
          error: 'Docker 未就绪',
          dockerStatus
        };
      }

      // Step 2: 自动启动容器
      this.currentState = StartupState.STARTING_CONTAINERS;
      const startResult = await this.dockerManager.startContainer();

      if (!startResult.success) {
        await this.showContainerStartError(startResult.error);
        return {
          success: false,
          state: StartupState.ERROR,
          error: startResult.error
        };
      }

      // Step 3: 等待容器健康
      this.currentState = StartupState.WAITING_HEALTHY;
      const healthResult = await this.dockerManager.waitForHealthy();

      if (!healthResult.success) {
        await this.showHealthCheckError(healthResult.error);
        return {
          success: false,
          state: StartupState.ERROR,
          error: healthResult.error
        };
      }

      // Step 4: 初始化 Matrix 客户端
      this.currentState = StartupState.INITIALIZING_MATRIX;
      await this.initializeMatrixClient();

      // Step 5: 显示主窗口
      this.currentState = StartupState.READY;
      await this.createMainWindow();

      // 关闭启动窗口（如果有）
      this.closeStartupWindow();

      return {
        success: true,
        state: StartupState.READY,
        dockerStatus
      };
    } catch (error: any) {
      this.currentState = StartupState.ERROR;
      await this.showGenericError(error.message);
      return {
        success: false,
        state: StartupState.ERROR,
        error: error.message
      };
    }
  }

  /**
   * 显示首次运行向导（Docker 未就绪）
   */
  private async showFirstRunWizard(dockerStatus: DockerStatus): Promise<void> {
    // 创建启动窗口
    this.createStartupWindow();

    // 发送 Docker 状态到启动窗口
    this.startupWindow?.webContents.send('docker-status', dockerStatus);

    // 获取友好的错误消息
    const friendlyMessage = this.dockerDetector.getFriendlyErrorMessage(dockerStatus);

    // 显示对话框（可选：替代启动窗口）
    const result = await dialog.showMessageBox(this.startupWindow || undefined, {
      type: 'warning',
      title: friendlyMessage.title,
      message: friendlyMessage.title,
      detail: friendlyMessage.message,
      buttons: [
        friendlyMessage.actionUrl ? '查看安装指南' : '重试',
        '退出应用'
      ],
      defaultId: 0,
      cancelId: 1
    });

    if (result.response === 0) {
      // 用户选择查看安装指南或重试
      if (friendlyMessage.actionUrl) {
        // 打开安装指南链接
        const { shell } = require('electron');
        shell.openExternal(friendlyMessage.actionUrl);
      }
      // 重新检测
      await this.retryStartup();
    } else {
      // 用户选择退出
      app.quit();
    }
  }

  /**
   * 显示容器启动错误
   */
  private async showContainerStartError(error?: string): Promise<void> {
    const result = await dialog.showMessageBox({
      type: 'error',
      title: '容器启动失败',
      message: '无法启动 Matrix 容器',
      detail: error || '未知错误',
      buttons: ['重试', '查看日志', '退出应用'],
      defaultId: 0,
      cancelId: 2
    });

    if (result.response === 0) {
      await this.retryStartup();
    } else if (result.response === 1) {
      await this.showLogs();
    } else {
      app.quit();
    }
  }

  /**
   * 显示健康检查错误
   */
  private async showHealthCheckError(error?: string): Promise<void> {
    const result = await dialog.showMessageBox({
      type: 'warning',
      title: '服务响应超时',
      message: 'Matrix 服务启动超时',
      detail: error || '容器已启动但服务无响应',
      buttons: ['重试', '查看日志', '继续（可能无法使用）'],
      defaultId: 0,
      cancelId: 2
    });

    if (result.response === 0) {
      await this.retryStartup();
    } else if (result.response === 1) {
      await this.showLogs();
    } else {
      // 用户选择继续，尝试显示主窗口（可能功能受限）
      await this.createMainWindow();
      this.closeStartupWindow();
    }
  }

  /**
   * 显示通用错误
   */
  private async showGenericError(error: string): Promise<void> {
    await dialog.showMessageBox({
      type: 'error',
      title: '启动失败',
      message: 'SmartClaw 启动失败',
      detail: error,
      buttons: ['重试', '退出应用'],
      defaultId: 0,
      cancelId: 1
    });
  }

  /**
   * 显示日志
   */
  private async showLogs(): Promise<void> {
    try {
      const logs = await this.dockerManager.getLogs({ tail: 100 });
      await dialog.showMessageBox({
        type: 'info',
        title: '容器日志',
        message: '最近 100 行日志',
        detail: logs,
        buttons: ['关闭']
      });
    } catch (error: any) {
      await dialog.showMessageBox({
        type: 'error',
        title: '无法获取日志',
        message: error.message,
        buttons: ['关闭']
      });
    }
  }

  /**
   * 重试启动
   */
  private async retryStartup(): Promise<void> {
    this.closeStartupWindow();
    await this.onAppReady();
  }

  /**
   * 创建启动窗口（加载动画）
   */
  private createStartupWindow(): void {
    this.startupWindow = new BrowserWindow({
      width: 500,
      height: 400,
      frame: false,
      resizable: false,
      movable: false,
      minimizable: false,
      maximizable: false,
      closable: false,
      alwaysOnTop: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.js')
      }
    });

    // 加载启动 HTML（需要创建对应的 HTML 文件）
    this.startupWindow.loadFile(path.join(__dirname, '../../public/startup.html'));

    // 居中显示
    this.startupWindow.center();
  }

  /**
   * 关闭启动窗口
   */
  private closeStartupWindow(): void {
    if (this.startupWindow) {
      this.startupWindow.close();
      this.startupWindow = null;
    }
  }

  /**
   * 创建主窗口
   */
  private async createMainWindow(): Promise<void> {
    this.mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      minWidth: 800,
      minHeight: 600,
      title: 'SmartClaw',
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.js')
      }
    });

    // 加载应用
    if (process.env.NODE_ENV === 'development') {
      this.mainWindow.loadURL('http://localhost:3000');
      this.mainWindow.webContents.openDevTools();
    } else {
      this.mainWindow.loadFile(path.join(__dirname, '../../renderer/index.html'));
    }

    // 窗口关闭处理
    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });

    // 窗口关闭前清理
    this.mainWindow.on('close', async (event) => {
      event.preventDefault();
      await this.onAppClosing();
    });
  }

  /**
   * 初始化 Matrix 客户端
   */
  private async initializeMatrixClient(): Promise<void> {
    // TODO: 集成 matrix-js-sdk
    // 这里预留 Matrix 客户端初始化逻辑
    console.log('Initializing Matrix client...');
    
    // 模拟初始化延迟
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log('Matrix client initialized');
  }

  /**
   * 应用关闭处理
   */
  private async onAppClosing(): Promise<void> {
    // 停止容器（可选：根据用户设置决定是否停止）
    const shouldStop = await this.shouldStopContainersOnExit();
    
    if (shouldStop) {
      await this.dockerManager.stopContainer();
    }

    // 清理资源
    this.cleanup();

    // 退出应用
    app.quit();
  }

  /**
   * 询问用户是否在退出时停止容器
   */
  private async shouldStopContainersOnExit(): Promise<boolean> {
    // TODO: 从用户设置中读取
    // 默认：停止容器以节省资源
    return true;
  }

  /**
   * 清理资源
   */
  private cleanup(): void {
    // 停止状态轮询
    // 清理 IPC 处理器
    // 关闭 Matrix 客户端连接
  }

  /**
   * 获取当前启动状态
   */
  getCurrentState(): StartupState {
    return this.currentState;
  }

  /**
   * 获取主窗口引用
   */
  getMainWindow(): BrowserWindow | null {
    return this.mainWindow;
  }
}

// 单例实例
let appStartupManager: AppStartupManager | null = null;

/**
 * 获取 AppStartupManager 单例
 */
export function getAppStartupManager(): AppStartupManager {
  if (!appStartupManager) {
    appStartupManager = new AppStartupManager();
  }
  return appStartupManager;
}

export default AppStartupManager;
