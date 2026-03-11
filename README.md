# SmartClaw

🤖 **Auto-configuring desktop chatbot agent based on OpenClaw** - Intelligent, fast, and easy to set up.

Inspired by Tencent Qclaw, SmartClaw brings the power of OpenClaw to your desktop with a beautiful Electron-based UI.

---

## ✨ Features

- **🎯 Auto-Configuration**: Intelligent setup with minimal user input
- **💻 Desktop Native**: Built with Electron for cross-platform support (Windows, macOS, Linux)
- **🧠 AI-Powered**: Leverages OpenClaw's agent framework for intelligent conversations
- **🔌 Extensible**: Plugin architecture for custom skills and integrations
- **🔒 Secure**: Local-first design with optional cloud sync
- **⚡ Fast**: Optimized performance with minimal resource usage

---

## 🛠️ Tech Stack

| Component | Technology |
|-----------|------------|
| Desktop App | Electron + React/TypeScript |
| Agent Runtime | OpenClaw (Node.js) |
| Config Generator | TypeScript CLI |
| Package Manager | npm workspaces (monorepo) |

---

## 📁 Project Structure

```
SmartClaw/
├── apps/
│   ├── desktop/       # Electron desktop application
│   └── agent/         # OpenClaw agent runtime
├── packages/
│   └── config-gen/    # Configuration generator CLI
├── package.json       # Root monorepo config
├── README.md
└── .gitignore
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0

### Installation

```bash
# Clone the repository
git clone https://github.com/nigel201611/SmartClaw.git
cd SmartClaw

# Install dependencies
npm install

# Start development
npm run dev:desktop    # Start desktop app
npm run dev:agent      # Start agent runtime
```

### Build

```bash
# Build all workspaces
npm run build

# Start the application
npm start
```

---

## 📋 Development Phases

- [x] **Phase 1**: Project Setup & Structure
- [ ] **Phase 2**: Core Agent Integration
- [ ] **Phase 3**: Desktop UI Development
- [ ] **Phase 4**: Configuration Generator
- [ ] **Phase 5**: Polish & Release

---

## 📄 License

MIT License - see LICENSE file for details.

---

## 🙏 Acknowledgments

- [OpenClaw](https://github.com/openclaw/openclaw) - The foundation of SmartClaw
- [Tencent Qclaw](https://github.com/Tencent/qclaw) - Inspiration for this project
