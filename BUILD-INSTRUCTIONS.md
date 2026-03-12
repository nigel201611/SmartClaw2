# 🚀 SmartClaw v1.0.0 - Build Instructions

## ⚠️ Important: Platform-Specific Builds

SmartClaw must be built on each target platform. **You cannot build macOS DMG on Linux or Windows DMG on macOS.**

---

## 📋 Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- Git

---

## 🍎 macOS Build (Creates .dmg)

**Requirements:**
- macOS 10.13+ (High Sierra or later)
- Xcode Command Line Tools

**Steps:**

```bash
# 1. Clone repository
git clone https://github.com/nigel201611/SmartClaw.git
cd SmartClaw

# 2. Install dependencies
npm install --ignore-scripts

# 3. Build macOS DMG
cd apps/desktop
npm run build:mac

# Output: dist/SmartClaw-1.0.0-mac-x64.dmg (Intel)
# Output: dist/SmartClaw-1.0.0-mac-arm64.dmg (Apple Silicon)
```

**For Universal Build (Intel + Apple Silicon):**

```bash
npm run build:all
```

---

## 🪟 Windows Build (Creates .exe)

**Requirements:**
- Windows 10/11
- Visual Studio Build Tools (optional, for native modules)

**Steps:**

```bash
# 1. Clone repository
git clone https://github.com/nigel201611/SmartClaw.git
cd SmartClaw

# 2. Install dependencies
npm install --ignore-scripts

# 3. Build Windows installer
cd apps/desktop
npm run build:win

# Output: dist/SmartClaw-1.0.0-win-x64.exe
```

---

## 🐧 Linux Build (Creates .AppImage and .deb)

**Requirements:**
- Linux (Ubuntu/Debian recommended)
- dpkg, rpm (optional, for specific formats)

**Steps:**

```bash
# 1. Clone repository
git clone https://github.com/nigel201611/SmartClaw.git
cd SmartClaw

# 2. Install dependencies
npm install --ignore-scripts

# 3. Build Linux packages
cd apps/desktop
npm run build:linux

# Output: dist/SmartClaw-1.0.0-linux-x64.AppImage
# Output: dist/SmartClaw-1.0.0-linux-x64.deb
```

---

## 📦 Build All Platforms (Requires All OS)

```bash
cd apps/desktop
npm run build:all
```

**Note:** This will only build for the current platform. To build for all platforms, you need to run this command on each OS.

---

## 🎯 Distribution

After building, upload the artifacts to GitHub Releases:

1. Go to https://github.com/nigel201611/SmartClaw/releases
2. Create new release (tag: v1.0.0)
3. Upload build artifacts:
   - `SmartClaw-1.0.0-mac-x64.dmg` (macOS Intel)
   - `SmartClaw-1.0.0-mac-arm64.dmg` (macOS Apple Silicon)
   - `SmartClaw-1.0.0-win-x64.exe` (Windows)
   - `SmartClaw-1.0.0-linux-x64.AppImage` (Linux)
   - `SmartClaw-1.0.0-linux-x64.deb` (Debian/Ubuntu)
4. Write release notes
5. Publish

---

## 🔐 Code Signing (Optional but Recommended)

### macOS Code Signing

**Requirements:**
- Apple Developer ID ($99/year)
- Xcode

**Configuration:**

Add to `apps/desktop/package.json`:

```json
"mac": {
  "identity": "Developer ID Application: Your Name (TEAM_ID)",
  "hardenedRuntime": true,
  "gatekeeperAssess": false,
  "notarize": {
    "teamId": "YOUR_TEAM_ID",
    "appleId": "your@apple.id",
    "appleIdPassword": "@keychain:AC_PASSWORD"
  }
}
```

### Windows Code Signing

**Requirements:**
- Code signing certificate from trusted CA

**Configuration:**

```json
"win": {
  "signingHashAlgorithms": ["sha256"],
  "sign": null
}
```

---

## 📝 Current Status (v1.0.0)

- ✅ Source code complete
- ✅ Auto-config wizard ready
- ✅ Build configuration ready
- ⚠️ **DMG needs to be built on macOS**
- ⚠️ Code signing not configured (Option A: Quick Release)

---

## 🎯 For Users (After Release)

### macOS Installation

1. Download `SmartClaw-1.0.0-mac-x64.dmg`
2. Open DMG file
3. Drag SmartClaw to Applications folder
4. **First run:** Right-click → Open (to bypass security warning)
5. Follow setup wizard

### Windows Installation

1. Download `SmartClaw-1.0.0-win-x64.exe`
2. Run installer
3. Follow installation wizard
4. Launch SmartClaw

### Linux Installation

**AppImage:**
```bash
chmod +x SmartClaw-1.0.0-linux-x64.AppImage
./SmartClaw-1.0.0-linux-x64.AppImage
```

**Debian/Ubuntu:**
```bash
sudo dpkg -i SmartClaw-1.0.0-linux-x64.deb
```

---

## 📊 Build Output Summary

| Platform | Command | Output File |
|----------|---------|-------------|
| macOS | `npm run build:mac` | `.dmg` (x64, arm64) |
| Windows | `npm run build:win` | `.exe` (NSIS installer) |
| Linux | `npm run build:linux` | `.AppImage`, `.deb` |

---

## 🆘 Troubleshooting

### "Cannot compute electron version"

**Solution:** Install electron in the desktop app directory:

```bash
cd apps/desktop
npm install electron --save-dev
npm run build:mac
```

### Build fails on Linux for macOS

**Explanation:** You cannot cross-compile macOS apps on Linux. You need a macOS machine.

**Solution:** Use GitHub Actions CI/CD or build on a Mac.

### macOS security warning

**Solution:** Right-click app → Open → Click "Open" in dialog. This is normal for unsigned apps.

---

## 📞 Support

- GitHub Issues: https://github.com/nigel201611/SmartClaw/issues
- Documentation: https://github.com/nigel201611/SmartClaw/blob/main/README.md

---

**Last Updated:** 2026-03-12  
**Version:** 1.0.0
