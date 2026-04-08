/**
 * SmartClaw App Startup Manager
 *
 * 管理 Electron 应用启动流程：Docker 检测 → 容器启动 → Matrix 初始化 → 显示主窗口
 */

import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron';
import { DockerDetector, DockerStatus } from './docker-detector';
import { DockerManager, getDockerComposePath } from './docker-manager';
import { getMatrixService, MatrixService } from './matrix-service';
import * as path from 'path';
import * as fs from 'fs';

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
  ERROR = 'error',
}

/**
 * 启动结果
 */
export interface StartupResult {
  success: boolean;
  state: StartupState;
  error?: string;
  dockerStatus?: DockerStatus;
  matrixStatus?: {
    isLoggedIn: boolean;
    userId?: string;
  };
}

/**
 * 应用启动管理器
 */
export class AppStartupManager {
  private dockerDetector: DockerDetector;
  private dockerManager: DockerManager;
  private matrixService: MatrixService | null = null;
  private mainWindow: BrowserWindow | null = null;
  private startupWindow: BrowserWindow | null = null;
  private currentState: StartupState = StartupState.INITIALIZING;
  private isClosing = false; // 添加关闭标志

  constructor() {
    this.dockerDetector = new DockerDetector();
    let composePath: string;
    try {
      composePath = getDockerComposePath();
    } catch (error) {
      composePath = path.join(__dirname, '../../docker-compose.yml');
      console.log('Using fallback path:', composePath);
    }

    this.dockerManager = new DockerManager({
      containerName: 'smartclaw-matrix',
      composeFilePath: composePath,
      startupTimeout: 60000,
      stopGracePeriod: 30,
    });

    // 设置 IPC 处理器
    this.setupIpcHandlers();
  }

  /**
   * 应用启动主流程
   */
  async onAppReady(): Promise<StartupResult> {
    try {
      this.createStartupWindow();
      await new Promise((resolve) => setTimeout(resolve, 500));
      // Step 1: 检测 Docker 环境
      this.currentState = StartupState.CHECKING_DOCKER;
      this.updateStartupProgress('正在检测 Docker 环境...', 10);
      const dockerStatus = await this.dockerDetector.detectDocker();
      this.sendToStartupWindow('docker-status', dockerStatus);
      if (!dockerStatus.installed || !dockerStatus.running) {
        await this.showFirstRunWizard(dockerStatus);
        return {
          success: false,
          state: StartupState.ERROR,
          error: 'Docker 未就绪',
          dockerStatus,
        };
      }

      // Step 2: 检查并启动容器
      this.currentState = StartupState.STARTING_CONTAINERS;
      this.updateStartupProgress('正在启动 Matrix 容器...', 30);
      const containerExists = await this.dockerManager.checkContainerExists();
      const isRunning = containerExists && (await this.dockerManager.isContainerRunning());

      if (!isRunning) {
        const startResult = await this.dockerManager.startContainer();
        if (!startResult.success) {
          await this.showContainerStartError(startResult.error);
          return {
            success: false,
            state: StartupState.ERROR,
            error: startResult.error,
          };
        }
      }

      // Step 3: 等待容器健康
      this.currentState = StartupState.WAITING_HEALTHY;
      this.updateStartupProgress('等待 Matrix 服务就绪...', 50);
      const healthResult = await this.dockerManager.waitForHealthy();
      if (!healthResult.success) {
        await this.showHealthCheckError(healthResult.error);
        return {
          success: false,
          state: StartupState.ERROR,
          error: healthResult.error,
        };
      }

      // Step 4: 初始化 Matrix 客户端
      this.currentState = StartupState.INITIALIZING_MATRIX;
      this.updateStartupProgress('连接 Matrix 服务...', 70);
      this.sendToStartupWindow('matrix-status', {
        status: 'connecting',
        message: '正在连接 Matrix 服务...',
      });

      await this.initializeMatrixClientWithoutLogin();
      // 关闭启动窗口
      this.currentState = StartupState.READY;
      this.updateStartupProgress('正在启动应用...', 95);

      await this.createMainWindow();

      return {
        success: true,
        state: StartupState.READY,
        dockerStatus,
        matrixStatus: this.matrixService?.getStatus(),
      };
    } catch (error: any) {
      console.error('Startup error:', error);
      this.currentState = StartupState.ERROR;
      this.sendToStartupWindow('startup-error', { message: error.message, detail: error.stack });
      await this.showGenericError(error.message);
      return {
        success: false,
        state: StartupState.ERROR,
        error: error.message,
      };
    }
  }

