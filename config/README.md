# SmartClaw Conduit Configuration

## Files

- `conduit.toml` - Main Conduit server configuration
- `.env.example` - Environment variable template

## Configuration Options

### Network

| Setting | Default | Description |
|---------|---------|-------------|
| `port` | 8008 | HTTP port for Matrix client connections |
| `address` | 0.0.0.0 | Bind address (localhost for single-user) |
| `federation` | false | Disable federation (local-only mode) |

### Security

| Setting | Default | Description |
|---------|---------|-------------|
| `allow_registration` | true | Allow new user registration |
| `allow_join_requests` | false | Disable room join requests (local-only) |
| `enable_encryption` | true | Enable end-to-end encryption |
| `allow_tls` | false | TLS not needed for localhost |

### Performance

| Setting | Default | Description |
|---------|---------|-------------|
| `max_request_size` | 100MB | Maximum file upload size |
| `concurrent_request_limit` | 50 | Max concurrent requests per user |
| `max_concurrent_requests` | 100 | Global concurrent request limit |
| `memory_limit` | 100MB | Docker memory limit |

### Logging

| Setting | Default | Description |
|---------|---------|-------------|
| `log_level` | info | Log verbosity (debug/info/warn/error) |

## Changing the Port

If port 8008 is in use:

1. Edit `.env` file:
   ```
   MATRIX_PORT=8009
   ```

2. Or pass environment variable:
   ```bash
   MATRIX_PORT=8009 docker-compose up -d
   ```

## Data Persistence

Conduit data is stored in:
```
./data/conduit/  (mounted to /var/lib/matrix-conduit)
```

This directory contains:
- User accounts
- Room data
- Messages
- Encryption keys

**Backup**: Copy this directory to preserve all data.

## Troubleshooting

### Check container status
```bash
docker ps | grep smartclaw-matrix
```

### View logs
```bash
docker logs smartclaw-matrix
```

### Test health endpoint
```bash
curl http://localhost:8008/_matrix/client/versions
```

### Restart container
```bash
docker-compose restart
```

### Reset (warning: deletes all data)
```bash
docker-compose down
rm -rf data/conduit/*
docker-compose up -d
```

## References

- [Conduit Documentation](https://conduit.rs/)
- [Conduit GitHub](https://github.com/matrix-conduit/conduit)
- [Docker Compose Reference](https://docs.docker.com/compose/)
