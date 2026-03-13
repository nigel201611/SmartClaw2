# 容器生命周期管理 - Task 2.4 完成报告

## 交付文件

| 文件 | 大小 | 说明 |
|------|------|------|
| `src/main/container-settings.ts` | 5.4KB | 容器设置管理（加载/保存/验证） |
| `src/main/tray-manager.ts` | 6.8KB | 系统托盘管理器 |
| `src/main/settings-ipc.ts` | 3.2KB | 设置 IPC 通信 |
| `src/renderer/components/ContainerSettingsPanel.tsx` | 9.1KB | 设置面板 UI |
| `src/renderer/components/LogViewer.tsx` | 5.5KB | 日志查看器 UI |

## 核心功能

### 1. 容器设置管理 (`container-settings.ts`)

**设置项**:
```typescript
interface ContainerSettings {
  autoStartOnLaunch: boolean;      // 应用启动时自动启动容器
  autoStopOnQuit: boolean;         // 应用退出时自动停止容器
  runInBackground: boolean;        // 后台运行模式
  memoryLimit: string;             // 内存限制（如 "100MB"）
  cpuLimit: number;                // CPU 限制（如 0.5）
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  healthCheckTimeout: number;      // 健康检查超时（秒）
  startupTimeout: number;          // 启动超时（秒）
  portConfig: {
    matrixPort: number;            // Matrix 端口
    autoSelectPort: boolean;       // 自动选择端口
  };
}
```

**功能**:
- ✅ 设置持久化（JSON 文件）
- ✅ 设置验证（格式/范围检查）
- ✅ 重置为默认值
- ✅ 导入/导出设置

### 2. 系统托盘 (`tray-manager.ts`)

**托盘菜单**:
```
┌─────────────────────────────────────┐
│  SmartClaw v2.0                     │
├─────────────────────────────────────┤
│  🟢 运行中                          │
├─────────────────────────────────────┤
│  停止容器                           │
│  重启容器                           │
├─────────────────────────────────────┤
│  查看日志                           │
│  设置...                            │
├─────────────────────────────────────┤
│  ☑ 开机自启                         │
│  ☐ 退出时停止容器                   │
├─────────────────────────────────────┤
│  打开主窗口                         │
├─────────────────────────────────────┤
│  退出 SmartClaw                     │
└─────────────────────────────────────┘
```

**功能**:
- ✅ 容器状态显示（运行中/已停止）
- ✅ 启动/停止/重启容器
- ✅ 查看日志（复制/导出）
- ✅ 快速设置切换
- ✅ 状态轮询（5 秒间隔）

### 3. 设置面板 UI (`ContainerSettingsPanel.tsx`)

**设置分类**:

1. **启动行为**
   - 应用启动时自动启动容器
   - 应用退出时自动停止容器
   - 后台运行模式

2. **资源限制**
   - 内存限制（50MB - 1GB）
   - CPU 限制（0.25 - 4 核心）

3. **超时设置**
   - 健康检查超时（1-300 秒）
   - 启动超时（10-600 秒）

4. **端口配置**
   - 自动选择可用端口
   - Matrix 端口（1024-65535）

5. **日志级别**
   - 仅错误 / 警告 / 信息 / 调试

### 4. 日志查看器 (`LogViewer.tsx`)

**功能**:
- ✅ 实时日志显示（自动刷新）
- ✅ 日志过滤（搜索）
- ✅ 显示行数选择（50-全部）
- ✅ 跟随/暂停模式
- ✅ 复制日志到剪贴板
- ✅ 导出日志文件
- ✅ 清除显示

## IPC 通道

### 设置相关
```typescript
const SETTINGS_IPC_CHANNELS = {
  LOAD: 'settings:load',
  SAVE: 'settings:save',
  RESET: 'settings:reset',
  EXPORT: 'settings:export',
  IMPORT: 'settings:import'
};
```

