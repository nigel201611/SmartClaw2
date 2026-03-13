# Docker 检测模块使用文档

## 文件结构

```
src/
├── main/
│   ├── docker-detector.ts    # Docker 环境检测核心逻辑
│   ├── docker-manager.ts     # Docker 容器生命周期管理
│   └── docker-ipc.ts         # Electron IPC 通信处理
└── renderer/
    ├── hooks/
    │   └── useDocker.ts      # React Hook
    └── components/
        └── DockerDetection.tsx  # UI 组件
```

## 模块说明

### 1. docker-detector.ts (主进程)

**功能**: 检测系统 Docker 环境状态

**核心类**: `DockerDetector`

**主要方法**:
```typescript
// 完整检测
async detectDocker(): Promise<DockerStatus>

// 快速可用性检查
async isDockerAvailable(): Promise<boolean>

// 获取安装引导链接
getInstallGuide(): { url: string; title: string }

// 获取友好错误消息
getFriendlyErrorMessage(status: DockerStatus): {...}
```

**检测流程**:
1. 检查 `docker --version` 命令
2. 检测 Docker Desktop 是否运行 (macOS/Windows)
3. 检查 Docker Daemon 状态 (`docker info`)
4. 验证用户权限 (`docker run --rm hello-world`)

### 2. docker-manager.ts (主进程)

**功能**: 管理 Conduit 容器生命周期

**核心类**: `DockerManager`

**主要方法**:
```typescript
// 容器控制
async startContainer(): Promise<{success, error}>
async stopContainer(): Promise<{success, error}>
async restartContainer(): Promise<{success, error}>
async removeContainer(): Promise<{success, error}>

// 状态查询
async getContainerInfo(): Promise<ContainerInfo | null>
async getHealthStatus(): Promise<HealthCheckResult>
async containerExists(): Promise<boolean>

// 日志
async getLogs(options?: {tail, since, follow}): Promise<string>

// 镜像
async pullLatestImage(): Promise<{success, error}>
```

**配置选项**:
```typescript
interface DockerManagerConfig {
  containerName: string;        // 默认：'smartclaw-matrix'
  composeFilePath: string;      // 默认：'./docker-compose.yml'
  envFilePath?: string;
  healthCheckTimeout: number;   // 默认：5000ms
  startupTimeout: number;       // 默认：60000ms
  stopGracePeriod: number;      // 默认：30s
}
```

### 3. docker-ipc.ts (主进程)

**功能**: 注册 IPC 处理器，供渲染进程调用

**IPC 通道**:
```typescript
const DOCKER_IPC_CHANNELS = {
  DETECT_DOCKER: 'docker:detect',
  IS_DOCKER_AVAILABLE: 'docker:is-available',
  START_CONTAINER: 'docker:start',
  STOP_CONTAINER: 'docker:stop',
  RESTART_CONTAINER: 'docker:restart',
  GET_CONTAINER_INFO: 'docker:container-info',
  GET_HEALTH_STATUS: 'docker:health-status',
  GET_LOGS: 'docker:logs',
  PULL_LATEST: 'docker:pull-latest'
};
```

**使用方法**:
```typescript
// main.ts
import { registerDockerIPCHandlers } from './main/docker-ipc';

app.whenReady().then(() => {
  const mainWindow = new BrowserWindow({...});
  registerDockerIPCHandlers(mainWindow);
});

// 清理（应用退出时）
import { cleanupDockerIPC } from './main/docker-ipc';
app.on('will-quit', cleanupDockerIPC);
```

### 4. useDocker.ts (渲染进程)

**功能**: React Hook，简化 Docker 操作

**使用示例**:
```typescript
import { useDocker } from './hooks/useDocker';

function MyComponent() {
  const {
    dockerStatus,
    containerRunning,
    detectDocker,
    startContainer,
    stopContainer,
    isLoading,
    error
  } = useDocker(true); // true = 自动检测

  return (
    <div>
      {dockerStatus?.available ? (
        <p>Docker 已就绪</p>
      ) : (
        <button onClick={detectDocker}>检测 Docker</button>
      )}
    </div>
  );
}
```

