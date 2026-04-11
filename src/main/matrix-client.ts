// src/main/matrix-client.ts

import { createClient, MatrixClient, ICreateClientOpts, ClientEvent, RoomEvent, SyncState as MatrixSyncState } from 'matrix-js-sdk';
import { MatrixEvent, Room } from 'matrix-js-sdk';

export interface MatrixSession {
  userId: string;
  deviceId: string;
  accessToken: string;
  homeserverUrl: string;
}

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

export interface RoomInfo {
  roomId: string;
  name: string;
  members: number;
  isDirect: boolean;
  lastMessage?: MessageContent;
  topic?: string;
}

export enum SyncState {
  NOT_STARTED = 'NOT_STARTED',
  SYNCING = 'SYNCING',
  PREPARED = 'PREPARED',
  CATCHUP = 'CATCHUP',
  RECONNECTING = 'RECONNECTING',
  ERROR = 'ERROR',
}

export interface UserPowerInfo {
  userId: string;
  isAdmin: boolean;
  isCreator: boolean;
  powerLevel: number;
}

export class MatrixClientWrapper {
  private client: MatrixClient | null = null;
  private session: MatrixSession | null = null;
  private eventListeners: Map<string, Set<Function>> = new Map();
  private syncPromise: Promise<void> | null = null;
  private syncState: SyncState = SyncState.NOT_STARTED;
  private syncStateListeners: Set<(state: SyncState) => void> = new Set();
  private roomCache: Map<string, RoomInfo> = new Map();
  private isInitialSyncComplete: boolean = false;

  async connect(homeserverUrl: string): Promise<void> {
    try {
      const url = homeserverUrl.replace(/\/$/, '');
      const opts: ICreateClientOpts = {
        baseUrl: url,
        timelineSupport: true,
        useAuthorizationHeader: true,
      };
      this.client = createClient(opts);
      console.log('Matrix client created, connecting to:', url);
    } catch (error: any) {
      throw new Error(`连接 Matrix 服务器失败：${error.message}`);
    }
  }

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
      this.session = session;
      this.isInitialSyncComplete = false;

      this.setupEventListeners();
      await this.startSyncAndWait();

