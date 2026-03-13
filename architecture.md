# SmartClaw v2.0 Standalone - 架构设计文档

**版本**: 1.0  
**作者**: Nigel Luo  
**日期**: 2026-03-13  
**状态**: 初稿待审核

---

## 1. Matrix 服务器选型

### 1.1 选项对比

| 特性 | Synapse | Conduit | Dendrite |
|------|---------|---------|----------|
| 语言 | Python | Rust | Go |
| 内存占用 | ~400-600MB | ~30-80MB | ~100-200MB |
| CPU 占用 | 中等 | 低 | 低 - 中等 |
| 功能完整性 | ⭐⭐⭐⭐⭐ 完整 | ⭐⭐⭐ 基础 | ⭐⭐⭐⭐ 较完整 |
| 稳定性 | 成熟稳定 | 快速迭代中 | 稳定 |
| Docker 镜像大小 | ~800MB | ~50MB | ~150MB |
| 启动时间 | ~15-30 秒 | ~2-5 秒 | ~5-10 秒 |
| 官方维护 | matrix.org | 社区 | matrix.org |

### 1.2 详细分析

#### Option A: matrix-org/synapse
**优势**:
- 最成熟、功能最完整的 Matrix 服务器实现
- 官方参考实现，兼容性最佳
- 丰富的文档和社区支持
- 支持所有 Matrix 特性（桥接、联邦等）

**劣势**:
- 内存占用高（~500MB 起步）
- Python 性能瓶颈，CPU 占用较高
- 启动较慢
- 对于单机本地使用来说功能过剩

#### Option B: conduit (conduit-rs/conduit)
**优势**:
- 极轻量（~50MB RAM）
- Rust 编写，性能优异
- 启动速度快（<5 秒）
- 镜像小（~50MB）
- 适合资源受限环境

**劣势**:
- 功能相对基础，缺少部分高级特性
- 仍在快速迭代中，API 可能有变动
- 社区规模较小
- 不支持服务器间联邦（设计决策）

#### Option C: dendrite (matrix-org/dendrite) - 中间选项
**优势**:
- Go 编写，性能介于 Synapse 和 Conduit 之间
- matrix.org 官方维护
- 功能比 Conduit 完整
- 资源占用适中（~150MB RAM）
- 支持联邦

**劣势**:
- 配置相对复杂
- 某些边缘功能仍在开发中

### 1.3 推荐方案

**推荐：Conduit（首选） + Dendrite（备选）**

**理由**:
1. **SmartClaw 使用场景**: 本地单机使用，无需联邦功能
2. **资源敏感**: 作为桌面应用的一部分，需最小化资源占用
3. **用户体验**: 快速启动（<5 秒）对用户体验至关重要
4. **功能足够**: Conduit 支持 1:1 聊天、群聊、文件传输等核心功能

**备选策略**:
- 如果用户需要联邦功能 → 提供 Dendrite 选项
- 如果用户需要完整企业功能 → 提供 Synapse 选项（但明确告知资源成本）

---

## 2. Docker 策略

### 2.1 Docker 依赖方案

**方案：要求用户预装 Docker Desktop / Docker Engine**

**理由**:
- 捆绑 Docker 运行时会显著增加安装包体积（>100MB）
- Docker Desktop 已广泛普及（开发者、技术用户）
- 维护独立 Docker 运行时的兼容性成本高
- 安全考虑：Docker 需要系统级权限

### 2.2 Docker 检测流程

```
┌─────────────────────────────────────────────────────────┐
│                  应用启动检测流程                        │
├─────────────────────────────────────────────────────────┤
│  1. 检查 docker 命令是否存在 (which docker)              │
│  2. 检查 Docker Daemon 是否运行 (docker info)            │
│  3. 检查用户权限 (是否能无 sudo 运行 docker)             │
│  4. 检查端口占用 (8008, 8448 等)                         │
└─────────────────────────────────────────────────────────┘
```

### 2.3 缺失 Docker 处理

