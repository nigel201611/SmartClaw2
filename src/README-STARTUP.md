# 应用启动流程集成指南

## 文件结构

```
src/main/
├── main.ts              # Electron 主入口
├── app-startup.ts       # 应用启动管理器
├── docker-detector.ts   # Docker 环境检测
├── docker-manager.ts    # Docker 容器管理
└── docker-ipc.ts        # IPC 通信处理

public/
└── startup.html         # 启动加载页面
```

## 启动流程

```
┌─────────────────────────────────────────────────────────────┐
│                      应用启动流程                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. Electron app.whenReady()                                │
│         │                                                    │
│         ▼                                                    │
│  2. AppStartupManager.onAppReady()                          │
│         │                                                    │
│         ▼                                                    │
│  3. 检测 Docker 环境 (docker-detector.ts)                    │
│         │                                                    │
│         ├─ Docker 未安装 → 显示首次运行向导                   │
│         ├─ Docker 未运行 → 提示启动 Docker                    │
│         └─ Docker 就绪 → 继续                                │
│                      │                                       │
│                      ▼                                       │
│  4. 启动 Matrix 容器 (docker-manager.ts)                     │
│         │                                                    │
│         ├─ 启动失败 → 显示错误对话框（重试/查看日志/退出）     │
│         └─ 启动成功 → 继续                                   │
│                      │                                       │
│                      ▼                                       │
│  5. 等待容器健康检查 (60 秒超时)                              │
│         │                                                    │
│         ├─ 超时 → 显示警告（重试/查看日志/继续）              │
│         └─ 健康 → 继续                                       │
│                      │                                       │
│                      ▼                                       │
│  6. 初始化 Matrix 客户端                                     │
│         │                                                    │
│         ▼                                                    │
│  7. 创建主窗口                                               │
│         │                                                    │
│         ▼                                                    │
│  8. 关闭启动窗口，应用就绪                                   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## 集成步骤

### 1. 主入口文件 (main.ts)

```typescript
import { app } from 'electron';
import { getAppStartupManager } from './app-startup';
import { registerDockerIPCHandlers } from './docker-ipc';

app.whenReady().then(async () => {
  const startupManager = getAppStartupManager();
  const result = await startupManager.onAppReady();
  
  if (result.success) {
    const mainWindow = startupManager.getMainWindow();
    registerDockerIPCHandlers(mainWindow);
  }
});
```

### 2. 应用启动管理器 (app-startup.ts)

核心方法：

```typescript
class AppStartupManager {
  // 主启动流程
  async onAppReady(): Promise<StartupResult>
  
  // 显示首次运行向导
  private async showFirstRunWizard(dockerStatus: DockerStatus)
  
  // 显示容器启动错误
  private async showContainerStartError(error?: string)
  
  // 显示健康检查错误
  private async showHealthCheckError(error?: string)
  
  // 重试启动
  private async retryStartup()
  
  // 创建启动窗口
  private createStartupWindow()
  
  // 创建主窗口
  private async createMainWindow()
  
  // 应用关闭处理
  private async onAppClosing()
}
```

### 3. 启动页面 (startup.html)

功能：
- 显示加载动画
- 显示 4 步启动进度
- 接收主进程状态更新
- 显示错误对话框

IPC 通信：

```javascript
// 监听 Docker 状态
ipcRenderer.on('docker-status', (event, status) => {
  if (!status.installed || !status.running) {
    showError('Docker 未就绪', status.error);
  }
});

// 监听启动状态
ipcRenderer.on('startup-state', (event, state) => {
  switch (state) {
    case 'checking-docker':
      setStepActive(0);
      break;
    case 'starting-containers':
      setStepActive(1);
      break;
    // ...
  }
});
```

## 状态枚举

```typescript
enum StartupState {
  INITIALIZING = 'initializing',       // 初始化
  CHECKING_DOCKER = 'checking-docker', // 检测 Docker
  STARTING_CONTAINERS = 'starting-containers', // 启动容器
  WAITING_HEALTHY = 'waiting-healthy', // 等待健康
  INITIALIZING_MATRIX = 'initializing-matrix', // 初始化 Matrix
  READY = 'ready',                     // 就绪
  ERROR = 'error'                      // 错误
}
```

## 错误处理策略

### Docker 未安装

```
┌─────────────────────────────────────┐
│  ⚠️ Docker 未安装                    │
├─────────────────────────────────────┤
│  SmartClaw 需要 Docker 才能运行。     │
│  请先安装 Docker。                    │
│                                     │
│  [查看安装指南]  [重试]  [退出]      │
└─────────────────────────────────────┘
```

### 容器启动失败

```
┌─────────────────────────────────────┐
│  ❌ 容器启动失败                      │
├─────────────────────────────────────┤
│  无法启动 Matrix 容器                 │
│  错误详情：端口被占用                │
│                                     │
│  [重试]  [查看日志]  [退出]          │
└─────────────────────────────────────┘
```

### 健康检查超时

```
┌─────────────────────────────────────┐
│  ⚡ 服务响应超时                      │
├─────────────────────────────────────┤
│  Matrix 服务启动超时                 │
│  容器已启动但服务无响应              │
│                                     │
│  [重试]  [查看日志]  [继续]          │
└─────────────────────────────────────┘
```

## 配置选项

### 启动管理器配置

```typescript
const dockerManager = new DockerManager({
  containerName: 'smartclaw-matrix',    // 容器名称
  composeFilePath: './docker-compose.yml', // Compose 文件路径
  startupTimeout: 60000,                // 启动超时（毫秒）
  stopGracePeriod: 30                   // 停止宽限期（秒）
});
```

### 退出时行为

```typescript
// 从用户设置读取
const shouldStop = await this.shouldStopContainersOnExit();

if (shouldStop) {
  await this.dockerManager.stopContainer();
}
```

## 最佳实践

1. **快速失败**: Docker 检测失败立即显示向导，不浪费用户时间
2. **友好错误**: 提供可操作的错误消息和解决方案
3. **重试机制**: 所有错误都提供重试选项
4. **日志收集**: 错误时提供查看日志选项
5. **优雅降级**: 健康检查超时允许用户选择继续
6. **资源清理**: 应用退出时停止容器（可配置）

## 测试场景

### 正常启动

```bash
# 1. Docker 已安装并运行
# 2. 端口 8008 可用
# 3. 启动应用
# 预期：显示启动进度 → 进入主界面
```

### Docker 未安装

```bash
# 1. 卸载 Docker
# 2. 启动应用
# 预期：显示首次运行向导 → 提供安装链接
```

### 端口冲突

```bash
# 1. 占用端口 8008
# 2. 启动应用
# 预期：显示容器启动错误 → 提供重试/查看日志选项
```

### 容器启动超时

```bash
# 1. 修改 docker-compose.yml 使容器启动缓慢
# 2. 启动应用
# 预期：显示健康检查超时 → 提供重试/继续选项
```

## 下一步

- [ ] 添加启动性能分析（记录各阶段耗时）
- [ ] 实现启动失败自动诊断
- [ ] 添加启动日志持久化
- [ ] 优化启动动画和用户体验
