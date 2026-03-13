/**
 * Higress Gateway Configuration Generator
 * 
 * Generates Higress gateway config with LLM provider routes
 */

const fs = require('fs-extra');
const path = require('path');

/**
 * Generate Higress gateway configuration
 */
async function generateHigressConfig(config, outputDir) {
  const higressConfig = {
    apiVersion: 'networking.higress.io/v1',
    kind: 'HigressConfig',
    metadata: {
      name: 'smartclaw-gateway',
      namespace: 'default'
    },
    spec: {
      http: {
        routes: [
          {
            name: 'llm-provider',
            match: {
              uri: {
                prefix: '/openai/v1'
              }
            },
            route: [
              {
                destination: {
                  host: 'llm-provider.default.svc.cluster.local',
                  port: {
                    number: 8000
                  }
                }
              }
            ]
          },
          {
            name: 'matrix-server',
            match: {
              uri: {
                prefix: '/_matrix'
              }
            },
            route: [
              {
                destination: {
                  host: 'matrix-server.default.svc.cluster.local',
                  port: {
                    number: 8008
                  }
                }
              }
            ]
          },
          {
            name: 'minio',
            match: {
              uri: {
                prefix: '/minio'
              }
            },
            route: [
              {
                destination: {
                  host: 'minio.default.svc.cluster.local',
                  port: {
                    number: 9000
                  }
                }
              }
            ]
          }
        ]
      },
      cors: {
        allowOrigins: ['*'],
        allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowHeaders: ['Content-Type', 'Authorization'],
        maxAge: '24h'
      },
      rateLimit: {
        enabled: true,
        requestsPerSecond: 100,
        burstSize: 200
      }
    }
  };

  const outputSubdir = path.join(outputDir, 'higress');
  await fs.ensureDir(outputSubdir);
  
  const outputPath = path.join(outputSubdir, 'config.yaml');
  await fs.writeFile(outputPath, generateYAML(higressConfig), 'utf8');
  
  console.log('✅ Generated: higress/config.yaml');
  return higressConfig;
}

/**
 * Simple YAML generator (without external dependency)
 */
function generateYAML(obj, indent = 0) {
  let yaml = '';
  const spaces = '  '.repeat(indent);
  
  for (const [key, value] of Object.entries(obj)) {
    if (Array.isArray(value)) {
      yaml += `${spaces}${key}:\n`;
      for (const item of value) {
        if (typeof item === 'object') {
          yaml += `${spaces}- ${Object.keys(item)[0]}:\n`;
          yaml += generateYAML(item, indent + 2);
        } else {
          yaml += `${spaces}- ${item}\n`;
        }
      }
    } else if (typeof value === 'object' && value !== null) {
      yaml += `${spaces}${key}:\n`;
      yaml += generateYAML(value, indent + 1);
    } else {
      yaml += `${spaces}${key}: ${value}\n`;
    }
  }
  
  return yaml;
}

/**
 * Validate Higress configuration
 */
async function validateHigressConfig(configPath) {
  try {
    const content = await fs.readFile(configPath, 'utf8');
    // Basic validation - check for required fields
    const hasRoutes = content.includes('routes:');
    const hasMetadata = content.includes('metadata:');
    
    return {
      valid: hasRoutes && hasMetadata,
      errors: hasRoutes && hasMetadata ? [] : ['Missing required fields']
    };
  } catch (err) {
    return {
      valid: false,
      errors: [`Failed to read config: ${err.message}`]
    };
  }
}

module.exports = {
  generateHigressConfig,
  validateHigressConfig,
  generateYAML
};
