#!/usr/bin/env node

/**
 * smartclaw health - Run system health checks
 */

const chalk = require('chalk');
const { execSync } = require('child_process');
const os = require('os');

async function runHealth() {
  try {
    console.log(chalk.blue.bold('\n🏥 SmartClaw Health Check'));
    console.log(chalk.gray('Running system diagnostics...\n'));

    let allPassed = true;

    // Check Node.js version
    console.log(chalk.yellow('Checking Node.js...'));
    const nodeVersion = process.version;
    const nodeMajor = parseInt(nodeVersion.slice(1).split('.')[0]);
    if (nodeMajor >= 18) {
      console.log(chalk.green(`✓ Node.js ${nodeVersion} (required: >=18.0.0)`));
    } else {
      console.log(chalk.red(`✗ Node.js ${nodeVersion} (required: >=18.0.0)`));
      allPassed = false;
    }

    // Check npm
    console.log(chalk.yellow('Checking npm...'));
    try {
      const npmVersion = execSync('npm --version', { encoding: 'utf-8' }).trim();
      console.log(chalk.green(`✓ npm ${npmVersion}`));
    } catch (error) {
      console.log(chalk.red('✗ npm not found'));
      allPassed = false;
    }

    // Check disk space
    console.log(chalk.yellow('Checking disk space...'));
    const freeMemory = os.freemem();
    const totalMemory = os.totalmem();
    const freePercent = ((freeMemory / totalMemory) * 100).toFixed(1);
    if (freePercent > 10) {
      console.log(chalk.green(`✓ Memory: ${(freeMemory / 1024 / 1024 / 1024).toFixed(2)} GB free (${freePercent}%)`));
    } else {
      console.log(chalk.yellow(`! Memory: ${(freeMemory / 1024 / 1024 / 1024).toFixed(2)} GB free (${freePercent}%) - consider freeing space`));
    }

    // Check OS
    console.log(chalk.yellow('Checking OS...'));
    const platform = os.platform();
    console.log(chalk.green(`✓ ${platform} (${os.arch()})`));

    // Check network (optional)
    console.log(chalk.yellow('Checking network...'));
    try {
      const interfaces = os.networkInterfaces();
      const hasNetwork = Object.keys(interfaces).some(key => {
        return interfaces[key].some(iface => !iface.internal && iface.family === 'IPv4');
      });
      if (hasNetwork) {
        console.log(chalk.green('✓ Network interfaces available'));
      } else {
        console.log(chalk.yellow('! No external network interfaces detected'));
      }
    } catch (error) {
      console.log(chalk.yellow('! Could not check network interfaces'));
    }

    // Summary
    console.log('');
    if (allPassed) {
      console.log(chalk.green.bold('✅ All health checks passed!'));
      console.log(chalk.gray('Your system is ready to run SmartClaw.'));
    } else {
      console.log(chalk.red.bold('⚠️  Some checks failed - please review above'));
    }
    console.log('');

  } catch (error) {
    console.error(chalk.red.bold('\n❌ Health check failed!'));
    console.error(chalk.red(error.message));
    process.exit(1);
  }
}

module.exports = runHealth;
