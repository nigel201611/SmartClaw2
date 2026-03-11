# SmartClaw Configuration Guide

Advanced configuration options for SmartClaw.

## Configuration Files

### openclaw.json

Main configuration file located in `generated-configs/openclaw.json`.

```json
{
  "version": "1.0.0",
  "agent": {
    "name": "smartclaw",
    "model": {
      "provider": "openai-compatible",
      "endpoint": "http://127.0.0.1:8001/openai/v1",
      "name": "qwen3.5-plus",
      "temperature": 0.7,
      "maxTokens": 4096
    },
    "workspace": "./workspace",
    "memory": {
      "enabled": true,
      "path": "./memory",
      "maxEntries": 1000
    }
  },
  "matrix": {
    "homeserver": "http://localhost:8008",
    "userId": "@smartclaw:localhost",
    "accessToken": "${MATRIX_ACCESS_TOKEN}"
  },
  "storage": {
    "type": "local",
    "minio": {
      "endpoint": "http://127.0.0.1:9000",
      "bucket": "smartclaw-storage"
    }
  }
}
```

### Configuration Options

#### Agent Settings

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `agent.name` | string | "smartclaw" | Agent identifier |
| `agent.model.provider` | string | "openai-compatible" | Model provider |
| `agent.model.endpoint` | string | - | LLM API endpoint |
| `agent.model.name` | string | "qwen3.5-plus" | Model name |
| `agent.model.temperature` | number | 0.7 | Response creativity (0-1) |
| `agent.model.maxTokens` | number | 4096 | Max tokens in response |
| `agent.workspace` | string | "./workspace" | Workspace directory |
| `agent.memory.enabled` | boolean | true | Enable memory |
| `agent.memory.maxEntries` | number | 1000 | Max memory entries |

#### Matrix Settings

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `matrix.homeserver` | string | - | Matrix server URL |
| `matrix.userId` | string | - | Matrix user ID |
| `matrix.accessToken` | string | - | Access token (use env var) |
| `matrix.roomId` | string | null | Default room ID |

#### Storage Settings

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `storage.type` | string | "local" | Storage type |
| `storage.minio.endpoint` | string | - | MinIO endpoint |
| `storage.minio.bucket` | string | "smartclaw-storage" | MinIO bucket |

## Environment Variables

Use environment variables for sensitive data:

```bash
# Matrix
export MATRIX_ACCESS_TOKEN=your_token_here
export MATRIX_HOMESERVER=https://matrix.example.com

# MinIO
export MINIO_ACCESS_KEY=your_access_key
export MINIO_SECRET_KEY=your_secret_key

# LLM
export LLM_API_KEY=your_api_key
export LLM_ENDPOINT=https://api.example.com/v1
```

## Command Line Options

### SmartClaw CLI

```bash
# Run setup wizard
smartclaw init

# Generate configs
smartclaw config

# Validate configs
smartclaw validate

# Health check
smartclaw health

# Show environment info
smartclaw detect
```

### Desktop App Options

```bash
# Development mode
smartclaw --dev

# Disable GPU acceleration
smartclaw --disable-gpu

# Custom config directory
smartclaw --config-dir=/path/to/config

# Log level
smartclaw --log-level=debug
```

## Advanced Configuration

### Custom Model Provider

Add custom model provider to `openclaw.json`:

```json
{
  "agent": {
    "model": {
      "provider": "custom",
      "endpoint": "https://your-api.com/v1",
      "headers": {
        "Authorization": "Bearer ${CUSTOM_API_KEY}"
      }
    }
  }
}
```

### Proxy Configuration

Configure proxy for corporate networks:

```json
{
  "network": {
    "proxy": {
      "enabled": true,
      "host": "proxy.example.com",
      "port": 8080,
      "username": "${PROXY_USER}",
      "password": "${PROXY_PASS}"
    }
  }
}
```

### Custom Themes

Add custom CSS theme:

1. Create `custom-theme.css` in config directory
2. Add to settings:

```json
{
  "ui": {
    "theme": "custom",
    "customCss": "./custom-theme.css"
  }
}
```

## Security Considerations

### Credential Storage

- Credentials are encrypted using AES-256-CBC
- Encryption key stored separately from encrypted data
- Never commit credentials to version control

### Network Security

- Use HTTPS for all external connections
- Verify SSL certificates
- Configure firewall rules for local services

### File Permissions

Ensure proper file permissions:

```bash
# Config files
chmod 600 generated-configs/openclaw.json
chmod 600 generated-configs/credentials/encrypted/.env.enc
chmod 600 generated-configs/credentials/encrypted/.key
```

## Backup and Restore

### Backup Configuration

```bash
# Create backup
tar -czf smartclaw-backup-$(date +%Y%m%d).tar.gz \
  generated-configs/ \
  ~/.config/SmartClaw/
```

### Restore Configuration

```bash
# Extract backup
tar -xzf smartclaw-backup-20260311.tar.gz -C ~/
```

## Troubleshooting

### Config Not Loading

1. Check file exists: `ls generated-configs/openclaw.json`
2. Validate JSON: `cat openclaw.json | python -m json.tool`
3. Check permissions: `ls -la openclaw.json`

### Environment Variables Not Working

1. Verify variable is set: `echo $VARIABLE_NAME`
2. Check for typos in variable names
3. Restart application after setting variables

For more help, see [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
