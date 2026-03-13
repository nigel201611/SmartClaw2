# SmartClaw v2.0 构建指南

## 构建前准备

### 系统要求

- **Node.js**: 18.x 或更高版本
- **npm**: 9.x 或更高版本
- **Docker Desktop**: 已安装并运行（用于测试）
- **macOS**: 10.15+ (Xcode Command Line Tools)
- **Windows**: 10+ (Visual Studio Build Tools)
- **Linux**: gcc, make, python3

### Apple 代码签名和公证（仅 macOS）

如需发布到 macOS，需要配置以下环境变量：

```bash
# Apple Developer 账号
export APPLE_TEAM_ID="YourTeamId"
export APPLE_ID="your.apple.id@example.com"
export APPLE_APP_SPECIFIC_PASSWORD="your-app-specific-password"

# 生成应用专用密码：
# https://support.apple.com/en-us/HT204397
```

## 构建步骤

### 1. 安装依赖

```bash
npm ci
```

### 2. 构建应用

```bash
# 完整构建（包括打包）
npm run dist

# 仅构建主进程
npm run build:main

# 仅构建渲染进程
npm run build:renderer

# 仅打包（不构建）
npm run pack
```

### 3. 使用构建脚本（推荐）

```bash
# macOS
./build.sh

# Windows
build.bat

# Linux
./build.sh

# 选项
./build.sh --clean        # 清理后构建
./build.sh --skip-deps    # 跳过依赖安装
./build.sh --skip-build   # 跳过构建，仅打包
```

## 输出文件

### macOS

```
release/
├── SmartClaw-2.0.0-mac.dmg      # DMG 安装包
├── SmartClaw-2.0.0-mac.zip      # ZIP 压缩包
├── SmartClaw-2.0.0-arm64.dmg    # Apple Silicon
└── SmartClaw-2.0.0-x64.dmg      # Intel
```

### Windows

```
release/
├── SmartClaw-2.0.0-win.exe      # NSIS 安装程序
└── SmartClaw-2.0.0-portable.exe # 便携版
```

### Linux

```
release/
├── SmartClaw-2.0.0.AppImage     # AppImage
└── SmartClaw-2.0.0.deb          # Debian 包
```

## 代码签名

### macOS

```bash
# 查看可用签名身份
security find-identity -v -p codesigning

# 手动签名（如果 electron-builder 未自动签名）
codesign --force --deep --sign "Developer ID Application: Your Name" SmartClaw.app

# 验证签名
codesign -dv --verbose=4 SmartClaw.app

# 验证公证
spctl -a -v SmartClaw.app
```

### Windows

需要购买代码签名证书（如 DigiCert、GlobalSign 等）。

```bash
# 在 electron-builder 配置中设置
"win": {
  "signingHashAlgorithms": ["sha256"],
  "sign": "signtool.exe sign /f certificate.pfx /p password /t http://timestamp.digicert.com ${path}"
}
```

## 公证（macOS）

公证是 Apple 要求的安全验证流程。

### 自动公证

electron-builder 会自动处理公证（如果配置了 Apple 凭据）。

### 手动公证

```bash
# 提交公证
xcrun notarytool submit SmartClaw-2.0.0-mac.dmg \
  --apple-id "your.apple.id@example.com" \
  --password "app-specific-password" \
  --team-id "YourTeamId" \
  --wait

# 装订公证票
xcrun stapler staple SmartClaw.app
```

## 测试构建

### 本地测试 DMG

```bash
# 挂载 DMG
hdiutil attach release/SmartClaw-2.0.0-mac.dmg

# 运行应用
open /Volumes/SmartClaw/SmartClaw.app

# 测试后卸载
hdiutil detach /Volumes/SmartClaw
```

### 测试自动更新

```bash
# 安装旧版本
open release/SmartClaw-1.0.0-mac.dmg

# 启动应用，应该会自动检测到新版本
```

## 发布到 GitHub

### 配置

在 `package.json` 中配置：

```json
"publish": {
  "provider": "github",
  "owner": "smartclaw",
  "repo": "smartclaw-desktop",
  "releaseType": "release"
}
```

### 发布

```bash
# 设置 GitHub Token
export GH_TOKEN="your-github-token"

# 构建并发布
npm run dist
```

## 常见问题

### 1. 构建失败：找不到 Docker

```
Warning: Docker not found. App will require Docker to be installed separately.
```

这是警告，不是错误。应用会正常工作，但用户需要自行安装 Docker。

### 2. macOS 签名失败

```
Error: Exit code: 1. Command failed: codesign ...
```

解决：
- 确保安装了 Xcode Command Line Tools
- 检查证书是否有效
- 确认 APPLE_TEAM_ID 正确

### 3. 公证失败

```
Error: Invalid credentials
```

解决：
- 使用应用专用密码（不是 Apple ID 密码）
- 确认 APPLE_TEAM_ID 正确
- 检查网络连通性

### 4. Linux 构建失败

```
Error: Cannot build Linux targets on macOS
```

解决：使用 Docker 或 CI/CD 进行跨平台构建。

## CI/CD 集成

### GitHub Actions 示例

```yaml
name: Build

on:
  push:
    tags: ['v*']

jobs:
  build:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [macos-latest, windows-latest, ubuntu-latest]
    
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm ci
      - run: npm run dist
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          APPLE_TEAM_ID: ${{ secrets.APPLE_TEAM_ID }}
          APPLE_ID: ${{ secrets.APPLE_ID }}
          APPLE_APP_SPECIFIC_PASSWORD: ${{ secrets.APPLE_APP_SPECIFIC_PASSWORD }}
      - uses: actions/upload-artifact@v3
        with:
          name: SmartClaw-${{ matrix.os }}
          path: release/
```

## 版本管理

### 更新版本号

```bash
# 编辑 package.json
npm version patch  # 2.0.0 -> 2.0.1
npm version minor  # 2.0.0 -> 2.1.0
npm version major  # 2.0.0 -> 3.0.0
```

### 更新构建版本

```bash
# 在 package.json 中更新 buildVersion
"buildVersion": "2026.03.13"
```

## 下一步

- [ ] 配置自动更新服务器
- [ ] 设置 CI/CD 流水线
- [ ] 准备发布说明
- [ ] 测试升级流程

---

**构建完成！** 🎉
