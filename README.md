# SmartClaw

🤖 **Auto-configuring Desktop Chatbot based on OpenClaw**

SmartClaw is a desktop chatbot application inspired by Tencent Qclaw, built with Electron and OpenClaw. It provides an intelligent, auto-configuring chat interface that runs locally on your desktop.

## ✨ Features

- 🖥️ **Native Desktop App** - Cross-platform Electron application (Windows, macOS, Linux)
- 🤖 **AI-Powered** - Built on OpenClaw agent framework
- ⚙️ **Auto-Configuration** - Intelligent config generator for easy setup
- 💬 **Real-time Chat** - Smooth, responsive chat interface
- 🎨 **Modern UI** - Clean, intuitive user interface
- 🔌 **Extensible** - Plugin architecture for custom integrations
- 🔒 **Local First** - Your data stays on your device

## 🛠️ Tech Stack

- **Runtime**: Node.js >= 18.x
- **Desktop Framework**: Electron
- **Agent Framework**: OpenClaw
- **Package Manager**: npm (monorepo with workspaces)
- **Language**: JavaScript/TypeScript

## 📁 Project Structure

```
SmartClaw/
├── apps/
│   ├── desktop/       # Electron desktop application
│   │   ├── src/       # Application source code
│   │   ├── electron-main.js
│   │   └── package.json
│   └── agent/         # OpenClaw Worker agent
│       ├── src/       # Agent source code
│       └── package.json
├── packages/
│   └── config-gen/    # Auto-configuration generator CLI
│       ├── src/
│       │   ├── cli.js           # CLI entry point
│       │   ├── detector.js      # Environment detection
│       │   ├── generators/      # Config generators
│       │   └── utils/           # Utilities
│       └── package.json
├── generated-configs/  # Auto-generated configurations
│   ├── openclaw.json
│   ├── higress/
│   ├── matrix/
│   └── credentials/
├── package.json       # Monorepo root configuration
├── README.md
└── .gitignore
```

## 🚀 Getting Started

### Prerequisites

- Node.js >= 18.x
- npm >= 9.x

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/nigel201611/SmartClaw.git
   cd SmartClaw
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run configuration wizard** (Phase 2)
   ```bash
   npm run config-gen:init
   ```

4. **Start the desktop app**
   ```bash
   npm run dev
   ```

### Configuration Generator (Phase 2)

The config-gen CLI provides automatic environment detection and configuration generation:

```bash
# Full interactive setup wizard
npm run config-gen:init

# Environment detection only
npm run config-gen:detect

# Generate configs with defaults
npm run config-gen:generate

# Validate existing configurations
npm run config-gen:validate
```

#### What it generates:

- **openclaw.json** - Agent runtime configuration
- **higress/config.yaml** - Gateway routing configuration
- **matrix/homeserver.yaml** - Matrix server configuration
- **credentials/** - Encrypted credential storage

### Development

```bash
# Start desktop app in dev mode
npm run dev:desktop

# Start agent in dev mode
npm run dev:agent

# Build all workspaces
npm run build

# Run linter
npm run lint
```

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📞 Contact

- **Author**: Nigel Luo
- **GitHub**: [@nigel201611](https://github.com/nigel201611)

---

Built with ❤️ using OpenClaw

## 📋 Development Progress

### Phase 1: Project Setup ✅
- [x] Initialize monorepo structure
- [x] Set up npm workspaces
- [x] Create basic Electron app skeleton
- [x] Create OpenClaw agent skeleton
- [x] Add README and documentation

### Phase 2: Configuration Generator ✅
- [x] Environment detection module
- [x] Port availability checker
- [x] openclaw.json generator
- [x] Higress gateway config generator
- [x] Matrix homeserver config generator
- [x] Encrypted credential storage
- [x] Interactive CLI wizard
- [x] Validation commands

### Phase 3: Core Features (Coming Soon)
- [ ] Desktop app UI implementation
- [ ] Agent-Desktop communication
- [ ] Chat interface
- [ ] Settings panel
