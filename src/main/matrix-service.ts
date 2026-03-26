/**
 * Matrix 服务管理器
 * 负责管理 Matrix 客户端的生命周期和启动流程
 */

import { getMatrixClient, MatrixClientWrapper, MatrixSession } from './matrix-client';

export interface MatrixServiceStatus {
  isConnected: boolean;
  isLoggedIn: boolean;
  userId: string | undefined;
  homeserverUrl: string | undefined;
}

export interface MatrixServiceEvents {
  onStatusChange?: (status: MatrixServiceStatus) => void;
  onMessage?: (message: any) => void;
  onSync?: (state: string) => void;
  onError?: (error: Error) => void;
}

export class MatrixService {
  private client: MatrixClientWrapper;
  private status: MatrixServiceStatus = {
    isConnected: false,
    isLoggedIn: false,
    userId: undefined,
    homeserverUrl: undefined,
  };
  private eventHandlers: MatrixServiceEvents = {};

  constructor() {
    this.client = getMatrixClient();
    this.setupClientEvents();
  }

  getClient(): MatrixClientWrapper {
    return this.client;
  }

  /**
   * 获取 Matrix 客户端包装器（别名，保持兼容）
   */
  getMatrixClient(): MatrixClientWrapper {
    return this.client;
  }

  /**
   * 设置客户端事件监听
   */
  private setupClientEvents(): void {
    this.client.on('sync', (data: { state: string; prevState: string }) => {
      console.log('Matrix sync state:', data.state);
      this.eventHandlers.onSync?.(data.state);

      // 同步完成后更新状态
      if (data.state === 'PREPARED' || data.state === 'SYNCING') {
        this.updateStatus();
      }
    });

    this.client.on('message', (message: any) => {
      console.log('Matrix message received:', message);
      this.eventHandlers.onMessage?.(message);
    });

    this.client.on('error', (error: Error) => {
      console.error('Matrix error:', error);
      this.eventHandlers.onError?.(error);
    });

    this.client.on('logged_out', () => {
      console.log('Matrix logged out');
      this.status.isLoggedIn = false;
      this.status.userId = undefined;
      this.eventHandlers.onStatusChange?.(this.status);
    });
  }

  /**
   * 更新状态
   */
  private updateStatus(): void {
    const session = this.client.getSession();
    this.status = {
      isConnected: this.client.getClient() !== null,
      isLoggedIn: this.client.isLoggedIn(),
      userId: session?.userId || undefined,
      homeserverUrl: session?.homeserverUrl || undefined,
    };
    this.eventHandlers.onStatusChange?.(this.status);
  }

  /**
   * 初始化 Matrix 服务
   */
  async initialize(homeserverUrl: string = 'http://localhost:8008'): Promise<boolean> {
    try {
      console.log('Initializing Matrix service...');

      // 连接到服务器
      await this.client.connect(homeserverUrl);

      // 尝试恢复已保存的会话
      const savedSession = await this.loadSession();
      if (savedSession) {
        const restored = await this.client.restoreSession(savedSession);
        if (restored) {
          console.log('Session restored for:', savedSession.userId);
          this.updateStatus();
          return true;
        }
      }

      this.updateStatus();
      console.log('Matrix service initialized (no session)');
      return true;
    } catch (error: any) {
      console.error('Failed to initialize Matrix service:', error);
      this.eventHandlers.onError?.(error);
      throw new Error(`Matrix 服务初始化失败：${error.message}`);
    }
  }

  /**
   * 登录
   */
  async login(credentials: { username: string; password: string; homeserverUrl?: string }): Promise<MatrixSession> {
    try {
      // 如果指定了不同的服务器，先重新连接
      if (credentials.homeserverUrl && credentials.homeserverUrl !== this.status.homeserverUrl) {
        await this.client.connect(credentials.homeserverUrl);
      }

      const session = await this.client.login(credentials.username, credentials.password);

      // 保存会话
      await this.saveSession(session);

      this.updateStatus();
      console.log('Matrix login successful:', session.userId);

      return session;
    } catch (error: any) {
      console.error('Matrix login failed:', error);
      throw error;
    }
  }