```
┌─────────────────────────────────────────────────────────┐
│                  Docker 缺失处理流程                      │
├─────────────────────────────────────────────────────────┤
│  检测到 Docker 不可用 → 显示友好错误提示                  │
│                                                            │
│  提供引导链接:                                            │
│  - macOS: https://docs.docker.com/desktop/install-mac/   │
│  - Windows: https://docs.docker.com/desktop/install-win/ │
│  - Linux: https://docs.docker.com/engine/install/        │
│                                                            │
│  提供替代方案提示:                                         │
│  - "是否需要使用远程 Matrix 服务器模式？"                 │
└─────────────────────────────────────────────────────────┘
```

### 2.4 Docker 命令抽象层

在 Electron 中通过 Node.js 子进程调用 Docker:

```javascript
// docker-manager.js
class DockerManager {
  async checkDockerAvailable() {
    try {
      await execAsync('docker --version');
      await execAsync('docker info');
      return true;
    } catch (e) {
      return false;
    }
  }

  async startContainer(image, config) {
    // docker run -d --name smartclaw-matrix ...
  }

  async stopContainer(name) {
    // docker stop + docker rm
  }

  async getContainerLogs(name, tail = 100) {
    // docker logs --tail 100 smartclaw-matrix
  }
}
```

---

## 3. 架构设计

### 3.1 系统架构图

#### 完整架构 (v2.0 目标)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     SmartClaw Electron App                               │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                    用户界面层 (UI - Renderer)                       │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐           │  │
│  │  │  聊天界面    │  │  设置面板    │  │   状态/日志面板   │           │  │
│  │  └─────────────┘  └─────────────┘  └─────────────────┘           │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                              │                                           │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                   业务逻辑层 (Main Process)                        │  │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐   │  │
│  │  │  Docker Manager │  │  Matrix Client  │  │  Config Manager │   │  │
│  │  │  - 容器生命周期  │  │  - 消息收发      │  │  - 配置读写      │   │  │
│  │  │  - 健康检查      │  │  - 用户认证      │  │  - 端口管理      │   │  │
│  │  │  - 日志收集      │  │  - 文件传输      │  │  - 凭证加密      │   │  │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘   │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                              │                                           │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                    数据持久层 (~/.smartclaw/)                      │  │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐   │  │
│  │  │  config.json    │  │  credentials    │  │  logs/          │   │  │
│  │  │  - 服务器配置    │  │  - 用户 token   │  │  - app.log      │   │  │
│  │  │  - 端口设置      │  │  - 设备 ID      │  │  - matrix.log   │   │  │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘   │  │
│  └───────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
                              │ Docker API
                              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         Docker Containers                                │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │  ┌─────────────────────┐        ┌─────────────────────────────┐   │  │
│  │  │   Conduit Matrix    │        │   Hiclaw Gateway (可选)     │   │  │
│  │  │   :8008             │        │   :6168                     │   │  │
│  │  │   ┌───────────────┐ │        │   ┌───────────────────────┐ │   │  │
│  │  │   │ Matrix Protocol│ │        │   │ Business Logic        │ │   │  │
│  │  │   │ E2E Encryption │ │        │   │ AI Agent Integration  │ │   │  │
│  │  │   │ User Management│ │        │   │ External APIs         │ │   │  │
│  │  │   └───────────────┘ │        │   └───────────────────────┘ │   │  │
│  │  └─────────────────────┘        └─────────────────────────────┘   │  │
│  │                                                                     │  │
│  │  数据卷：~/.smartclaw/matrix-data/                                  │  │
│  └───────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

#### 简化架构 (v2.0 MVP - 仅 Conduit)

```
┌─────────────────────────────────────────────────────────┐
│              SmartClaw Electron App                      │
│  ┌─────────────────┐  ┌───────────────────────────────┐ │
│  │  UI (Renderer)  │  │  Main Process                 │ │
│  │  - Chat         │  │  - Docker Manager             │ │
│  │  - Settings     │  │  - Matrix Client SDK          │ │
│  └─────────────────┘  └───────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│           Docker: matrixconduit/matrix-conduit          │
│           Port: 8008 → localhost:8008                   │
│           Volume: ~/.smartclaw/matrix-data:/data        │
└─────────────────────────────────────────────────────────┘
```

