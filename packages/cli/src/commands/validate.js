#!/usr/bin/env node

/**
 * smartclaw validate - Validate existing configuration
 */

const chalk = require('chalk');
const fs = require('fs-extra');
const path = require('path');

async function runValidate(options) {
  try {
    console.log(chalk.blue.bold('\n🔍 SmartClaw Configuration Validator'));
    
    const configPath = options.path || '.';
    let hasErrors = false;

    // Check for package.json
    const packageJsonPath = path.join(configPath, 'package.json');
    if (await fs.pathExists(packageJsonPath)) {
      console.log(chalk.green('✓ package.json found'));
      const packageJson = await fs.readJson(packageJsonPath);
      console.log(chalk.gray(`  Name: ${packageJson.name}`));
      console.log(chalk.gray(`  Version: ${packageJson.version}`));
    } else {
      console.log(chalk.red('✗ package.json not found'));
      hasErrors = true;
    }

    // Check for generated configs
    const generatedConfigPath = path.join(configPath, 'generated-configs');
    if (await fs.pathExists(generatedConfigPath)) {
      console.log(chalk.green('✓ generated-configs directory found'));
      
      const files = await fs.readdir(generatedConfigPath);
      if (files.length > 0) {
        console.log(chalk.gray(`  Files: ${files.join(', ')}`));
      }
    } else {
      console.log(chalk.yellow('! generated-configs directory not found (run "smartclaw config" to generate)'));
    }

    // Check for apps directory
    const appsPath = path.join(configPath, 'apps');
    if (await fs.pathExists(appsPath)) {
      console.log(chalk.green('✓ apps directory found'));
      const apps = await fs.readdir(appsPath);
      console.log(chalk.gray(`  Apps: ${apps.join(', ')}`));
    } else {
      console.log(chalk.red('✗ apps directory not found'));
      hasErrors = true;
    }

    // Summary
    console.log('');
    if (hasErrors) {
      console.log(chalk.red.bold('❌ Validation failed - some required files are missing'));
      process.exit(1);
    } else {
      console.log(chalk.green.bold('✅ Validation passed - configuration looks good!'));
    }

  } catch (error) {
    console.error(chalk.red.bold('\n❌ Validation failed!'));
    console.error(chalk.red(error.message));
    process.exit(1);
  }
}

module.exports = runValidate;