**返回值**:
```typescript
interface UseDockerReturn {
  dockerStatus: DockerStatus | null;
  isDetecting: boolean;
  containerInfo: ContainerInfo | null;
  healthStatus: HealthStatus | null;
  containerRunning: boolean;
  detectDocker: () => Promise<DockerStatus | null>;
  startContainer: () => Promise<boolean>;
  stopContainer: () => Promise<boolean>;
  restartContainer: () => Promise<boolean>;
  getLogs: (tail?: number) => Promise<string>;
  isLoading: boolean;
  error: string | null;
}
```

### 5. DockerDetection.tsx (渲染进程)

**功能**: 首次运行向导中的 Docker 检测 UI 组件

**使用示例**:
```typescript
import { DockerDetection } from './components/DockerDetection';

function FirstRunWizard() {
  const handleDockerReady = () => {
    console.log('Docker 已就绪，继续下一步');
  };

  const handleSkip = () => {
    console.log('用户跳过 Docker 检测');
  };

  return (
    <DockerDetection
      onDockerReady={handleDockerReady}
      onSkip={handleSkip}
    />
  );
}
```

**支持的状态**:
- 🔍 检测中
- ✅ Docker 已就绪
- ⚠️ Docker 未安装（带安装引导链接）
- ⚡ Docker 未运行
- 🔒 权限不足
- ❌ 错误

## 样式建议

```css
.docker-detection {
  text-align: center;
  padding: 2rem;
}

.docker-detection.detecting .spinner {
  /* 加载动画 */
}

.docker-detection.ready .icon.success {
  color: #22c55e;
}

.docker-detection.error .icon.error {
  color: #ef4444;
}

.docker-detection .actions {
  margin-top: 1.5rem;
  display: flex;
  gap: 1rem;
  justify-content: center;
}

.docker-detection .btn {
  padding: 0.5rem 1.5rem;
  border-radius: 6px;
  cursor: pointer;
}

.docker-detection .btn.primary {
  background: #3b82f6;
  color: white;
  border: none;
}

.docker-detection .btn.secondary {
  background: #e5e7eb;
  color: #374151;
  border: none;
}
```

## 错误处理

### Docker 错误类型

| 错误类型 | 说明 | 解决方案 |
|----------|------|----------|
| `NOT_INSTALLED` | Docker 未安装 | 显示安装引导链接 |
| `DAEMON_NOT_RUNNING` | Docker Daemon 未运行 | 提示启动 Docker Desktop |
| `NO_PERMISSION` | 权限不足 | Linux: 加入 docker 组；其他：检查权限设置 |
| `unknown` | 未知错误 | 显示错误详情，提供重试按钮 |

### 容器错误处理

```typescript
const result = await startContainer();
if (!result.success) {
  switch (result.error) {
    case '端口被占用':
      // 提示用户修改端口配置
      break;
    case '容器启动超时':
      // 建议查看日志
      break;
    default:
      // 显示通用错误消息
  }
}
```

## 最佳实践

1. **首次启动时自动检测**: 在应用启动时自动运行 `detectDocker()`
2. **状态轮询**: 使用 `start-status-polling` 实时更新容器状态
3. **友好错误提示**: 使用 `getFriendlyErrorMessage()` 提供可操作的错误消息
4. **优雅降级**: 允许用户跳过 Docker 检测（不推荐）
5. **日志收集**: 启动失败时自动收集并显示日志

## 测试建议

```typescript
// 单元测试示例
describe('DockerDetector', () => {
  it('should detect Docker installation', async () => {
    const detector = new DockerDetector();
    const status = await detector.detectDocker();
    expect(status.installed).toBe(true);
  });

  it('should provide install guide for platform', () => {
    const detector = new DockerDetector();
    const guide = detector.getInstallGuide();
    expect(guide.url).toMatch(/docker.com/);
  });
});
```

## 下一步

- [ ] 集成到首次运行向导
- [ ] 添加容器资源监控 UI
- [ ] 实现日志查看器组件
- [ ] 添加容器配置设置面板
