/**
 * Matrix Server Configuration Generator
 * 
 * Generates Matrix homeserver configuration
 */

const fs = require('fs-extra');
const path = require('path');

/**
 * Generate Matrix homeserver configuration
 */
async function generateMatrixConfig(config, outputDir) {
  const serverName = config.matrixServer ? new URL(config.matrixServer).hostname : 'localhost';
  
  const matrixConfig = {
    server_name: serverName,
    public_baseurl: config.matrixServer || 'http://localhost:8008',
    bind_addresses: ['::1', '127.0.0.1'],
    port: 8008,
    
    database: {
      name: 'sqlite3',
      args: {
        database: './homeserver.db'
      }
    },
    
    log_config: 'smartclaw.log.config',
    
    media_store_path: './media_store',
    uploads_path: './uploads',
    
    max_upload_size: '50M',
    max_image_pixels: '32M',
    
    registration_shared_secret: '${REGISTRATION_SHARED_SECRET}',
    
    bcrypt_rounds: 12,
    
    allow_guest_access: false,
    
    enable_registration: true,
    enable_registration_captcha: false,
    
    password_config: {
      enabled: true,
      localdb_enabled: true,
      minimum_length: 8
    },
    
    rc_message: {
      per_second: 0.17,
      burst_count: 3
    },
    
    rc_login: {
      address: {
        per_second: 0.17,
        burst_count: 3
      },
      account: {
        per_second: 0.17,
        burst_count: 3
      },
      failed_attempts: {
        per_second: 0.17,
        burst_count: 3
      }
    },
    
    rc_registration: {
      per_second: 0.17,
      burst_count: 3
    },
    
    rc_3pid_validation: {
      per_second: 0.17,
      burst_count: 3
    },
    
    federation_domain_whitelist: [],
    federation_sender_worker_replication: {
      host: '127.0.0.1',
      port: 9093
    },
    
    app_service_config_files: [],
    
    enable_metrics: false,
    log_metrics: false,
    
    signing_key_path: './smartclaw.signing.key',
    trusted_key_servers: [
      {
        server_name: 'matrix.org'
      }
    ],
    
    report_stats: false,
    
    macaroon_secret_key_path: './shared_secret.macaroon',
    
    experimental_features: {
      msc3026_enabled: false,
      msc2716_enabled: false
    }
  };

  const outputSubdir = path.join(outputDir, 'matrix');
  await fs.ensureDir(outputSubdir);
  
  const outputPath = path.join(outputSubdir, 'homeserver.yaml');
  await fs.writeFile(outputPath, generateYAML(matrixConfig), 'utf8');
  
  // Generate log config
  const logConfigPath = path.join(outputSubdir, 'smartclaw.log.config');
  await fs.writeFile(logConfigPath, generateLogConfig(), 'utf8');
  
  console.log('✅ Generated: matrix/homeserver.yaml');
  console.log('✅ Generated: matrix/smartclaw.log.config');
  
  return matrixConfig;
}

/**
 * Generate Matrix log configuration
 */
function generateLogConfig() {
  return `version: 1
formatters:
  precise:
    format: '%(asctime)s - %(name)s - %(lineno)d - %(levelname)s - %(message)s'
handlers:
  console:
    class: logging.StreamHandler
    formatter: precise
    stream: ext://sys.stdout
  file:
    class: logging.handlers.RotatingFileHandler
    formatter: precise
    filename: 'homeserver.log'
    maxBytes: 104857600
    backupCount: 3
    encoding: utf8
root:
  level: INFO
  handlers: [console, file]
disable_existing_loggers: false
`;
}

/**
 * Simple YAML generator
 */
function generateYAML(obj, indent = 0) {
  let yaml = '';
  const spaces = '  '.repeat(indent);
  
  for (const [key, value] of Object.entries(obj)) {
    if (Array.isArray(value)) {
      if (value.length === 0) {
        yaml += `${spaces}${key}: []\n`;
      } else {
        yaml += `${spaces}${key}:\n`;
        for (const item of value) {
          if (typeof item === 'object') {
            const firstKey = Object.keys(item)[0];
            yaml += `${spaces}  - ${firstKey}:\n`;
            yaml += generateYAML({ [firstKey]: item[firstKey] }, indent + 3);
            // Handle remaining keys
            for (const [k, v] of Object.entries(item)) {
              if (k !== firstKey) {
                yaml += generateYAML({ [k]: v }, indent + 2);
              }
            }
          } else {
            yaml += `${spaces}  - ${item}\n`;
          }
        }
      }
    } else if (typeof value === 'object' && value !== null) {
      yaml += `${spaces}${key}:\n`;
      yaml += generateYAML(value, indent + 1);
    } else if (typeof value === 'string' && value.includes('\n')) {
      yaml += `${spaces}${key}: |\n`;
      yaml += value.split('\n').map(line => `${spaces}    ${line}`).join('\n') + '\n';
    } else {
      yaml += `${spaces}${key}: ${value}\n`;
    }
  }
  
  return yaml;
}

/**
 * Validate Matrix configuration
 */
async function validateMatrixConfig(configPath) {
  try {
    const content = await fs.readFile(configPath, 'utf8');
    const hasServerName = content.includes('server_name:');
    const hasDatabase = content.includes('database:');
    
    return {
      valid: hasServerName && hasDatabase,
      errors: hasServerName && hasDatabase ? [] : ['Missing required fields']
    };
  } catch (err) {
    return {
      valid: false,
      errors: [`Failed to read config: ${err.message}`]
    };
  }
}

module.exports = {
  generateMatrixConfig,
  validateMatrixConfig,
  generateYAML,
  generateLogConfig
};
