/**
 * SmartClaw Interactive Setup Wizard
 * 
 * 9-step interactive CLI wizard for one-click SmartClaw setup
 */

const inquirer = import('inquirer').then(m => m.default).catch(() => null);
const chalk = import('chalk').then(m => m.default).catch(() => null);
const ora = import('ora').then(m => m.default).catch(() => null);
const { detectEnvironment } = require('./detector');
const { generateOpenClawConfig } = require('./generators/openclaw');
const { generateHigressConfig } = require('./generators/higress');
const { generateMatrixConfig } = require('./generators/matrix');
const { generateCredentials } = require('./generators/creds');

const OUTPUT_DIR = process.env.SMARTCLAW_OUTPUT_DIR || './generated-configs';

/**
 * Run the full 9-step wizard
 */
async function runWizard() {
  const Inquirer = await inquirer;
  const Chalk = await chalk;
  const Spinner = await ora;
  
  if (!Inquirer || !Chalk) {
    console.log('Interactive mode not available. Running in basic mode...');
    return runBasicSetup();
  }

  console.log('\n');
  console.log(Chalk.default.bold.blue('╔═══════════════════════════════════════════════════════════╗'));
  console.log(Chalk.default.bold.blue('║                                                           ║'));
  console.log(Chalk.default.bold.blue('║           🤖  SmartClaw Setup Wizard  🤖                  ║'));
  console.log(Chalk.default.bold.blue('║                                                           ║'));
  console.log(Chalk.default.bold.blue('║     Auto-configuring your AI desktop chatbot              ║'));
  console.log(Chalk.default.bold.blue('║                                                           ║'));
  console.log(Chalk.default.bold.blue('╚═══════════════════════════════════════════════════════════╝'));
  console.log('\n');

  // Step 1: Welcome
  console.log(Chalk.default.green('✓') + ' Step 1/9: Welcome\n');

  // Step 2: Environment Detection
  console.log(Chalk.default.yellow('⟳') + ' Step 2/9: Detecting environment...\n');
  const spinner = Spinner.default ? Spinner.default('Analyzing system...').start() : null;
  const envInfo = await detectEnvironment();
  if (spinner) spinner.succeed('Environment detected');
  
  displayEnvInfo(envInfo, Chalk.default);

  // Step 3-6: Interactive prompts
  console.log('\n' + Chalk.default.yellow('⟳') + ' Step 3-6/9: Configuration\n');
  
  const answers = await Inquirer.prompt([
    {
      type: 'input',
      name: 'projectName',
      message: 'Project name:',
      default: 'smartclaw',
      validate: input => input.length > 0 || 'Project name cannot be empty'
    },
    {
      type: 'input',
      name: 'adminEmail',
      message: 'Admin email:',
      default: '',
      validate: input => {
        if (!input) return true; // Optional
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(input) || 'Please enter a valid email';
      }
    },
    {
      type: 'input',
      name: 'workspacePath',
      message: 'Workspace path:',
      default: getDefaultWorkspacePath(),
      validate: input => input.length > 0 || 'Workspace path cannot be empty'
    },
    {
      type: 'input',
      name: 'matrixServer',
      message: 'Matrix server URL:',
      default: envInfo.ports['6167'] ? 'http://localhost:6167' : 'https://matrix.example.com',
      validate: input => {
        try {
          new URL(input);
          return true;
        } catch {
          return 'Please enter a valid URL';
        }
      }
    },
    {
      type: 'input',
      name: 'modelEndpoint',
      message: 'LLM model endpoint (via Higress):',
      default: 'http://127.0.0.1:8001/openai/v1',
      validate: input => {
        try {
          new URL(input);
          return true;
        } catch {
          return 'Please enter a valid URL';
        }
      }
    },
    {
      type: 'password',
      name: 'apiKey',
      message: 'API Key (will be encrypted):',
      mask: '*'
    },
    {
      type: 'list',
      name: 'preferredPort',
      message: 'Select preferred Matrix port:',
      choices: getAvailablePortChoices(envInfo.ports),
      default: '6167'
    },
    {
      type: 'checkbox',
      name: 'features',
      message: 'Select features to enable:',
      choices: [
        { name: 'Desktop App (Electron)', value: 'desktop', checked: true },
        { name: 'Agent Backend', value: 'agent', checked: true },
        { name: 'Matrix Server', value: 'matrix', checked: true },
        { name: 'Higress Gateway', value: 'higress', checked: true },
        { name: 'MinIO Storage', value: 'minio', checked: true },
        { name: 'System Tray', value: 'tray', checked: true }
      ]
    },
    {
      type: 'confirm',
      name: 'useDocker',
      message: 'Use Docker for deployment?',
      default: envInfo.docker.available
    },
    {
      type: 'confirm',
      name: 'confirmGenerate',
      message: 'Generate configurations with these settings?',
      default: true
    }
  ]);

  if (!answers.confirmGenerate) {
    console.log('\n' + Chalk.default.yellow('Setup cancelled by user.') + '\n');
    return null;
  }

  // Step 7: Generate
  console.log('\n' + Chalk.default.yellow('⟳') + ' Step 7/9: Generating configurations...\n');
  
  const config = {
    ...answers,
    envInfo,
    matrixPort: answers.preferredPort
  };

  await generateConfigurations(config, OUTPUT_DIR, Spinner, Chalk.default);

  // Step 8: Validate
  console.log('\n' + Chalk.default.yellow('⟳') + ' Step 8/9: Validating configurations...\n');
  const validationResults = await validateGeneratedConfigs(OUTPUT_DIR);
  
  if (validationResults.allValid) {
    console.log(Chalk.default.green('✓') + ' All configurations validated successfully!\n');
  } else {
    console.log(Chalk.default.red('✗') + ' Some validations failed:\n');
    validationResults.errors.forEach(err => console.log(Chalk.default.red('  - ' + err)));
  }

  // Step 9: Complete
  console.log('\n' + Chalk.default.green('✓') + ' Step 9/9: Complete!\n');
  console.log(Chalk.default.bold.green('╔═══════════════════════════════════════════════════════════╗'));
  console.log(Chalk.default.bold.green('║                                                           ║'));
  console.log(Chalk.default.bold.green('║              🎉  Setup Complete!  🎉                      ║'));
  console.log(Chalk.default.bold.green('║                                                           ║'));
  console.log(Chalk.default.bold.green('║  Your SmartClaw configuration has been generated!         ║'));
  console.log(Chalk.default.bold.green('║                                                           ║'));
  console.log(Chalk.default.bold.green('╚═══════════════════════════════════════════════════════════╝'));
  console.log('\n');
  console.log(Chalk.default.blue('📁 Output directory:') + ' ' + Chalk.default.bold(OUTPUT_DIR));
  console.log(Chalk.default.blue('📄 Generated files:'));
  console.log('   - openclaw.json');
  console.log('   - higress/config.yaml');
  console.log('   - matrix/homeserver.yaml');
  console.log('   - credentials/encrypted/.env.enc');
  console.log('   - README.md');
  console.log('\n');
  console.log(Chalk.default.yellow('🚀 Next steps:'));
  console.log('   1. Review generated configurations');
  console.log('   2. Run: npm install');
  console.log('   3. Run: npm run dev:desktop');
  console.log('\n');

  return config;
}

