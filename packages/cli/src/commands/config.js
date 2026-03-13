#!/usr/bin/env node

/**
 * smartclaw config - Generate configuration files
 */

const chalk = require('chalk');
const fs = require('fs-extra');
const path = require('path');

async function runConfig(options) {
  try {
    console.log(chalk.blue.bold('\n📝 SmartClaw Configuration Generator'));
    
    const outputDir = options.output || './generated-configs';
    await fs.ensureDir(outputDir);

    // Generate openclaw.json
    const openclawConfig = {
      agent: {
        id: 'nigel-luo',
        workspace: path.join(process.env.HOME || '.', 'smartclaw-fs', 'agents', 'nigel-luo')
      },
      matrix: {
        server: 'http://matrix-local.hiclaw.io:18080',
        userId: '@nigel-luo:matrix-local.hiclaw.io:18080'
      },
      gateway: {
        url: 'http://127.0.0.1:8001',
        model: 'hiclaw-gateway/qwen3.5-plus'
      },
      generatedAt: new Date().toISOString()
    };

    const openclawPath = path.join(outputDir, 'openclaw.json');
    await fs.writeJson(openclawPath, openclawConfig, { spaces: 2 });
    console.log(chalk.green(`✓ Generated: ${openclawPath}`));

    console.log(chalk.green.bold('\n✅ Configuration generated successfully!'));
    console.log(chalk.gray(`Output directory: ${outputDir}`));

  } catch (error) {
    console.error(chalk.red.bold('\n❌ Configuration generation failed!'));
    console.error(chalk.red(error.message));
    process.exit(1);
  }
}

module.exports = runConfig;
