# SmartClaw CLI

Command-line interface for SmartClaw auto-configuration and setup.

## Installation

```bash
# Install from root directory
npm install

# Or install CLI globally
npm install -g @smartclaw/cli
```

## Usage

### Interactive Setup Wizard

```bash
npx smartclaw init
```

Run the interactive setup wizard to configure SmartClaw for your environment.

### Generate Configuration

```bash
npx smartclaw config
npx smartclaw config -o ./my-configs
```

Generate configuration files for SmartClaw deployment.

### Validate Configuration

```bash
npx smartclaw validate
npx smartclaw validate -p /path/to/project
```

Validate existing SmartClaw configuration files.

### Health Check

```bash
npx smartclaw health
```

Run system health checks to ensure your environment is ready.

## Commands

| Command | Description |
|---------|-------------|
| `init` | Run interactive setup wizard |
| `config` | Generate configuration files |
| `validate` | Validate existing configuration |
| `health` | Run system health checks |
| `--help` | Show help message |
| `--version` | Show version number |

## Options

### config command
- `-o, --output <dir>` - Output directory for generated configs (default: `./generated-configs`)

### validate command
- `-p, --path <dir>` - Path to configuration directory (default: `.`)

## Example Workflow

```bash
# 1. Run setup wizard
npx smartclaw init

# 2. Generate additional configs
npx smartclaw config -o ./configs

# 3. Validate everything
npx smartclaw validate

# 4. Check system health
npx smartclaw health
```

## License

MIT
