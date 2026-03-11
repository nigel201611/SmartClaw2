/**
 * Configuration Validator
 * 
 * Validates SmartClaw configuration files
 */

const fs = require('fs-extra');
const path = require('path');

/**
 * Validate all configurations in a directory
 */
async function validateAllConfigs(configDir) {
  const results = {
    valid: true,
    configs: {},
    errors: [],
    warnings: []
  };

  // Validate openclaw.json
  const openclawResult = await validateOpenClawConfig(configDir);
  results.configs.openclaw = openclawResult;
  if (!openclawResult.valid) {
    results.valid = false;
    results.errors.push(...openclawResult.errors);
  }
  results.warnings.push(...openclawResult.warnings);

  // Validate Higress config
  const higressResult = await validateHigressConfig(configDir);
  results.configs.higress = higressResult;
  if (!higressResult.valid) {
    results.valid = false;
    results.errors.push(...higressResult.errors);
  }

  // Validate Matrix config
  const matrixResult = await validateMatrixConfig(configDir);
  results.configs.matrix = matrixResult;
  if (!matrixResult.valid) {
    results.valid = false;
    results.errors.push(...matrixResult.errors);
  }

  // Validate credentials
  const credsResult = await validateCredentials(configDir);
  results.configs.credentials = credsResult;
  if (!credsResult.valid) {
    results.valid = false;
    results.errors.push(...credsResult.errors);
  }

  return results;
}

/**
 * Validate openclaw.json
 */
async function validateOpenClawConfig(configDir) {
  const result = { valid: true, errors: [], warnings: [] };
  const configPath = path.join(configDir, 'openclaw.json');

  try {
    if (!await fs.pathExists(configPath)) {
      result.valid = false;
      result.errors.push('openclaw.json not found');
      return result;
    }

    const config = await fs.readJson(configPath);

    // Required sections
    const requiredSections = ['agent', 'matrix', 'storage'];
    for (const section of requiredSections) {
      if (!config[section]) {
        result.valid = false;
        result.errors.push(`Missing required section: ${section}`);
      }
    }

    // Validate agent config
    if (config.agent) {
      if (!config.agent.model?.endpoint) {
        result.warnings.push('Agent model endpoint not configured');
      }
      if (!config.agent.workspace) {
        result.warnings.push('Agent workspace not configured');
      }
    }

    // Validate matrix config
    if (config.matrix) {
      if (!config.matrix.homeserver) {
        result.warnings.push('Matrix homeserver not configured');
      }
      if (config.matrix.accessToken?.includes('${')) {
        result.warnings.push('Matrix access token uses placeholder - needs to be set');
      }
    }

    // Validate storage config
    if (config.storage) {
      if (!config.storage.minio?.endpoint) {
        result.warnings.push('MinIO endpoint not configured');
      }
    }

  } catch (error) {
    result.valid = false;
    result.errors.push(`Failed to read openclaw.json: ${error.message}`);
  }

  return result;
}

/**
 * Validate Higress configuration
 */
async function validateHigressConfig(configDir) {
  const result = { valid: true, errors: [], warnings: [] };
  const configPath = path.join(configDir, 'higress', 'config.yaml');

  try {
    if (!await fs.pathExists(configPath)) {
      result.valid = false;
      result.errors.push('higress/config.yaml not found');
      return result;
    }

    const content = await fs.readFile(configPath, 'utf8');

    // Basic validation
    if (!content.includes('routes:')) {
      result.warnings.push('No routes configured in Higress config');
    }
    if (!content.includes('metadata:')) {
      result.warnings.push('Missing metadata in Higress config');
    }

  } catch (error) {
    result.valid = false;
    result.errors.push(`Failed to read Higress config: ${error.message}`);
  }

  return result;
}

/**
 * Validate Matrix configuration
 */
async function validateMatrixConfig(configDir) {
  const result = { valid: true, errors: [], warnings: [] };
  const configPath = path.join(configDir, 'matrix', 'homeserver.yaml');

  try {
    if (!await fs.pathExists(configPath)) {
      result.valid = false;
      result.errors.push('matrix/homeserver.yaml not found');
      return result;
    }

    const content = await fs.readFile(configPath, 'utf8');

    // Required fields
    if (!content.includes('server_name:')) {
      result.valid = false;
      result.errors.push('Missing server_name in Matrix config');
    }
    if (!content.includes('database:')) {
      result.warnings.push('Database not configured in Matrix config');
    }
    if (content.includes('${REGISTRATION_SHARED_SECRET}')) {
      result.warnings.push('Registration secret uses placeholder - needs to be set');
    }

  } catch (error) {
    result.valid = false;
    result.errors.push(`Failed to read Matrix config: ${error.message}`);
  }

  return result;
}

/**
 * Validate credentials
 */
async function validateCredentials(configDir) {
  const result = { valid: true, errors: [], warnings: [] };
  const encryptedPath = path.join(configDir, 'credentials', 'encrypted', '.env.enc');
  const keyPath = path.join(configDir, 'credentials', 'encrypted', '.key');

  try {
    const encryptedExists = await fs.pathExists(encryptedPath);
    const keyExists = await fs.pathExists(keyPath);

    if (!encryptedExists) {
      result.valid = false;
      result.errors.push('Encrypted credentials file not found');
    }
    if (!keyExists) {
      result.valid = false;
      result.errors.push('Encryption key file not found');
    }

    if (encryptedExists && keyExists) {
      // Try to decrypt and validate
      try {
        const encrypted = await fs.readJson(encryptedPath);
        const keyHex = await fs.readFile(keyPath, 'utf8');
        
        if (!encrypted.data || !encrypted.iv || !encrypted.algorithm) {
          result.warnings.push('Encrypted credentials file may be corrupted');
        }
      } catch (error) {
        result.warnings.push(`Could not validate encrypted credentials: ${error.message}`);
      }
    }

  } catch (error) {
    result.valid = false;
    result.errors.push(`Failed to validate credentials: ${error.message}`);
  }

  return result;
}

/**
 * Quick validation (check files exist)
 */
async function quickValidate(configDir) {
  const requiredFiles = [
    'openclaw.json',
    'higress/config.yaml',
    'matrix/homeserver.yaml'
  ];

  const missing = [];
  for (const file of requiredFiles) {
    const filePath = path.join(configDir, file);
    if (!await fs.pathExists(filePath)) {
      missing.push(file);
    }
  }

  return {
    valid: missing.length === 0,
    missing
  };
}

module.exports = {
  validateAllConfigs,
  validateOpenClawConfig,
  validateHigressConfig,
  validateMatrixConfig,
  validateCredentials,
  quickValidate
};
