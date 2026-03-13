/**
 * SmartClaw Message Store
 * 
 * 本地消息存储（使用 SQLite）
 * 支持离线消息缓存和持久化
 */

import Database from 'better-sqlite3';
import * as path from 'path';
import { app } from 'electron';
import { MessageContent } from '../renderer/hooks/useMatrix';

/**
 * 本地消息记录
 */
interface LocalMessage {
  id: number;
  event_id: string;
  room_id: string;
  sender: string;
  timestamp: number;
  msgtype: string;
  body: string;
  formatted_body: string | null;
  is_own: boolean;
  is_read: boolean;
  created_at: string;
}

/**
 * 房间阅读进度
 */
interface RoomReadReceipt {
  room_id: string;
  last_read_event_id: string;
  last_read_ts: number;
}

/**
 * 消息存储类
 */
export class MessageStore {
  private db: Database.Database | null = null;
  private dbPath: string;

  constructor() {
    const userDataPath = app.getPath('userData');
    this.dbPath = path.join(userDataPath, 'messages.db');
  }

  /**
   * 初始化数据库
   */
  async initialize(): Promise<void> {
    try {
      this.db = new Database(this.dbPath);
      
      // 启用 WAL 模式（更好的并发性能）
      this.db.pragma('journal_mode = WAL');
      
      // 创建表
      this.createTables();
      
      console.log('Message store initialized:', this.dbPath);
    } catch (error: any) {
      console.error('Failed to initialize message store:', error);
      throw new Error(`数据库初始化失败：${error.message}`);
    }
  }