**说明**:
- v2.0 MVP 阶段：仅使用 Conduit 容器，Gateway 功能集成到 Electron 主进程
- v2.1+ 阶段：分离为独立 Gateway 容器，支持更复杂的业务逻辑和 AI 集成

### 3.2 容器生命周期管理

```
┌─────────────────────────────────────────────────────────────────┐
│                    容器启动流程                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. 应用启动 → 检查 Docker 可用性                                 │
│  2. 检查是否存在 smartclaw-matrix 容器                            │
│  3. 如果不存在 → 拉取镜像并创建容器                               │
│  4. 如果存在但已停止 → 启动容器                                   │
│  5. 如果正在运行 → 健康检查                                       │
│  6. 等待 Matrix 服务就绪 (轮询 /_matrix/client/versions)         │
│  7. 初始化 Matrix Client SDK                                     │
│  8. UI 显示"就绪"状态                                            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    容器关闭流程                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. 用户退出应用 / 点击停止服务                                   │
│  2. 保存所有未同步消息到本地                                      │
│  3. 断开 Matrix Client 连接                                       │
│  4. 发送 docker stop smartclaw-matrix (宽限期 30 秒)              │
│  5. 如果 30 秒后仍在运行 → docker kill                           │
│  6. 清理临时文件                                                 │
│  7. 应用退出                                                      │
│                                                                  │
│  ⚠️ 注意：不自动删除容器，保留用户数据                            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 3.3 数据存储位置

```
~/.smartclaw/
├── config.json              # 应用配置
├── credentials.json         # 加密的认证信息
├── logs/
│   ├── app.log             # 应用日志
│   └── matrix.log          # Matrix 服务器日志（定期同步）
└── matrix-data/            # Docker 卷挂载点
    ├── conduit.toml        # Conduit 配置
    └── database/           # Conduit 数据库文件
```

### 3.4 网络端口规划

| 用途 | 端口 | 协议 | 是否可配置 |
|------|------|------|-----------|
| Matrix HTTP API | 8008 | TCP | ✅ 是 |
| Matrix HTTPS | 8448 | TCP | ✅ 是（可选） |
| Electron DevTools | 8080 | TCP | ❌ 仅开发模式 |

**默认配置**:
- 内部通信：`http://localhost:8008`
- 用户可自定义端口避免冲突

---

## 4. 资源目标

### 4.1 内存占用目标

| 组件 | 目标 | 最大允许 |
|------|------|----------|
| Electron 主进程 | 150MB | 250MB |
| Electron 渲染进程 | 100MB | 200MB |
| Conduit 容器 | 50MB | 100MB |
| **总计** | **300MB** | **550MB** |

**优化策略**:
- Electron 使用 `--disable-gpu` 选项（如不需要硬件加速）
- 限制渲染进程内存：`app.commandLine.appendSwitch('js-flags', '--max-old-space-size=200')`
- Conduit 配置内存限制：`docker run --memory=100m ...`

### 4.2 磁盘空间估算

| 项目 | 空间 |
|------|------|
| Electron 应用 | ~150MB |
| Docker 镜像 (Conduit) | ~50MB |
| 用户数据（每用户） | ~10-100MB（取决于聊天记录） |
| 日志文件（轮转） | ~50MB |
| **总计（初始）** | **~250MB** |
| **总计（6 个月后）** | **~400-500MB** |

### 4.3 启动时间目标

| 阶段 | 目标时间 |
|------|----------|
| Electron 应用启动 | < 2 秒 |
| Docker 容器启动 | < 5 秒 |
| Matrix 服务就绪检测 | < 3 秒 |
| 用户认证完成 | < 2 秒 |
| **总计（冷启动）** | **< 12 秒** |
| **总计（热启动，容器已运行）** | **< 4 秒** |

### 4.4 性能监控

应用应提供实时资源监控面板：

```
┌─────────────────────────────────────────────────────────┐
│  SmartClaw 资源监控                                      │
├─────────────────────────────────────────────────────────┤
│  内存使用：285 MB / 550 MB (52%)                        │
│  CPU 使用：3.2%                                         │
│  磁盘使用：312 MB                                       │
│                                                          │
│  Matrix 服务状态：● 运行中 (uptime: 2h 34m)             │
│  消息队列：0 条待发送                                    │
│  网络连接：● 已连接                                      │
└─────────────────────────────────────────────────────────┘
```

