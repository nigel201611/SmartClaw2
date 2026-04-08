/**
 * SmartClaw Matrix Client Wrapper
 *
 * 基于 matrix-js-sdk 的 Matrix 客户端封装
 * 提供与本地 Conduit 服务器的连接、认证、消息收发等功能
 */

import { createClient, MatrixClient, ICreateClientOpts, ClientEvent, RoomEvent, SyncState as MatrixSyncState } from 'matrix-js-sdk';
import { MatrixEvent, Room } from 'matrix-js-sdk';

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
  members: number;
  isDirect: boolean;
  lastMessage?: MessageContent;
}

/**
 * 同步状态
 */
export enum SyncState {
  NOT_STARTED = 'NOT_STARTED',
  SYNCING = 'SYNCING',
  PREPARED = 'PREPARED',
  CATCHUP = 'CATCHUP',
  RECONNECTING = 'RECONNECTING',
  ERROR = 'ERROR',
}

/**
 * Matrix 客户端包装器
 */
export class MatrixClientWrapper {
  private client: MatrixClient | null = null;
  private session: MatrixSession | null = null;
  private eventListeners: Map<string, Set<Function>> = new Map();
  private syncPromise: Promise<void> | null = null;
  private syncState: SyncState = SyncState.NOT_STARTED;
  private syncStateListeners: Set<(state: SyncState) => void> = new Set();
  private roomCache: Map<string, RoomInfo> = new Map();
  private isInitialSyncComplete: boolean = false;

  /**
   * 连接到 Matrix 服务器
   */
  async connect(homeserverUrl: string): Promise<void> {
    try {
      const url = homeserverUrl.replace(/\/$/, '');

      const opts: ICreateClientOpts = {
        baseUrl: url,
        timelineSupport: true,
        useAuthorizationHeader: true,
      };

      this.client = createClient(opts);
      // this.setupEventListeners();
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
      const response = await this.client.login('m.login.password', {
        identifier: {
          type: 'm.id.user',
          user: username,
        },
        password,
        initial_device_display_name: 'SmartClaw Desktop',
      });

      this.session = {
        userId: response.user_id,
        deviceId: response.device_id,
        accessToken: response.access_token,
        homeserverUrl: this.client.getHomeserverUrl(),
      };

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
    if (this.client) {
      this.stopClient();
    }

    try {
      const url = session.homeserverUrl.replace(/\/$/, '');

      const opts: ICreateClientOpts = {
        baseUrl: url,
        accessToken: session.accessToken,
        userId: session.userId,
        deviceId: session.deviceId,
        timelineSupport: true,
        useAuthorizationHeader: true,
      };

      this.client = createClient(opts);
      // 手动设置 access token（确保生效）
      // (this.client as any).accessToken = session.accessToken;
      // if ((this.client as any).httpOpts) {
      //   (this.client as any).httpOpts.headers = {
      //     ...(this.client as any).httpOpts.headers,
      //     Authorization: `Bearer ${session.accessToken}`,
      //   };
      // }
      this.session = session;
      this.isInitialSyncComplete = false;

      this.setupEventListeners();
      await this.startSyncAndWait();

      console.log('Matrix client connected with token, sync completed');
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
   * 启动同步并等待完成
   */
  private async startSyncAndWait(): Promise<void> {
    if (!this.client) {
      throw new Error('Client not initialized');
    }

    if (this.syncPromise) {
      return this.syncPromise;
    }

    this.syncPromise = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.syncState = SyncState.ERROR;
        this.emitSyncState();
        reject(new Error('Sync timeout after 30 seconds'));
      }, 30000);

      const syncHandler = (state: MatrixSyncState, prevState: MatrixSyncState | null, data: any) => {
        const stateStr = String(state);
        console.log('Sync state changed:', stateStr, 'Previous:', prevState);

        switch (stateStr) {
          case 'PREPARED':
            clearTimeout(timeout);
            this.syncState = SyncState.PREPARED;
            this.isInitialSyncComplete = true;
            this.emitSyncState();
            this.updateRoomCache();
            this.client?.removeListener(ClientEvent.Sync, syncHandler);
            resolve();
            break;
          case 'SYNCING':
            this.syncState = SyncState.SYNCING;
            this.emitSyncState();
            break;
          case 'CATCHUP':
            this.syncState = SyncState.CATCHUP;
            this.emitSyncState();
            break;
          case 'RECONNECTING':
            this.syncState = SyncState.RECONNECTING;
            this.emitSyncState();
            break;
          case 'ERROR':
            clearTimeout(timeout);
            this.syncState = SyncState.ERROR;
            this.emitSyncState();
            this.client?.removeListener(ClientEvent.Sync, syncHandler);
            reject(new Error(data?.error || 'Sync failed'));
            break;
        }
      };

      this.client!.on(ClientEvent.Sync, syncHandler);
      this.client!.startClient({
        initialSyncLimit: 100,
      });

      console.log('Matrix sync started, waiting for PREPARED state...');
    });

