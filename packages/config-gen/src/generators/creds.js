/**
 * Credential Storage Generator
 * 
 * Implements secure credential storage with encryption
 */

const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');

/**
 * Generate encrypted credentials file
 */
async function generateCredentials(config, outputDir) {
  const credentialsSubdir = path.join(outputDir, 'credentials', 'encrypted');
  await fs.ensureDir(credentialsSubdir);
  
  // Generate encryption key (in production, this should be from a secure source)
  const encryptionKey = crypto.randomBytes(32);
  const iv = crypto.randomBytes(16);
  
  // Credentials to encrypt
  const sensitiveData = {
    apiKey: config.apiKey || '',
    matrixAccessToken: generateRandomToken(32),
    matrixRegistrationSecret: generateRandomToken(32),
    minioAccessKey: 'smartclaw-admin',
    minioSecretKey: generateRandomToken(40),
    generatedAt: new Date().toISOString()
  };
  
  // Encrypt credentials
  const encrypted = encryptCredentials(sensitiveData, encryptionKey, iv);
  
  // Save encrypted credentials
  const encryptedPath = path.join(credentialsSubdir, '.env.enc');
  await fs.writeJson(encryptedPath, {
    data: encrypted.data,
    iv: iv.toString('hex'),
    algorithm: 'aes-256-cbc'
  }, { spaces: 2 });
  
  // Save decryption key separately (in production, use key management service)
  const keyPath = path.join(credentialsSubdir, '.key');
  await fs.writeFile(keyPath, encryptionKey.toString('hex'), 'utf8');
  
  // Generate .env template
  const envTemplate = generateEnvTemplate(config, sensitiveData);
  const envPath = path.join(outputDir, '.env.template');
  await fs.writeFile(envPath, envTemplate, 'utf8');
  
  console.log('✅ Generated: credentials/encrypted/.env.enc');
  console.log('✅ Generated: credentials/encrypted/.key');
  console.log('✅ Generated: .env.template');
  
  return {
    encrypted: true,
    path: encryptedPath
  };
}

/**
 * Encrypt credentials using AES-256-CBC
 */
function encryptCredentials(data, key, iv) {
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return { data: encrypted };
}

/**
 * Decrypt credentials
 */
function decryptCredentials(encryptedData, key, iv) {
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return JSON.parse(decrypted);
}

/**
 * Generate random token
 */
function generateRandomToken(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Generate .env template file
 */
function generateEnvTemplate(config, credentials) {
  return `# SmartClaw Environment Configuration
# Copy this file to .env and fill in your actual values

# Project Configuration
PROJECT_NAME=${config.projectName || 'smartclaw'}
WORKSPACE_PATH=${config.workspacePath || './workspace'}

# Matrix Server
MATRIX_HOMESERVER=${config.matrixServer || 'http://localhost:8008'}
MATRIX_ACCESS_TOKEN=${credentials.matrixAccessToken}
MATRIX_REGISTRATION_SECRET=${credentials.matrixRegistrationSecret}

# MinIO Storage
MINIO_ENDPOINT=http://127.0.0.1:9000
MINIO_BUCKET=smartclaw-storage
MINIO_ACCESS_KEY=${credentials.minioAccessKey}
MINIO_SECRET_KEY=${credentials.minioSecretKey}

# LLM Gateway (Higress)
LLM_ENDPOINT=${config.modelEndpoint || 'http://127.0.0.1:8001/openai/v1'}
API_KEY=<your-api-key-here>

# Encryption Key (store securely!)
ENCRYPTION_KEY=<store-your-encryption-key-securely>

# Docker Configuration
USE_DOCKER=${config.useDocker ? 'true' : 'false'}
`;
}

/**
 * Load and decrypt credentials
 */
async function loadCredentials(credentialsDir) {
  const encryptedPath = path.join(credentialsDir, '.env.enc');
  const keyPath = path.join(credentialsDir, '.key');
  
  if (!await fs.pathExists(encryptedPath) || !await fs.pathExists(keyPath)) {
    throw new Error('Credentials not found. Run config-gen init first.');
  }
  
  const encrypted = await fs.readJson(encryptedPath);
  const keyHex = await fs.readFile(keyPath, 'utf8');
  
  const key = Buffer.from(keyHex, 'hex');
  const iv = Buffer.from(encrypted.iv, 'hex');
  
  return decryptCredentials(encrypted.data, key, iv);
}

/**
 * Validate credentials exist
 */
async function validateCredentials(credentialsDir) {
  const encryptedPath = path.join(credentialsDir, 'encrypted', '.env.enc');
  const keyPath = path.join(credentialsDir, 'encrypted', '.key');
  
  const encryptedExists = await fs.pathExists(encryptedPath);
  const keyExists = await fs.pathExists(keyPath);
  
  return {
    valid: encryptedExists && keyExists,
    errors: [
      !encryptedExists ? 'Encrypted credentials file not found' : null,
      !keyExists ? 'Encryption key file not found' : null
    ].filter(Boolean)
  };
}

module.exports = {
  generateCredentials,
  encryptCredentials,
  decryptCredentials,
  generateRandomToken,
  generateEnvTemplate,
  loadCredentials,
  validateCredentials
};
