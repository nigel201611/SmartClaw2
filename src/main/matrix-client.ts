/**
 * SmartClaw Matrix Client Wrapper
 * 
 * 基于 matrix-js-sdk 的 Matrix 客户端封装
 * 提供与本地 Conduit 服务器的连接、认证、消息收发等功能
 */

import { createClient, MatrixClient, ICreateClientOpts } from 'matrix-js-sdk';
import { Room, MatrixEvent } from 'matrix-js-sdk';
import * as crypto from 'crypto';

/**
 * 会话信息
 */
export interface MatrixSession {
  userId: string;
  deviceId: string;
  accessToken: string;
  homeserverUrl: string;
}

/**
 * 消息内容
 */
export interface MessageContent {
  roomId: string;
  eventId: string;
  sender: string;
  timestamp: number;
  content: {
    msgtype: string;
    body: string;
    formatted_body?: string;
  };
  type: string;
}

/**
 * 房间信息
 */
export interface RoomInfo {
  roomId: string;
  name: string;
  topic?: string;
  members: number;
  isDirect: boolean;
  lastMessage?: MessageContent;
}

/**
 * 认证凭据
 */
export interface AuthCredentials {
  username: string;
  password: string;
  homeserverUrl: string;
}

/**
 * Matrix 客户端包装器
 */
export class MatrixClientWrapper {
  private client: MatrixClient | null = null;
  private session: MatrixSession | null = null;
  private eventListeners: Map<string, Set<Function>> = new Map();
  private syncPromise: Promise<void> | null = null;

  /**
   * 连接到 Matrix 服务器
   */
  async connect(homeserverUrl: string): Promise<void> {
    try {
      // 确保 URL 格式正确
      const url = homeserverUrl.replace(/\/$/, '');

      // 创建客户端配置
      const opts: ICreateClientOpts = {
        baseUrl: url,
        timelineSupport: true,
        useAuthorizationHeader: true
      };

      this.client = createClient(opts);

      // 设置事件监听
      this.setupEventListeners();

      console.log('Matrix client created, connecting to:', url);
    } catch (error: any) {
      throw new Error(`连接 Matrix 服务器失败：${error.message}`);
    }
  }

  /**
   * 登录到 Matrix 服务器
   */
  async login(username: string, password: string): Promise<MatrixSession> {
    if (!this.client) {
      throw new Error('Matrix 客户端未初始化');
    }

    try {
      // 执行登录
      const response = await this.client.login('m.login.password', {
        identifier: {
          type: 'm.id.user',
          user: username
        },
        password,
        initial_device_display_name: 'SmartClaw Desktop'
      });

      // 保存会话信息
      this.session = {
        userId: response.user_id,
        deviceId: response.device_id,
        accessToken: response.access_token,
        homeserverUrl: this.client.getHomeserverUrl()
      };

      // 使用访问令牌重新初始化客户端
      await this.connectWithToken(this.session);

      console.log('Matrix login successful:', this.session.userId);
      return this.session;
    } catch (error: any) {
      console.error('Matrix login failed:', error);
      
      if (error.httpStatus === 401) {
        throw new Error('用户名或密码错误');
      } else if (error.httpStatus === 403) {
        throw new Error('账户已被禁用');
      } else if (error.httpStatus === 0) {
        throw new Error('无法连接到 Matrix 服务器');
      } else {
        throw new Error(`登录失败：${error.message}`);
      }
    }
  }

  /**
   * 使用访问令牌连接
   */
  async connectWithToken(session: MatrixSession): Promise<void> {
    try {
      const url = session.homeserverUrl.replace(/\/$/, '');

      const opts: ICreateClientOpts = {
        baseUrl: url,
        accessToken: session.accessToken,
        userId: session.userId,
        deviceId: session.deviceId,
        timelineSupport: true
      };

      this.client = createClient(opts);
      this.session = session;

      // 设置事件监听
      this.setupEventListeners();

      // 启动同步
      this.startSync();

      console.log('Matrix client connected with token');
    } catch (error: any) {
      throw new Error(`连接 Matrix 服务器失败：${error.message}`);
    }
  }

