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
  WAITING_LOGIN = 'waiting-login',
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
  private loginResolve: (() => void) | null = null;
  private loginReject: ((reason: Error) => void) | null = null;
  private loginTimeout: NodeJS.Timeout | null = null;

  constructor() {
    this.dockerDetector = new DockerDetector();
    let composePath: string;
    try {
      composePath = getDockerComposePath();
    } catch (error) {
      console.error('Failed to get docker-compose path:', error);
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
      // 创建启动窗口
      this.createStartupWindow();
      // Step 1: 检测 Docker 环境
      this.currentState = StartupState.CHECKING_DOCKER;
      this.updateStartupProgress('正在检测 Docker 环境...', 10);
      const dockerStatus = await this.dockerDetector.detectDocker();
      this.sendToStartupWindow('docker-status', dockerStatus);
      if (!dockerStatus.installed || !dockerStatus.running) {
        // Docker 未就绪，显示首次运行向导
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
      this.sendToStartupWindow('matrix-status', { status: 'connecting', message: '正在连接 Matrix 服务...' });

      await this.initializeMatrixClient();

      // Step 5: 等待登录（如果需要）
      if (!this.matrixService?.getStatus().isLoggedIn) {
        this.currentState = StartupState.WAITING_LOGIN;
        this.updateStartupProgress('请登录 Matrix 账号', 85);
        this.sendToStartupWindow('matrix-status', { status: 'waiting_login', message: '请登录 Matrix 账号' });
        await this.waitForUserLogin();
      }

      // Step 6: 显示主窗口
      this.currentState = StartupState.READY;
      this.updateStartupProgress('正在启动应用...', 95);
      await this.createMainWindow();

      // 关闭启动窗口
      this.closeStartupWindow();

      return {
        success: true,
        state: StartupState.READY,
        dockerStatus,
        matrixStatus: this.matrixService?.getStatus(),
      };
    } catch (error: any) {
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
   * 初始化 Matrix 客户端
   */
  private async initializeMatrixClient(): Promise<void> {
    console.log('Initializing Matrix client...');

    // 获取 Matrix 服务实例
    this.matrixService = getMatrixService();

    // 设置事件处理器
    this.matrixService.setEventHandlers({
      onStatusChange: (status) => {
        console.log('Matrix status changed:', status);
        this.sendToStartupWindow('matrix-status', {
          status: status.isLoggedIn ? 'authenticated' : 'connected',
          userId: status.userId,
          message: status.isLoggedIn ? '已登录' : '已连接',
        });

        // 如果正在等待登录且已登录，完成等待
        if (this.currentState === StartupState.WAITING_LOGIN && status.isLoggedIn) {
          this.loginResolve?.();
        }
      },
      onSync: (state) => {
        console.log('Matrix sync state:', state);
        this.sendToStartupWindow('matrix-sync', state);
      },
      onError: (error) => {
        console.error('Matrix error:', error);
        this.sendToStartupWindow('matrix-error', error.message);
      },
    });

    try {
      // 初始化 Matrix 服务（连接到本地 Conduit）
      await this.matrixService.initialize('http://localhost:8008');

      const status = this.matrixService.getStatus();
      console.log('Matrix service status:', status);

      // 如果已登录，直接成功
      if (status.isLoggedIn) {
        console.log('Matrix already logged in as:', status.userId);
        return;
      }

      // 未登录，检查是否有自动注册配置
      if (process.env.AUTO_REGISTER_USER === 'true') {
        await this.autoLoginOrRegister();
      }

      console.log('Matrix client initialized successfully');
    } catch (error: any) {
      console.error('Matrix initialization failed:', error);
      throw new Error(`Matrix 服务初始化失败：${error.message}`);
    }
  }

  /**
   * 等待用户登录
   */
  private async waitForUserLogin(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.loginResolve = resolve;
      this.loginReject = reject;

      // 设置超时（5分钟）
      this.loginTimeout = setTimeout(() => {
        this.loginResolve = null;
        this.loginReject = null;
        reject(new Error('登录超时'));
      }, 300000);
    });
  }

  /**
   * 自动登录或注册
   */
  private async autoLoginOrRegister(): Promise<void> {
    const username = process.env.MATRIX_USERNAME || 'smartclaw_user';
    const password = process.env.MATRIX_PASSWORD || 'smartclaw123';
    const registrationToken = process.env.MATRIX_REGISTRATION_TOKEN || 'smartclaw123';

    try {
      // 尝试登录
      await this.matrixService!.login({ username, password });
      console.log('Auto-login successful');
    } catch (error: any) {
      // 登录失败，尝试注册
      if (error.message.includes('用户名或密码错误') || error.message.includes('User not found')) {
        console.log('User not found, attempting to register...');
        await this.autoRegister(username, password, registrationToken);
      } else {
        throw error;
      }
    }
  }

  /**
   * 自动注册
   */
  private async autoRegister(username: string, password: string, registrationToken: string): Promise<void> {
    const client = this.matrixService!.getClient();
    if (!client) {
      throw new Error('Matrix client not available');
    }

    try {
      // 使用 matrix-js-sdk 的 register 方法
      const { createClient } = await import('matrix-js-sdk');
      const tempClient = createClient({
        baseUrl: 'http://localhost:8008',
      });

      const response = await tempClient.register(username, password, null, {
        type: 'm.login.registration_token',
        session: registrationToken,
      });

      // 注册成功后使用新凭证登录
      await this.matrixService!.login({ username, password });
      console.log('Auto-registration successful');
    } catch (error: any) {
      console.error('Auto-registration failed:', error);
      throw new Error(`自动注册失败：${error.message}`);
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
      app.quit();
    }
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
      return;
    }

    this.startupWindow = new BrowserWindow({
      width: 500,
      height: 450,
      frame: false,
      resizable: false,
      movable: true,
      minimizable: false,
      maximizable: false,
      closable: false,
      alwaysOnTop: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.js'),
      },
    });

    // 加载启动 HTML
    const startupHtmlPath = path.join(__dirname, '../../public/startup.html');
    if (fs.existsSync(startupHtmlPath)) {
      this.startupWindow.loadFile(startupHtmlPath);
    } else {
      this.startupWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(this.getInlineStartupHtml())}`);
    }

    this.startupWindow.center();
  }

  /**
   * 获取内联启动 HTML
   */
  private getInlineStartupHtml(): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>SmartClaw 启动中</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            color: white;
          }
          .container { text-align: center; padding: 40px; }
          .logo { font-size: 64px; margin-bottom: 20px; animation: pulse 2s infinite; }
          .title { font-size: 28px; font-weight: bold; margin-bottom: 8px; }
          .subtitle { font-size: 14px; opacity: 0.7; margin-bottom: 30px; }
          .status-card { background: rgba(255,255,255,0.1); border-radius: 16px; padding: 24px; backdrop-filter: blur(10px); }
          .status { font-size: 18px; margin-bottom: 20px; }
          .status-icon { display: inline-block; width: 12px; height: 12px; border-radius: 50%; background: #ffc107; margin-right: 10px; animation: blink 1.5s infinite; }
          .progress-bar { width: 100%; height: 6px; background: rgba(255,255,255,0.2); border-radius: 3px; overflow: hidden; margin: 20px 0; }
          .progress-fill { width: 0%; height: 100%; background: linear-gradient(90deg, #4caf50, #8bc34a); transition: width 0.3s; }
          .message { font-size: 13px; opacity: 0.8; margin-top: 15px; }
          @keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05); } }
          @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="logo">🦞</div>
          <div class="title">SmartClaw</div>
          <div class="subtitle">智能矩阵客户端</div>
          <div class="status-card">
            <div class="status"><span class="status-icon"></span><span id="statusText">正在初始化...</span></div>
            <div class="progress-bar"><div class="progress-fill" id="progressFill"></div></div>
            <div class="message" id="message"></div>
          </div>
        </div>
        <script>
          if (window.electron?.onStartupProgress) {
            window.electron.onStartupProgress((data) => {
              document.getElementById('statusText').textContent = data.message;
              document.getElementById('progressFill').style.width = data.progress + '%';
              if (data.detail) document.getElementById('message').textContent = data.detail;
            });
          }
        </script>
      </body>
      </html>
    `;
  }

  /**
   * 更新启动窗口进度
   */
  private updateStartupProgress(message: string, progress: number, detail?: string): void {
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
      this.startupWindow.webContents.send(channel, data);
    }
  }

  /**
   * 关闭启动窗口
   */
  private closeStartupWindow(): void {
    if (this.loginTimeout) {
      clearTimeout(this.loginTimeout);
      this.loginTimeout = null;
    }

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
      },
      show: false,
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

    this.mainWindow.show();
    this.mainWindow.focus();

    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });

    this.mainWindow.on('close', async (event) => {
      event.preventDefault();
      await this.onAppClosing();
    });
  }

  /**
   * 设置 IPC 处理器
   */
  private setupIpcHandlers(): void {
    // 获取启动状态
    ipcMain.handle('startup:get-state', async () => {
      return {
        state: this.currentState,
        message: this.getStateMessage(),
      };
    });

    // Matrix 登录
    ipcMain.handle('matrix:login', async (event, credentials: { username: string; password: string }) => {
      if (!this.matrixService) {
        throw new Error('Matrix service not initialized');
      }

      try {
        const result = await this.matrixService.login(credentials);
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
    ipcMain.handle('matrix:create-room', async (event, name: string, topic?: string) => {
      if (!this.matrixService) throw new Error('Matrix service not available');
      return await this.matrixService.createRoom(name, topic);
    });

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

    // 重启容器
    ipcMain.handle('docker:restart', async () => {
      await this.dockerManager.restartContainer();
    });

    // 打开指南
    ipcMain.handle('open:guide', async () => {
      shell.openExternal('https://docs.docker.com/get-docker/');
    });
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
      [StartupState.WAITING_LOGIN]: '请登录 Matrix 账号',
      [StartupState.READY]: '就绪',
      [StartupState.ERROR]: '启动失败',
    };
    return messages[this.currentState] || '处理中...';
  }

  /**
   * 应用关闭处理
   */
  async onAppClosing(): Promise<void> {
    const shouldStop = await this.shouldStopContainersOnExit();

    if (shouldStop && this.mainWindow) {
      // 显示关闭提示
      const splash = new BrowserWindow({
        width: 300,
        height: 150,
        frame: false,
        transparent: true,
        alwaysOnTop: true,
        webPreferences: { nodeIntegration: false },
      });

      splash.loadURL(`data:text/html;charset=utf-8,
        <html><body style="background: rgba(0,0,0,0.7); color: white; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; font-family: sans-serif;">
          <div style="text-align: center;">🦞 正在清理资源...<br/><span style="font-size: 12px;">请稍候</span></div>
        </body></html>
      `);
      splash.center();

      await this.dockerManager.stopContainer();
      splash.close();
    }

    this.cleanup();
    app.quit();
  }

  /**
   * 询问用户是否在退出时停止容器
   */
  private async shouldStopContainersOnExit(): Promise<boolean> {
    // 从用户设置中读取，默认停止容器
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
  private cleanup(): void {
    if (this.loginTimeout) {
      clearTimeout(this.loginTimeout);
      this.loginTimeout = null;
    }

    if (this.matrixService) {
      this.matrixService.logout().catch(console.error);
      this.matrixService = null;
    }

    // 清理 IPC 处理器
    const handlers = [
      'startup:get-state',
      'matrix:login',
      'matrix:get-status',
      'matrix:logout',
      'matrix:get-rooms',
      'matrix:send-message',
      'matrix:create-room',
      'matrix:get-messages',
      'docker:get-status',
      'docker:restart',
      'open:guide',
    ];

    handlers.forEach((handler) => {
      ipcMain.removeHandler(handler);
    });
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
