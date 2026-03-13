# Message Sync & Storage - Task 3.3 完成报告

## 交付文件

| 文件 | 大小 | 说明 |
|------|------|------|
| `message-store.ts` | 11.7KB | SQLite 消息存储 |
| `sync-manager.ts` | 9.8KB | 同步管理器 |
| `message-ipc.ts` | 9.5KB | IPC 通信处理 |

## 核心功能

### 1. MessageStore (message-store.ts)

**数据库**: SQLite (better-sqlite3)

**数据表**:
```sql
-- 消息表
CREATE TABLE messages (
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
);

-- 房间阅读进度表
CREATE TABLE room_read_receipts (
  room_id TEXT PRIMARY KEY,
  last_read_event_id TEXT NOT NULL,
  last_read_ts INTEGER NOT NULL
);

-- 同步元数据表
CREATE TABLE sync_metadata (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
```

**主要方法**:
```typescript
class MessageStore {
  // 初始化
  async initialize(): Promise<void>
  
  // 消息操作
  async saveMessage(roomId: string, message: MessageContent): Promise<void>
  async saveMessages(roomId: string, messages: MessageContent[]): Promise<void>
  async getMessages(roomId: string, limit: number): Promise<MessageContent[]>
  async getMessage(eventId: string): Promise<MessageContent | null>
  async deleteMessage(eventId: string): Promise<boolean>
  async deleteRoomMessages(roomId: string): Promise<number>
  
  // 已读状态
  async markAsRead(roomId: string, eventId: string): Promise<void>
  async getUnreadCount(roomId: string): Promise<number>
  async getTotalUnreadCount(): Promise<number>
  
  // 同步元数据
  async getSyncMetadata(key: string): Promise<string | null>
  async saveSyncMetadata(key: string, value: string): Promise<void>
  
  // 统计
  async getRoomCount(): Promise<number>
  async getMessageCount(): Promise<number>
  
  // 管理
  async clearAll(): Promise<void>
  close(): void
}
```

**特性**:
- ✅ WAL 模式（更好的并发性能）
- ✅ 索引优化（房间 ID/时间戳/事件 ID）
- ✅ 事务支持（批量操作）
- ✅ 自动创建表结构

### 2. SyncManager (sync-manager.ts)

**同步状态**:
```typescript
type SyncStatus = 
  | 'idle'      // 空闲
  | 'syncing'   // 同步中
  | 'error'     // 错误
  | 'paused'    // 暂停
  | 'stopped';  // 已停止
```

**主要方法**:
```typescript
class SyncManager {
  // 同步控制
  async startSync(): Promise<void>
  stopSync(): void
  pauseSync(): void
  resumeSync(): void
  
  // 同步执行
  private async performSync(lastToken: string | null): Promise<void>
  private async performIncrementalSync(): Promise<void>
  async handleDelta(delta: any): Promise<void>
  
  // 事件处理
  private async handleRoomDelta(roomId: string, delta: any): Promise<void>
  private async handleReadReceipt(roomId: string, event: any): Promise<void>
  
  // 监听器
  addSyncListener(listener: (progress: SyncProgress) => void): void
  removeSyncListener(listener: (progress: SyncProgress) => void): void
  
  // 状态
  getProgress(): SyncProgress
}
```

**同步策略**:

1. **首次同步（全量）**:
   - 获取所有房间
   - 每个房间获取最近 100 条消息
   - 保存到本地存储
   - 记录同步 token

2. **增量同步（定期）**:
   - 每 5 分钟执行一次
   - 只获取最近 50 条消息
   - 与本地比较，只保存新消息
   - 更新同步时间

3. **实时同步（Delta 处理）**:
   - 监听 Matrix sync 事件
   - 处理房间增量
   - 处理已读回执
   - 处理输入状态

**冲突解决**:
```typescript
// 策略：时间戳优先，新的覆盖旧的
resolveConflict(local, remote) {
  if (remote.timestamp > local.timestamp) {
    return remote;
  } else if (remote.timestamp < local.timestamp) {
    return local;
  } else {
    return local; // 时间戳相同，优先本地
  }
}
```

### 3. Message IPC (message-ipc.ts)

**IPC 通道** (20 个):

```typescript
const MESSAGE_IPC_CHANNELS = {
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
};
```

**主动推送事件**:
- `sync:progress` - 同步进度更新
- `message:saved` - 消息已保存

## 使用示例

### 主进程集成

```typescript
// src/main/main.ts
import { registerMessageIPCHandlers, cleanupMessageIPC } from './message-ipc';

app.whenReady().then(() => {
  const mainWindow = createMainWindow();
  
  // 注册消息存储 IPC
  registerMessageIPCHandlers(mainWindow);
  
  // 注册其他 IPC...
});

app.on('will-quit', () => {
  // 清理资源
  cleanupMessageIPC();
});
```

### 渲染进程使用

```typescript
// 获取消息
const messages = await ipcRenderer.invoke(
  'message:get-messages',
  '!roomId:localhost',
  50
);

// 保存消息
await ipcRenderer.invoke(
  'message:save-message',
  '!roomId:localhost',
  messageContent
);

// 标记已读
await ipcRenderer.invoke(
  'message:mark-as-read',
  '!roomId:localhost',
  '$eventId'
);

// 获取未读数
const unreadCount = await ipcRenderer.invoke(
  'message:get-unread-count',
  '!roomId:localhost'
);

// 开始同步
await ipcRenderer.invoke('sync:start');

// 监听同步进度
ipcRenderer.on('sync:progress', (event, progress) => {
  console.log('Sync progress:', progress);
});
```

## 数据存储位置

```
~/.smartclaw/
└── messages.db        # SQLite 数据库
    ├── messages       # 消息表
    ├── room_read_receipts  # 阅读进度表
    └── sync_metadata  # 同步元数据表
```

## 性能优化

### 索引

```sql
CREATE INDEX idx_messages_room_id ON messages(room_id);
CREATE INDEX idx_messages_timestamp ON messages(timestamp);
CREATE INDEX idx_messages_event_id ON messages(event_id);
CREATE INDEX idx_messages_room_timestamp ON messages(room_id, timestamp);
```

### WAL 模式

```typescript
db.pragma('journal_mode = WAL');
```

优势:
- 更好的并发读写性能
- 减少锁竞争
- 适合聊天应用的多房间场景

### 批量操作

```typescript
// 使用事务批量保存
const transaction = db.transaction((messages) => {
  for (const msg of messages) {
    stmt.run(/* ... */);
  }
});
transaction(messagesArray);
```

## 离线支持

### 启动流程

```
1. 应用启动
   ↓
2. 检查本地存储
   ↓
3. 有数据 → 立即显示（离线模式）
   ↓
4. 后台启动同步
   ↓
5. 增量更新消息
```

### 数据持久化

- 消息永久存储（除非用户清除）
- 阅读进度持久化
- 同步元数据持久化

## 待实现功能

以下功能已预留接口，需要后续完善：

1. **附件存储**
   - 图片/视频/文件本地缓存
   - 需要额外的文件存储表

2. **加密存储**
   - 敏感消息加密
   - 需要密钥管理

3. **数据导出**
   - 导出聊天记录
   - JSON/HTML 格式

4. **高级搜索**
   - 全文搜索
   - 需要 FTS5 扩展

## 下一步 (Task 3.4)

- [ ] Task 3.4: User Authentication (用户认证流程)
  - 登录/注册界面
  - 会话管理
  - 密码重置

---

**Task 3.3: 完成** ✅

**Phase 3 进度**: 3 of 4 任务完成 (75%)
