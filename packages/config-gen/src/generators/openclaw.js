/**
 * OpenClaw Configuration Generator
 * 
 * Generates openclaw.json with agent runtime configuration
 */

const fs = require('fs-extra');
const path = require('path');

/**
 * Generate openclaw.json configuration
 */
async function generateOpenClawConfig(config, outputDir) {
  const openclawConfig = {
    version: '0.1.0',
    agent: {
      name: config.projectName || 'smartclaw',
      model: {
        provider: 'openai-compatible',
        endpoint: config.modelEndpoint || 'http://127.0.0.1:8001/openai/v1',
        name: 'qwen3.5-plus',
        temperature: 0.7,
        maxTokens: 4096
      },
      workspace: config.workspacePath || './workspace',
      memory: {
        enabled: true,
        path: './memory',
        maxEntries: 1000
      },
      skills: {
        enabled: true,
        directory: './skills'
      }
    },
    matrix: {
      homeserver: config.matrixServer || 'http://localhost:8008',
      userId: `@${config.projectName || 'smartclaw'}:localhost`,
      roomId: null,
      accessToken: '${MATRIX_ACCESS_TOKEN}'
    },
    storage: {
      type: config.useDocker ? 'docker' : 'local',
      minio: {
        endpoint: 'http://127.0.0.1:9000',
        bucket: 'smartclaw-storage',
        accessKey: '${MINIO_ACCESS_KEY}',
        secretKey: '${MINIO_SECRET_KEY}'
      }
    },
    gateway: {
      enabled: true,
      endpoint: 'http://127.0.0.1:8001',
      routes: {
        '/openai/v1': 'llm-provider',
        '/matrix': 'matrix-server'
      }
    },
    logging: {
      level: 'info',
      format: 'json',
      output: './logs/agent.log'
    }
  };

  const outputPath = path.join(outputDir, 'openclaw.json');
  await fs.ensureDir(path.dirname(outputPath));
  await fs.writeJson(outputPath, openclawConfig, { spaces: 2 });
  
  console.log('✅ Generated: openclaw.json');
  return openclawConfig;
}

/**
 * Validate openclaw.json configuration
 */
async function validateOpenClawConfig(configPath) {
  try {
    const config = await fs.readJson(configPath);
    const errors = [];
    
    if (!config.agent) errors.push('Missing "agent" configuration');
    if (!config.agent?.model?.endpoint) errors.push('Missing agent.model.endpoint');
    if (!config.matrix) errors.push('Missing "matrix" configuration');
    if (!config.storage) errors.push('Missing "storage" configuration');
    
    return {
      valid: errors.length === 0,
      errors
    };
  } catch (err) {
    return {
      valid: false,
      errors: [`Failed to read config: ${err.message}`]
    };
  }
}

module.exports = {
  generateOpenClawConfig,
  validateOpenClawConfig
};
