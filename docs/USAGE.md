# SmartClaw Usage Guide

Learn how to use SmartClaw for AI-powered conversations.

## Getting Started

### Launching SmartClaw

- **Windows**: Click Start Menu → SmartClaw or desktop shortcut
- **macOS**: Open Applications → SmartClaw
- **Linux**: Run `./SmartClaw-*.AppImage` or find in application menu

### Main Interface

```
┌─────────────────────────────────────────────────┐
│  SmartClaw                          − □ ×      │
├─────────────┬───────────────────────────────────┤
│  Sidebar    │  Chat Area                        │
│  ┌───────┐  │  ┌─────────────────────────────┐  │
│  │ 🤖    │  │  │ Assistant: Hello! How can   │  │
│  │ Chat  │  │  │ I help you today?           │  │
│  └───────┘  │  └─────────────────────────────┘  │
│             │  ┌─────────────────────────────┐  │
│  ┌───────┐  │  │ You: What is SmartClaw?   │  │
│  │ 👤    │  │  └─────────────────────────────┘  │
│  │ You   │  │                                   │
│  └───────┘  │  [Type message...]      [Send]   │
│             │                                   │
└─────────────┴───────────────────────────────────┘
```

## Basic Usage

### Sending Messages

1. Type your message in the input box at the bottom
2. Press `Enter` or click the Send button
3. Wait for the AI response

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Enter` | Send message |
| `Shift+Enter` | New line |
| `Ctrl+L` | Clear chat |
| `Ctrl+,` | Open settings |
| `Ctrl+Q` | Quit (Linux/Windows) |
| `Cmd+Q` | Quit (macOS) |

### Conversation Features

#### Starting New Conversations
- Click the "+" button in the sidebar
- Or use `Ctrl+N` (Cmd+N on macOS)

#### Switching Conversations
- Click on a conversation in the sidebar
- Use `Ctrl+Tab` to cycle through conversations

#### Deleting Conversations
- Right-click on a conversation
- Select "Delete"
- Confirm deletion

## Settings

### Opening Settings

- Click the gear icon (⚙️) in the sidebar
- Or use `Ctrl+,` (Cmd+, on macOS)

### Server Configuration

#### Matrix Server
- **Server URL**: Your Matrix homeserver URL
- **Access Token**: Your Matrix access token
- **User ID**: Your Matrix user ID (auto-detected)

#### AI Configuration
- **Model Endpoint**: LLM API endpoint URL
- **API Key**: Your API key (encrypted)
- **Model**: Select AI model
- **Temperature**: Response creativity (0-1)

### Preferences

#### Theme
- **Dark** (default): Easy on the eyes
- **Light**: Traditional light theme

#### Language
- English
- 中文 (Chinese)

#### Notifications
- Enable/disable desktop notifications
- Sound on new message
- Show message preview

## Advanced Features

### System Tray

SmartClaw runs in the system tray when minimized:

- **Click icon**: Show/hide window
- **Right-click**: Context menu
  - Open SmartClaw
  - Hide to Tray
  - Quit

### Auto-Update

SmartClaw automatically checks for updates:

- **Check manually**: Settings → About → Check for Updates
- **Disable auto-update**: Settings → Advanced → Auto-update

### Data Management

#### Export Conversation
- Right-click conversation → Export
- Choose format: JSON or TXT
- Select save location

#### Import Conversation
- Settings → Data → Import
- Select conversation file
- Confirm import

#### Clear Data
- Settings → Data → Clear All Data
- This removes all conversations and settings

## Tips & Tricks

### Better AI Responses

1. **Be specific**: Clear questions get better answers
2. **Provide context**: Include relevant background
3. **Use examples**: Show what format you want

### Productivity

1. **Pin important conversations**: Right-click → Pin
2. **Search conversations**: `Ctrl+F` (coming soon)
3. **Quick reply**: Use arrow keys to navigate history

### Privacy

1. **Local storage**: All data stored locally by default
2. **Encrypted credentials**: API keys are encrypted
3. **No cloud sync**: Your conversations stay private

## Troubleshooting

### Common Issues

**AI not responding**
- Check API key is valid
- Verify internet connection
- Check model endpoint URL

**Can't connect to Matrix**
- Verify server URL
- Check access token
- Ensure server is online

**App running slow**
- Close unused conversations
- Clear old conversation history
- Check system resources

For more help, see [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)

## Next Steps

- Read [CONFIG.md](./CONFIG.md) for advanced configuration
- Check [CONTRIBUTING.md](./CONTRIBUTING.md) to contribute
- Report issues on [GitHub](https://github.com/nigel201611/SmartClaw/issues)
