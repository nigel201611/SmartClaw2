# SmartClaw v2.0.0 下载页面内容

## 页面标题
SmartClaw v2.0.0 - 独立桌面版

## 副标题
本地 Matrix 服务器，开箱即用

---

## 主要下载区域

### 🍎 macOS

**系统要求**: macOS 12.0+ | Docker Desktop

| 版本 | 架构 | 文件大小 | 下载 |
|------|------|----------|------|
| DMG | Apple Silicon (M1/M2/M3) | ~150MB | [下载](#) |
| DMG | Intel (x64) | ~150MB | [下载](#) |
| ZIP | Apple Silicon (M1/M2/M3) | ~145MB | [下载](#) |
| ZIP | Intel (x64) | ~145MB | [下载](#) |

**安装说明**:
1. 下载 `.dmg` 文件
2. 双击打开
3. 拖拽到 Applications 文件夹
4. 首次启动时在系统偏好设置中允许

---

### 🪟 Windows

**系统要求**: Windows 10+ | Docker Desktop

| 版本 | 类型 | 文件大小 | 下载 |
|------|------|----------|------|
| 安装程序 | NSIS (推荐) | ~160MB | [下载](#) |
| 便携版 | 免安装 | ~155MB | [下载](#) |

**安装说明**:
1. 下载 `.exe` 文件
2. 运行安装程序
3. 按照向导完成安装

---

### 🐧 Linux

**系统要求**: Ubuntu 20.04+ / 同等发行版 | Docker

| 版本 | 格式 | 文件大小 | 下载 |
|------|------|----------|------|
| AppImage | 通用 | ~150MB | [下载](#) |
| Debian | .deb | ~145MB | [下载](#) |

**安装说明**:

**AppImage**:
```bash
chmod +x SmartClaw-2.0.0.AppImage
./SmartClaw-2.0.0.AppImage
```

**Debian**:
```bash
sudo dpkg -i SmartClaw-2.0.0.deb
sudo apt-get install -f  # 解决依赖
```

---

## 版本信息

**版本号**: 2.0.0  
**发布日期**: 2026-03-13  
**代号**: Standalone Desktop Edition

### 更新内容
- 🐳 内置 Docker Matrix 服务器
- 🎨 全新聊天界面
- 🔐 安全认证系统
- 💾 离线消息存储
- ⚡ 性能优化

### 已知问题
- 首次容器启动可能需要约 8 秒（镜像拉取）
- Conduit 默认不支持在线注册

[查看完整发布说明 →](#)

---

## 历史版本

| 版本 | 发布日期 | 下载 |
|------|----------|------|
| v1.0.0 | 2025-06-15 | [归档](#) |

---

## 验证文件

### 校验和

```
# SHA256
SmartClaw-2.0.0-arm64.dmg:    abc123...
SmartClaw-2.0.0-x64.dmg:       def456...
SmartClaw-2.0.0-win.exe:       ghi789...
SmartClaw-2.0.0.AppImage:      jkl012...
```

### 签名验证

**macOS**:
```bash
codesign -dv --verbose=4 /Applications/SmartClaw.app
```

---

## 需要帮助？

- 📖 [安装指南](#)
- 📖 [使用文档](#)
- 🐛 [报告问题](#)
- 💬 [社区支持](#)

---

## 更新通知

订阅更新通知：

[输入邮箱] [订阅]

---

*最后更新：2026-03-13*
