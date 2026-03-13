/**
 * System Health Check
 * 
 * Performs health checks on SmartClaw components
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const net = require('net');
const fs = require('fs-extra');
const path = require('path');

const execAsync = promisify(exec);

/**
 * Run all health checks
 */
async function runHealthCheck(configDir) {
  const results = {
    healthy: true,
    checks: {},
    summary: {
      passed: 0,
      failed: 0,
      warnings: 0
    }
  };

  // System checks
  results.checks.system = await checkSystemHealth();
  updateSummary(results, results.checks.system);

  // Config checks
  results.checks.configs = await checkConfigHealth(configDir);
  updateSummary(results, results.checks.configs);

  // Service checks
  results.checks.services = await checkServiceHealth();
  updateSummary(results, results.checks.services);

  // Port checks
  results.checks.ports = await checkPortHealth();
  updateSummary(results, results.checks.ports);

  return results;
}

/**
 * Update summary from check results
 */
function updateSummary(results, check) {
  if (check.passed) results.summary.passed++;
  if (check.failed) {
    results.summary.failed++;
    results.healthy = false;
  }
  if (check.warnings) results.summary.warnings += check.warnings;
}

/**
 * Check system health
 */
async function checkSystemHealth() {
  const result = { name: 'System', passed: true, issues: [], warnings: 0 };

  try {
    // Check Node.js version
    const nodeVersion = process.version;
    const [major] = nodeVersion.slice(1).split('.').map(Number);
    if (major < 18) {
      result.passed = false;
      result.issues.push(`Node.js version ${nodeVersion} is below required 18.x`);
    }

    // Check available disk space (basic check)
    try {
      const { stdout } = await execAsync('df -h . | tail -1 | awk \'{print $4}\'');
      const available = stdout.trim();
      result.info = `Disk available: ${available}`;
    } catch {
      result.warnings++;
      result.issues.push('Could not check disk space');
    }

    // Check memory
    const totalMem = Math.round(require('os').totalmem() / 1024 / 1024 / 1024);
    if (totalMem < 2) {
      result.warnings++;
      result.issues.push(`Low memory: ${totalMem}GB available`);
    }
    result.info = (result.info || '') + `, Memory: ${totalMem}GB`;

  } catch (error) {
    result.passed = false;
    result.issues.push(`System check failed: ${error.message}`);
  }

  return result;
}

/**
 * Check configuration health
 */
async function checkConfigHealth(configDir) {
  const result = { name: 'Configuration', passed: true, issues: [], warnings: 0 };

  try {
    // Check if config directory exists
    if (!await fs.pathExists(configDir)) {
      result.passed = false;
      result.issues.push('Configuration directory not found');
      return result;
    }

    // Check required files
    const requiredFiles = [
      'openclaw.json',
      'higress/config.yaml',
      'matrix/homeserver.yaml'
    ];

    for (const file of requiredFiles) {
      const filePath = path.join(configDir, file);
      if (!await fs.pathExists(filePath)) {
        result.passed = false;
        result.issues.push(`Missing config: ${file}`);
      }
    }

    // Check credentials
    const credsPath = path.join(configDir, 'credentials', 'encrypted', '.env.enc');
    const keyPath = path.join(configDir, 'credentials', 'encrypted', '.key');
    
    if (!await fs.pathExists(credsPath)) {
      result.warnings++;
      result.issues.push('Encrypted credentials not found');
    }
    if (!await fs.pathExists(keyPath)) {
      result.warnings++;
      result.issues.push('Encryption key not found');
    }

  } catch (error) {
    result.passed = false;
    result.issues.push(`Config check failed: ${error.message}`);
  }

  return result;
}

/**
 * Check service health
 */
async function checkServiceHealth() {
  const result = { name: 'Services', passed: true, issues: [], warnings: 0 };

  // Check Docker
  try {
    await execAsync('docker --version');
    try {
      await execAsync('docker ps');
      result.docker = 'Running';
    } catch {
      result.docker = 'Installed but not running';
      result.warnings++;
    }
  } catch {
    result.docker = 'Not installed';
    result.warnings++;
  }

  // Check if running in Docker
  try {
    await fs.access('/.dockerenv');
    result.environment = 'Docker container';
  } catch {
    result.environment = 'Native';
  }

  return result;
}

/**
 * Check port health
 */
async function checkPortHealth() {
  const result = { name: 'Ports', passed: true, issues: [], warnings: 0 };
  
  const ports = {
    '6167': 'Matrix Server',
    '8001': 'Higress Gateway',
    '8008': 'Matrix HTTP',
    '9000': 'MinIO'
  };

  result.portStatus = {};

  for (const [port, service] of Object.entries(ports)) {
    const available = await checkPort(port);
    result.portStatus[port] = {
      service,
      available,
      status: available ? 'Free' : 'In use'
    };
    
    if (!available) {
      result.warnings++;
      result.issues.push(`Port ${port} (${service}) is in use`);
    }
  }

  return result;
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
 * Display health check results
 */
function displayHealthResults(results, chalk) {
  const green = chalk?.green || (s => s);
  const red = chalk?.red || (s => s);
  const yellow = chalk?.yellow || (s => s);
  const blue = chalk?.blue || (s => s);

  console.log('\n' + blue('═══════════════════════════════════════════════════════'));
  console.log(blue('              SmartClaw Health Check Results'));
  console.log(blue('═══════════════════════════════════════════════════════\n'));

  const status = results.healthy ? green('✓ HEALTHY') : red('✗ ISSUES FOUND');
  console.log('Overall Status: ' + status + '\n');

  for (const [name, check] of Object.entries(results.checks)) {
    const checkStatus = check.passed ? green('✓') : red('✗');
    console.log(`${checkStatus} ${check.name}`);
    
    if (check.info) {
      console.log(`  ${blue('Info:')} ${check.info}`);
    }
    if (check.docker) {
      console.log(`  Docker: ${check.docker}`);
    }
    if (check.environment) {
      console.log(`  Environment: ${check.environment}`);
    }
    if (check.portStatus) {
      console.log('  Ports:');
      for (const [port, info] of Object.entries(check.portStatus)) {
        const portStatus = info.available ? green('Free') : yellow('In use');
        console.log(`    ${port} (${info.service}): ${portStatus}`);
      }
    }
    if (check.issues && check.issues.length > 0) {
      console.log('  Issues:');
      check.issues.forEach(issue => {
        console.log(`    - ${issue}`);
      });
    }
    console.log('');
  }

  console.log(blue('───────────────────────────────────────────────────────'));
  console.log(`Summary: ${green(results.summary.passed + ' passed')}, ${red(results.summary.failed + ' failed')}, ${yellow(results.summary.warnings + ' warnings')}`);
  console.log(blue('═══════════════════════════════════════════════════════\n'));
}

module.exports = {
  runHealthCheck,
  checkSystemHealth,
  checkConfigHealth,
  checkServiceHealth,
  checkPortHealth,
  checkPort,
  displayHealthResults
};
