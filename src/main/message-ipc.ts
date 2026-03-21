/**
 * SmartClaw Message Store & Sync IPC Handlers
 * 
 * 消息存储和同步相关的 IPC 通信处理
 */

import { ipcMain, BrowserWindow } from 'electron';
import { getMessageStore, MessageStore } from './message-store';
import { getSyncManager, SyncManager, SyncProgress } from './sync-manager';
import { MessageContent } from './types';

/**
 * 消息存储 IPC 通道
 */
export const MESSAGE_IPC_CHANNELS = {
  // 消息操作
  GET_MESSAGES: 'message:get-messages',
  GET_MESSAGE: 'message:get-message',
  SAVE_MESSAGE: 'message:save-message',
  SAVE_MESSAGES: 'message:save-messages',
  DELETE_MESSAGE: 'message:delete-message',
  DELETE_ROOM_MESSAGES: 'message:delete-room-messages',
  
  // 已读状态
  MARK_AS_READ: 'message:mark-as-read',
  GET_UNREAD_COUNT: 'message:get-unread-count',
  GET_TOTAL_UNREAD: 'message:get-total-unread',
  
  // 统计
  GET_ROOM_COUNT: 'message:get-room-count',
  GET_MESSAGE_COUNT: 'message:get-message-count',
  
  // 同步
  START_SYNC: 'sync:start',
  STOP_SYNC: 'sync:stop',
  PAUSE_SYNC: 'sync:pause',
  RESUME_SYNC: 'sync:resume',
  GET_SYNC_PROGRESS: 'sync:get-progress',
  
  // 存储管理
  CLEAR_ALL: 'message:clear-all'
} as const;

/**
 * IPC 响应类型
 */
export interface MessageIPCResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * 注册消息存储 IPC 处理器
 */
