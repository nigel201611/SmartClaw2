#!/usr/bin/env node

/**
 * SmartClaw Config Generator CLI
 * 
 * Interactive wizard for generating SmartClaw configurations
 */

const chalk = import('chalk').then(m => m.default).catch(() => ({ default: { 
  green: s => s, 
  blue: s => s, 
  yellow: s => s, 
  red: s => s,
  bold: s => s
}}));
const inquirer = import('inquirer').catch(() => ({ default: { prompt: () => ({}), registerPrompt: () => {} } }));
const fs = require('fs-extra');
const path = require('path');

const { detectEnvironment } = require('./detector');
const { generateOpenClawConfig } = require('./generators/openclaw');
const { generateHigressConfig } = require('./generators/higress');
const { generateMatrixConfig } = require('./generators/matrix');
const { generateCredentials } = require('./generators/creds');

const OUTPUT_DIR = path.join(process.cwd(), 'generated-configs');

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'init';

  console.log('\n🤖 SmartClaw Config Generator\n');

  switch (command) {
    case 'init':
      await runWizard();
      break;
    case 'detect':
      await runDetection();
      break;
    case 'generate':
      await runGenerate();
      break;
    case 'validate':
      await runValidate();
      break;
    case 'help':
    case '--help':
    case '-h':
      showHelp();
      break;
    default:
      console.log(`Unknown command: ${command}`);
      showHelp();
  }
}

async function runWizard() {
  console.log('🚀 Starting SmartClaw Setup Wizard\n');
  
  // Step 1: Environment Detection
  console.log('📊 Step 1: Detecting environment...\n');
  const envInfo = await detectEnvironment();
  displayEnvInfo(envInfo);

  // Step 2: Interactive prompts
  console.log('\n⚙️  Step 2: Configuration options\n');
  
  const answers = await (async () => {
    try {
      const inquirerMod = await inquirer;
      return await inquirerMod.default.prompt([
        {
          type: 'input',
          name: 'projectName',
          message: 'Project name:',
          default: 'smartclaw'
        },
        {
          type: 'input',
          name: 'workspacePath',
          message: 'Workspace path:',
          default: path.join(process.env.HOME || process.env.USERPROFILE || '.', 'smartclaw-workspace')
        },
        {
          type: 'input',
          name: 'modelEndpoint',
          message: 'LLM model endpoint (via Higress):',
          default: 'http://127.0.0.1:8001/openai/v1'
        },
        {
          type: 'password',
          name: 'apiKey',
          message: 'API Key (will be encrypted):',
          mask: '*'
        },
        {
          type: 'input',
          name: 'matrixServer',
          message: 'Matrix server URL:',
          default: 'http://localhost:8008'
        },
        {
          type: 'confirm',
          name: 'useDocker',
          message: 'Use Docker for deployment?',
          default: envInfo.docker.available
        }
      ]);
    } catch (e) {
      console.log('Inquirer not available, using defaults...');
      return {
        projectName: 'smartclaw',
        workspacePath: path.join(process.env.HOME || '.', 'smartclaw-workspace'),
        modelEndpoint: 'http://127.0.0.1:8001/openai/v1',
        apiKey: '',
        matrixServer: 'http://localhost:8008',
        useDocker: envInfo.docker.available
      };
    }
  })();

  // Step 3: Generate configurations
  console.log('\n🔧 Step 3: Generating configurations...\n');
  
  await fs.ensureDir(OUTPUT_DIR);
  
  const config = {
    ...answers,
    envInfo
  };

  await generateOpenClawConfig(config, OUTPUT_DIR);
  await generateHigressConfig(config, OUTPUT_DIR);
  await generateMatrixConfig(config, OUTPUT_DIR);
  await generateCredentials(config, OUTPUT_DIR);

  console.log('\n✅ Configuration generation complete!\n');
  console.log(`📁 Output directory: ${OUTPUT_DIR}`);
  console.log('\nGenerated files:');
  console.log('  - openclaw.json');
  console.log('  - higress/config.yaml');
  console.log('  - matrix/homeserver.yaml');
  console.log('  - credentials/encrypted/.env.enc');
  console.log('  - README.md\n');
}

async function runDetection() {
  console.log('📊 Environment Detection\n');
  const envInfo = await detectEnvironment();
  displayEnvInfo(envInfo);
}

async function runGenerate() {
  console.log('🔧 Generating configurations...\n');
  await fs.ensureDir(OUTPUT_DIR);
  
  const envInfo = await detectEnvironment();
  const config = {
    projectName: 'smartclaw',
    workspacePath: path.join(process.env.HOME || '.', 'smartclaw-workspace'),
    modelEndpoint: 'http://127.0.0.1:8001/openai/v1',
    apiKey: '',
    matrixServer: 'http://localhost:8008',
    useDocker: envInfo.docker.available,
    envInfo
  };

  await generateOpenClawConfig(config, OUTPUT_DIR);
  await generateHigressConfig(config, OUTPUT_DIR);
  await generateMatrixConfig(config, OUTPUT_DIR);
  await generateCredentials(config, OUTPUT_DIR);

  console.log('✅ Configurations generated successfully!');
}

async function runValidate() {
  console.log('🔍 Validating configurations...\n');
  
  const requiredFiles = [
    'openclaw.json',
    'higress/config.yaml',
    'matrix/homeserver.yaml'
  ];

  let allValid = true;
  for (const file of requiredFiles) {
    const filePath = path.join(OUTPUT_DIR, file);
    if (await fs.pathExists(filePath)) {
      console.log(`✅ ${file}`);
    } else {
      console.log(`❌ ${file} - NOT FOUND`);
      allValid = false;
    }
  }

  if (allValid) {
    console.log('\n✅ All configurations are valid!');
  } else {
    console.log('\n❌ Some configurations are missing. Run "config-gen init" to generate.');
    process.exit(1);
  }
}

function displayEnvInfo(envInfo) {
  const c = require('chalk');
  console.log('Operating System:', c.blue(envInfo.os));
  console.log('Node.js Version:', c.blue(envInfo.nodeVersion));
  console.log('Docker:', envInfo.docker.available ? c.green('Available') : c.yellow('Not available'));
  console.log('Port Availability:');
  for (const [port, available] of Object.entries(envInfo.ports)) {
    console.log(`  - ${port}:`, available ? c.green('Free') : c.red('In use'));
  }
}

function showHelp() {
  console.log(`
SmartClaw Config Generator - Usage:

  config-gen init       Run full setup wizard (interactive)
  config-gen detect     Run environment detection only
  config-gen generate   Generate configs with defaults
  config-gen validate   Validate existing configurations
  config-gen help       Show this help message

Examples:

  config-gen init       # Start interactive wizard
  config-gen detect     # Check system compatibility
`);
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
