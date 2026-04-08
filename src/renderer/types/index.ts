// src/renderer/types/index.ts

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
 * 房间信息（原始数据）
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
 * 显示用的房间信息（格式化后）
 */
export interface DisplayRoom {
  roomId: string;
  name: string;
  topic?: string;
  memberCount: number;
  isDirect: boolean;
  lastMessage?: string;
  lastMessageTime?: Date;
  unreadCount: number;
}

/**
 * 用户信息
 */
export interface User {
  userId: string;
  displayName?: string;
  avatarUrl?: string;
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
 * 创建房间选项
 */
export interface CreateRoomOptions {
  name?: string;
  topic?: string;
  isDirect?: boolean;
  invite?: string[];
  roomAliasName?: string;
  visibility?: 'public' | 'private';
  preset?: 'private_chat' | 'public_chat' | 'trusted_private_chat';
}

/**
 * 同步状态
 */
export type SyncState = 'PREPARED' | 'SYNCING' | 'ERROR' | 'RECONNECTING' | 'STOPPED';

/**
 * API 响应
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * 登录响应
 */
export interface LoginResponse {
  userId: string;
  deviceId: string;
  accessToken: string;
  homeserverUrl: string;
}

/**
 * 房间更新事件
 */
export interface RoomUpdateEvent {
  rooms: RoomInfo[];
}

/**
 * 消息接收事件
 */
export interface MessageReceivedEvent {
  message: MessageContent;
}

/**
 * 认证状态事件
 */
export interface AuthStatusEvent {
  authenticated: boolean;
}
