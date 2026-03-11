# SmartClaw Installation Guide

This guide provides detailed installation instructions for all supported platforms.

## System Requirements

### Minimum Requirements

- **OS**: Windows 10 / macOS 10.13 / Linux (Ubuntu 18.04+)
- **CPU**: Dual-core 64-bit processor
- **RAM**: 2 GB
- **Disk**: 500 MB free space
- **Node.js**: 18.0.0+ (for development)

### Recommended Requirements

- **OS**: Windows 11 / macOS 12+ / Linux (Ubuntu 22.04+)
- **CPU**: Quad-core 64-bit processor
- **RAM**: 4 GB
- **Disk**: 1 GB free space
- **Network**: Broadband connection for AI features

---

## Windows Installation

### Option 1: NSIS Installer (Recommended)

1. **Download**
   - Go to [Releases](https://github.com/nigel201611/SmartClaw/releases)
   - Download `SmartClaw-1.0.0-win-x64.exe`

2. **Install**
   - Double-click the downloaded `.exe` file
   - If prompted by Windows Defender, click "More info" → "Run anyway"
   - Follow the installation wizard:
     - Accept the license agreement
     - Choose installation location (default: `C:\Program Files\SmartClaw`)
     - Choose Start Menu folder
     - Create desktop shortcut (optional)
   - Click "Install"
   - Wait for installation to complete
   - Click "Finish" to launch SmartClaw

3. **First Run**
   - SmartClaw will launch automatically
   - Complete the setup wizard
   - Configure your Matrix server and API keys

### Option 2: Portable Version

1. **Download**
   - Download `SmartClaw-Portable-1.0.0-win-x64.exe`

2. **Run**
   - No installation required
   - Double-click to run
   - Data stored in the same directory

---

## macOS Installation

### Option 1: DMG (Recommended)

1. **Download**
   - Go to [Releases](https://github.com/nigel201611/SmartClaw/releases)
   - Download `SmartClaw-1.0.0-mac.dmg` (Universal: Intel + Apple Silicon)

2. **Install**
   - Double-click the `.dmg` file
   - Drag SmartClaw icon to Applications folder
   - Wait for copy to complete
   - Eject the DMG

3. **First Run**
   - Open Applications folder
   - Right-click SmartClaw → Open (first time only)
   - Click "Open" when prompted by Gatekeeper
   - Complete the setup wizard

### Option 2: Homebrew (Development)

```bash
# Add the tap (when available)
brew tap nigel201611/smartclaw

# Install
brew install smartclaw
```

---

## Linux Installation

### Option 1: AppImage (Recommended - Universal)

1. **Download**
   - Download `SmartClaw-1.0.0-linux.AppImage`

2. **Make Executable**
   ```bash
   chmod +x SmartClaw-1.0.0-linux.AppImage
   ```

3. **Run**
   ```bash
   ./SmartClaw-1.0.0-linux.AppImage
   ```

4. **Optional: Integrate with Desktop**
   ```bash
   # Install appimaged for automatic integration
   wget https://github.com/AppImage/AppImageKit/releases/download/continuous/appimaged-x86_64.AppImage
   chmod +x appimaged-x86_64.AppImage
   ./appimaged-x86_64.AppImage
   ```

### Option 2: Debian/Ubuntu (.deb)

1. **Download**
   - Download `SmartClaw-1.0.0-linux.deb`

2. **Install**
   ```bash
   sudo apt install ./SmartClaw-1.0.0-linux.deb
   ```

3. **Run**
   ```bash
   smartclaw
   ```
   Or find it in your application menu.

### Option 3: RPM (Fedora/RHEL)

1. **Download**
   - Download `SmartClaw-1.0.0-linux.rpm`

2. **Install**
   ```bash
   sudo dnf install ./SmartClaw-1.0.0-linux.rpm
   ```

3. **Run**
   ```bash
   smartclaw
   ```

---

## Post-Installation Setup

### First Run Wizard

1. **Welcome Screen**
   - Click "Get Started"

2. **Environment Detection**
   - SmartClaw automatically detects your system configuration
   - Review detected settings

3. **Account Setup**
   - Enter Matrix server URL (or use default)
   - Enter access token (or create new account)

4. **AI Configuration**
   - Enter LLM endpoint URL
   - Enter API key (encrypted and stored securely)

5. **Features**
   - Select features to enable
   - Choose preferred ports

6. **Review & Generate**
   - Review all settings
   - Click "Generate Configuration"

7. **Complete**
   - Configuration saved
   - Ready to use!

---

## Uninstallation

### Windows
- Use Windows Settings → Apps → SmartClaw → Uninstall
- Or use the uninstaller in Start Menu

### macOS
- Drag SmartClaw from Applications to Trash
- Remove config: `rm -rf ~/Library/Application Support/SmartClaw`

### Linux
- AppImage: Just delete the AppImage file
- .deb: `sudo apt remove smartclaw`
- .rpm: `sudo dnf remove smartclaw`

---

## Troubleshooting

### Installation Fails

**Windows**: Run installer as Administrator
**macOS**: Check Gatekeeper settings
**Linux**: Check dependencies with `ldd`

### App Won't Start

1. Check system requirements
2. Verify graphics drivers are up to date
3. Try running with `--no-sandbox` flag (development only)

### Update Issues

1. Check internet connection
2. Disable firewall temporarily
3. Download latest version manually

For more help, see [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