### Docker 相关（Task 2.2 已创建）
```typescript
const DOCKER_IPC_CHANNELS = {
  START_CONTAINER: 'docker:start',
  STOP_CONTAINER: 'docker:stop',
  RESTART_CONTAINER: 'docker:restart',
  GET_LOGS: 'docker:logs',
  // ...
};
```

## 集成示例

### 主进程 (main.ts)
```typescript
import { TrayManager } from './tray-manager';
import { registerSettingsIPCHandlers } from './settings-ipc';
import { getContainerSettingsManager } from './container-settings';

let trayManager: TrayManager | null = null;

app.whenReady().then(async () => {
  const mainWindow = createMainWindow();
  
  // 注册 IPC
  registerSettingsIPCHandlers(mainWindow);
  registerDockerIPCHandlers(mainWindow);
  
  // 创建托盘
  trayManager = new TrayManager();
  await trayManager.createTray(() => {
    // 退出回调
    app.quit();
  });
});

app.on('will-quit', async () => {
  const settings = getContainerSettingsManager().getSettings();
  if (settings.autoStopOnQuit) {
    await dockerManager.stopContainer();
  }
});
```

### 渲染进程 (React)
```typescript
import { ContainerSettingsPanel } from './components/ContainerSettingsPanel';
import { LogViewer } from './components/LogViewer';

function App() {
  const [showSettings, setShowSettings] = useState(false);
  const [showLogs, setShowLogs] = useState(false);

  return (
    <>
      <button onClick={() => setShowSettings(true)}>设置</button>
      <button onClick={() => setShowLogs(true)}>查看日志</button>
      
      {showSettings && (
        <ContainerSettingsPanel onClose={() => setShowSettings(false)} />
      )}
      
      {showLogs && (
        <LogViewer onClose={() => setShowLogs(false)} />
      )}
    </>
  );
}
```

## 样式建议

```css
/* 设置面板 */
.settings-panel {
  max-width: 600px;
  margin: 0 auto;
  padding: 2rem;
}

.settings-section {
  margin-bottom: 2rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid #e5e7eb;
}

.setting-item {
  margin-bottom: 1rem;
}

.setting-item label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 500;
}

.help-text {
  margin-left: 2rem;
  font-size: 0.85rem;
  color: #6b7280;
}

/* 日志查看器 */
.log-viewer {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.log-content {
  flex: 1;
  overflow: auto;
  background: #1f2937;
  color: #f3f4f6;
  padding: 1rem;
}

.log-text {
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 0.85rem;
  line-height: 1.5;
  white-space: pre-wrap;
}
```

## Phase 2 完成总结

### 所有任务

| 任务 | 状态 | 交付物 |
|------|------|--------|
| 2.1 docker-compose.yml | ✅ 完成 | Docker 配置 + 文档 |
| 2.2 Docker detection | ✅ 完成 | 检测模块 + UI 组件 |
| 2.3 Auto-start | ✅ 完成 | 启动流程 + 加载页面 |
| 2.4 Lifecycle management | ✅ 完成 | 设置 + 托盘 + 日志 |

### 文件统计

- **总文件数**: 20+
- **总代码量**: ~100KB
- **MinIO 同步**: 已完成

### 核心能力

1. ✅ Docker 环境检测（4 步流程）
2. ✅ 容器自动启动（60 秒超时）
3. ✅ 健康检查轮询（3 秒间隔）
4. ✅ 系统托盘控制
5. ✅ 设置持久化
6. ✅ 日志查看器
7. ✅ 错误处理（友好提示）
8. ✅ 优雅关闭

## 下一步 (Phase 3)

- [ ] Matrix 客户端集成 (matrix-js-sdk)
- [ ] 用户认证（注册/登录）
- [ ] 1:1 聊天功能
- [ ] 群聊功能
- [ ] 消息持久化

---

**Phase 2: 100% 完成** 🎉