---

## 5. 错误处理与日志

### 5.1 错误场景处理

| 错误类型 | 用户提示 | 自动恢复 |
|----------|----------|----------|
| Docker 未安装 | 引导安装页面 | ❌ |
| Docker Daemon 未运行 | "请启动 Docker Desktop" | ❌ |
| 端口被占用 | "端口 8008 已被占用，是否改用 8009？" | ✅ 自动尝试备用端口 |
| 容器启动失败 | 显示错误日志 + 重试按钮 | ✅ 最多重试 3 次 |
| Matrix 服务无响应 | "服务响应超时，正在重启..." | ✅ 自动重启容器 |
| 磁盘空间不足 | "磁盘空间不足，请清理" | ❌ |

### 5.2 日志收集

```javascript
// 日志聚合策略
class LogManager {
  // 1. 应用日志（winston）
  appLogger = winston.createLogger({...});
  
  // 2. 定期同步容器日志
  async syncContainerLogs() {
    const logs = await dockerManager.getLogs('smartclaw-matrix', {tail: 500});
    this.appLogger.info('Matrix Container', logs);
  }
  
  // 3. 用户可查看的日志面板
  getLogsForUI(limit = 100) {
    return this.recentLogs.slice(-limit);
  }
}
```

### 5.3 日志文件轮转

- 单文件最大：10MB
- 保留文件数：5 个
- 总日志空间上限：50MB

---

## 6. 安全考虑

### 6.1 凭证存储

- 使用 `keytar` 或系统密钥链存储敏感信息
- `credentials.json` 使用 AES-256 加密
- 加密密钥派生自用户主密码（如设置）

### 6.2 Docker 安全

- 容器以非 root 用户运行（如 Conduit 支持）
- 仅暴露必要端口
- 不使用 `--privileged` 模式

### 6.3 网络安全

- 默认仅监听 localhost
- 如需要远程访问，必须显式启用并配置 TLS
- 默认启用防火墙规则（通过 Docker 网络隔离）

---

## 7. 技术细节补充

### 7.1 Conduit Docker 镜像选择

**推荐镜像**: `matrixconduit/matrix-conduit:latest`

**备选**:
- `ghcr.io/matrix-conduit/matrix-conduit:latest` (GitHub Container Registry)
- `docker.io/matrixconduit/matrix-conduit:0.7.0` (固定版本，生产环境推荐)

**Docker Compose 示例**:
```yaml
version: '3.8'
services:
  conduit:
    image: matrixconduit/matrix-conduit:latest
    container_name: smartclaw-matrix
    restart: unless-stopped
    ports:
      - "${MATRIX_PORT:-8008}:8008"
    volumes:
      - ~/.smartclaw/matrix-data:/data
    environment:
      - CONDUIT_SERVER_NAME=${SERVER_NAME:-localhost}
      - CONDUIT_PORT=8008
    mem_limit: 100m
    cpus: 0.5
```

### 7.2 Hiclaw Gateway 镜像

**当前状态**: 需要创建官方镜像

**建议方案**:
1. 基于现有 hiclaw-gateway 代码创建 Dockerfile
2. 镜像命名：`hiclaw/gateway:latest` 或 `ghcr.io/hiclaw/gateway:latest`
3. 端口：6168 (与 Matrix 6167 区分)

**临时方案** (开发阶段):
- 使用 `conduit` 单容器模式
- Gateway 功能直接集成到 Electron 主进程
- 后续迭代再分离为独立容器

### 7.3 Docker 检测逻辑 (详细实现)

