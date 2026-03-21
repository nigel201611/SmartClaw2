/**
 * SmartClaw Shared Types
 * 
 * 主进程和渲染进程共享的类型定义
 */

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
 * 会话信息
 */
export interface MatrixSession {
  userId: string;
  deviceId: string;
  accessToken: string;
  homeserverUrl: string;
}
