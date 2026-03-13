# Contributing to SmartClaw

Thank you for your interest in contributing to SmartClaw! This guide will help you get started.

## 🤝 How to Contribute

### Reporting Bugs

Before creating a bug report:
- [ ] Check if the issue already exists in [Issues](https://github.com/nigel201611/SmartClaw/issues)
- [ ] Try the latest version
- [ ] Check [TROUBLESHOOTING.md](./docs/TROUBLESHOOTING.md)

When creating a bug report, include:
- **Title**: Clear and descriptive
- **Description**: What happened vs. what you expected
- **Steps to Reproduce**: Detailed steps
- **Environment**: OS, version, SmartClaw version
- **Logs**: Relevant log excerpts
- **Screenshots**: If applicable

Example:
```markdown
**Title**: App crashes on launch (macOS 14)

**Description**: SmartClaw closes immediately after opening.

**Steps to Reproduce**:
1. Open SmartClaw from Applications
2. App shows splash screen
3. App closes after 2 seconds

**Environment**:
- macOS: 14.2
- SmartClaw: 1.0.0
- Chip: M2

**Logs**:
[Attach relevant log file]
```

### Suggesting Features

Before suggesting a feature:
- [ ] Check if it already exists
- [ ] Check if it's already requested in Issues

When suggesting a feature:
- **Title**: Clear feature name
- **Problem**: What problem does this solve?
- **Solution**: How should it work?
- **Alternatives**: What alternatives have you considered?
- **Context**: Any additional context

### Pull Requests

1. **Fork** the repository
2. **Create a branch** from `main`:
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Make your changes**
4. **Test** your changes
5. **Commit** with clear messages:
   ```bash
   git commit -m "feat: add amazing feature"
   ```
6. **Push** to your fork
7. **Open a Pull Request**

### PR Guidelines

**Title Format**:
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation
- `style:` Formatting
- `refactor:` Code refactoring
- `test:` Tests
- `chore:` Maintenance

**Requirements**:
- [ ] Code follows existing style
- [ ] Tests pass
- [ ] Documentation updated
- [ ] No breaking changes (or clearly marked)
- [ ] Linked issues (if applicable)

---

## 🛠️ Development Setup

### Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- Git

### Installation

```bash
# Fork and clone
git clone https://github.com/YOUR_USERNAME/SmartClaw.git
cd SmartClaw

# Install dependencies
npm install

# Run in development mode
npm run dev:desktop
```

### Building

```bash
# Build for current platform
npm run build

# Build for specific platform
npm run build:win
npm run build:mac
npm run build:linux

# Build for all platforms
npm run build:all
```

### Testing

```bash
# Run tests
npm test

# Run linter
npm run lint
```

---

## 📐 Coding Standards

### JavaScript Style

- Use ES6+ features
- Use `const` and `let` (no `var`)
- Use async/await for async code
- Use template literals
- Use arrow functions for callbacks

Example:
```javascript
// Good
const sendMessage = async (message) => {
  try {
    await client.send(message);
    console.log('Message sent:', message);
  } catch (error) {
    console.error('Failed to send:', error);
  }
};

// Avoid
var sendMessage = function(message) {
  client.send(message).then(function() {
    console.log('Message sent');
  });
};
```

### File Organization

```
apps/desktop/
├── src/
│   ├── component.js    # Component files
│   └── utils/          # Utility functions
├── tests/
│   └── component.test.js
└── package.json
```

### Comments

- Use JSDoc for functions
- Comment complex logic
- Keep comments up to date

```javascript
/**
 * Send a message to the Matrix server
 * @param {string} roomId - The room ID
 * @param {string} message - The message content
 * @returns {Promise<Object>} The send result
 */
async function sendMessage(roomId, message) {
  // Implementation
}
```

---

## 🧪 Testing

### Unit Tests

```javascript
// example.test.js
const { sendMessage } = require('./message');

describe('sendMessage', () => {
  it('should send a message', async () => {
    const result = await sendMessage('room123', 'Hello');
    expect(result.success).toBe(true);
  });
});
```

### Manual Testing

Before submitting a PR:
- [ ] Test on your primary OS
- [ ] Test basic functionality
- [ ] Test edge cases
- [ ] Check for console errors

---

## 📝 Documentation

### Code Documentation

- Document public APIs
- Add examples for complex features
- Keep README up to date

### User Documentation

When adding features:
- Update USAGE.md
- Add to CONFIG.md if configurable
- Add to TROUBLESHOOTING.md if relevant
- Update CHANGELOG.md

---

## 🚀 Release Process

### Version Numbering

SmartClaw uses [Semantic Versioning](https://semver.org/):

- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes (backward compatible)

### Release Checklist

- [ ] Update version in package.json
- [ ] Update CHANGELOG.md
- [ ] Test all platforms
- [ ] Create git tag
- [ ] Create GitHub Release
- [ ] Build and upload binaries
- [ ] Update documentation

---

## 💬 Community

### Code of Conduct

- Be respectful
- Be inclusive
- Accept constructive feedback
- Focus on what's best for the community

### Communication

- **Issues**: Bug reports and feature requests
- **Discussions**: Questions and ideas
- **PRs**: Code contributions

---

## 📜 License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

## 🙏 Thank You!

Your contributions make SmartClaw better for everyone. We appreciate your time and effort!

For questions, open an issue or discussion on GitHub.
