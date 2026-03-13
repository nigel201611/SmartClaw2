# SmartClaw Agent Runtime

OpenClaw Agent runtime with Matrix SDK integration for real-time AI messaging.

## Features

- ✅ **Matrix SDK Integration** - Connect to Matrix homeserver
- ✅ **Real-time Messaging** - Listen and respond to messages
- ✅ **LLM Gateway** - Process messages through AI models
- ✅ **@mention Detection** - Respond when mentioned
- ✅ **Direct Messages** - Handle 1-on-1 conversations
- ✅ **Graceful Reconnection** - Auto-recover from network issues
- ✅ **Configurable** - Load from file or environment variables
- ✅ **Logging** - Console and file logging with levels

## Installation

```bash
# From project root
npm install

# Or install agent dependencies only
cd apps/agent
npm install
```

## Configuration

### Option 1: Run `smartclaw init`

```bash
npx smartclaw init
```

This generates configuration in `generated-configs/`.

### Option 2: Generate default config

```bash
npm run dev:agent -- --init
```

Creates `agent-config.json` with default values.

### Option 3: Environment Variables

```bash
export MATRIX_SERVER=http://matrix-local.hiclaw.io:18080
export MATRIX_USER_ID=@smartclaw:matrix-local.hiclaw.io:18080
export MATRIX_ACCESS_TOKEN=your_token_here
export GATEWAY_URL=http://127.0.0.1:8001
export GATEWAY_MODEL=hiclaw-gateway/qwen3.5-plus
```

## Usage

### Start the Agent

```bash
# Development mode (verbose logging)
npm run dev:agent

# Production mode
npm start --workspace=apps/agent

# Or directly
node apps/agent/src/index.js --dev
```

### Command Line Options

```bash
# Show help
node apps/agent/src/index.js --help

# Development mode
node apps/agent/src/index.js --dev

# Custom config file
node apps/agent/src/index.js --config ./my-config.json

# Generate default config
node apps/agent/src/index.js --init

# Show status
node apps/agent/src/index.js --status
```

## File Structure

```
apps/agent/
├── src/
│   ├── index.js           # Main entry point
│   ├── agent.js           # Agent core logic
│   ├── matrix-client.js   # Matrix SDK integration
│   ├── message-handler.js # Message processing
│   ├── config.js          # Configuration loader
│   └── logger.js          # Logging utility
├── package.json
└── README.md
```

## Configuration Options

```json
{
  "agent": {
    "id": "smartclaw-agent",
    "name": "SmartClaw Agent",
    "workspace": "./hiclaw-fs"
  },
  "matrix": {
    "server": "http://matrix-local.hiclaw.io:18080",
    "userId": "@smartclaw:matrix-local.hiclaw.io:18080",
    "accessToken": "YOUR_ACCESS_TOKEN",
    "rooms": ["!roomid:server.com"]
  },
  "gateway": {
    "url": "http://127.0.0.1:8001",
    "model": "hiclaw-gateway/qwen3.5-plus",
    "apiKey": null
  },
  "logging": {
    "level": "info",
    "file": "./logs"
  }
}
```

## How It Works

1. **Start**: Agent loads configuration and connects to Matrix
2. **Listen**: Joins rooms and listens for messages
3. **Process**: Detects @mentions and direct messages
4. **Respond**: Sends messages through LLM gateway
5. **Reply**: Posts response back to Matrix room

## Logging

- **Console**: Colored output with timestamps
- **File**: Optional file logging (configure with `LOG_FILE`)
- **Levels**: error, warn, info, debug (configure with `LOG_LEVEL`)

## Error Handling

- Automatic reconnection on network failures
- Graceful shutdown on SIGINT/SIGTERM
- Error messages sent back to Matrix room
- Detailed error logging for debugging

## Troubleshooting

### Connection Issues

```bash
# Check Matrix server is accessible
curl http://matrix-local.hiclaw.io:18080/_matrix/client/versions

# Verify access token
curl -X GET "http://matrix-local.hiclaw.io:18080/_matrix/client/r0/account/whoami?access_token=YOUR_TOKEN"
```

### LLM Gateway Issues

```bash
# Test gateway connection
curl http://127.0.0.1:8001/v1/models

# Check gateway logs
```

### Debug Mode

```bash
# Enable verbose logging
export LOG_LEVEL=debug
npm run dev:agent
```

## License

MIT