export function registerMessageIPCHandlers(mainWindow: BrowserWindow) {
  const messageStore = getMessageStore();
  const syncManager = getSyncManager();

  // 初始化存储
  messageStore.initialize().catch(console.error);

  // ========== 消息操作 ==========

  // 获取房间消息
  ipcMain.handle(
    MESSAGE_IPC_CHANNELS.GET_MESSAGES,
    async (event, roomId: string, limit: number = 50): Promise<MessageIPCResponse<MessageContent[]>> => {
      try {
        const messages = await messageStore.getMessages(roomId, limit);
        return { success: true, data: messages };
      } catch (error: any) {
        return { 
          success: false, 
          error: error.message || '获取消息失败' 
        };
      }
    }
  );

  // 获取单条消息
  ipcMain.handle(
    MESSAGE_IPC_CHANNELS.GET_MESSAGE,
    async (event, eventId: string): Promise<MessageIPCResponse<MessageContent | null>> => {
      try {
        const message = await messageStore.getMessage(eventId);
        return { success: true, data: message };
      } catch (error: any) {
        return { 
          success: false, 
          error: error.message || '获取消息失败' 
        };
      }
    }
  );

  // 保存消息
  ipcMain.handle(
    MESSAGE_IPC_CHANNELS.SAVE_MESSAGE,
    async (event, roomId: string, message: MessageContent): Promise<MessageIPCResponse<void>> => {
      try {
        await messageStore.saveMessage(roomId, message);
        
        // 通知渲染进程消息已保存
        mainWindow.webContents.send('message:saved', { roomId, message });
        
        return { success: true };
      } catch (error: any) {
        return { 
          success: false, 
          error: error.message || '保存消息失败' 
        };
      }
    }
  );

  // 批量保存消息
  ipcMain.handle(
    MESSAGE_IPC_CHANNELS.SAVE_MESSAGES,
    async (event, roomId: string, messages: MessageContent[]): Promise<MessageIPCResponse<void>> => {
      try {
        await messageStore.saveMessages(roomId, messages);
        return { success: true };
      } catch (error: any) {
        return { 
          success: false, 
          error: error.message || '批量保存消息失败' 
        };
      }
    }
  );

  // 删除消息
  ipcMain.handle(
    MESSAGE_IPC_CHANNELS.DELETE_MESSAGE,
    async (event, eventId: string): Promise<MessageIPCResponse<boolean>> => {
      try {
        const deleted = await messageStore.deleteMessage(eventId);
        return { success: true, data: deleted };
      } catch (error: any) {
        return { 
          success: false, 
          error: error.message || '删除消息失败' 
        };
      }
    }
  );

  // 删除房间所有消息
  ipcMain.handle(
    MESSAGE_IPC_CHANNELS.DELETE_ROOM_MESSAGES,
    async (event, roomId: string): Promise<MessageIPCResponse<number>> => {
      try {
        const count = await messageStore.deleteRoomMessages(roomId);
        return { success: true, data: count };
      } catch (error: any) {
        return { 
          success: false, 
          error: error.message || '删除房间消息失败' 
        };
      }
    }
  );

  // ========== 已读状态 ==========

  // 标记为已读
  ipcMain.handle(
    MESSAGE_IPC_CHANNELS.MARK_AS_READ,
    async (event, roomId: string, eventId: string): Promise<MessageIPCResponse<void>> => {
      try {
        await messageStore.markAsRead(roomId, eventId);
        return { success: true };
      } catch (error: any) {
        return { 
          success: false, 
          error: error.message || '标记已读失败' 
        };
      }
    }
  );

  // 获取未读消息数
  ipcMain.handle(
    MESSAGE_IPC_CHANNELS.GET_UNREAD_COUNT,
    async (event, roomId: string): Promise<MessageIPCResponse<number>> => {
      try {
        const count = await messageStore.getUnreadCount(roomId);
        return { success: true, data: count };
      } catch (error: any) {
        return { 
          success: false, 
          error: error.message || '获取未读数失败' 
        };
      }
    }
  );

  // 获取总未读消息数
  ipcMain.handle(
    MESSAGE_IPC_CHANNELS.GET_TOTAL_UNREAD,
    async (): Promise<MessageIPCResponse<number>> => {
      try {
        const count = await messageStore.getTotalUnreadCount();
        return { success: true, data: count };
      } catch (error: any) {
        return { 
          success: false, 
          error: error.message || '获取总未读数失败' 
        };
      }
    }
  );

  // ========== 统计 ==========

  // 获取房间数
  ipcMain.handle(
    MESSAGE_IPC_CHANNELS.GET_ROOM_COUNT,
    async (): Promise<MessageIPCResponse<number>> => {
      try {
        const count = await messageStore.getRoomCount();
        return { success: true, data: count };
      } catch (error: any) {
        return { 
          success: false, 
          error: error.message || '获取房间数失败' 
        };
      }
    }
  );

  // 获取消息总数
  ipcMain.handle(
    MESSAGE_IPC_CHANNELS.GET_MESSAGE_COUNT,
    async (): Promise<MessageIPCResponse<number>> => {
      try {
        const count = await messageStore.getMessageCount();
        return { success: true, data: count };
      } catch (error: any) {
        return { 
          success: false, 
          error: error.message || '获取消息总数失败' 
        };
      }
    }
  );

  // ========== 同步 ==========

  // 开始同步
  ipcMain.handle(
    MESSAGE_IPC_CHANNELS.START_SYNC,
    async (): Promise<MessageIPCResponse<void>> => {
      try {
        await syncManager.startSync();
        return { success: true };
      } catch (error: any) {
        return { 
          success: false, 
          error: error.message || '开始同步失败' 
        };
      }
    }
  );

  // 停止同步
  ipcMain.handle(
    MESSAGE_IPC_CHANNELS.STOP_SYNC,
    async (): Promise<MessageIPCResponse<void>> => {
      try {
        syncManager.stopSync();
        return { success: true };
      } catch (error: any) {
        return { 
          success: false, 
          error: error.message || '停止同步失败' 
        };
      }
    }
  );

  // 暂停同步
  ipcMain.handle(
    MESSAGE_IPC_CHANNELS.PAUSE_SYNC,
    async (): Promise<MessageIPCResponse<void>> => {
      try {
        syncManager.pauseSync();
        return { success: true };
      } catch (error: any) {
        return { 
          success: false, 
          error: error.message || '暂停同步失败' 
        };
      }
    }
  );

  // 恢复同步
  ipcMain.handle(
    MESSAGE_IPC_CHANNELS.RESUME_SYNC,
    async (): Promise<MessageIPCResponse<void>> => {
      try {
        syncManager.resumeSync();
        return { success: true };
      } catch (error: any) {
        return { 
          success: false, 
          error: error.message || '恢复同步失败' 
        };
      }
    }
  );

  // 获取同步进度
  ipcMain.handle(
    MESSAGE_IPC_CHANNELS.GET_SYNC_PROGRESS,
    async (): Promise<MessageIPCResponse<SyncProgress>> => {
      try {
        const progress = syncManager.getProgress();
        return { success: true, data: progress };
      } catch (error: any) {
        return { 
          success: false, 
          error: error.message || '获取同步进度失败' 
        };
      }
    }
  );

  // ========== 存储管理 ==========

  // 清空所有数据
  ipcMain.handle(
    MESSAGE_IPC_CHANNELS.CLEAR_ALL,
    async (): Promise<MessageIPCResponse<void>> => {
      try {
        await messageStore.clearAll();
        return { success: true };
      } catch (error: any) {
        return { 
          success: false, 
          error: error.message || '清空数据失败' 
        };
      }
    }
  );

  // ========== 主动推送事件 ==========

  // 同步进度更新
  syncManager.addSyncListener((progress: SyncProgress) => {
    mainWindow.webContents.send('sync:progress', progress);
  });

  // Matrix 新消息到达时保存到本地
  const matrixClient = require('./matrix-client').getMatrixClient();
  matrixClient.on('message', async (message: MessageContent) => {
    try {
      await messageStore.saveMessage(message.roomId, message);
      mainWindow.webContents.send('message:saved', { 
        roomId: message.roomId, 
        message 
      });
    } catch (error) {
      console.error('Failed to save incoming message:', error);
    }
  });
}

/**
 * 清理消息存储 IPC 处理器
 */
export function cleanupMessageIPC() {
  const messageStore = getMessageStore();
  const syncManager = getSyncManager();
  
  messageStore.close();
  syncManager.stopSync();
  
  Object.values(MESSAGE_IPC_CHANNELS).forEach(channel => {
    ipcMain.removeHandler(channel);
  });
}

export default registerMessageIPCHandlers;
