# SmartClaw v2.0.0 发布说明

**版本**: 2.0.0  
**代号**: Standalone Desktop Edition  
**发布日期**: 2026-03-13  
**类型**: Major Release

---

## 🎉 发布亮点

### 什么是 SmartClaw v2.0？

SmartClaw v2.0 是一个全新的独立桌面版本，让您无需外部 Matrix 服务器即可运行完整的即时通讯服务。内置 Conduit Matrix 服务器，通过 Docker 容器自动管理，提供完整的聊天、群聊、文件传输等功能。

---

## ✨ 新功能

### 🐳 内置 Docker 容器
- **本地 Matrix 服务器** - 无需外部服务
- **自动容器管理** - 启动/停止/健康检查
- **一键安装** - Docker Desktop 自动检测

### 🎨 全新聊天界面
- **现代化设计** - 响应式布局
- **消息气泡** - 发送/接收样式区分
- **Markdown 支持** - 粗体/斜体/代码/链接
- **实时输入状态** - "正在输入..."指示器

### 🔐 安全认证
- **系统密钥链** - macOS Keychain / Windows Credential Manager
- **记住我** - 安全凭证存储
- **会话恢复** - 自动登录
- **密码可见性切换** - 安全输入

### 💾 离线优先
- **SQLite 本地存储** - 消息持久化
- **离线消息查看** - 无网络也能查看历史
- **增量同步** - 5 分钟自动同步
- **冲突解决** - 智能合并策略

### ⚡ 性能优化
- **低内存占用** - <300MB RAM
- **快速启动** - <12 秒冷启动
- **消息延迟** - <100ms
- **资源限制** - 可配置 CPU/内存限制

---

## 📥 下载

### macOS
| 架构 | 文件大小 | 下载 |
|------|----------|------|
| Apple Silicon (M1/M2) | ~150MB | [SmartClaw-2.0.0-arm64.dmg](#) |
| Intel (x64) | ~150MB | [SmartClaw-2.0.0-x64.dmg](#) |

### Windows
| 类型 | 文件大小 | 下载 |
|------|----------|------|
| NSIS 安装程序 | ~160MB | [SmartClaw-2.0.0-win.exe](#) |
| 便携版 | ~155MB | [SmartClaw-2.0.0-portable.exe](#) |

### Linux
| 格式 | 文件大小 | 下载 |
|------|----------|------|
| AppImage | ~150MB | [SmartClaw-2.0.0.AppImage](#) |
| Debian 包 | ~145MB | [SmartClaw-2.0.0.deb](#) |

---

## ⚙️ 系统要求

### 最低要求
- **操作系统**: macOS 12.0+ / Windows 10+ / Linux (Ubuntu 20.04+)
- **处理器**: Intel Core i5 或同等
- **内存**: 4GB RAM
- **磁盘空间**: 1GB 可用空间

### 推荐配置
- **操作系统**: macOS 14.0+ / Windows 11+ / Linux (Ubuntu 22.04+)
- **处理器**: Intel Core i7 / Apple Silicon
- **内存**: 8GB RAM
- **磁盘空间**: 2GB 可用空间

### 必需软件
- **Docker Desktop** (免费版即可)
  - [macOS 下载](https://docs.docker.com/desktop/install-mac/)
  - [Windows 下载](https://docs.docker.com/desktop/install-windows-install/)
  - [Linux 下载](https://docs.docker.com/engine/install/)

---

## 📖 安装指南

### macOS
1. 下载 `.dmg` 文件
2. 双击打开 DMG
3. 将 SmartClaw 拖到 Applications 文件夹
4. 首次启动时允许 macOS 安全提示
5. 启动 Docker Desktop（如未运行）
6. 登录或创建账户

### Windows
1. 下载 `.exe` 安装程序
2. 运行安装程序
3. 按照安装向导完成安装
4. 启动 Docker Desktop
5. 启动 SmartClaw 并登录

### Linux
```bash
# AppImage
chmod +x SmartClaw-2.0.0.AppImage
./SmartClaw-2.0.0.AppImage

# 或 Debian 包
sudo dpkg -i SmartClaw-2.0.0.deb
```

---

## 🔄 从 v1.0 迁移

### 变化
- **独立运行** - 不再需要外部 Matrix 服务器
- **数据迁移** - 旧数据需要手动导出/导入
- **新界面** - 完全重新设计的 UI

### 迁移步骤
1. 在 v1.0 中导出聊天记录（设置 → 导出）
2. 安装 v2.0
3. 登录账户
4. 导入聊天记录（设置 → 导入）

### 注意事项
- ⚠️ v1.0 和 v2.0 不能同时运行
- ⚠️ 迁移前请备份数据
- ⚠️ 部分设置需要重新配置

---

## 🐛 已知问题

### 首次启动延迟
- **问题**: 首次启动容器可能需要约 8 秒
- **原因**: Docker 镜像首次拉取
- **解决**: 后续启动只需 3-4 秒
- **计划**: v2.0.1 将预下载镜像

### 注册功能
- **问题**: Conduit 默认不支持在线注册
- **解决**: 使用管理员工具创建账户
- **计划**: v2.1.0 将提供注册服务器选项

---

## 📝 更新日志

### v2.0.0 (2026-03-13)

**新增**
- 内置 Conduit Matrix 服务器
- Docker 容器自动管理
- 全新聊天界面
- 用户认证系统
- SQLite 消息存储
- 离线模式支持
- 系统托盘集成
- 设置持久化

**改进**
- 性能优化（内存 <300MB）
- 启动速度优化
- 错误处理改进
- 用户体验优化

**修复**
- 多个 bug 修复
- 稳定性改进

---

## 🔧 技术细节

### 核心技术栈
- **Electron**: 29.0.0
- **Matrix SDK**: matrix-js-sdk 30.0.0
- **数据库**: better-sqlite3 9.4.3
- **构建工具**: electron-builder 24.13.3

### 安全特性
- 系统密钥链凭证存储
- 端到端加密支持
-  hardened runtime (macOS)
- 代码签名 + 公证

### 网络端口
- Matrix HTTP: 8008 (可配置)
- 内部通信：localhost only

---

## 📞 支持与反馈

### 文档
- [使用文档](https://smartclaw.io/docs)
- [安装指南](https://smartclaw.io/docs/install)
- [故障排除](https://smartclaw.io/docs/troubleshooting)

### 联系方式
- **网站**: https://smartclaw.io
- **邮箱**: support@smartclaw.io
- **Matrix**: @smartclaw:matrix.org
- **GitHub**: https://github.com/nigel201611/SmartClaw2

### 报告问题
请在 GitHub Issues 报告问题：
https://github.com/nigel201611/SmartClaw2/issues

---

## 🙏 致谢

感谢所有参与测试和提供反馈的用户！

特别感谢：
- Conduit 团队 - 提供轻量级 Matrix 服务器
- Matrix.org 团队 - Matrix 协议支持
- Electron 团队 - 跨平台框架
- 所有 beta 测试者

---

## 📄 许可证

SmartClaw v2.0 使用 MIT 许可证。

---

**SmartClaw Team**  
2026-03-13

*Happy Messaging! 🎩💬*
