#!/usr/bin/env node

/**
 * Environment Detection Module
 * 
 * Detects OS, Docker availability, port status, Node.js version, and existing configs
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const net = require('net');
const path = require('path');
const fs = require('fs-extra');

const execAsync = promisify(exec);

const COMMON_PORTS = {
  '8001': 'Higress Gateway',
  '8080': 'HTTP Proxy',
  '9000': 'MinIO',
  '6167': 'Matrix Server',
  '3030': 'Web UI'
};

/**
 * Detect operating system
 */
function detectOS() {
  const platform = process.platform;
  const arch = process.arch;
  
  let osName = platform;
  if (platform === 'win32') osName = 'Windows';
  else if (platform === 'darwin') osName = 'macOS';
  else if (platform === 'linux') osName = 'Linux';
  
  return `${osName} (${arch})`;
}

/**
 * Get Node.js version
 */
function getNodeVersion() {
  return process.version;
}

/**
 * Check if Node.js version meets requirements (>= 18.0.0)
 */
function checkNodeVersion() {
  const version = process.version.slice(1); // Remove 'v' prefix
  const [major] = version.split('.').map(Number);
  return {
    version,
    meetsRequirement: major >= 18
  };
}

/**
 * Check if Docker is available
 */
async function checkDocker() {
  try {
    await execAsync('docker --version');
    try {
      await execAsync('docker ps');
      return { available: true, running: true };
    } catch {
      return { available: true, running: false };
    }
  } catch {
    return { available: false, running: false };
  }
}

/**
 * Check if a port is available
 */
function checkPort(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(parseInt(port), () => {
      server.once('close', () => resolve(true));
      server.close();
    });
    server.on('error', () => resolve(false));
  });
}

/**
 * Check all common ports
 */
async function checkPorts() {
  const results = {};
  for (const port of Object.keys(COMMON_PORTS)) {
    results[port] = await checkPort(port);
  }
  return results;
}

/**
 * Detect existing OpenClaw/HiClaw installations
 */
async function detectExistingConfigs() {
  const possiblePaths = [
    path.join(process.env.HOME || '.', '.openclaw', 'config.json'),
    path.join(process.env.HOME || '.', 'hiclaw', 'config.json'),
    '/etc/openclaw/config.json',
    '/opt/openclaw/config.json'
  ];

  const existing = [];
  for (const configPath of possiblePaths) {
    if (await fs.pathExists(configPath)) {
      existing.push(configPath);
    }
  }
  return existing;
}

/**
 * Main detection function
 */
async function detectEnvironment() {
  const nodeCheck = checkNodeVersion();
  
  const results = {
    os: detectOS(),
    nodeVersion: nodeCheck.version,
    nodeMeetsRequirement: nodeCheck.meetsRequirement,
    docker: await checkDocker(),
    ports: await checkPorts(),
    existingConfigs: await detectExistingConfigs(),
    timestamp: new Date().toISOString()
  };

  return results;
}

// Export for use in other modules
module.exports = {
  detectEnvironment,
  detectOS,
  getNodeVersion,
  checkNodeVersion,
  checkDocker,
  checkPort,
  checkPorts,
  detectExistingConfigs,
  COMMON_PORTS
};

// CLI mode when run directly
if (require.main === module) {
  (async () => {
    console.log('📊 SmartClaw Environment Detection\n');
    const env = await detectEnvironment();
    
    console.log('Operating System:', env.os);
    console.log('Node.js Version:', env.nodeVersion);
    console.log('Node.js OK:', env.nodeMeetsRequirement ? '✅' : '❌');
    console.log('Docker Available:', env.docker.available ? '✅' : '❌');
    console.log('Docker Running:', env.docker.running ? '✅' : '❌');
    console.log('\nPort Availability:');
    for (const [port, service] of Object.entries(COMMON_PORTS)) {
      const status = env.ports[port] ? '🟢 Free' : '🔴 In use';
      console.log(`  ${port} (${service}): ${status}`);
    }
    
    if (env.existingConfigs.length > 0) {
      console.log('\nExisting Configurations Found:');
      env.existingConfigs.forEach(p => console.log(`  - ${p}`));
    }
    
    console.log('\nDetection completed at:', env.timestamp);
  })();
}
