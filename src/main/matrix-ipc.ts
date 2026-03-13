/**
 * SmartClaw Matrix IPC Handlers
 * 
 * Matrix 客户端相关的 IPC 通信处理
 */

import { ipcMain, BrowserWindow } from 'electron';
import { getMatrixClient, MatrixClientWrapper, MatrixSession, MessageContent, RoomInfo } from './matrix-client';

/**
 * Matrix IPC 通道
 */
export const MATRIX_IPC_CHANNELS = {
  // 连接和认证
  CONNECT: 'matrix:connect',
  LOGIN: 'matrix:login',
  LOGOUT: 'matrix:logout',
  RESTORE_SESSION: 'matrix:restore-session',
  GET_SESSION: 'matrix:get-session',
  IS_LOGGED_IN: 'matrix:is-logged-in',
  
  // 房间操作
  GET_ROOMS: 'matrix:get-rooms',
  GET_ROOM: 'matrix:get-room',
  CREATE_ROOM: 'matrix:create-room',
  JOIN_ROOM: 'matrix:join-room',
  LEAVE_ROOM: 'matrix:leave-room',
  
  // 消息操作
  SEND_MESSAGE: 'matrix:send-message',
  SEND_FORMATTED_MESSAGE: 'matrix:send-formatted-message',
  GET_ROOM_MESSAGES: 'matrix:get-room-messages',
  
  // 事件订阅
  SUBSCRIBE_EVENTS: 'matrix:subscribe-events',
  UNSUBSCRIBE_EVENTS: 'matrix:unsubscribe-events'
} as const;

/**
 * IPC 响应类型
 */
export interface MatrixIPCResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * 注册 Matrix IPC 处理器
 */
