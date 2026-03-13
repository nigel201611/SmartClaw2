# Matrix SDK 集成指南 - Task 3.1

## 交付文件

| 文件 | 大小 | 说明 |
|------|------|------|
| `src/main/matrix-client.ts` | 12.0KB | Matrix 客户端封装类 |
| `src/main/matrix-ipc.ts` | 8.9KB | Matrix IPC 通信处理 |
| `src/renderer/hooks/useMatrix.ts` | 10.8KB | React Hook |

## 核心功能

### 1. Matrix 客户端封装 (`matrix-client.ts`)

**主要方法**:

```typescript
class MatrixClientWrapper {
  // 连接和认证
  async connect(homeserverUrl: string): Promise<void>
  async login(username: string, password: string): Promise<MatrixSession>
  async logout(): Promise<void>
  async restoreSession(session: MatrixSession): Promise<boolean>
  
  // 房间操作
  async getRooms(): Promise<RoomInfo[]>
  async getRoom(roomId: string): Promise<RoomInfo | null>
  async createRoom(options?: {...}): Promise<string>
  async joinRoom(roomIdOrAlias: string): Promise<RoomInfo>
  async leaveRoom(roomId: string): Promise<void>
  
  // 消息操作
  async sendMessage(roomId: string, text: string): Promise<string>
  async sendFormattedMessage(roomId: string, text: string, format: 'plain' | 'html'): Promise<string>
  async getRoomMessages(roomId: string, limit: number): Promise<MessageContent[]>
  
  // 事件监听
  on(event: string, callback: Function): void
  off(event: string, callback: Function): void
  
  // 状态
  isLoggedIn(): boolean
  getSession(): MatrixSession | null
  stopClient(): void
}
```

**事件类型**:
- `sync` - 同步状态变化
- `message` - 收到新消息
- `room` - 房间更新
- `error` - 错误
- `logged_out` - 会话登出

### 2. IPC 通信 (`matrix-ipc.ts`)

**IPC 通道**:

```typescript
const MATRIX_IPC_CHANNELS = {
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
  SUBSCRIBE_EVENTS: 'matrix:subscribe-events'
};
```

**主动推送事件**:
- `matrix:logged-in` - 登录成功
- `matrix:logged-out` - 登出
- `matrix:message` - 新消息
- `matrix:room` - 房间更新
- `matrix:sync` - 同步状态
- `matrix:error` - 错误

### 3. React Hook (`useMatrix.ts`)

**使用示例**:

```typescript
import { useMatrix } from './hooks/useMatrix';

function ChatApp() {
  const {
    isConnected,
    isLoggedIn,
    session,
    rooms,
    messages,
    connect,
    login,
    logout,
    sendMessage,
    getRooms,
    getRoomMessages,
    isLoading,
    error
  } = useMatrix({
    autoConnect: true,
    homeserverUrl: 'http://localhost:8008',
    onMessage: (message) => {
      console.log('New message:', message);
    }
  });

  if (!isLoggedIn) {
    return <LoginForm onLogin={login} />;
  }

  return (
    <div>
      <button onClick={logout}>登出</button>
      <RoomList rooms={rooms} />
      <MessageList messages={messages} />
      <MessageInput onSend={sendMessage} />
    </div>
  );
}
```

**返回值**:

```typescript
interface UseMatrixReturn {
  // 连接状态
  isConnected: boolean;
  isLoggedIn: boolean;
  session: MatrixSession | null;
  syncState: SyncState | null;
  
  // 数据
  rooms: RoomInfo[];
  currentRoom: RoomInfo | null;
  messages: MessageContent[];
  
  // 操作函数
  connect: (url: string) => Promise<boolean>;
  login: (username, password) => Promise<boolean>;
  logout: () => Promise<void>;
  sendMessage: (roomId, text) => Promise<boolean>;
  getRooms: () => Promise<RoomInfo[]>;
  getRoomMessages: (roomId, limit) => Promise<MessageContent[]>;
  createRoom: (options) => Promise<string>;
  joinRoom: (roomId) => Promise<RoomInfo>;
  leaveRoom: (roomId) => Promise<void>;
  
  // 状态
  isLoading: boolean;
  error: string | null;
}
```

## 集成步骤

### 1. 安装 matrix-js-sdk

```bash
npm install matrix-js-sdk
```

### 2. 在主进程中注册 IPC

