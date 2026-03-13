/**
 * SmartClaw Sync Manager
 * 
 * Matrix 同步管理器
 * 处理增量同步、冲突解决、离线缓存
 */

import { getMatrixClient, MatrixClientWrapper } from './matrix-client';
import { getMessageStore, MessageStore } from './message-store';
import { MessageContent } from '../renderer/hooks/useMatrix';

/**
 * 同步状态
 */
export type SyncStatus = 
  | 'idle'           // 空闲
  | 'syncing'        // 同步中
  | 'error'          // 错误
  | 'paused'         // 暂停
  | 'stopped';       // 已停止

/**
 * 同步进度
 */
export interface SyncProgress {
  status: SyncStatus;
  roomsSynced: number;
  messagesSynced: number;
  lastSyncTime: number | null;
  error: string | null;
}

/**
 * 同步管理器
 */
export class SyncManager {
  private matrixClient: MatrixClientWrapper;
  private messageStore: MessageStore;
  private syncInterval: NodeJS.Timeout | null = null;
  private isSyncing: boolean = false;
  private progress: SyncProgress = {
    status: 'idle',
    roomsSynced: 0,
    messagesSynced: 0,
    lastSyncTime: null,
    error: null
  };
  private syncListeners: Set<(progress: SyncProgress) => void> = new Set();

  constructor() {
    this.matrixClient = getMatrixClient();
    this.messageStore = getMessageStore();
  }

  /**
   * 开始同步
   */
  async startSync(): Promise<void> {
    if (this.isSyncing) {
      console.log('Sync already in progress');
      return;
    }

    try {
      this.isSyncing = true;
      this.updateProgress({ status: 'syncing', error: null });

      console.log('Starting Matrix sync...');

      // 获取上次同步的 token
      const lastToken = await this.messageStore.getSyncMetadata('last_sync_token');

      // 开始同步（增量或全量）
      await this.performSync(lastToken);

      // 设置定期同步（每 5 分钟）
      this.syncInterval = setInterval(() => {
        this.performIncrementalSync();
      }, 5 * 60 * 1000);

      this.updateProgress({ 
        status: 'idle', 
        lastSyncTime: Date.now() 
      });

      console.log('Matrix sync started successfully');
    } catch (error: any) {
      console.error('Failed to start sync:', error);
      this.updateProgress({ 
        status: 'error', 
        error: error.message 
      });
      throw error;
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * 停止同步
   */
  stopSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    
    this.updateProgress({ status: 'stopped' });
    console.log('Sync stopped');
  }

  /**
   * 暂停同步
   */
  pauseSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    
    this.updateProgress({ status: 'paused' });
    console.log('Sync paused');
  }

  /**
   * 恢复同步
   */
  resumeSync(): void {
    if (this.progress.status === 'paused') {
      this.syncInterval = setInterval(() => {
        this.performIncrementalSync();
      }, 5 * 60 * 1000);
      
      this.updateProgress({ status: 'idle' });
      console.log('Sync resumed');
    }
  }

  /**
   * 执行同步
   */
  private async performSync(lastToken: string | null): Promise<void> {
    const client = this.matrixClient.getClient();
    if (!client) {
      throw new Error('Matrix client not initialized');
    }

    let syncedRooms = 0;
    let syncedMessages = 0;

    // 获取所有房间
    const rooms = await this.matrixClient.getRooms();
    
    for (const room of rooms) {
      try {
        // 获取房间消息历史
        const messages = await this.matrixClient.getRoomMessages(room.roomId, 100);
        
        // 保存到本地存储
        await this.messageStore.saveMessages(room.roomId, messages);
        
        syncedRooms++;
        syncedMessages += messages.length;

        this.updateProgress({
          roomsSynced: syncedRooms,
          messagesSynced: syncedMessages
        });

        console.log(`Synced room ${room.roomId}: ${messages.length} messages`);
      } catch (error) {
        console.error(`Failed to sync room ${room.roomId}:`, error);
        // 继续同步其他房间
      }
    }

    // 保存同步 token（简化处理，实际应从 Matrix 响应获取）
    await this.messageStore.saveSyncMetadata('last_sync_token', Date.now().toString());
    await this.messageStore.saveSyncMetadata('last_sync_time', Date.now().toString());

    console.log(`Sync complete: ${syncedRooms} rooms, ${syncedMessages} messages`);
  }