/**
 * Display environment info
 */
function displayEnvInfo(envInfo, chalk) {
  console.log(chalk.green('  OS:') + ' ' + envInfo.os);
  console.log(chalk.green('  Node.js:') + ' ' + envInfo.nodeVersion);
  console.log(chalk.green('  Docker:') + ' ' + (envInfo.docker.available ? chalk.green('Available') : chalk.yellow('Not available')));
  console.log(chalk.green('  Available ports:'));
  
  for (const [port, available] of Object.entries(envInfo.ports)) {
    const status = available ? chalk.green('Free') : chalk.red('In use');
    console.log(`    - ${port}: ${status}`);
  }
  console.log('');
}

/**
 * Get default workspace path
 */
function getDefaultWorkspacePath() {
  const home = process.env.HOME || process.env.USERPROFILE || '.';
  return require('path').join(home, 'smartclaw-workspace');
}

/**
 * Get available port choices
 */
function getAvailablePortChoices(ports) {
  return Object.entries(ports)
    .filter(([_, available]) => available)
    .map(([port, _]) => ({ name: `Port ${port}`, value: port }));
}

/**
 * Generate all configurations
 */
async function generateConfigurations(config, outputDir, Spinner, chalk) {
  const spinners = {};
  
  try {
    spinners.openclaw = Spinner.default ? Spinner.default('Generating openclaw.json...').start() : null;
    await generateOpenClawConfig(config, outputDir);
    if (spinners.openclaw) spinners.openclaw.succeed();

    spinners.higress = Spinner.default ? Spinner.default('Generating Higress config...').start() : null;
    await generateHigressConfig(config, outputDir);
    if (spinners.higress) spinners.higress.succeed();

    spinners.matrix = Spinner.default ? Spinner.default('Generating Matrix config...').start() : null;
    await generateMatrixConfig(config, outputDir);
    if (spinners.matrix) spinners.matrix.succeed();

    spinners.creds = Spinner.default ? Spinner.default('Encrypting credentials...').start() : null;
    await generateCredentials(config, outputDir);
    if (spinners.creds) spinners.creds.succeed();
  } catch (error) {
    Object.values(spinners).forEach(s => {
      if (s && s.fail) s.fail('Failed');
    });
    throw error;
  }
}