    return this.syncPromise;
  }

  /**
   * 等待同步完成
   */
  async waitForSync(timeoutMs: number = 30000): Promise<void> {
    if (this.syncState === SyncState.PREPARED) {
      return;
    }

    if (this.syncPromise) {
      return this.syncPromise;
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Wait for sync timeout'));
      }, timeoutMs);

      const checkSync = () => {
        if (this.syncState === SyncState.PREPARED) {
          clearTimeout(timeout);
          resolve();
        } else if (this.syncState === SyncState.ERROR) {
          clearTimeout(timeout);
          reject(new Error('Sync failed'));
        } else {
          setTimeout(checkSync, 100);
        }
      };

      checkSync();
    });
  }

  /**
   * 获取当前同步状态
   */
  getSyncState(): SyncState {
    return this.syncState;
  }

  /**
   * 检查同步是否完成
   */
  isSyncCompleted(): boolean {
    return this.syncState === SyncState.PREPARED && this.isInitialSyncComplete;
  }

  /**
   * 设置事件监听
   */
  private setupEventListeners(): void {
    if (!this.client) return;

    // 监听同步事件
    this.client.on(ClientEvent.Sync, (state: MatrixSyncState, prevState: MatrixSyncState | null, data: any) => {
      console.log('Matrix sync state:', state);
      this.emit('sync', { state, prevState, data });
    });

    // 监听房间添加事件
    this.client.on(RoomEvent.MyMembership, (room: Room, membership: string) => {
      if (membership === 'join') {
        console.log('Room joined:', room.roomId, room.name);
        const roomInfo = this.parseRoom(room);
        this.roomCache.set(roomInfo.roomId, roomInfo);
        this.emit('room', roomInfo);
        this.emit('rooms_updated', this.getRoomsSync());
      }
    });

    // 监听房间消息
    this.client.on(RoomEvent.Timeline, (event: MatrixEvent, room: Room | undefined, toStartOfTimeline: boolean | undefined) => {
      if (toStartOfTimeline) return;
      if (!room) return;

      if (event.getType() === 'm.room.message') {
        const message = this.parseMessage(event);
        this.emit('message', message);

        const roomInfo = this.roomCache.get(message.roomId);
        if (roomInfo) {
          roomInfo.lastMessage = message;
          this.roomCache.set(message.roomId, roomInfo);
          this.emit('room_updated', roomInfo);
        }
      }
    });

    // 监听房间名称更新
    this.client.on(RoomEvent.Name, (room: Room) => {
      console.log('Room name updated:', room.roomId, room.name);
      const roomInfo = this.roomCache.get(room.roomId);
      if (roomInfo) {
        roomInfo.name = room.name || room.roomId;
        this.roomCache.set(room.roomId, roomInfo);
        this.emit('room_updated', roomInfo);
      }
    });

    // 监听登录状态
    this.client.on('Session.logged_out' as any, () => {
      console.warn('Matrix session logged out');
      this.emit('logged_out', {});
    });
  }

  /**
   * 更新房间缓存
   */
  private updateRoomCache(): void {
    if (!this.client) return;

    try {
      const rooms = this.client.getRooms();
      console.log(`Updating room cache with ${rooms.length} rooms`);
      this.roomCache.clear();
      for (const room of rooms) {
        const roomInfo = this.parseRoom(room);
        this.roomCache.set(roomInfo.roomId, roomInfo);
      }

      this.emit('rooms_updated', this.getRoomsSync());
    } catch (error) {
      console.error('Failed to update room cache:', error);
    }
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
  async sendFormattedMessage(roomId: string, text: string, format: 'plain' | 'html' = 'plain'): Promise<string> {
    if (!this.client) {
      throw new Error('Matrix 客户端未初始化');
    }

    try {
      const content: any = {
        msgtype: 'm.text',
        body: text,
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

  async getRooms(): Promise<RoomInfo[]> {
    if (!this.client) {
      throw new Error('Matrix 客户端未初始化');
    }

    // 等待同步完成
    if (!this.isSyncCompleted()) {
      await this.waitForSync();
    }

    return Array.from(this.roomCache.values());
  }

  /**
   * 同步获取房间列表（从缓存）
   */
  getRoomsSync(): RoomInfo[] {
    return Array.from(this.roomCache.values());
  }

  /**
   * 获取房间信息
   */
  async getRoom(roomId: string): Promise<RoomInfo | null> {
    if (!this.client) {
      throw new Error('Matrix 客户端未初始化');
    }

    const cachedRoom = this.roomCache.get(roomId);
    if (cachedRoom) {
      return cachedRoom;
    }

    if (!this.isSyncCompleted()) {
      await this.waitForSync();
    }

    const room = this.client.getRoom(roomId);
    if (!room) return null;

    const roomInfo = this.parseRoom(room);
    this.roomCache.set(roomId, roomInfo);
    return roomInfo;
  }

  /**
   * 创建房间
   */
  // async createRoom(options?: { name?: string; isDirect?: boolean; invite?: string[] }): Promise<string> {
  //   if (!this.client) {
  //     throw new Error('Matrix 客户端未初始化');
  //   }

  //   // 确保 client 有 access token
  //   if (!this.session?.accessToken) {
  //     throw new Error('未登录或 session 已过期');
  //   }

  //   try {
  //     // 方法1：手动设置 headers（确保 token 被使用）
  //     const params: any = {
  //       name: options?.name,
  //       preset: options?.isDirect ? 'private_chat' : 'public_chat',
  //       visibility: options?.isDirect ? 'private' : 'public',
  //       invite: options?.invite || [],
  //     };

  //     if (options?.isDirect) {
  //       params.is_direct = true;
  //     }

  //     const homeserverUrl = this.session.homeserverUrl;
  //     const accessToken = this.session.accessToken;

  //     const response = await fetch(`${homeserverUrl}/_matrix/client/v3/createRoom`, {
  //       method: 'POST',
  //       headers: {
  //         'Content-Type': 'application/json',
  //         Authorization: `Bearer ${accessToken}`,
  //       },
  //       body: JSON.stringify(params),
  //     });

  //     if (!response.ok) {
  //       const error = await response.json();
  //       throw new Error(error.error || `HTTP ${response.status}`);
  //     }

  //     const data = await response.json();
  //     console.log('Room created:', data.room_id);

  //     await new Promise((resolve) => setTimeout(resolve, 1000));
  //     this.updateRoomCache();

  //     return data.room_id;
  //   } catch (error: any) {
  //     console.error('Create room error:', error);
  //     throw new Error(`创建房间失败：${error.message}`);
  //   }
  // }
  async createRoom(options?: { name?: string; isDirect?: boolean; invite?: string[] }): Promise<string> {
    if (!this.client) {
      throw new Error('Matrix 客户端未初始化');
    }

    try {
      const params: any = {
        name: options?.name,
        preset: options?.isDirect ? 'private_chat' : 'public_chat',
        visibility: options?.isDirect ? 'private' : 'public',
        invite: options?.invite || [],
      };

      if (options?.isDirect) {
        params.is_direct = true;
      }

      const response = await this.client.createRoom(params);
      console.log('Room created:', response.room_id);

      await new Promise((resolve) => setTimeout(resolve, 1000));
      this.updateRoomCache();

      return response.room_id;
    } catch (error: any) {
      console.error('Create room error:', error);
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
      const roomInfo = this.parseRoom(room);
      this.roomCache.set(roomInfo.roomId, roomInfo);
      this.emit('room', roomInfo);
      return roomInfo;
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
      this.roomCache.delete(roomId);
      this.emit('rooms_updated', this.getRoomsSync());
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
      if (!this.isSyncCompleted()) {
        await this.waitForSync();
      }

      const room = this.client.getRoom(roomId);
      if (!room) {
        throw new Error('房间不存在');
      }

      const timeline = room.getLiveTimeline();
      const events = timeline.getEvents();

      const messages = events
        .filter((event) => event.getType() === 'm.room.message')
        .slice(-limit)
        .map((event) => this.parseMessage(event));

      console.log(`Got ${messages.length} messages for room ${roomId}`);
      return messages.reverse();
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
      listeners.forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  /**
   * 触发同步状态变化
   */
  private emitSyncState(): void {
    this.syncStateListeners.forEach((listener) => {
      try {
        listener(this.syncState);
      } catch (error) {
        console.error('Error in sync state listener:', error);
      }
    });
  }

  /**
   * 监听同步状态变化
   */
  onSyncStateChange(listener: (state: SyncState) => void): () => void {
    this.syncStateListeners.add(listener);
    return () => {
      this.syncStateListeners.delete(listener);
    };
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
        formatted_body: content.formatted_body,
      },
      type: event.getType(),
    };
  }

  /**
   * 检查是否为直聊房间
   */
  private isDirectRoom(room: Room): boolean {
    try {
      // 通过 room 的成员数量判断（直聊房间只有2个人）
      const members = room.getJoinedMembers();
      if (members && members.length === 2) {
        return true;
      }

      // 通过 account data 检查
      const directRooms = this.client?.getAccountData('m.direct');
      if (directRooms && directRooms.getContent) {
        const content = directRooms.getContent();
        const userIds = Object.values(content);
        for (const ids of userIds) {
          if (Array.isArray(ids) && ids.includes(room.roomId)) {
            return true;
          }
        }
      }

      return false;
    } catch (error) {
      return false;
    }
  }

  /**
   * 解析房间信息
   */
  private parseRoom(room: Room): RoomInfo {
    try {
      const timeline = room.getLiveTimeline();
      const events = timeline.getEvents();
      const lastEvent = events
        .slice()
        .reverse()
        .find((e: MatrixEvent) => e.getType() === 'm.room.message');

      const name = room.name || room.roomId;
      const isDirect = this.isDirectRoom(room);

      return {
        roomId: room.roomId,
        name: name,
        members: room.getJoinedMembers()?.length || 0,
        isDirect: isDirect,
        lastMessage: lastEvent ? this.parseMessage(lastEvent as MatrixEvent) : undefined,
      };
    } catch (error) {
      console.error('Error parsing room:', error);
      return {
        roomId: room.roomId,
        name: room.name || room.roomId,
        members: 0,
        isDirect: false,
      };
    }
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
    return this.session !== null && this.client !== null;
  }

  /**
   * 登出
   */
  async logout(): Promise<void> {
    if (!this.client || !this.session) {
      this.stopClient();
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
      try {
        this.client.stopClient();
      } catch (error) {
        console.warn('Error stopping client:', error);
      }
      this.client = null;
    }
    this.session = null;
    this.syncPromise = null;
    this.syncState = SyncState.NOT_STARTED;
    this.isInitialSyncComplete = false;
    this.roomCache.clear();
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

/**
 * 重置 Matrix 客户端单例（用于测试或完全登出）
 */
export function resetMatrixClient(): void {
  if (matrixClientInstance) {
    matrixClientInstance.stopClient();
    matrixClientInstance = null;
  }
}

export default MatrixClientWrapper;