  /**
   * 发送认证状态到所有窗口
   */
  private sendAuthStatus(isAuthenticated: boolean): void {
    console.log('Sending auth status:', isAuthenticated);

    // 发送到主窗口（如果存在）
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('auth:status', isAuthenticated);
    }

    // 发送到启动窗口（如果存在）
    if (this.startupWindow && !this.startupWindow.isDestroyed()) {
      this.startupWindow.webContents.send('auth:status', isAuthenticated);
    }
  }

  /**
   * 发送消息到主窗口
   */
  private sendToMainWindow(channel: string, data: any): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      console.log(`Sending to main window: ${channel}`, data);
      this.mainWindow.webContents.send(channel, data);
    }
  }

  /**
   * 初始化 Matrix 客户端（不强制登录）
   */
  private async initializeMatrixClientWithoutLogin(): Promise<void> {
    // 获取 Matrix 服务实例
    this.matrixService = getMatrixService();
    // 设置事件处理器
    this.matrixService.setEventHandlers({
      onStatusChange: (status) => {
        console.log('Matrix status changed:', status);
        // 发送状态到启动窗口
        this.sendToStartupWindow('matrix-status', {
          status: status.isLoggedIn ? 'authenticated' : 'disconnected',
          userId: status.userId,
          message: status.isLoggedIn ? '已登录' : '未登录',
        });

        // 发送状态到主窗口
        this.sendToMainWindow('matrix-status', {
          status: status.isLoggedIn ? 'authenticated' : 'disconnected',
          userId: status.userId,
          message: status.isLoggedIn ? '已登录' : '未登录',
        });

        // 发送认证状态
        this.sendAuthStatus(status.isLoggedIn);
      },
      onSync: (state) => {
        console.log('Matrix sync state:', state);
        this.sendToStartupWindow('matrix-sync', state);
        this.sendToMainWindow('matrix-sync', state);
      },
      onError: (error) => {
        console.error('Matrix error:', error);
        this.sendToStartupWindow('matrix-error', error.message);
        this.sendToMainWindow('matrix-error', error.message);
      },
    });

    try {
      // 初始化 Matrix 服务（连接到本地 Conduit）
      await this.matrixService.initialize('http://localhost:8008');
      const status = this.matrixService.getStatus();
      // 如果有保存的凭证，尝试自动登录
      if (status.isLoggedIn) {
        console.log('Auto-login successful as:', status.userId);
        this.sendToStartupWindow('matrix-status', {
          status: 'authenticated',
          userId: status.userId,
          message: `欢迎回来，${status.userId}`,
        });
      } else {
        this.sendToStartupWindow('matrix-status', {
          status: 'disconnected',
          message: '请在主界面中登录 Matrix 账号',
        });
      }
    } catch (error: any) {
      // 用户可以在主界面中手动连接
      this.sendToStartupWindow('matrix-status', {
        status: 'disconnected',
        message: 'Matrix 服务连接失败，请检查服务状态',
      });
    }
  }

  /**
   * 显示首次运行向导（Docker 未就绪）
   */
  private async showFirstRunWizard(dockerStatus: DockerStatus): Promise<void> {
    const friendlyMessage = this.dockerDetector.getFriendlyErrorMessage(dockerStatus);

    this.sendToStartupWindow('docker-status', {
      ...dockerStatus,
      message: friendlyMessage,
    });

    const result = await dialog.showMessageBox({
      type: 'warning',
      title: friendlyMessage.title,
      message: friendlyMessage.title,
      detail: friendlyMessage.message,
      buttons: [friendlyMessage.actionUrl ? '查看安装指南' : '重试', '退出应用'],
      defaultId: 0,
      cancelId: 1,
    });

    if (result.response === 0) {
      if (friendlyMessage.actionUrl) {
        shell.openExternal(friendlyMessage.actionUrl);
      }
      await this.retryStartup();
    } else {
      this.requestAppExit();
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
      detail: error || '未知错误，请检查 Docker 状态',
      buttons: ['重试', '查看日志', '退出应用'],
      defaultId: 0,
      cancelId: 2,
    });

    if (result.response === 0) {
      await this.retryStartup();
    } else if (result.response === 1) {
      await this.showLogs();
    } else {
      this.requestAppExit();
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
      detail: error || '容器已启动但服务无响应，请检查日志',
      buttons: ['重试', '查看日志', '继续（可能无法使用）'],
      defaultId: 0,
      cancelId: 2,
    });

    if (result.response === 0) {
      await this.retryStartup();
    } else if (result.response === 1) {
      await this.showLogs();
    } else {
      // 用户选择继续，尝试显示主窗口
      await this.createMainWindow();
      this.closeStartupWindow();
    }
  }

  /**
   * 显示通用错误
   */
  private async showGenericError(error: string): Promise<void> {
    const result = await dialog.showMessageBox({
      type: 'error',
      title: '启动失败',
      message: 'SmartClaw 启动失败',
      detail: error,
      buttons: ['重试', '退出应用'],
      defaultId: 0,
      cancelId: 1,
    });

    if (result.response === 0) {
      await this.retryStartup();
    } else {
      this.requestAppExit();
    }
  }

  /**
   * 请求应用退出（通知 main.ts）
   */
  private requestAppExit(): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('app:request-exit');
    }
    // 如果没有主窗口，直接发送全局事件
    process.emit('SIGINT' as any);
  }

  /**
   * 显示日志
   */
  private async showLogs(): Promise<void> {
    try {
      const logs = await this.dockerManager.getLogs({ tail: 100 });
      const logWindow = new BrowserWindow({
        width: 800,
        height: 600,
        parent: this.mainWindow || undefined,
        modal: true,
        title: '容器日志',
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
        },
      });

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>容器日志</title>
          <style>
            body { font-family: monospace; margin: 0; padding: 20px; background: #1e1e1e; color: #d4d4d4; }
            pre { white-space: pre-wrap; word-wrap: break-word; margin: 0; font-size: 12px; }
          </style>
        </head>
        <body>
          <pre>${logs.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
        </body>
        </html>
      `;

      const dataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
      await logWindow.loadURL(dataUrl);
      logWindow.setMenuBarVisibility(false);
    } catch (error: any) {
      await dialog.showMessageBox({
        type: 'error',
        title: '无法获取日志',
        message: error.message,
        buttons: ['关闭'],
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
   * 创建启动窗口
   */
  private createStartupWindow(): void {
    if (this.startupWindow && !this.startupWindow.isDestroyed()) {
      console.log('Startup window already exists');
      return;
    }

    this.startupWindow = new BrowserWindow({
      width: 500,
      height: 450,
      frame: false,
      movable: true,
      alwaysOnTop: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.js'),
        spellcheck: false,
      },
      show: true,
    });

    // 监听窗口加载完成
    this.startupWindow.webContents.on('did-finish-load', () => {
      console.log('Startup window loaded successfully');
    });

    // 监听控制台消息（用于调试）
    this.startupWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
      console.log(`[Startup Window] ${message}`);
    });

    // 加载启动 HTML
    const startupHtmlPath = path.join(__dirname, '../public/startup.html');
    console.log('Startup HTML path:', startupHtmlPath);

    if (fs.existsSync(startupHtmlPath)) {
      this.startupWindow.loadFile(startupHtmlPath);
    }

    this.startupWindow.center();

    // 开发模式下打开 DevTools
    // if (process.env.NODE_ENV === 'development') {
    //   this.startupWindow.webContents.openDevTools();
    // }
  }

  /**
   * 更新启动窗口进度
   */
  private updateStartupProgress(message: string, progress: number, detail?: string): void {
    console.log(`Progress: ${message} (${progress}%)`);
    this.sendToStartupWindow('startup-progress', {
      state: this.currentState,
      message,
      progress,
      detail: detail || '',
    });
  }

  /**
   * 发送消息到启动窗口
   */
  private sendToStartupWindow(channel: string, data: any): void {
    if (this.startupWindow && !this.startupWindow.isDestroyed()) {
      console.log(`Sending to startup window: ${channel}`, data);
      this.startupWindow.webContents.send(channel, data);
    } else {
      console.warn(`Startup window not available for channel: ${channel}`);
    }
  }

  /**
   * 关闭启动窗口
   */
  private closeStartupWindow(): void {
    if (this.startupWindow && !this.startupWindow.isDestroyed()) {
      this.startupWindow.close();
      this.startupWindow = null;
    }
  }

  /**
   * 创建主窗口
   */
  private async createMainWindow(): Promise<void> {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.show();
      return;
    }

    this.mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      minWidth: 800,
      minHeight: 600,
      title: 'SmartClaw',
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.js'),
        spellcheck: false,
      },
      show: false,
    });

    this.mainWindow.once('ready-to-show', () => {
      this.closeStartupWindow();
      this.mainWindow?.show();
      this.mainWindow?.focus();
    });

    // 加载应用
    if (process.env.NODE_ENV === 'development') {
      await this.mainWindow.loadURL('http://localhost:3000');
      this.mainWindow.webContents.openDevTools();
    } else {
      const indexPath = path.join(__dirname, '../../renderer/index.html');
      if (fs.existsSync(indexPath)) {
        await this.mainWindow.loadFile(indexPath);
      } else {
        console.error('Renderer index not found:', indexPath);
        await this.mainWindow.loadURL('about:blank');
      }
    }

    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });

    if (process.env.NODE_ENV === 'development') {
      this.mainWindow.webContents.openDevTools();
    }
  }

  /**
   * 设置 IPC 处理器
   */
  private setupIpcHandlers(): void {
    console.log('Setting up IPC handlers...');

    // 获取启动状态
    ipcMain.handle('startup:get-state', async () => {
      console.log('IPC: startup:get-state');
      return {
        state: this.currentState,
        message: this.getStateMessage(),
        progress: this.getCurrentProgress(),
      };
    });

    // 关闭启动窗口
    ipcMain.handle('startup:close', async () => {
      console.log('IPC: startup:close');
      this.closeStartupWindow();
      return { success: true };
    });

    // 打开指南
    ipcMain.handle('open:guide', async () => {
      console.log('IPC: open:guide');
      shell.openExternal('https://docs.docker.com/get-docker/');
    });

    // 打开注册页面
    ipcMain.handle('open:registration', async () => {
      console.log('IPC: open:registration');
      shell.openExternal('https://matrix.org/docs/guides/registration');
    });

    // Docker 检查
    ipcMain.handle('docker:check', async () => {
      try {
        const status = await this.dockerDetector.detectDocker();
        return status;
      } catch (error: any) {
        return {
          installed: false,
          running: false,
          error: error.message,
        };
      }
    });

    // 获取容器信息
    ipcMain.handle('docker:container-info', async () => {
      try {
        const info = await this.dockerManager.getContainerInfo();
        return { success: true, data: info };
      } catch (error: any) {
        return {
          success: false,
          error: error.message || '获取容器信息失败',
        };
      }
    });

    // 快速可用性检查
    ipcMain.handle('docker:is-available', async () => {
      try {
        const status = await this.dockerDetector.detectDocker();
        const available = status.installed && status.running;
        return { success: true, data: available };
      } catch (error: any) {
        return {
          success: false,
          error: error.message || 'Docker 可用性检查失败',
        };
      }
    });

    // Docker 容器操作
    ipcMain.handle('docker:start-container', async () => {
      console.log('IPC: docker:start-container');
      return await this.dockerManager.startContainer();
    });

    ipcMain.handle('docker:stop-container', async () => {
      return await this.dockerManager.stopContainer();
    });

    ipcMain.handle('docker:restart-container', async () => {
      return await this.dockerManager.restartContainer();
    });

    ipcMain.handle('docker:get-container-status', async () => {
      const exists = await this.dockerManager.checkContainerExists();
      const running = exists && (await this.dockerManager.isContainerRunning());
      const healthy = running && (await this.dockerManager.isContainerHealthy());
      return { exists, running, healthy };
    });

    ipcMain.handle('docker:get-container-logs', async () => {
      return await this.dockerManager.getLogs({ tail: 100 });
    });

    ipcMain.handle('docker:is-installed', async () => {
      const status = await this.dockerDetector.detectDocker();
      return status.installed;
    });

    ipcMain.handle('docker:get-info', async () => {
      return await this.dockerDetector.detectDocker();
    });

    // Conduit 相关
    ipcMain.handle('docker:start-conduit', async () => {
      return await this.dockerManager.startContainer();
    });

    ipcMain.handle('docker:stop-conduit', async () => {
      return await this.dockerManager.stopContainer();
    });

    ipcMain.handle('docker:get-conduit-status', async () => {
      const running = await this.dockerManager.isContainerRunning();
      const healthy = running && (await this.dockerManager.isContainerHealthy());
      return { running, healthy };
    });

    ipcMain.handle('docker:get-conduit-logs', async () => {
      return await this.dockerManager.getLogs({ tail: 100 });
    });

    ipcMain.handle('docker:configure', async (event, config) => {
      const settingsPath = path.join(app.getPath('userData'), 'docker-settings.json');
      fs.writeFileSync(settingsPath, JSON.stringify(config, null, 2));
      return { success: true };
    });

    // Matrix 登录
    ipcMain.handle('matrix:login', async (event, credentials: { username: string; password: string }) => {
      if (!this.matrixService) {
        throw new Error('Matrix service not initialized');
      }

      try {
        const result = await this.matrixService.login(credentials);
        // 登录成功后发送认证状态
        this.sendAuthStatus(true);
        return { success: true, session: result };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    });

    // 获取 Matrix 状态
    ipcMain.handle('matrix:get-status', async () => {
      return this.matrixService?.getStatus() || null;
    });

    // 登出
    ipcMain.handle('matrix:logout', async () => {
      if (this.matrixService) {
        await this.matrixService.logout();
        // 登出后发送认证状态
        this.sendAuthStatus(false);
      }
    });

    // 获取房间列表
    ipcMain.handle('matrix:get-rooms', async () => {
      if (!this.matrixService) return [];
      return await this.matrixService.getRooms();
    });

    // 发送消息
    ipcMain.handle('matrix:send-message', async (event, roomId: string, text: string) => {
      if (!this.matrixService) throw new Error('Matrix service not available');
      return await this.matrixService.sendMessage(roomId, text);
    });

    // 创建房间
    // ipcMain.handle('matrix:create-room', async (event, name: string, topic?: string) => {
    //   if (!this.matrixService) throw new Error('Matrix service not available');
    //   return await this.matrixService.createRoom(name, topic);
    // });

    // 获取房间消息
    ipcMain.handle('matrix:get-messages', async (event, roomId: string, limit?: number) => {
      if (!this.matrixService) return [];
      return await this.matrixService.getRoomMessages(roomId, limit);
    });

    // 获取 Docker 状态
    ipcMain.handle('docker:get-status', async () => {
      return {
        isRunning: await this.dockerManager.isContainerRunning(),
        state: this.currentState,
      };
    });
  }

  /**
   * 获取当前进度
   */
  private getCurrentProgress(): number {
    const progressMap: Record<StartupState, number> = {
      [StartupState.INITIALIZING]: 0,
      [StartupState.CHECKING_DOCKER]: 10,
      [StartupState.STARTING_CONTAINERS]: 30,
      [StartupState.WAITING_HEALTHY]: 50,
      [StartupState.INITIALIZING_MATRIX]: 70,
      [StartupState.READY]: 95,
      [StartupState.ERROR]: 100,
    };
    return progressMap[this.currentState] || 0;
  }

  /**
   * 获取状态消息
   */
  private getStateMessage(): string {
    const messages: Record<StartupState, string> = {
      [StartupState.INITIALIZING]: '正在初始化...',
      [StartupState.CHECKING_DOCKER]: '检测 Docker 环境...',
      [StartupState.STARTING_CONTAINERS]: '启动 Matrix 容器...',
      [StartupState.WAITING_HEALTHY]: '等待服务就绪...',
      [StartupState.INITIALIZING_MATRIX]: '连接 Matrix 服务...',
      [StartupState.READY]: '就绪',
      [StartupState.ERROR]: '启动失败',
    };
    return messages[this.currentState] || '处理中...';
  }

  /**
   * 应用关闭处理
   */
  async onAppClosing(): Promise<void> {
    if (this.isClosing) return;
    this.isClosing = true;
    await this.cleanup();
    console.log('AppStartupManager: Cleanup completed');
  }

  private async shouldStopContainersOnExit(): Promise<boolean> {
    try {
      const settingsPath = path.join(app.getPath('userData'), 'settings.json');
      if (fs.existsSync(settingsPath)) {
        const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
        return settings.stopContainerOnExit !== false;
      }
    } catch (error) {
      console.error('Failed to read settings:', error);
    }
    return true;
  }

  /**
   * 清理资源
   */
  private async cleanup(): Promise<void> {
    // const shouldStop = await this.shouldStopContainersOnExit();
    // if (shouldStop && this.dockerManager) {
    //   try {
    //     await this.dockerManager.stopContainer();
    //   } catch (error) {
    //     console.error('Error stopping container:', error);
    //   }
    // }

    // 登出 Matrix 服务
    if (this.matrixService) {
      try {
        console.log('Logging out from Matrix...');
        await this.matrixService.logout().catch(console.error);
      } catch (error) {
        console.error('Error logging out:', error);
      }
      this.matrixService = null;
    }

    // 清理 IPC 处理器
    const handlers = [
      'startup:get-state',
      'startup:close',
      'open:guide',
      'open:registration',
      'docker:check',
      'docker:start-container',
      'docker:stop-container',
      'docker:restart-container',
      'docker:get-container-status',
      'docker:get-container-logs',
      'docker:container-info',
      'docker:is-available',
      'docker:is-installed',
      'docker:get-info',
      'docker:start-conduit',
      'docker:stop-conduit',
      'docker:get-conduit-status',
      'docker:get-conduit-logs',
      'docker:configure',
      'matrix:login',
      'matrix:get-status',
      'matrix:logout',
      'matrix:get-rooms',
      'matrix:send-message',
      'matrix:create-room',
      'matrix:get-messages',
      'docker:get-status',
    ];

    handlers.forEach((handler) => {
      try {
        ipcMain.removeHandler(handler);
      } catch (error) {
        // 忽略错误
      }
    });

    // 关闭窗口
    if (this.startupWindow && !this.startupWindow.isDestroyed()) {
      this.startupWindow.destroy();
      this.startupWindow = null;
    }

    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.destroy();
      this.mainWindow = null;
    }
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

  /**
   * 获取 Matrix 服务实例
   */
  getMatrixService(): MatrixService | null {
    return this.matrixService;
  }

  /**
   * 获取 Docker 管理器
   */
  getDockerManager(): DockerManager {
    return this.dockerManager;
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