  /**
   * 恢复会话（从存储的凭据）
   */
  async restoreSession(session: MatrixSession): Promise<boolean> {
    try {
      await this.connectWithToken(session);
      return true;
    } catch (error) {
      console.error('Failed to restore session:', error);
      return false;
    }
  }

  /**
   * 设置事件监听
   */
  private setupEventListeners(): void {
    if (!this.client) return;

    // 监听同步事件
    (this.client as any).on('sync', (state: string, prevState: string, data: any) => {
      console.log('Matrix sync state:', state, prevState);
      this.emit('sync', { state, prevState, data });
    });

    // 监听房间消息
    (this.client as any).on('Room.timeline', (event: any, room: any, toStartOfTimeline: any) => {
      if (toStartOfTimeline) return; // 忽略历史消息
      
      if (event.getType() === 'm.room.message') {
        const message = this.parseMessage(event);
        this.emit('message', message);
      }
    });

    // 监听房间更新
    (this.client as any).on('Room', (room: any) => {
      this.emit('room', this.parseRoom(room));
    });

    // 监听错误
    (this.client as any).on('error', (error: any) => {
      console.error('Matrix client error:', error);
      this.emit('error', error);
    });

    // 监听登录状态
    (this.client as any).on('Session.logged_out', () => {
      console.warn('Matrix session logged out');
      this.emit('logged_out', {});
    });
  }

