// src/main/ipc/matrix-ipc-handlers.ts

import { ipcMain, BrowserWindow } from 'electron';
import { getMatrixClient, MatrixSession, MessageContent, RoomInfo, UserPowerInfo } from './matrix-client';

export const MATRIX_IPC_CHANNELS = {
  CONNECT: 'matrix:connect',
  RESTORE_SESSION: 'matrix:restore-session',
  GET_SESSION: 'matrix:get-session',
  IS_LOGGED_IN: 'matrix:is-logged-in',
  GET_ROOM: 'matrix:get-room',
  CREATE_ROOM: 'matrix:create-room',
  JOIN_ROOM: 'matrix:join-room',
  LEAVE_ROOM: 'matrix:leave-room',
  DELETE_ROOM: 'matrix:delete-room',
  DELETE_ROOM_INTELLIGENT: 'matrix:delete-room-intelligent',
  CHECK_ROOM_NAME: 'matrix:check-room-name',
  GET_ROOM_NAMES: 'matrix:get-room-names',
  GET_USER_POWER_INFO: 'matrix:get-user-power-info',
  SEND_FORMATTED_MESSAGE: 'matrix:send-formatted-message',
  GET_ROOM_MESSAGES: 'matrix:get-room-messages',
  SUBSCRIBE_EVENTS: 'matrix:subscribe-events',
  UNSUBSCRIBE_EVENTS: 'matrix:unsubscribe-events',
} as const;

export interface MatrixIPCResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface DeleteRoomResult {
  method: 'admin' | 'creator' | 'leave';
  message: string;
}

