#!/usr/bin/env node

/**
 * SmartClaw Auto-Config Wizard CLI
 * 
 * Interactive CLI for one-click SmartClaw setup
 * 
 * Commands:
 *   smartclaw init      - Run full interactive setup wizard
 *   smartclaw config    - Generate configs (non-interactive)
 *   smartclaw validate  - Validate existing configurations
 *   smartclaw health    - Run system health checks
 *   smartclaw detect    - Environment detection only
 */

const fs = require('fs-extra');
const path = require('path');

// Dynamic imports for optional dependencies
const chalkPromise = import('chalk').then(m => m.default).catch(() => createFallbackChalk());
const inquirerPromise = import('inquirer').then(m => m.default).catch(() => null);
const oraPromise = import('ora').then(m => m.default).catch(() => createFallbackOra());

// Import modules
const { runWizard } = require('./wizard');
const { detectEnvironment } = require('./detector');
const { validateAllConfigs, quickValidate } = require('./validator');
const { runHealthCheck, displayHealthResults } = require('./health');
const { generateOpenClawConfig } = require('./generators/openclaw');
const { generateHigressConfig } = require('./generators/higress');
const { generateMatrixConfig } = require('./generators/matrix');
const { generateCredentials } = require('./generators/creds');

const OUTPUT_DIR = process.env.SMARTCLAW_OUTPUT_DIR || './generated-configs';

/**
 * Create fallback chalk (no colors)
 */
function createFallbackChalk() {
  const identity = s => s;
  return {
    green: identity,
    blue: identity,
    yellow: identity,
    red: identity,
    bold: identity,
    cyan: identity,
    magenta: identity
  };
}

/**
 * Create fallback ora (no spinner)
 */
function createFallbackOra() {
  return {
    default: (text) => ({
      start: () => ({ succeed: () => {}, fail: () => {} }),
      succeed: () => {},
      fail: () => {}
    })
  };
}

/**
 * Main entry point
 */
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'init';

  const chalk = await chalkPromise;

  console.log('\n');
  console.log(chalk.bold.blue('╔═══════════════════════════════════════════════════════════╗'));
  console.log(chalk.bold.blue('║                                                           ║'));
  console.log(chalk.bold.blue('║              🤖  SmartClaw CLI  🤖                        ║'));
  console.log(chalk.bold.blue('║                                                           ║'));
  console.log(chalk.bold.blue('║         Auto-configuring AI desktop chatbot               ║'));
  console.log(chalk.bold.blue('║                                                           ║'));
  console.log(chalk.bold.blue('╚═══════════════════════════════════════════════════════════╝'));
  console.log('\n');

  try {
    switch (command) {
      case 'init':
        await cmdInit(chalk);
        break;
      case 'config':
        await cmdConfig(chalk);
        break;
      case 'validate':
        await cmdValidate(chalk);
        break;
      case 'health':
        await cmdHealth(chalk);
        break;
      case 'detect':
        await cmdDetect(chalk);
        break;
      case 'help':
      case '--help':
      case '-h':
        showHelp(chalk);
        break;
      default:
        console.log(chalk.red(`Unknown command: ${command}`));
        showHelp(chalk);
        process.exit(1);
    }
  } catch (error) {
    console.error(chalk.red('\n❌ Error:'), error.message);
    if (process.env.DEBUG) {
      console.error(error);
    }
    process.exit(1);
  }
}

/**
 * Command: init - Full interactive wizard
 */
async function cmdInit(chalk) {
  console.log(chalk.yellow('⟳') + ' Starting SmartClaw Setup Wizard...\n');
  
  const config = await runWizard();
  
  if (config) {
    console.log(chalk.green('\n✓ Setup completed successfully!'));
    console.log(chalk.blue('\nNext steps:'));
    console.log('  1. Review generated configs in: ' + chalk.bold(OUTPUT_DIR));
    console.log('  2. Run: ' + chalk.bold('npm install'));
    console.log('  3. Run: ' + chalk.bold('npm run dev:desktop'));
    console.log('');
  }
}

/**
 * Command: config - Generate configs (non-interactive)
 */
async function cmdConfig(chalk) {
  console.log(chalk.yellow('⟳') + ' Generating configurations...\n');
  
  const envInfo = await detectEnvironment();
  
  const config = {
    projectName: 'smartclaw',
    workspacePath: path.join(process.env.HOME || '.', 'smartclaw-workspace'),
    matrixServer: envInfo.ports['6167'] ? 'http://localhost:6167' : 'https://matrix.example.com',
    modelEndpoint: 'http://127.0.0.1:8001/openai/v1',
    apiKey: '',
    useDocker: envInfo.docker.available,
    envInfo
  };

  await fs.ensureDir(OUTPUT_DIR);
  
  console.log(chalk.green('✓') + ' Generating openclaw.json...');
  await generateOpenClawConfig(config, OUTPUT_DIR);
  
  console.log(chalk.green('✓') + ' Generating Higress config...');
  await generateHigressConfig(config, OUTPUT_DIR);
  
  console.log(chalk.green('✓') + ' Generating Matrix config...');
  await generateMatrixConfig(config, OUTPUT_DIR);
  
  console.log(chalk.green('✓') + ' Encrypting credentials...');
  await generateCredentials(config, OUTPUT_DIR);
  
  console.log('\n' + chalk.green('✓') + ' Configurations generated successfully!');
  console.log(chalk.blue('📁 Output:') + ' ' + OUTPUT_DIR);
  console.log('');
}

