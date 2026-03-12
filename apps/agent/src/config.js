#!/usr/bin/env node

/**
 * SmartClaw Agent Configuration Loader
 * 
 * Loads and validates configuration from:
 * 1. Generated config file (from smartclaw init)
 * 2. Environment variables
 * 3. Default values
 */

const fs = require('fs-extra');
const path = require('path');
const logger = require('./logger');

// Default configuration
const defaultConfig = {
  agent: {
    id: 'smartclaw-agent',
    name: 'SmartClaw Agent',
    workspace: path.join(process.env.HOME || '.', 'hiclaw-fs')
  },
  matrix: {
    server: 'http://matrix-local.hiclaw.io:18080',
    userId: '@smartclaw:matrix-local.hiclaw.io:18080',
    accessToken: null,
    rooms: []
  },
  gateway: {
    url: 'http://127.0.0.1:8001',
    model: 'hiclaw-gateway/qwen3.5-plus',
    apiKey: null
  },
  logging: {
    level: 'info',
    file: null
  }
};

/**
 * Load configuration from file and environment
 */
async function loadConfig(configPath = null) {
  logger.info('Loading configuration...');
  
  const config = { ...defaultConfig };
  
  // Try to load from generated config file
  const configFiles = [
    configPath,
    './generated-configs/smartclaw-config.json',
    './generated-configs/openclaw.json',
    path.join(process.env.HOME || '.', 'hiclaw-fs', 'agents', 'smartclaw', 'config.json')
  ].filter(Boolean);
  
  for (const file of configFiles) {
    try {
      if (await fs.pathExists(file)) {
        const loaded = await fs.readJson(file);
        mergeConfig(config, loaded);
        logger.info(`Configuration loaded from: ${file}`);
        break;
      }
    } catch (error) {
      logger.warn(`Failed to load config from ${file}: ${error.message}`);
    }
  }
  
  // Override with environment variables
  overrideFromEnv(config);
  
  // Validate configuration
  validateConfig(config);
  
  logger.info('Configuration loaded successfully');
  return config;
}

/**
 * Merge loaded config with defaults
 */
function mergeConfig(target, source) {
  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      target[key] = target[key] || {};
      mergeConfig(target[key], source[key]);
    } else {
      target[key] = source[key];
    }
  }
}

/**
 * Override config with environment variables
 */
function overrideFromEnv(config) {
  const envMap = {
    'MATRIX_SERVER': ['matrix', 'server'],
    'MATRIX_USER_ID': ['matrix', 'userId'],
    'MATRIX_ACCESS_TOKEN': ['matrix', 'accessToken'],
    'GATEWAY_URL': ['gateway', 'url'],
    'GATEWAY_MODEL': ['gateway', 'model'],
    'GATEWAY_API_KEY': ['gateway', 'apiKey'],
    'LOG_LEVEL': ['logging', 'level'],
    'LOG_FILE': ['logging', 'file']
  };
  
  for (const [envVar, configPath] of Object.entries(envMap)) {
    if (process.env[envVar]) {
      let target = config;
      for (let i = 0; i < configPath.length - 1; i++) {
        target = target[configPath[i]];
      }
      target[configPath[configPath.length - 1]] = process.env[envVar];
      logger.debug(`Override ${envVar} from environment`);
    }
  }
}

/**
 * Validate required configuration
 */
function validateConfig(config) {
  const required = [
    ['matrix', 'server'],
    ['gateway', 'url']
  ];
  
  for (const [section, key] of required) {
    if (!config[section]?.[key]) {
      throw new Error(`Missing required config: ${section}.${key}`);
    }
  }
  
  logger.info('Configuration validation passed');
}

module.exports = {
  loadConfig,
  defaultConfig
};