export function registerMatrixIPCHandlers(mainWindow: BrowserWindow) {
  const client = getMatrixClient();

  // ========== 连接和认证 ==========

  // 连接服务器
  ipcMain.handle(
    MATRIX_IPC_CHANNELS.CONNECT,
    async (event, homeserverUrl: string): Promise<MatrixIPCResponse<void>> => {
      try {
        await client.connect(homeserverUrl);
        return { success: true };
      } catch (error: any) {
        return { 
          success: false, 
          error: error.message || '连接服务器失败' 
        };
      }
    }
  );

  // 登录
  ipcMain.handle(
    MATRIX_IPC_CHANNELS.LOGIN,
    async (event, username: string, password: string): Promise<MatrixIPCResponse<MatrixSession>> => {
      try {
        const session = await client.login(username, password);
        
        // 通知渲染进程登录成功
        mainWindow.webContents.send('matrix:logged-in', session);
        
        return { success: true, data: session };
      } catch (error: any) {
        return { 
          success: false, 
          error: error.message || '登录失败' 
        };
      }
    }
  );

  // 登出
  ipcMain.handle(
    MATRIX_IPC_CHANNELS.LOGOUT,
    async (): Promise<MatrixIPCResponse<void>> => {
      try {
        await client.logout();
        mainWindow.webContents.send('matrix:logged-out', {});
        return { success: true };
      } catch (error: any) {
        return { 
          success: false, 
          error: error.message || '登出失败' 
        };
      }
    }
  );

  // 恢复会话
  ipcMain.handle(
    MATRIX_IPC_CHANNELS.RESTORE_SESSION,
    async (event, session: MatrixSession): Promise<MatrixIPCResponse<boolean>> => {
      try {
        const success = await client.restoreSession(session);
        return { success: true, data: success };
      } catch (error: any) {
        return { 
          success: false, 
          error: error.message || '恢复会话失败' 
        };
      }
    }
  );

  // 获取当前会话
  ipcMain.handle(
    MATRIX_IPC_CHANNELS.GET_SESSION,
    async (): Promise<MatrixIPCResponse<MatrixSession | null>> => {
      try {
        const session = client.getSession();
        return { success: true, data: session };
      } catch (error: any) {
        return { 
          success: false, 
          error: error.message || '获取会话失败' 
        };
      }
    }
  );

  // 检查是否已登录
  ipcMain.handle(
    MATRIX_IPC_CHANNELS.IS_LOGGED_IN,
    async (): Promise<MatrixIPCResponse<boolean>> => {
      try {
        return { success: true, data: client.isLoggedIn() };
      } catch (error: any) {
        return { 
          success: false, 
          error: error.message || '检查登录状态失败' 
        };
      }
    }
  );

  // ========== 房间操作 ==========

  // 获取房间列表
  ipcMain.handle(
    MATRIX_IPC_CHANNELS.GET_ROOMS,
    async (): Promise<MatrixIPCResponse<RoomInfo[]>> => {
      try {
        const rooms = await client.getRooms();
        return { success: true, data: rooms };
      } catch (error: any) {
        return { 
          success: false, 
          error: error.message || '获取房间列表失败' 
        };
      }
    }
  );

  // 获取房间信息
  ipcMain.handle(
    MATRIX_IPC_CHANNELS.GET_ROOM,
    async (event, roomId: string): Promise<MatrixIPCResponse<RoomInfo | null>> => {
      try {
        const room = await client.getRoom(roomId);
        return { success: true, data: room };
      } catch (error: any) {
        return { 
          success: false, 
          error: error.message || '获取房间信息失败' 
        };
      }
    }
  );

  // 创建房间
  ipcMain.handle(
    MATRIX_IPC_CHANNELS.CREATE_ROOM,
    async (event, options: { name?: string; topic?: string; isDirect?: boolean }): Promise<MatrixIPCResponse<string>> => {
      try {
        const roomId = await client.createRoom(options);
        return { success: true, data: roomId };
      } catch (error: any) {
        return { 
          success: false, 
          error: error.message || '创建房间失败' 
        };
      }
    }
  );

  // 加入房间
  ipcMain.handle(
    MATRIX_IPC_CHANNELS.JOIN_ROOM,
    async (event, roomIdOrAlias: string): Promise<MatrixIPCResponse<RoomInfo>> => {
      try {
        const room = await client.joinRoom(roomIdOrAlias);
        return { success: true, data: room };
      } catch (error: any) {
        return { 
          success: false, 
          error: error.message || '加入房间失败' 
        };
      }
    }
  );

  // 离开房间
  ipcMain.handle(
    MATRIX_IPC_CHANNELS.LEAVE_ROOM,
    async (event, roomId: string): Promise<MatrixIPCResponse<void>> => {
      try {
        await client.leaveRoom(roomId);
        return { success: true };
      } catch (error: any) {
        return { 
          success: false, 
          error: error.message || '离开房间失败' 
        };
      }
    }
  );

  // ========== 消息操作 ==========

  // 发送消息
  ipcMain.handle(
    MATRIX_IPC_CHANNELS.SEND_MESSAGE,
    async (event, roomId: string, text: string): Promise<MatrixIPCResponse<string>> => {
      try {
        const eventId = await client.sendMessage(roomId, text);
        return { success: true, data: eventId };
      } catch (error: any) {
        return { 
          success: false, 
          error: error.message || '发送消息失败' 
        };
      }
    }
  );

  // 发送格式化消息
  ipcMain.handle(
    MATRIX_IPC_CHANNELS.SEND_FORMATTED_MESSAGE,
    async (event, roomId: string, text: string, format: 'plain' | 'html'): Promise<MatrixIPCResponse<string>> => {
      try {
        const eventId = await client.sendFormattedMessage(roomId, text, format);
        return { success: true, data: eventId };
      } catch (error: any) {
        return { 
          success: false, 
          error: error.message || '发送消息失败' 
        };
      }
    }
  );

  // 获取房间消息历史
  ipcMain.handle(
    MATRIX_IPC_CHANNELS.GET_ROOM_MESSAGES,
    async (event, roomId: string, limit: number = 50): Promise<MatrixIPCResponse<MessageContent[]>> => {
      try {
        const messages = await client.getRoomMessages(roomId, limit);
        return { success: true, data: messages };
      } catch (error: any) {
        return { 
          success: false, 
          error: error.message || '获取消息历史失败' 
        };
      }
    }
  );

  // ========== 事件订阅 ==========

  // 订阅 Matrix 事件
  ipcMain.handle(
    MATRIX_IPC_CHANNELS.SUBSCRIBE_EVENTS,
    async (event, events: string[]): Promise<MatrixIPCResponse<void>> => {
      try {
        events.forEach(eventName => {
          client.on(eventName, (data: any) => {
            mainWindow.webContents.send(`matrix:event:${eventName}`, data);
          });
        });
        return { success: true };
      } catch (error: any) {
        return { 
          success: false, 
          error: error.message || '订阅事件失败' 
        };
      }
    }
  );

  // 取消订阅
  ipcMain.handle(
    MATRIX_IPC_CHANNELS.UNSUBSCRIBE_EVENTS,
    async (): Promise<MatrixIPCResponse<void>> => {
      try {
        // 清理逻辑（可选实现）
        return { success: true };
      } catch (error: any) {
        return { 
          success: false, 
          error: error.message || '取消订阅失败' 
        };
      }
    }
  );

  // ========== 主动推送事件 ==========

  // 设置客户端事件监听
  client.on('message', (message: MessageContent) => {
    mainWindow.webContents.send('matrix:message', message);
  });

  client.on('room', (room: RoomInfo) => {
    mainWindow.webContents.send('matrix:room', room);
  });

  client.on('sync', (data: any) => {
    mainWindow.webContents.send('matrix:sync', data);
  });

  client.on('error', (error: any) => {
    mainWindow.webContents.send('matrix:error', error);
  });
}

/**
 * 清理 Matrix IPC 处理器
 */
export function cleanupMatrixIPC() {
  const client = getMatrixClient();
  client.stopClient();
  
  Object.values(MATRIX_IPC_CHANNELS).forEach(channel => {
    ipcMain.removeHandler(channel);
  });
}

export default registerMatrixIPCHandlers;