```typescript
// src/main/main.ts
import { registerMatrixIPCHandlers, cleanupMatrixIPC } from './matrix-ipc';

app.whenReady().then(() => {
  const mainWindow = createMainWindow();
  
  // 注册 Matrix IPC
  registerMatrixIPCHandlers(mainWindow);
  
  // 注册其他 IPC...
});

app.on('will-quit', () => {
  // 清理 Matrix IPC
  cleanupMatrixIPC();
});
```

### 3. 在渲染进程中使用 Hook

```typescript
// src/renderer/App.tsx
import { useMatrix } from './hooks/useMatrix';

function App() {
  const { isLoggedIn, login, logout } = useMatrix();
  
  return (
    <div>
      {isLoggedIn ? (
        <button onClick={logout}>登出</button>
      ) : (
        <LoginForm onLogin={login} />
      )}
    </div>
  );
}
```

## 数据接口

### MatrixSession

```typescript
interface MatrixSession {
  userId: string;          // 用户 ID，如 @user:localhost
  deviceId: string;        // 设备 ID
  accessToken: string;     // 访问令牌
  homeserverUrl: string;   // 服务器 URL
}
```

### MessageContent

```typescript
interface MessageContent {
  roomId: string;
  eventId: string;
  sender: string;
  timestamp: number;
  content: {
    msgtype: string;       // 如 m.text
    body: string;          // 消息内容
    formatted_body?: string; // 格式化内容（HTML）
  };
  type: string;
}
```

### RoomInfo

```typescript
interface RoomInfo {
  roomId: string;
  name: string;
  topic?: string;
  members: number;
  isDirect: boolean;       // 是否为私聊
  lastMessage?: MessageContent;
}
```

## 典型使用场景

### 场景 1: 首次登录

```typescript
const { connect, login } = useMatrix();

// 1. 连接服务器
await connect('http://localhost:8008');

// 2. 登录
const success = await login('username', 'password');

if (success) {
  // 保存会话到本地存储
  const session = getSession();
  localStorage.setItem('matrix_session', JSON.stringify(session));
}
```

### 场景 2: 恢复会话

```typescript
const { restoreSession } = useMatrix();

// 从本地存储加载会话
const saved = localStorage.getItem('matrix_session');
if (saved) {
  const session = JSON.parse(saved);
  const success = await restoreSession(session);
  
  if (success) {
    // 会话恢复成功
  } else {
    // 会话失效，需要重新登录
    localStorage.removeItem('matrix_session');
  }
}
```

### 场景 3: 发送消息

```typescript
const { sendMessage } = useMatrix();

// 发送文本消息
const success = await sendMessage('!roomid:localhost', 'Hello, World!');

if (success) {
  console.log('消息发送成功');
}
```

### 场景 4: 监听新消息

```typescript
const { onMessage } = useMatrix({
  onMessage: (message) => {
    console.log('收到新消息:', {
      from: message.sender,
      content: message.content.body,
      time: new Date(message.timestamp)
    });
  }
});
```

## 错误处理

### 常见错误

| 错误 | 原因 | 解决方案 |
|------|------|----------|
| 无法连接到 Matrix 服务器 | Conduit 容器未启动 | 检查容器状态并启动 |
| 用户名或密码错误 | 凭据错误 | 提示用户重新输入 |
| 账户已被禁用 | 账户问题 | 联系管理员 |
| 房间不存在 | 无效的 roomId | 检查房间 ID 格式 |
| 无权限 | 未加入房间 | 先加入房间 |

### 错误处理示例

```typescript
try {
  const success = await login(username, password);
  if (!success) {
    // 显示错误消息
    showError(error);
  }
} catch (err: any) {
  if (err.message.includes('用户名或密码错误')) {
    showLoginForm();
  } else if (err.message.includes('无法连接')) {
    showServerUnavailable();
  } else {
    showGenericError(err.message);
  }
}
```

## 最佳实践

1. **会话持久化**: 登录成功后保存 session 到安全存储
2. **自动恢复**: 应用启动时尝试恢复会话
3. **错误重试**: 网络错误时提供重试机制
4. **加载状态**: 异步操作时显示加载指示器
5. **消息队列**: 离线时缓存消息，上线后发送

## 下一步 (Task 3.2-3.4)

- [ ] Task 3.2: Chat UI Components (聊天界面组件)
- [ ] Task 3.3: Message Sync & Storage (消息同步和持久化)
- [ ] Task 3.4: User Authentication (用户认证流程)

---

**Task 3.1: 完成** ✅