/**
 * Validate generated configurations
 */
async function validateGeneratedConfigs(outputDir) {
  const fs = require('fs-extra');
  const path = require('path');
  
  const results = { allValid: true, errors: [] };
  
  const requiredFiles = [
    'openclaw.json',
    'higress/config.yaml',
    'matrix/homeserver.yaml',
    'credentials/encrypted/.env.enc'
  ];

  for (const file of requiredFiles) {
    const filePath = path.join(outputDir, file);
    if (!await fs.pathExists(filePath)) {
      results.allValid = false;
      results.errors.push(`Missing: ${file}`);
    }
  }

  // Validate JSON files
  const openclawPath = path.join(outputDir, 'openclaw.json');
  if (await fs.pathExists(openclawPath)) {
    try {
      const config = await fs.readJson(openclawPath);
      if (!config.agent || !config.matrix || !config.storage) {
        results.allValid = false;
        results.errors.push('openclaw.json: Missing required sections');
      }
    } catch (error) {
      results.allValid = false;
      results.errors.push(`openclaw.json: Invalid JSON - ${error.message}`);
    }
  }

  return results;
}

/**
 * Run basic (non-interactive) setup
 */
async function runBasicSetup() {
  const envInfo = await detectEnvironment();
  
  const config = {
    projectName: 'smartclaw',
    workspacePath: getDefaultWorkspacePath(),
    matrixServer: envInfo.ports['6167'] ? 'http://localhost:6167' : 'https://matrix.example.com',
    modelEndpoint: 'http://127.0.0.1:8001/openai/v1',
    apiKey: '',
    useDocker: envInfo.docker.available,
    envInfo
  };

  await generateConfigurations(config, OUTPUT_DIR, { default: null }, { bold: s => s, green: s => s, blue: s => s, yellow: s => s, red: s => s });
  
  console.log('\n✓ Configuration generated successfully!');
  console.log(`📁 Output: ${OUTPUT_DIR}`);
  
  return config;
}

module.exports = {
  runWizard,
  runBasicSetup
};