  /**
   * 执行增量同步
   */
  private async performIncrementalSync(): Promise<void> {
    if (this.isSyncing) {
      console.log('Sync already in progress, skipping');
      return;
    }

    try {
      this.isSyncing = true;
      this.updateProgress({ status: 'syncing', error: null });

      // 增量同步逻辑
      // 实际实现需要监听 Matrix 的 sync 事件
      // 这里简化处理：只同步最近的消息
      
      const rooms = await this.matrixClient.getRooms();
      let newMessages = 0;

      for (const room of rooms) {
        // 获取最近 50 条消息（与本地比较）
        const messages = await this.matrixClient.getRoomMessages(room.roomId, 50);
        
        // 检查是否有新消息
        const lastLocalMessage = await this.messageStore.getMessages(room.roomId, 1);
        
        if (lastLocalMessage.length === 0 || 
            messages[messages.length - 1]?.timestamp > lastLocalMessage[0]?.timestamp) {
          await this.messageStore.saveMessages(room.roomId, messages);
          newMessages += messages.length;
        }
      }

      this.updateProgress({ 
        status: 'idle', 
        lastSyncTime: Date.now() 
      });

      if (newMessages > 0) {
        console.log(`Incremental sync: ${newMessages} new messages`);
      }
    } catch (error: any) {
      console.error('Incremental sync failed:', error);
      this.updateProgress({ 
        status: 'error', 
        error: error.message 
      });
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * 处理同步增量（Delta）
   */
  async handleDelta(delta: any): Promise<void> {
    try {
      // 处理房间增量
      if (delta.rooms?.join) {
        for (const [roomId, roomDelta] of Object.entries(delta.rooms.join)) {
          await this.handleRoomDelta(roomId, roomDelta as any);
        }
      }

      // 处理房间离开
      if (delta.rooms?.leave) {
        for (const [roomId] of Object.entries(delta.rooms.leave)) {
          console.log('User left room:', roomId);
          // 可选：清理本地数据或保留历史记录
        }
      }
    } catch (error) {
      console.error('Failed to handle delta:', error);
    }
  }

  /**
   * 处理房间增量
   */
  private async handleRoomDelta(roomId: string, delta: any): Promise<void> {
    // 处理新消息
    if (delta.timeline?.events) {
      for (const event of delta.timeline.events) {
        if (event.type === 'm.room.message') {
          const message = this.parseMatrixEvent(event, roomId);
          await this.messageStore.saveMessage(roomId, message);
        }
      }
    }

    // 处理已读回执
    if (delta.ephemeral?.events) {
      for (const event of delta.ephemeral.events) {
        if (event.type === 'm.receipt') {
          await this.handleReadReceipt(roomId, event);
        }
      }
    }

    // 处理输入状态
    if (delta.ephemeral?.events) {
      for (const event of delta.ephemeral.events) {
        if (event.type === 'm.typing') {
          // 触发输入状态事件
          this.emitTyping(roomId, event.content.user_ids);
        }
      }
    }
  }

  /**
   * 处理已读回执
   */
  private async handleReadReceipt(roomId: string, event: any): Promise<void> {
    // 简化处理：标记所有消息为已读
    const userIds = Object.keys(event.content || {});
    for (const userId of userIds) {
      const receipt = event.content[userId];
      if (receipt?.m?.fully_read) {
        const eventId = receipt.m.fully_read.event_id;
        await this.messageStore.markAsRead(roomId, eventId);
      }
    }
  }

  /**
   * 解析 Matrix 事件
   */
  private parseMatrixEvent(event: any, roomId: string): MessageContent {
    return {
      roomId,
      eventId: event.event_id,
      sender: event.sender,
      timestamp: event.origin_server_ts,
      content: {
        msgtype: event.content.msgtype,
        body: event.content.body,
        formatted_body: event.content.formatted_body
      },
      type: event.type
    };
  }

  /**
   * 触发输入状态事件
   */
  private emitTyping(roomId: string, userIds: string[]): void {
    // 通知监听器
    this.syncListeners.forEach(listener => {
      try {
        listener({
          ...this.progress,
          status: 'syncing'
        });
      } catch (error) {
        console.error('Error in sync listener:', error);
      }
    });
  }

  /**
   * 添加同步监听器
   */
  addSyncListener(listener: (progress: SyncProgress) => void): void {
    this.syncListeners.add(listener);
  }

  /**
   * 移除同步监听器
   */
  removeSyncListener(listener: (progress: SyncProgress) => void): void {
    this.syncListeners.delete(listener);
  }

  /**
   * 获取当前同步进度
   */
  getProgress(): SyncProgress {
    return { ...this.progress };
  }

  /**
   * 更新进度并通知监听器
   */
  private updateProgress(partial: Partial<SyncProgress>): void {
    this.progress = { ...this.progress, ...partial };
    
    this.syncListeners.forEach(listener => {
      try {
        listener(this.progress);
      } catch (error) {
        console.error('Error in sync listener:', error);
      }
    });
  }

  /**
   * 冲突解决策略
   */
  private resolveConflict(
    localMessage: MessageContent,
    remoteMessage: MessageContent
  ): MessageContent {
    // 简单策略：使用时间戳，新的覆盖旧的
    if (remoteMessage.timestamp > localMessage.timestamp) {
      return remoteMessage;
    } else if (remoteMessage.timestamp < localMessage.timestamp) {
      return localMessage;
    } else {
      // 时间戳相同，优先保留本地消息
      return localMessage;
    }
  }
}

// 单例实例
let syncManagerInstance: SyncManager | null = null;

/**
 * 获取同步管理器单例
 */
export function getSyncManager(): SyncManager {
  if (!syncManagerInstance) {
    syncManagerInstance = new SyncManager();
  }
  return syncManagerInstance;
}

export default SyncManager;
