# SmartClaw v1.0.0

🤖 **AI-Powered Desktop Chatbot**

SmartClaw is a cross-platform desktop chatbot application built with Electron and OpenClaw. It provides an intelligent, auto-configuring chat interface that runs locally on your desktop.

![SmartClaw](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey)

## ✨ Features

- 🖥️ **Native Desktop App** - Cross-platform Electron application
- 🤖 **AI-Powered** - Built on OpenClaw agent framework
- ⚙️ **Auto-Configuration** - Interactive setup wizard
- 💬 **Real-time Chat** - Matrix SDK integration
- 🎨 **Modern UI** - Dark theme with smooth animations
- 🔌 **Extensible** - Plugin architecture
- 🔒 **Local First** - Your data stays on your device
- 🔄 **Auto-Update** - Seamless updates

## 🚀 Quick Start

### Download

Visit the [Releases page](https://github.com/nigel201611/SmartClaw/releases) to download the latest version for your platform:

- **Windows**: `SmartClaw-1.0.0-win-x64.exe` (NSIS installer)
- **macOS**: `SmartClaw-1.0.0-mac.dmg` (Universal)
- **Linux**: `SmartClaw-1.0.0-linux.AppImage` (Portable)

### Installation

#### Windows
1. Download the `.exe` installer
2. Run the installer
3. Follow the installation wizard
4. Launch SmartClaw from Start Menu

#### macOS
1. Download the `.dmg` file
2. Open the DMG
3. Drag SmartClaw to Applications
4. Launch from Applications folder

#### Linux
1. Download the `.AppImage`
2. Make executable: `chmod +x SmartClaw-*.AppImage`
3. Run: `./SmartClaw-*.AppImage`

## 📋 Documentation

- **[INSTALL.md](./INSTALL.md)** - Detailed installation instructions
- **[USAGE.md](./USAGE.md)** - How to use SmartClaw
- **[CONFIG.md](./CONFIG.md)** - Configuration options
- **[TROUBLESHOOTING.md](./TROUBLESHOOTING.md)** - Common issues and solutions
- **[CHANGELOG.md](./CHANGELOG.md)** - Version history
- **[CONTRIBUTING.md](./CONTRIBUTING.md)** - How to contribute

## 🛠️ Development

### Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0

### Build from Source

```bash
# Clone the repository
git clone https://github.com/nigel201611/SmartClaw.git
cd SmartClaw

# Install dependencies
npm install

# Run in development mode
npm run dev:desktop

# Build for production
npm run build:win    # Windows
npm run build:mac    # macOS
npm run build:linux  # Linux
```

## 📁 Project Structure

```
SmartClaw/
├── apps/
│   ├── desktop/       # Electron desktop app
│   └── agent/         # OpenClaw agent
├── packages/
│   └── config-gen/    # Auto-config wizard
├── docs/              # Documentation
├── generated-configs/ # Generated configurations
└── package.json       # Monorepo root
```

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

## 📞 Contact

- **Author**: Nigel Luo
- **GitHub**: [@nigel201611](https://github.com/nigel201611)
- **Issues**: [GitHub Issues](https://github.com/nigel201611/SmartClaw/issues)

---

Built with ❤️ using OpenClaw
