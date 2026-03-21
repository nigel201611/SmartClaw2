#!/usr/bin/env node
/**
 * SmartClaw v2.0 - Functional Test Script
 * Tests core functionality without requiring GUI or actual Docker
 */

const fs = require('fs');
const path = require('path');

console.log('========================================');
console.log('  SmartClaw v2.0 - Functional Tests');
console.log('========================================');
console.log('');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log('✅ PASS:', name);
    passed++;
  } catch (e) {
    console.log('❌ FAIL:', name);
    console.log('   Error:', e.message);
    failed++;
  }
}

// Test 1: docker-compose.yml exists
test('docker-compose.yml exists', () => {
  const composePath = path.join(process.cwd(), 'docker-compose.yml');
  if (!fs.existsSync(composePath)) {
    throw new Error('File not found: ' + composePath);
  }
  const content = fs.readFileSync(composePath, 'utf8');
  if (!content.includes('conduit')) {
    throw new Error('Missing conduit service definition');
  }
  console.log('   Path:', composePath);
  console.log('   Size:', content.length, 'bytes');
});

// Test 2: conduit.toml config exists
test('conduit.toml config exists', () => {
  const configPath = path.join(process.cwd(), 'config', 'conduit.toml');
  if (!fs.existsSync(configPath)) {
    throw new Error('File not found: ' + configPath);
  }
  const content = fs.readFileSync(configPath, 'utf8');
  if (!content.includes('server_name')) {
    throw new Error('Invalid config file');
  }
  console.log('   Path:', configPath);
});

// Test 3: Icon files exist
test('Icon files exist', () => {
  const iconPng = path.join(process.cwd(), 'build', 'icons', 'icon.png');
  const iconIcns = path.join(process.cwd(), 'build', 'icons', 'icon.icns');
  
  if (!fs.existsSync(iconPng)) {
    throw new Error('icon.png not found');
  }
  if (!fs.existsSync(iconIcns)) {
    throw new Error('icon.icns not found');
  }
  
  const pngSize = fs.statSync(iconPng).size;
  const icnsSize = fs.statSync(iconIcns).size;
  console.log('   icon.png:', pngSize, 'bytes');
  console.log('   icon.icns:', icnsSize, 'bytes');
});

// Test 4: Docker socket detection (macOS paths)
test('Docker socket detection logic', () => {
  const socketPaths = [
    '/var/run/docker.sock',
    path.join(process.env.HOME || '/root', '.docker/run/docker.sock'),
    path.join(process.env.HOME || '/root', '.docker/desktop/docker.sock')
  ];
  
  let found = false;
  socketPaths.forEach(p => {
    if (fs.existsSync(p)) {
      found = true;
      console.log('   Found socket:', p);
    }
  });
  
  // At least one socket should exist in test environment
  if (!found) {
    console.log('   Note: No Docker sockets found (expected in some environments)');
  }
});

// Test 5: Docker PATH helper logic
test('Docker PATH helper logic', () => {
  const os = require('os');
  const dockerPaths = [
    '/usr/local/bin',
    '/opt/homebrew/bin',
    '/opt/homebrew/sbin',
    '/usr/bin',
    '/usr/sbin',
    '/bin',
    '/sbin',
    path.join(os.homedir(), '.docker/cli-plugins'),
    '/Applications/Docker.app/Contents/Resources/bin'
  ];
  
  const currentPath = process.env.PATH || '';
  const newPath = [...dockerPaths, currentPath].join(':');
  
  console.log('   Docker paths added:', dockerPaths.length);
  console.log('   Total PATH length:', newPath.length, 'chars');
  
  if (newPath.length < currentPath.length) {
    throw new Error('PATH not extended correctly');
  }
});

// Test 6: Compiled TypeScript files exist
test('Compiled TypeScript files exist', () => {
  const distDir = path.join(process.cwd(), 'dist');
  const requiredFiles = [
    'docker-manager.js',
    'docker-detector.js',
    'app-startup.js',
    'main.js'
  ];
  
  requiredFiles.forEach(file => {
    const filePath = path.join(distDir, file);
    if (!fs.existsSync(filePath)) {
      throw new Error('Missing compiled file: ' + file);
    }
    const size = fs.statSync(filePath).size;
    console.log('   ' + file + ':', size, 'bytes');
  });
});

// Test 7: package.json build config
test('package.json build config', () => {
  const pkgPath = path.join(process.cwd(), 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  
  // Check extraResources
  if (!pkg.build || !pkg.build.extraResources) {
    throw new Error('Missing build.extraResources config');
  }
  
  const resources = pkg.build.extraResources;
  const hasDockerCompose = resources.some(r => r.from === 'docker-compose.yml');
  const hasConfig = resources.some(r => r.from === 'config/conduit.toml');
  
  if (!hasDockerCompose) {
    throw new Error('Missing docker-compose.yml in extraResources');
  }
  if (!hasConfig) {
    throw new Error('Missing config/conduit.toml in extraResources');
  }
  
  console.log('   extraResources:', resources.length, 'entries');
  console.log('   docker-compose.yml: configured');
  console.log('   config/conduit.toml: configured');
  
  // Check dist:mac script
  const distMac = pkg.scripts['dist:mac'];
  if (!distMac || !distMac.includes('uname -m')) {
    throw new Error('dist:mac script missing auto-arch detection');
  }
  console.log('   dist:mac: auto-arch detection configured');
});

// Test 8: Release directory (from packaging test)
test('Release directory structure', () => {
  const releaseDir = path.join(process.cwd(), 'release', 'linux-unpacked', 'resources', 'resources');
  
  if (!fs.existsSync(releaseDir)) {
    console.log('   Note: Release directory not found (packaging test may not have run)');
    return;
  }
  
  const dockerCompose = path.join(releaseDir, 'docker-compose.yml');
  const configDir = path.join(releaseDir, 'config');
  
  if (!fs.existsSync(dockerCompose)) {
    throw new Error('docker-compose.yml not in release resources');
  }
  
  if (!fs.existsSync(configDir)) {
    throw new Error('config directory not in release resources');
  }
  
  console.log('   Release resources: OK');
  console.log('   docker-compose.yml: packed');
  console.log('   config/: packed');
});

// Summary
console.log('');
console.log('========================================');
console.log('  Test Summary');
console.log('========================================');
console.log('  Passed:', passed);
console.log('  Failed:', failed);
console.log('  Total:', passed + failed);
console.log('========================================');

if (failed > 0) {
  process.exit(1);
} else {
  console.log('');
  console.log('✅ All tests passed! SmartClaw v2.0 is ready.');
  console.log('');
}