export function registerMatrixIPCHandlers(mainWindow: BrowserWindow) {
  const client = getMatrixClient();

  ipcMain.handle(MATRIX_IPC_CHANNELS.CONNECT, async (event, homeserverUrl: string): Promise<MatrixIPCResponse<void>> => {
    try {
      await client.connect(homeserverUrl);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || '连接服务器失败' };
    }
  });

  ipcMain.handle(MATRIX_IPC_CHANNELS.RESTORE_SESSION, async (event, session: MatrixSession): Promise<MatrixIPCResponse<boolean>> => {
    try {
      const success = await client.restoreSession(session);
      return { success: true, data: success };
    } catch (error: any) {
      return { success: false, error: error.message || '恢复会话失败' };
    }
  });

  ipcMain.handle(MATRIX_IPC_CHANNELS.GET_SESSION, async (): Promise<MatrixIPCResponse<MatrixSession | null>> => {
    try {
      const session = client.getSession();
      return { success: true, data: session };
    } catch (error: any) {
      return { success: false, error: error.message || '获取会话失败' };
    }
  });

  ipcMain.handle(MATRIX_IPC_CHANNELS.IS_LOGGED_IN, async (): Promise<MatrixIPCResponse<boolean>> => {
    try {
      return { success: true, data: client.isLoggedIn() };
    } catch (error: any) {
      return { success: false, error: error.message || '检查登录状态失败' };
    }
  });

  ipcMain.handle(MATRIX_IPC_CHANNELS.GET_ROOM, async (event, roomId: string): Promise<MatrixIPCResponse<RoomInfo | null>> => {
    try {
      const room = await client.getRoom(roomId);
      return { success: true, data: room };
    } catch (error: any) {
      return { success: false, error: error.message || '获取房间信息失败' };
    }
  });

  ipcMain.handle(MATRIX_IPC_CHANNELS.CREATE_ROOM, async (event, options: { name?: string; topic?: string; isDirect?: boolean }): Promise<MatrixIPCResponse<string>> => {
    try {
      if (options.name) {
        const exists = await client.isRoomNameExists(options.name);
        if (exists) {
          return { success: false, error: '房间名称已存在，请使用其他名称' };
        }
      }
      const roomId = await client.createRoom(options);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      mainWindow.webContents.send('matrix:rooms-updated');
      return { success: true, data: roomId };
    } catch (error: any) {
      return { success: false, error: error.message || '创建房间失败' };
    }
  });

  ipcMain.handle(MATRIX_IPC_CHANNELS.JOIN_ROOM, async (event, roomIdOrAlias: string): Promise<MatrixIPCResponse<RoomInfo>> => {
    try {
      const room = await client.joinRoom(roomIdOrAlias);
      mainWindow.webContents.send('matrix:rooms-updated');
      return { success: true, data: room };
    } catch (error: any) {
      return { success: false, error: error.message || '加入房间失败' };
    }
  });

  ipcMain.handle(MATRIX_IPC_CHANNELS.LEAVE_ROOM, async (event, roomId: string): Promise<MatrixIPCResponse<void>> => {
    try {
      await client.leaveRoom(roomId);
      mainWindow.webContents.send('matrix:rooms-updated');
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || '离开房间失败' };
    }
  });

  ipcMain.handle(MATRIX_IPC_CHANNELS.DELETE_ROOM_INTELLIGENT, async (event, roomId: string): Promise<MatrixIPCResponse<DeleteRoomResult>> => {
    console.log('DELETE_ROOM_INTELLIGENT called for room:', roomId);
    try {
      const result = await client.deleteRoomIntelligent(roomId);
      console.log('Delete room result:', result);
      mainWindow.webContents.send('matrix:rooms-updated');
      mainWindow.webContents.send('matrix:room-deleted', roomId);
      return { success: true, data: result };
    } catch (error: any) {
      console.error('Delete room error:', error);
      return { success: false, error: error.message || '删除房间失败' };
    }
  });

  ipcMain.handle(MATRIX_IPC_CHANNELS.DELETE_ROOM, async (event, roomId: string): Promise<MatrixIPCResponse<DeleteRoomResult>> => {
    console.log('DELETE_ROOM called for room:', roomId);
    try {
      const result = await client.deleteRoomIntelligent(roomId);
      console.log('Delete room result:', result);
      mainWindow.webContents.send('matrix:rooms-updated');
      mainWindow.webContents.send('matrix:room-deleted', roomId);
      return { success: true, data: result };
    } catch (error: any) {
      console.error('Delete room error:', error);
      return { success: false, error: error.message || '删除房间失败' };
    }
  });

  ipcMain.handle(MATRIX_IPC_CHANNELS.GET_USER_POWER_INFO, async (event, roomId: string): Promise<MatrixIPCResponse<UserPowerInfo>> => {
    try {
      const powerInfo = await client.getUserPowerInfo(roomId);
      return { success: true, data: powerInfo };
    } catch (error: any) {
      return { success: false, error: error.message || '获取权限信息失败' };
    }
  });

  ipcMain.handle(MATRIX_IPC_CHANNELS.CHECK_ROOM_NAME, async (event, roomName: string, excludeRoomId?: string): Promise<MatrixIPCResponse<boolean>> => {
    try {
      const exists = await client.isRoomNameExists(roomName, excludeRoomId);
      return { success: true, data: exists };
    } catch (error: any) {
      return { success: false, error: error.message || '检查房间名称失败' };
    }
  });

  ipcMain.handle(MATRIX_IPC_CHANNELS.GET_ROOM_NAMES, async (): Promise<MatrixIPCResponse<string[]>> => {
    try {
      const names = await client.getRoomNames();
      return { success: true, data: names };
    } catch (error: any) {
      return { success: false, error: error.message || '获取房间名称列表失败' };
    }
  });

  ipcMain.handle(MATRIX_IPC_CHANNELS.SEND_FORMATTED_MESSAGE, async (event, roomId: string, text: string, format: 'plain' | 'html'): Promise<MatrixIPCResponse<string>> => {
    try {
      const eventId = await client.sendFormattedMessage(roomId, text, format);
      return { success: true, data: eventId };
    } catch (error: any) {
      return { success: false, error: error.message || '发送消息失败' };
    }
  });

  ipcMain.handle(MATRIX_IPC_CHANNELS.GET_ROOM_MESSAGES, async (event, roomId: string, limit: number = 50): Promise<MatrixIPCResponse<MessageContent[]>> => {
    try {
      const messages = await client.getRoomMessages(roomId, limit);
      return { success: true, data: messages };
    } catch (error: any) {
      return { success: false, error: error.message || '获取消息历史失败' };
    }
  });

  ipcMain.handle(MATRIX_IPC_CHANNELS.SUBSCRIBE_EVENTS, async (event, events: string[]): Promise<MatrixIPCResponse<void>> => {
    try {
      events.forEach((eventName) => {
        client.on(eventName, (data: any) => {
          mainWindow.webContents.send(`matrix:event:${eventName}`, data);
        });
      });
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || '订阅事件失败' };
    }
  });

  ipcMain.handle(MATRIX_IPC_CHANNELS.UNSUBSCRIBE_EVENTS, async (): Promise<MatrixIPCResponse<void>> => {
    try {
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || '取消订阅失败' };
    }
  });

  client.on('message', (message: MessageContent) => {
    mainWindow.webContents.send('matrix:message', message);
  });

  client.on('room', (room: RoomInfo) => {
    mainWindow.webContents.send('matrix:room', room);
  });

  client.on('rooms_updated', (rooms: RoomInfo[]) => {
    mainWindow.webContents.send('matrix:rooms', rooms);
    mainWindow.webContents.send('matrix:rooms-updated');
  });

  client.on('sync', (data: any) => {
    mainWindow.webContents.send('matrix:sync', data.state);
  });

  client.on('error', (error: any) => {
    mainWindow.webContents.send('matrix:error', error);
  });

  client.on('logged_out', () => {
    mainWindow.webContents.send('matrix:logged-out');
  });
}

export function cleanupMatrixIPC() {
  const client = getMatrixClient();
  client.stopClient();

  Object.values(MATRIX_IPC_CHANNELS).forEach((channel) => {
    ipcMain.removeHandler(channel);
  });
}

export default registerMatrixIPCHandlers;