```javascript
// docker-detector.js
const { execAsync } = require('./utils');

class DockerDetector {
  /**
   * 完整检测流程，返回详细状态
   */
  async checkDockerStatus() {
    const result = {
      available: false,
      dockerInstalled: false,
      daemonRunning: false,
      hasPermission: false,
      dockerDesktop: false,
      error: null
    };

    // 1. 检查 docker 命令
    try {
      await execAsync('docker --version');
      result.dockerInstalled = true;
    } catch (e) {
      result.error = 'Docker 未安装';
      return result;
    }

    // 2. 检查 Docker Desktop (macOS/Windows)
    if (process.platform === 'darwin') {
      try {
        await execAsync('osascript -e "tell application \\"Docker\\" to get running"');
        result.dockerDesktop = true;
      } catch (e) {
        // Docker Desktop 未运行或不存在
      }
    }

    // 3. 检查 Daemon 是否运行
    try {
      await execAsync('docker info');
      result.daemonRunning = true;
    } catch (e) {
      result.error = 'Docker Daemon 未运行';
      return result;
    }

    // 4. 检查权限 (能否无 sudo 运行)
    try {
      await execAsync('docker ps');
      result.hasPermission = true;
    } catch (e) {
      result.error = 'Docker 权限不足，请将用户加入 docker 组';
      return result;
    }

    result.available = true;
    return result;
  }

  /**
   * 获取安装引导链接
   */
  getInstallGuide() {
    const guides = {
      darwin: 'https://docs.docker.com/desktop/install-mac/',
      win32: 'https://docs.docker.com/desktop/install-windows-install/',
      linux: 'https://docs.docker.com/engine/install/'
    };
    return guides[process.platform] || guides.linux;
  }
}
```

### 7.4 端口策略

**方案：固定默认端口 + 冲突时自动切换**

| 服务 | 默认端口 | 备用端口 1 | 备用端口 2 |
|------|----------|-----------|-----------|
| Matrix (Conduit) | 8008 | 8009 | 8010 |
| Gateway | 6168 | 6169 | 6170 |

**端口检测逻辑**:
```javascript
async function findAvailablePort(basePort, maxAttempts = 3) {
  for (let i = 0; i < maxAttempts; i++) {
    const port = basePort + i;
    const inUse = await checkPortInUse(port);
    if (!inUse) return port;
  }
  throw new Error(`无法找到可用端口 (${basePort}-${basePort + maxAttempts - 1})`);
}
```

**用户配置**:
- 在 `config.json` 中允许用户自定义端口
- 首次启动自动检测，冲突时提示用户选择

---

## 8. 下一步行动

### 8.1 立即行动 (Phase 1)

| 优先级 | 任务 | 预计时间 |
|--------|------|----------|
| P0 | 创建 Docker Compose 模板 | 0.5 天 |
| P0 | 实现 Docker 检测模块 | 1 天 |
| P0 | Electron 主进程框架搭建 | 1 天 |
| P1 | Conduit 容器集成测试 | 1 天 |
| P1 | 基础 UI 框架 (React/Vue) | 2 天 |

### 8.2 短期行动 (Phase 2)

- [ ] Matrix Client SDK 集成 (matrix-js-sdk)
- [ ] 用户认证流程 (注册/登录)
- [ ] 1:1 聊天功能
- [ ] 群聊功能
- [ ] 消息持久化

### 8.3 中期行动 (Phase 3)

- [ ] 文件传输功能
- [ ] 资源监控面板
- [ ] 设置面板 (端口配置等)
- [ ] 日志查看器

### 8.4 长期行动 (Phase 4)

- [ ] Hiclaw Gateway 容器化
- [ ] AI Agent 集成
- [ ] 外部 API 桥接
- [ ] E2E 加密增强

---

## 9. 附录

### 9.1 参考链接

- Conduit: https://conduit.rs/
- Conduit Docker: https://hub.docker.com/r/matrixconduit/matrix-conduit
- Synapse: https://matrix-org.github.io/synapse/
- Dendrite: https://matrix-org.github.io/dendrite/
- Docker Desktop: https://www.docker.com/products/docker-desktop/
- Electron: https://www.electronjs.org/
- matrix-js-sdk: https://github.com/matrix-org/matrix-js-sdk

### 9.2 版本历史

| 版本 | 日期 | 作者 | 变更 |
|------|------|------|------|
| 1.0 | 2026-03-13 | Nigel Luo | 初稿 |

---

**文档结束**
