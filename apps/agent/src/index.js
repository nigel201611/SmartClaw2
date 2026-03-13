#!/usr/bin/env node

/**
 * SmartClaw Agent - Main Entry Point
 * 
 * Usage:
 *   node src/index.js              # Start agent
 *   node src/index.js --dev        # Development mode
 *   node src/index.js --help       # Show help
 */

const { Command } = require('commander');
const path = require('path');
const logger = require('./logger');
const { loadConfig } = require('./config');
const Agent = require('./agent');

const program = new Command();

program
  .name('smartclaw-agent')
  .description('SmartClaw OpenClaw Agent Runtime')
  .version('1.0.0');

program
  .option('-c, --config <path>', 'Path to configuration file')
  .option('--dev', 'Development mode (verbose logging)')
  .option('--status', 'Show agent status and exit')
  .option('--init', 'Generate default configuration');

program.parse(process.argv);

const options = program.opts();

// Main function
async function main() {
  try {
    // Handle --init
    if (options.init) {
      await generateDefaultConfig();
      return;
    }

    // Handle --status
    if (options.status) {
      console.log('Agent status: Not running (start with: npm start)');
      return;
    }

    // Set development mode
    if (options.dev) {
      process.env.LOG_LEVEL = 'debug';
      logger.info('Development mode enabled');
    }

    // Load configuration
    const config = await loadConfig(options.config);
    
    // Update logger config
    if (config.logging?.level) {
      process.env.LOG_LEVEL = config.logging.level;
    }
    if (config.logging?.file) {
      process.env.LOG_FILE = config.logging.file;
    }

    // Create and start agent
    const agent = new Agent(config);
    
    // Setup graceful shutdown
    setupGracefulShutdown(agent);

    // Start the agent
    await agent.start();

    // Keep process running
    logger.info('Agent is running. Press Ctrl+C to stop.');
    
  } catch (error) {
    logger.error(`Fatal error: ${error.message}`);
    logger.error(error.stack);
    process.exit(1);
  }
}

/**
 * Generate default configuration file
 */
async function generateDefaultConfig() {
  const fs = require('fs-extra');
  const defaultConfig = {
    agent: {
      id: 'smartclaw-agent',
      name: 'SmartClaw Agent',
      workspace: './hiclaw-fs'
    },
    matrix: {
      server: 'http://matrix-local.hiclaw.io:18080',
      userId: '@smartclaw:matrix-local.hiclaw.io:18080',
      accessToken: 'YOUR_ACCESS_TOKEN',
      rooms: []
    },
    gateway: {
      url: 'http://127.0.0.1:8001',
      model: 'hiclaw-gateway/qwen3.5-plus',
      apiKey: null
    },
    logging: {
      level: 'info',
      file: './logs'
    }
  };

  const configPath = './agent-config.json';
  await fs.writeJson(configPath, defaultConfig, { spaces: 2 });
  console.log(`Default configuration generated: ${configPath}`);
  console.log('Please edit this file with your Matrix credentials and settings.');
}

/**
 * Setup graceful shutdown handlers
 */
function setupGracefulShutdown(agent) {
  const shutdown = async (signal) => {
    logger.info(`Received ${signal}, shutting down gracefully...`);
    try {
      await agent.stop();
      logger.info('Shutdown complete');
      process.exit(0);
    } catch (error) {
      logger.error(`Error during shutdown: ${error.message}`);
      process.exit(1);
    }
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  // Handle uncaught errors
  process.on('uncaughtException', (error) => {
    logger.error(`Uncaught exception: ${error.message}`);
    logger.error(error.stack);
    process.exit(1);
  });

  process.on('unhandledRejection', (reason, promise) => {
    logger.error(`Unhandled rejection at ${promise}: ${reason}`);
  });
}

// Run main function
main();