  /**
   * 启动同步
   */
  private startSync(): void {
    if (!this.client) return;

    // 等待客户端准备好
    this.syncPromise = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Sync timeout'));
      }, 30000);

      (this.client as any).once('sync', (state: string) => {
        clearTimeout(timeout);
        if (state === 'PREPARED' || state === 'SYNCING') {
          resolve();
        } else {
          reject(new Error(`Sync failed: ${state}`));
        }
      });
    });

    // 启动客户端同步
    this.client.startClient({
      initialSyncLimit: 100
    });

    console.log('Matrix sync started');
  }

  /**
   * 发送消息
   */
  async sendMessage(roomId: string, text: string): Promise<string> {
    if (!this.client) {
      throw new Error('Matrix 客户端未初始化');
    }

    try {
      const response = await this.client.sendTextMessage(roomId, text);
      console.log('Message sent:', response.event_id);
      return response.event_id;
    } catch (error: any) {
      throw new Error(`发送消息失败：${error.message}`);
    }
  }

  /**
   * 发送格式化消息
   */
  async sendFormattedMessage(
    roomId: string,
    text: string,
    format: 'plain' | 'html' = 'plain'
  ): Promise<string> {
    if (!this.client) {
      throw new Error('Matrix 客户端未初始化');
    }

    try {
      const content: any = {
        msgtype: 'm.text',
        body: text
      };

      if (format === 'html') {
        content.format = 'org.matrix.custom.html';
        content.formatted_body = text;
      }

      const response = await this.client.sendMessage(roomId, content);
      return response.event_id;
    } catch (error: any) {
      throw new Error(`发送消息失败：${error.message}`);
    }
  }

  /**
   * 获取房间列表
   */
  async getRooms(): Promise<RoomInfo[]> {
    if (!this.client) {
      throw new Error('Matrix 客户端未初始化');
    }

    try {
      const rooms = this.client.getRooms();
      return rooms.map(room => this.parseRoom(room));
    } catch (error: any) {
      throw new Error(`获取房间列表失败：${error.message}`);
    }
  }

  /**
   * 获取房间信息
   */
  async getRoom(roomId: string): Promise<RoomInfo | null> {
    if (!this.client) {
      throw new Error('Matrix 客户端未初始化');
    }

    const room = this.client.getRoom(roomId);
    if (!room) return null;

    return this.parseRoom(room);
  }

  /**
   * 创建房间
   */
  async createRoom(options?: {
    name?: string;
    topic?: string;
    isDirect?: boolean;
    invite?: string[];
  }): Promise<string> {
    if (!this.client) {
      throw new Error('Matrix 客户端未初始化');
    }

    try {
      const params: any = {
        preset: 'private_chat',
        ...options
      };

      const response = await this.client.createRoom(params);
      return response.room_id;
    } catch (error: any) {
      throw new Error(`创建房间失败：${error.message}`);
    }
  }

  /**
   * 加入房间
   */
  async joinRoom(roomIdOrAlias: string): Promise<RoomInfo> {
    if (!this.client) {
      throw new Error('Matrix 客户端未初始化');
    }

    try {
      const room = await this.client.joinRoom(roomIdOrAlias);
      return this.parseRoom(room);
    } catch (error: any) {
      throw new Error(`加入房间失败：${error.message}`);
    }
  }

  /**
   * 离开房间
   */
  async leaveRoom(roomId: string): Promise<void> {
    if (!this.client) {
      throw new Error('Matrix 客户端未初始化');
    }

    try {
      await this.client.leave(roomId);
    } catch (error: any) {
      throw new Error(`离开房间失败：${error.message}`);
    }
  }

  /**
   * 获取房间消息历史
   */
  async getRoomMessages(roomId: string, limit: number = 50): Promise<MessageContent[]> {
    if (!this.client) {
      throw new Error('Matrix 客户端未初始化');
    }

    try {
      const room = this.client.getRoom(roomId);
      if (!room) {
        throw new Error('房间不存在');
      }

      const timeline = room.getLiveTimeline();
      const events = timeline.getEvents().slice(-limit);

      return events
        .filter(event => event.getType() === 'm.room.message')
        .map(event => this.parseMessage(event))
        .reverse(); // 最新消息在前
    } catch (error: any) {
      throw new Error(`获取消息历史失败：${error.message}`);
    }
  }

  /**
   * 注册事件监听
   */
  on(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(callback);
  }

  /**
   * 移除事件监听
   */
  off(event: string, callback: Function): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.delete(callback);
    }
  }

  /**
   * 触发事件
   */
  private emit(event: string, data: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  /**
   * 解析消息事件
   */
  private parseMessage(event: MatrixEvent): MessageContent {
    const content = event.getContent();
    return {
      roomId: event.getRoomId()!,
      eventId: event.getId()!,
      sender: event.getSender()!,
      timestamp: event.getTs(),
      content: {
        msgtype: content.msgtype || 'm.text',
        body: content.body || '',
        formatted_body: content.formatted_body
      },
      type: event.getType()
    };
  }

  /**
   * 解析房间信息
   */
  private parseRoom(room: any): RoomInfo {
    const lastEvent = room.timeline[room.timeline.length - 1];
    
    return {
      roomId: room.roomId,
      name: room.name || room.roomId,
      topic: (room.currentState as any)?.topic,
      members: room.getJoinedMembers().length,
      isDirect: room.isDirectRoom?.() || false,
      lastMessage: lastEvent ? this.parseMessage(lastEvent) : undefined
    };
  }

  /**
   * 获取当前会话
   */
  getSession(): MatrixSession | null {
    return this.session ? { ...this.session } : null;
  }

  /**
   * 检查是否已登录
   */
  isLoggedIn(): boolean {
    return this.session !== null;
  }

  /**
   * 登出
   */
  async logout(): Promise<void> {
    if (!this.client || !this.session) {
      return;
    }

    try {
      await this.client.logout(true);
    } catch (error) {
      console.warn('Logout failed:', error);
    } finally {
      this.stopClient();
    }
  }

  /**
   * 停止客户端
   */
  stopClient(): void {
    if (this.client) {
      this.client.stopClient();
      this.client = null;
    }
    this.session = null;
    this.syncPromise = null;
    this.eventListeners.clear();
  }

  /**
   * 获取客户端实例（用于高级操作）
   */
  getClient(): MatrixClient | null {
    return this.client;
  }
}

// 单例实例
let matrixClientInstance: MatrixClientWrapper | null = null;

/**
 * 获取 Matrix 客户端单例
 */
export function getMatrixClient(): MatrixClientWrapper {
  if (!matrixClientInstance) {
    matrixClientInstance = new MatrixClientWrapper();
  }
  return matrixClientInstance;
}

export default MatrixClientWrapper;
