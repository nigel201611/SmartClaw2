#!/usr/bin/env node

/**
 * SmartClaw CLI - Auto-config wizard and setup tool
 * 
 * Usage:
 *   smartclaw init      - Run interactive setup wizard
 *   smartclaw config    - Generate configuration files
 *   smartclaw validate  - Validate existing configuration
 *   smartclaw health    - Run health checks
 */

const { Command } = require('commander');
const chalk = require('chalk');
const path = require('path');
const fs = require('fs-extra');

const program = new Command();

// Get package version
const packageJson = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../package.json'), 'utf-8')
);

program
  .name('smartclaw')
  .description('SmartClaw - Auto-configuring desktop chatbot agent')
  .version(packageJson.version);

// Import commands
const initCommand = require('./commands/init');
const configCommand = require('./commands/config');
const validateCommand = require('./commands/validate');
const healthCommand = require('./commands/health');

// Register commands
program
  .command('init')
  .description('Run interactive setup wizard')
  .action(initCommand);

program
  .command('config')
  .description('Generate configuration files')
  .option('-o, --output <dir>', 'Output directory for generated configs', './generated-configs')
  .action(configCommand);

program
  .command('validate')
  .description('Validate existing configuration')
  .option('-p, --path <dir>', 'Path to configuration directory', '.')
  .action(validateCommand);

program
  .command('health')
  .description('Run system health checks')
  .action(healthCommand);

// Handle unknown commands
program.on('command:*', () => {
  console.error(chalk.red(`Error: Unknown command '${program.args.join(' ')}'`));
  console.error('Run "smartclaw --help" to see available commands.');
  process.exit(1);
});

// Parse arguments
program.parse(process.argv);

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