      console.log('Matrix client connected with token, sync completed');
    } catch (error: any) {
      throw new Error(`连接 Matrix 服务器失败：${error.message}`);
    }
  }

  async restoreSession(session: MatrixSession): Promise<boolean> {
    try {
      await this.connectWithToken(session);
      return true;
    } catch (error) {
      console.error('Failed to restore session:', error);
      return false;
    }
  }

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
        console.log('Sync state changed:', stateStr);

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

  getSyncState(): SyncState {
    return this.syncState;
  }

  isSyncCompleted(): boolean {
    return this.syncState === SyncState.PREPARED && this.isInitialSyncComplete;
  }

  private setupEventListeners(): void {
    if (!this.client) return;

    this.client.on(ClientEvent.Sync, (state: MatrixSyncState, prevState: MatrixSyncState | null, data: any) => {
      console.log('Matrix sync state:', state);
      this.emit('sync', { state, prevState, data });
    });

    this.client.on(RoomEvent.MyMembership, (room: Room, membership: string) => {
      if (membership === 'join') {
        console.log('Room joined:', room.roomId, room.name);
        const roomInfo = this.parseRoom(room);
        this.roomCache.set(roomInfo.roomId, roomInfo);
        this.emit('room', roomInfo);
        this.emit('rooms_updated', this.getRoomsSync());
      }
    });

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

    this.client.on(RoomEvent.Name, (room: Room) => {
      console.log('Room name updated:', room.roomId, room.name);
      const roomInfo = this.roomCache.get(room.roomId);
      if (roomInfo) {
        roomInfo.name = room.name || room.roomId;
        this.roomCache.set(room.roomId, roomInfo);
        this.emit('room_updated', roomInfo);
      }
    });

    this.client.on('Session.logged_out' as any, () => {
      console.warn('Matrix session logged out');
      this.emit('logged_out', {});
    });
  }

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
    if (!this.isSyncCompleted()) {
      await this.waitForSync();
    }

    const rooms = Array.from(this.roomCache.values());
    const joinedRooms = rooms.filter((room) => {
      const matrixRoom = this.client?.getRoom(room.roomId);
      if (matrixRoom) {
        const myMembership = matrixRoom.getMyMembership();
        return myMembership === 'join';
      }
      return true;
    });

    console.log(`Total rooms: ${rooms.length}, Joined rooms: ${joinedRooms.length}`);
    return joinedRooms;
  }

  getRoomsSync(): RoomInfo[] {
    const rooms = Array.from(this.roomCache.values());
    const joinedRooms = rooms.filter((room) => {
      const matrixRoom = this.client?.getRoom(room.roomId);
      if (matrixRoom) {
        const myMembership = matrixRoom.getMyMembership();
        return myMembership === 'join';
      }
      return true;
    });
    return joinedRooms;
  }

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

  async isRoomNameExists(roomName: string, excludeRoomId?: string): Promise<boolean> {
    if (!this.client) {
      throw new Error('Matrix 客户端未初始化');
    }
    if (!this.isSyncCompleted()) {
      await this.waitForSync();
    }
    const rooms = Array.from(this.roomCache.values());
    return rooms.some((room) => room.name === roomName && (!excludeRoomId || room.roomId !== excludeRoomId));
  }

  async getRoomNames(): Promise<string[]> {
    if (!this.client) {
      throw new Error('Matrix 客户端未初始化');
    }
    if (!this.isSyncCompleted()) {
      await this.waitForSync();
    }
    return Array.from(this.roomCache.values()).map((room) => room.name);
  }

  async getUserPowerInfo(roomId: string): Promise<UserPowerInfo> {
    const userId = this.session?.userId;
    if (!userId) {
      throw new Error('用户未登录');
    }

    const homeserverUrl = this.session?.homeserverUrl;
    const accessToken = this.session?.accessToken;

    let isCreator = false;
    let powerLevel = 0;
    let isAdmin = false;

    if (!homeserverUrl || !accessToken) {
      return { userId, isAdmin, isCreator, powerLevel };
    }

    try {
      // 检查是否是服务器管理员
      const whoamiResponse = await fetch(`${homeserverUrl}/_matrix/client/v3/account/whoami`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (whoamiResponse.ok) {
        const data = await whoamiResponse.json();
        isAdmin = data.admin === true || data.is_admin === true || data.user_type === 'admin';
        console.log('Admin check result:', isAdmin, data);
      }

      // 获取房间创建信息
      const createResponse = await fetch(`${homeserverUrl}/_matrix/client/v3/rooms/${roomId}/state/m.room.create`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (createResponse.ok) {
        const data = await createResponse.json();
        if (data.creator === userId) {
          isCreator = true;
        }
      }

      // 获取权力级别信息
      const powerResponse = await fetch(`${homeserverUrl}/_matrix/client/v3/rooms/${roomId}/state/m.room.power_levels`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (powerResponse.ok) {
        const data = await powerResponse.json();
        powerLevel = data.users?.[userId] || 0;
        if (powerLevel >= 100) {
          isCreator = true;
        }
      }

      console.log('User power info:', { userId, isAdmin, isCreator, powerLevel });
    } catch (error) {
      console.error('Failed to get user power info via API:', error);
    }

    return {
      userId,
      isAdmin,
      isCreator,
      powerLevel,
    };
  }

  async createRoom(options?: { name?: string; topic?: string; isDirect?: boolean; invite?: string[] }): Promise<string> {
    if (!this.client) {
      throw new Error('Matrix 客户端未初始化');
    }

    try {
      const params: any = {
        name: options?.name,
        preset: options?.isDirect ? 'private_chat' : 'public_chat',
        visibility: options?.isDirect ? 'private' : 'public',
        invite: options?.invite || [],
        topic: options?.topic,
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

  async kickUser(roomId: string, userId: string, reason?: string): Promise<void> {
    if (!this.client) {
      throw new Error('Matrix 客户端未初始化');
    }

    try {
      await this.client.kick(roomId, userId, reason);
      console.log(`Kicked user ${userId} from room ${roomId}`);
    } catch (error: any) {
      throw new Error(`踢出用户失败：${error.message}`);
    }
  }

  async deleteRoomIntelligent(roomId: string): Promise<{ method: 'admin' | 'creator' | 'leave'; message: string }> {
    if (!this.client) {
      throw new Error('Matrix 客户端未初始化');
    }

    const userId = this.session?.userId;
    if (!userId) {
      throw new Error('用户未登录');
    }

    try {
      const powerInfo = await this.getUserPowerInfo(roomId);
      console.log('Delete room power info:', powerInfo);

      if (powerInfo.isAdmin) {
        console.log('User is admin, attempting force delete...');
        const success = await this.forceDeleteRoom(roomId);
        if (success) {
          this.roomCache.delete(roomId);
          this.emit('rooms_updated', this.getRoomsSync());
          return {
            method: 'admin',
            message: '已使用管理员权限永久删除房间',
          };
        } else {
          console.log('Force delete failed, falling back to creator logic...');
        }
      }

      if (powerInfo.isCreator) {
        console.log('User is creator, kicking all members...');
        const room = this.client.getRoom(roomId);
        if (room) {
          const members = room.getJoinedMembers();
          console.log(`Kicking ${members.length - 1} members from room...`);

          for (const member of members) {
            if (member.userId !== userId) {
              try {
                await this.kickUser(roomId, member.userId, 'Room deletion by creator');
                await new Promise((resolve) => setTimeout(resolve, 500));
              } catch (kickError) {
                console.warn(`Failed to kick user ${member.userId}:`, kickError);
              }
            }
          }
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
        await this.leaveRoom(roomId);
        this.roomCache.delete(roomId);
        this.emit('rooms_updated', this.getRoomsSync());
        return {
          method: 'creator',
          message: '已踢出所有成员并离开房间',
        };
      }

      console.log('User is normal member, just leaving...');
      await this.leaveRoom(roomId);
      this.roomCache.delete(roomId);
      this.emit('rooms_updated', this.getRoomsSync());
      return {
        method: 'leave',
        message: '已离开房间',
      };
    } catch (error: any) {
      console.error('Delete room error:', error);
      throw new Error(`删除房间失败：${error.message}`);
    }
  }

  async forceDeleteRoom(roomId: string): Promise<boolean> {
    if (!this.client) {
      throw new Error('Matrix 客户端未初始化');
    }

    try {
      const homeserverUrl = this.session?.homeserverUrl;
      const accessToken = this.session?.accessToken;

      if (!homeserverUrl || !accessToken) {
        throw new Error('未登录或会话已过期');
      }

      // 尝试 Synapse API
      let response = await fetch(`${homeserverUrl}/_synapse/admin/v1/rooms/${roomId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          block: true,
          purge: true,
        }),
      });

      if (response.ok) {
        console.log('Room deleted via Synapse API:', roomId);
        return true;
      }

      // 尝试 Conduit API
      response = await fetch(`${homeserverUrl}/_conduit/admin/v1/rooms/${roomId}/delete`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        console.log('Room deleted via Conduit API:', roomId);
        return true;
      }

      // 尝试 Matrix v3 Admin API
      response = await fetch(`${homeserverUrl}/_matrix/client/v3/admin/rooms/${roomId}/delete`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          purge: true,
        }),
      });

      if (response.ok) {
        console.log('Room deleted via Matrix v3 Admin API:', roomId);
        return true;
      }

      // 如果都不成功，尝试踢出所有成员后离开
      console.log('Admin API not available, falling back to kick all members...');
      const room = this.client.getRoom(roomId);
      if (room) {
        const members = room.getJoinedMembers();
        for (const member of members) {
          if (member.userId !== this.session?.userId) {
            try {
              await this.kickUser(roomId, member.userId, 'Room deletion by admin');
              await new Promise((resolve) => setTimeout(resolve, 500));
            } catch (kickError) {
              console.warn(`Failed to kick user ${member.userId}:`, kickError);
            }
          }
        }
        await new Promise((resolve) => setTimeout(resolve, 1000));
        await this.leaveRoom(roomId);
        return true;
      }

      return false;
    } catch (error: any) {
      console.error('Force delete room error:', error);
      return false;
    }
  }

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

  on(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(callback);
  }

  off(event: string, callback: Function): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.delete(callback);
    }
  }

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

  private emitSyncState(): void {
    this.syncStateListeners.forEach((listener) => {
      try {
        listener(this.syncState);
      } catch (error) {
        console.error('Error in sync state listener:', error);
      }
    });
  }

  onSyncStateChange(listener: (state: SyncState) => void): () => void {
    this.syncStateListeners.add(listener);
    return () => {
      this.syncStateListeners.delete(listener);
    };
  }

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

  private isDirectRoom(room: Room): boolean {
    try {
      const members = room.getJoinedMembers();
      if (members && members.length === 2) {
        return true;
      }
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

  getSession(): MatrixSession | null {
    return this.session ? { ...this.session } : null;
  }

  isLoggedIn(): boolean {
    return this.session !== null && this.client !== null;
  }

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

  getClient(): MatrixClient | null {
    return this.client;
  }
}

let matrixClientInstance: MatrixClientWrapper | null = null;

export function getMatrixClient(): MatrixClientWrapper {
  if (!matrixClientInstance) {
    matrixClientInstance = new MatrixClientWrapper();
  }
  return matrixClientInstance;
}

export function resetMatrixClient(): void {
  if (matrixClientInstance) {
    matrixClientInstance.stopClient();
    matrixClientInstance = null;
  }
}

export default MatrixClientWrapper;