  /**
   * 创建数据库表
   */
  private createTables(): void {
    if (!this.db) return;

    // 消息表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_id TEXT UNIQUE NOT NULL,
        room_id TEXT NOT NULL,
        sender TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        msgtype TEXT NOT NULL,
        body TEXT NOT NULL,
        formatted_body TEXT,
        is_own BOOLEAN DEFAULT 0,
        is_read BOOLEAN DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 创建索引
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_messages_room_id ON messages(room_id);
      CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp);
      CREATE INDEX IF NOT EXISTS idx_messages_event_id ON messages(event_id);
      CREATE INDEX IF NOT EXISTS idx_messages_room_timestamp ON messages(room_id, timestamp);
    `);

    // 房间阅读进度表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS room_read_receipts (
        room_id TEXT PRIMARY KEY,
        last_read_event_id TEXT NOT NULL,
        last_read_ts INTEGER NOT NULL
      )
    `);

    // 同步元数据表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sync_metadata (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      )
    `);
  }

  /**
   * 保存消息
   */
  async saveMessage(roomId: string, message: MessageContent): Promise<void> {
    if (!this.db) {
      throw new Error('数据库未初始化');
    }

    try {
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO messages 
        (event_id, room_id, sender, timestamp, msgtype, body, formatted_body, is_own, is_read)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        message.eventId,
        roomId,
        message.sender,
        message.timestamp,
        message.content.msgtype,
        message.content.body,
        message.content.formatted_body || null,
        0, // is_own 由客户端判断
        0  // 默认未读
      );

      console.log('Message saved:', message.eventId);
    } catch (error: any) {
      console.error('Failed to save message:', error);
      throw new Error(`保存消息失败：${error.message}`);
    }
  }

  /**
   * 批量保存消息
   */
  async saveMessages(roomId: string, messages: MessageContent[]): Promise<void> {
    if (!this.db) {
      throw new Error('数据库未初始化');
    }

    const transaction = this.db.transaction((msgs: MessageContent[]) => {
      const stmt = this.db!.prepare(`
        INSERT OR REPLACE INTO messages 
        (event_id, room_id, sender, timestamp, msgtype, body, formatted_body, is_own, is_read)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const msg of msgs) {
        stmt.run(
          msg.eventId,
          roomId,
          msg.sender,
          msg.timestamp,
          msg.content.msgtype,
          msg.content.body,
          msg.content.formatted_body || null,
          0,
          0
        );
      }
    });

    try {
      transaction(messages);
      console.log(`Saved ${messages.length} messages for room ${roomId}`);
    } catch (error: any) {
      console.error('Failed to save messages:', error);
      throw new Error(`批量保存消息失败：${error.message}`);
    }
  }

  /**
   * 获取房间消息
   */
  async getMessages(roomId: string, limit: number = 50): Promise<MessageContent[]> {
    if (!this.db) {
      throw new Error('数据库未初始化');
    }

    try {
      const stmt = this.db.prepare(`
        SELECT * FROM messages 
        WHERE room_id = ?
        ORDER BY timestamp DESC
        LIMIT ?
      `);

      const rows = stmt.all(roomId, limit) as LocalMessage[];

      // 转换为 MessageContent 格式并反转（最新消息在前）
      return rows
        .map(row => this.localMessageToMessageContent(row))
        .reverse();
    } catch (error: any) {
      console.error('Failed to get messages:', error);
      throw new Error(`获取消息失败：${error.message}`);
    }
  }

  /**
   * 获取消息（按事件 ID）
   */
  async getMessage(eventId: string): Promise<MessageContent | null> {
    if (!this.db) {
      throw new Error('数据库未初始化');
    }

    try {
      const stmt = this.db.prepare('SELECT * FROM messages WHERE event_id = ?');
      const row = stmt.get(eventId) as LocalMessage | undefined;

      if (!row) return null;

      return this.localMessageToMessageContent(row);
    } catch (error: any) {
      console.error('Failed to get message:', error);
      return null;
    }
  }

  /**
   * 删除消息
   */
  async deleteMessage(eventId: string): Promise<boolean> {
    if (!this.db) {
      throw new Error('数据库未初始化');
    }

    try {
      const stmt = this.db.prepare('DELETE FROM messages WHERE event_id = ?');
      const result = stmt.run(eventId);
      return result.changes > 0;
    } catch (error: any) {
      console.error('Failed to delete message:', error);
      return false;
    }
  }

  /**
   * 删除房间所有消息
   */
  async deleteRoomMessages(roomId: string): Promise<number> {
    if (!this.db) {
      throw new Error('数据库未初始化');
    }

    try {
      const stmt = this.db.prepare('DELETE FROM messages WHERE room_id = ?');
      const result = stmt.run(roomId);
      return result.changes;
    } catch (error: any) {
      console.error('Failed to delete room messages:', error);
      return 0;
    }
  }

  /**
   * 标记消息为已读
   */
  async markAsRead(roomId: string, eventId: string): Promise<void> {
    if (!this.db) {
      throw new Error('数据库未初始化');
    }

    try {
      const transaction = this.db.transaction(() => {
        // 更新消息已读状态
        const updateStmt = this.db!.prepare(`
          UPDATE messages SET is_read = 1 WHERE room_id = ? AND timestamp <= (
            SELECT timestamp FROM messages WHERE event_id = ?
          )
        `);
        updateStmt.run(roomId, eventId);

        // 更新房间阅读进度
        const upsertStmt = this.db!.prepare(`
          INSERT OR REPLACE INTO room_read_receipts (room_id, last_read_event_id, last_read_ts)
          VALUES (?, ?, (SELECT timestamp FROM messages WHERE event_id = ?))
        `);
        upsertStmt.run(roomId, eventId, eventId);
      });

      transaction();
      console.log('Messages marked as read:', roomId, eventId);
    } catch (error: any) {
      console.error('Failed to mark messages as read:', error);
      throw new Error(`标记已读失败：${error.message}`);
    }
  }

  /**
   * 获取房间未读消息数
   */
  async getUnreadCount(roomId: string): Promise<number> {
    if (!this.db) {
      throw new Error('数据库未初始化');
    }

    try {
      const stmt = this.db.prepare(`
        SELECT COUNT(*) as count FROM messages 
        WHERE room_id = ? AND is_read = 0
      `);
      const result = stmt.get(roomId) as { count: number };
      return result.count;
    } catch (error: any) {
      console.error('Failed to get unread count:', error);
      return 0;
    }
  }

  /**
   * 获取所有房间未读消息总数
   */
  async getTotalUnreadCount(): Promise<number> {
    if (!this.db) {
      throw new Error('数据库未初始化');
    }

    try {
      const stmt = this.db.prepare('SELECT COUNT(*) as count FROM messages WHERE is_read = 0');
      const result = stmt.get() as { count: number };
      return result.count;
    } catch (error: any) {
      console.error('Failed to get total unread count:', error);
      return 0;
    }
  }

  /**
   * 获取同步元数据
   */
  async getSyncMetadata(key: string): Promise<string | null> {
    if (!this.db) {
      throw new Error('数据库未初始化');
    }

    try {
      const stmt = this.db.prepare('SELECT value FROM sync_metadata WHERE key = ?');
      const row = stmt.get(key) as { value: string } | undefined;
      return row ? row.value : null;
    } catch (error: any) {
      console.error('Failed to get sync metadata:', error);
      return null;
    }
  }

  /**
   * 保存同步元数据
   */
  async saveSyncMetadata(key: string, value: string): Promise<void> {
    if (!this.db) {
      throw new Error('数据库未初始化');
    }

    try {
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO sync_metadata (key, value)
        VALUES (?, ?)
      `);
      stmt.run(key, value);
    } catch (error: any) {
      console.error('Failed to save sync metadata:', error);
      throw new Error(`保存同步元数据失败：${error.message}`);
    }
  }

  /**
   * 获取房间总数
   */
  async getRoomCount(): Promise<number> {
    if (!this.db) {
      throw new Error('数据库未初始化');
    }

    try {
      const stmt = this.db.prepare('SELECT COUNT(DISTINCT room_id) as count FROM messages');
      const result = stmt.get() as { count: number };
      return result.count;
    } catch (error: any) {
      console.error('Failed to get room count:', error);
      return 0;
    }
  }

  /**
   * 获取消息总数
   */
  async getMessageCount(): Promise<number> {
    if (!this.db) {
      throw new Error('数据库未初始化');
    }

    try {
      const stmt = this.db.prepare('SELECT COUNT(*) as count FROM messages');
      const result = stmt.get() as { count: number };
      return result.count;
    } catch (error: any) {
      console.error('Failed to get message count:', error);
      return 0;
    }
  }

  /**
   * 清空所有数据
   */
  async clearAll(): Promise<void> {
    if (!this.db) {
      throw new Error('数据库未初始化');
    }

    try {
      this.db.exec('DELETE FROM messages');
      this.db.exec('DELETE FROM room_read_receipts');
      this.db.exec('DELETE FROM sync_metadata');
      console.log('Message store cleared');
    } catch (error: any) {
      console.error('Failed to clear message store:', error);
      throw new Error(`清空数据失败：${error.message}`);
    }
  }

  /**
   * 关闭数据库
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
      console.log('Message store closed');
    }
  }

  /**
   * 本地消息转换为 MessageContent
   */
  private localMessageToMessageContent(row: LocalMessage): MessageContent {
    return {
      roomId: row.room_id,
      eventId: row.event_id,
      sender: row.sender,
      timestamp: row.timestamp,
      content: {
        msgtype: row.msgtype,
        body: row.body,
        formatted_body: row.formatted_body || undefined
      },
      type: 'm.room.message'
    };
  }
}

// 单例实例
let messageStoreInstance: MessageStore | null = null;

/**
 * 获取消息存储单例
 */
export function getMessageStore(): MessageStore {
  if (!messageStoreInstance) {
    messageStoreInstance = new MessageStore();
  }
  return messageStoreInstance;
}

export default MessageStore;