/**
 * Command: validate - Validate existing configurations
 */
async function cmdValidate(chalk) {
  console.log(chalk.yellow('⟳') + ' Validating configurations...\n');
  
  // Check if configs exist
  const quickResult = await quickValidate(OUTPUT_DIR);
  
  if (!quickResult.valid) {
    console.log(chalk.red('✗') + ' Configuration directory not found or incomplete\n');
    console.log(chalk.yellow('Missing files:'));
    quickResult.missing.forEach(file => {
      console.log('  - ' + file);
    });
    console.log('\nRun ' + chalk.bold('smartclaw init') + ' to generate configurations.\n');
    process.exit(1);
  }
  
  // Full validation
  const results = await validateAllConfigs(OUTPUT_DIR);
  
  if (results.valid) {
    console.log(chalk.green('✓') + ' All configurations are valid!\n');
    
    console.log(chalk.blue('Validated:'));
    for (const [name, result] of Object.entries(results.configs)) {
      const status = result.valid ? chalk.green('✓') : chalk.red('✗');
      console.log(`  ${status} ${name}`);
    }
    
    if (results.warnings.length > 0) {
      console.log('\n' + chalk.yellow('Warnings:'));
      results.warnings.forEach(w => console.log('  - ' + w));
    }
  } else {
    console.log(chalk.red('✗') + ' Configuration validation failed!\n');
    console.log(chalk.red('Errors:'));
    results.errors.forEach(e => console.log('  - ' + e));
    process.exit(1);
  }
  
  console.log('');
}

/**
 * Command: health - Run system health checks
 */
async function cmdHealth(chalk) {
  console.log(chalk.yellow('⟳') + ' Running health checks...\n');
  
  const results = await runHealthCheck(OUTPUT_DIR);
  displayHealthResults(results, chalk);
  
  if (!results.healthy) {
    console.log(chalk.yellow('Some issues were found. Review the results above.\n'));
    process.exit(1);
  }
}

/**
 * Command: detect - Environment detection only
 */
async function cmdDetect(chalk) {
  console.log(chalk.yellow('⟳') + ' Detecting environment...\n');
  
  const envInfo = await detectEnvironment();
  
  console.log(chalk.bold('Environment Report'));
  console.log('─────────────────────────────────────\n');
  
  console.log(chalk.blue('Operating System:') + ' ' + envInfo.os);
  console.log(chalk.blue('Node.js Version:') + ' ' + envInfo.nodeVersion);
  console.log(chalk.blue('Node.js OK:') + ' ' + (envInfo.nodeMeetsRequirement ? chalk.green('Yes') : chalk.red('No')));
  console.log(chalk.blue('Docker Available:') + ' ' + (envInfo.docker.available ? chalk.green('Yes') : chalk.yellow('No')));
  console.log(chalk.blue('Docker Running:') + ' ' + (envInfo.docker.running ? chalk.green('Yes') : chalk.yellow('No')));
  
  console.log('\n' + chalk.blue('Port Availability:'));
  for (const [port, available] of Object.entries(envInfo.ports)) {
    const status = available ? chalk.green('Free') : chalk.red('In use');
    console.log(`  ${port}: ${status}`);
  }
  
  if (envInfo.existingConfigs.length > 0) {
    console.log('\n' + chalk.blue('Existing Configurations:'));
    envInfo.existingConfigs.forEach(p => console.log('  - ' + p));
  }
  
  console.log('\n' + chalk.blue('Detected at:') + ' ' + envInfo.timestamp);
  console.log('');
}

/**
 * Show help
 */
function showHelp(chalk) {
  console.log(`
${chalk.bold('SmartClaw CLI')} - Auto-configuration wizard

${chalk.bold('USAGE:')}
  smartclaw <command> [options]

${chalk.bold('COMMANDS:')}
  init        Run full interactive setup wizard
  config      Generate configurations (non-interactive)
  validate    Validate existing configurations
  health      Run system health checks
  detect      Show environment detection results
  help        Show this help message

${chalk.bold('EXAMPLES:')}
  smartclaw init              # Start interactive wizard
  smartclaw config            # Generate configs with defaults
  smartclaw validate          # Check if configs are valid
  smartclaw health            # Run health checks
  smartclaw detect            # Show environment info

${chalk.bold('ENVIRONMENT VARIABLES:')}
  SMARTCLAW_OUTPUT_DIR        Output directory (default: ./generated-configs)
  DEBUG                       Enable debug mode (show stack traces)

${chalk.bold('MORE INFO:')}
  GitHub: https://github.com/nigel201611/SmartClaw
  Docs:   https://github.com/nigel201611/SmartClaw/blob/main/README.md
`);
}

// Run main
main();