  /**
   * 登出
   */
  async logout(): Promise<void> {
    try {
      await this.client.logout();
      await this.clearSession();
      this.updateStatus();
      console.log('Matrix logout successful');
    } catch (error: any) {
      console.error('Matrix logout failed:', error);
      throw error;
    }
  }

  /**
   * 获取当前状态
   */
  getStatus(): MatrixServiceStatus {
    return { ...this.status };
  }

  /**
   * 获取房间列表
   */
  async getRooms() {
    return this.client.getRooms();
  }

  /**
   * 发送消息
   */
  async sendMessage(roomId: string, text: string) {
    return this.client.sendMessage(roomId, text);
  }

  /**
   * 创建房间
   */
  async createRoom(name: string, topic?: string) {
    return this.client.createRoom({ name, topic });
  }

  /**
   * 获取房间消息
   */
  async getRoomMessages(roomId: string, limit?: number) {
    return this.client.getRoomMessages(roomId, limit);
  }

  /**
   * 设置事件处理器
   */
  setEventHandlers(handlers: MatrixServiceEvents): void {
    this.eventHandlers = { ...this.eventHandlers, ...handlers };
  }

  /**
   * 保存会话到本地存储
   */
  private async saveSession(session: MatrixSession): Promise<void> {
    try {
      const { safeStorage } = require('electron');
      const { app } = require('electron');
      const fs = require('fs');
      const path = require('path');

      const userDataPath = app.getPath('userData');
      const sessionPath = path.join(userDataPath, 'matrix-session.json');

      const sessionData = JSON.stringify(session);

      if (safeStorage.isEncryptionAvailable()) {
        const encrypted = safeStorage.encryptString(sessionData);
        fs.writeFileSync(sessionPath, encrypted.toString('base64'));
      } else {
        // 降级：明文存储（不推荐）
        fs.writeFileSync(sessionPath, sessionData);
      }

      console.log('Matrix session saved');
    } catch (error) {
      console.error('Failed to save session:', error);
    }
  }

  /**
   * 从本地存储加载会话
   */
  private async loadSession(): Promise<MatrixSession | null> {
    try {
      const { safeStorage } = require('electron');
      const { app } = require('electron');
      const fs = require('fs');
      const path = require('path');

      const userDataPath = app.getPath('userData');
      const sessionPath = path.join(userDataPath, 'matrix-session.json');

      if (!fs.existsSync(sessionPath)) {
        return null;
      }

      let sessionData: string;
      const fileContent = fs.readFileSync(sessionPath, 'utf8');

      if (safeStorage.isEncryptionAvailable()) {
        const encrypted = Buffer.from(fileContent, 'base64');
        sessionData = safeStorage.decryptString(encrypted);
      } else {
        sessionData = fileContent;
      }

      return JSON.parse(sessionData);
    } catch (error) {
      console.error('Failed to load session:', error);
      return null;
    }
  }

  /**
   * 清除保存的会话
   */
  private async clearSession(): Promise<void> {
    try {
      const { app } = require('electron');
      const fs = require('fs');
      const path = require('path');

      const userDataPath = app.getPath('userData');
      const sessionPath = path.join(userDataPath, 'matrix-session.json');

      if (fs.existsSync(sessionPath)) {
        fs.unlinkSync(sessionPath);
      }

      console.log('Matrix session cleared');
    } catch (error) {
      console.error('Failed to clear session:', error);
    }
  }
}

// 单例
let matrixServiceInstance: MatrixService | null = null;

export function getMatrixService(): MatrixService {
  if (!matrixServiceInstance) {
    matrixServiceInstance = new MatrixService();
  }
  return matrixServiceInstance;
}
