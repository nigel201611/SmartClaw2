/**
 * Crypto Utilities
 * 
 * Encryption and decryption utilities for secure credential storage
 */

const crypto = require('crypto');

const ALGORITHM = 'aes-256-cbc';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16;  // 128 bits

/**
 * Generate a random encryption key
 * @returns {Buffer} - Random 32-byte key
 */
function generateKey() {
  return crypto.randomBytes(KEY_LENGTH);
}

/**
 * Generate a random initialization vector
 * @returns {Buffer} - Random 16-byte IV
 */
function generateIV() {
  return crypto.randomBytes(IV_LENGTH);
}

/**
 * Encrypt data using AES-256-CBC
 * @param {string|Object} data - Data to encrypt
 * @param {Buffer|string} key - Encryption key (32 bytes)
 * @param {Buffer|string} iv - Initialization vector (16 bytes)
 * @returns {Object} - Encrypted data with IV
 */
function encrypt(data, key, iv) {
  const dataStr = typeof data === 'string' ? data : JSON.stringify(data);
  const keyBuffer = typeof key === 'string' ? Buffer.from(key, 'hex') : key;
  const ivBuffer = typeof iv === 'string' ? Buffer.from(iv, 'hex') : iv;
  
  const cipher = crypto.createCipheriv(ALGORITHM, keyBuffer, ivBuffer);
  let encrypted = cipher.update(dataStr, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  return {
    data: encrypted,
    iv: ivBuffer.toString('hex'),
    algorithm: ALGORITHM
  };
}

/**
 * Decrypt data using AES-256-CBC
 * @param {string} encryptedData - Hex-encoded encrypted data
 * @param {Buffer|string} key - Encryption key (32 bytes)
 * @param {Buffer|string} iv - Initialization vector (16 bytes)
 * @returns {string|Object} - Decrypted data
 */
function decrypt(encryptedData, key, iv) {
  const keyBuffer = typeof key === 'string' ? Buffer.from(key, 'hex') : key;
  const ivBuffer = typeof iv === 'string' ? Buffer.from(iv, 'hex') : iv;
  
  const decipher = crypto.createDecipheriv(ALGORITHM, keyBuffer, ivBuffer);
  let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  // Try to parse as JSON, otherwise return as string
  try {
    return JSON.parse(decrypted);
  } catch {
    return decrypted;
  }
}

/**
 * Hash a string using SHA-256
 * @param {string} data - Data to hash
 * @returns {string} - Hex-encoded hash
 */
function hash(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Generate a random token
 * @param {number} length - Token length in bytes
 * @returns {string} - Hex-encoded token
 */
function generateToken(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Derive a key from a password using PBKDF2
 * @param {string} password - Password
 * @param {string} salt - Salt
 * @param {number} iterations - Number of iterations
 * @returns {Buffer} - Derived key
 */
function deriveKey(password, salt, iterations = 100000) {
  return crypto.pbkdf2Sync(password, salt, iterations, KEY_LENGTH, 'sha256');
}

/**
 * Create HMAC for data integrity verification
 * @param {string} data - Data to sign
 * @param {Buffer|string} key - Secret key
 * @returns {string} - Hex-encoded HMAC
 */
function createHMAC(data, key) {
  const keyBuffer = typeof key === 'string' ? Buffer.from(key, 'hex') : key;
  return crypto.createHmac('sha256', keyBuffer).update(data).digest('hex');
}

/**
 * Verify HMAC
 * @param {string} data - Original data
 * @param {string} hmac - HMAC to verify
 * @param {Buffer|string} key - Secret key
 * @returns {boolean} - True if HMAC is valid
 */
function verifyHMAC(data, hmac, key) {
  const expectedHMAC = createHMAC(data, key);
  return crypto.timingSafeEqual(Buffer.from(hmac, 'hex'), Buffer.from(expectedHMAC, 'hex'));
}

module.exports = {
  generateKey,
  generateIV,
  encrypt,
  decrypt,
  hash,
  generateToken,
  deriveKey,
  createHMAC,
  verifyHMAC,
  ALGORITHM,
  KEY_LENGTH,
  IV_LENGTH
};
