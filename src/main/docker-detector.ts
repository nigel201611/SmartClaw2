/**
 * SmartClaw Docker Detector - macOS Socket Detection Fix
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const execAsync = promisify(exec);

/**
 * Get Docker PATH for macOS
 * Docker Desktop may not be in the default PATH when running from Finder
 */
function getDockerPath(): string {
  const dockerPaths = [
    '/usr/local/bin',
    '/opt/homebrew/bin',
    '/opt/homebrew/sbin',
    '/usr/bin',
    '/usr/sbin',
    '/bin',
    '/sbin',
    path.join(os.homedir(), '.docker/cli-plugins'),
    '/Applications/Docker.app/Contents/Resources/bin',
  ];

  const currentPath = process.env.PATH || '';
  const newPath = [...dockerPaths, currentPath].join(':');
  return newPath;
}

/**
 * Execute command with Docker PATH
 */
async function execWithDockerPath(command: string): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    exec(
      command,
      {
        env: {
          ...process.env,
          PATH: getDockerPath(),
        },
        shell: '/bin/bash',
      },
      (error, stdout, stderr) => {
        if (error) {
          reject(new Error(stderr || error.message));
        } else {
          resolve({ stdout, stderr });
        }
      },
    );
  });
}

export interface DockerStatus {
  available: boolean;
  installed: boolean;
  running: boolean;
  hasPermission: boolean;
  isDesktop: boolean;
  error: string | null;
  errorType: DockerErrorType | null;
  version: string | null;
}

export type DockerErrorType = 'NOT_INSTALLED' | 'DAEMON_NOT_RUNNING' | 'NO_PERMISSION' | 'UNKNOWN';

const INSTALL_GUIDES: Record<string, { url: string; title: string }> = {
  darwin: { url: 'https://docs.docker.com/desktop/install-mac/', title: 'macOS 安装 Docker Desktop' },
  win32: { url: 'https://docs.docker.com/desktop/install-windows-install/', title: 'Windows 安装 Docker Desktop' },
  linux: { url: 'https://docs.docker.com/engine/install/', title: 'Linux 安装 Docker Engine' },
};

export class DockerDetector {
  private platform: string;
  constructor() {
    this.platform = process.platform;
  }

  async detectDocker(): Promise<DockerStatus> {
    const status: DockerStatus = {
      available: false,
      installed: false,
      running: false,
      hasPermission: false,
      isDesktop: false,
      error: null,
      errorType: null,
      version: null,
    };

    // macOS: Check Docker Desktop via CLI first (most reliable for Desktop edition)
    if (this.platform === 'darwin') {
      // Try docker CLI first - Docker Desktop adds it to PATH
      try {
        const { stdout, stderr } = await execWithDockerPath('docker --version 2>&1');
        const fullOutput = stdout + stderr;

        if (fullOutput.includes('Docker version')) {
          status.installed = true;
          status.isDesktop = true;
          const versionMatch = fullOutput.match(/Docker version ([\d.]+)/);
          status.version = versionMatch ? versionMatch[1] : 'Docker Desktop';

          // Check if daemon is running by trying docker info
          try {
            await execWithDockerPath('docker info 2>&1');
            status.running = true;

            // Check permissions
            try {
              await execWithDockerPath('docker ps 2>&1');
              status.hasPermission = true;
              status.available = true;
              return status;
            } catch (permError: any) {
              status.error = 'Docker 权限不足';
              status.errorType = 'NO_PERMISSION';
              status.hasPermission = false;
              return status;
            }
          } catch (daemonError: any) {
            status.running = false;
            status.error = 'Docker Desktop 未运行';
            status.errorType = 'DAEMON_NOT_RUNNING';
            status.error += '\n\n请打开 Docker Desktop 应用程序并等待其完全启动。\n';
            status.error += '提示：在 Spotlight 中搜索 "Docker" 并打开它。';
            return status;
          }
        }
      } catch (cliError: any) {
        // docker CLI not found, continue to socket checks
      }

      // Fallback: Check Docker socket paths
      const socketPaths = ['/var/run/docker.sock', `${os.homedir()}/.docker/run/docker.sock`, `${os.homedir()}/.docker/desktop/docker.sock`];

      for (const socketPath of socketPaths) {
        if (fs.existsSync(socketPath)) {
          status.installed = true;
          status.isDesktop = true;
          status.running = true;
          status.hasPermission = true;
          status.available = true;
          try {
            const { stdout } = await execWithDockerPath('docker --version 2>/dev/null');
            const versionMatch = stdout.match(/Docker version ([\d.]+)/);
            status.version = versionMatch ? versionMatch[1] : 'Docker Desktop';
          } catch (e) {
            status.version = 'Docker Desktop';
          }
          return status;
        }
      }

      // If we get here, Docker is not installed or not running
      status.error = 'Docker 未安装或未运行';
      status.errorType = 'NOT_INSTALLED';
      status.error += '\n\n请在 MacBook 上安装并启动 Docker Desktop：';
      status.error += '\n1. 访问：https://docs.docker.com/desktop/install-mac/';
      status.error += '\n2. 下载并安装 Docker Desktop';
      status.error += '\n3. 打开 Docker Desktop 应用程序';
      status.error += '\n4. 等待状态栏显示 Docker 图标（绿色表示就绪）';
      return status;
    }

    // Linux: Check Docker socket
    if (this.platform === 'linux') {
      if (fs.existsSync('/var/run/docker.sock')) {
        status.installed = true;
        status.running = true;
        try {
          const { stdout } = await execWithDockerPath('docker --version');
          const versionMatch = stdout.match(/Docker version ([\d.]+)/);
          status.version = versionMatch ? versionMatch[1] : stdout.trim();
          try {
            await execWithDockerPath('docker ps');
            status.hasPermission = true;
            status.available = true;
            return status;
          } catch (permError: any) {
            status.error = 'Docker 权限不足。请将当前用户加入 docker 组：\nsudo usermod -aG docker $USER\n然后重新登录。';
            status.errorType = 'NO_PERMISSION';
            return status;
          }
        } catch (error) {
          status.error = 'Docker 命令执行失败';
          status.errorType = 'UNKNOWN';
          return status;
        }
      }
    }

    // Fallback: Check docker CLI
    try {
      const { stdout } = await execWithDockerPath('docker --version');
      const versionMatch = stdout.match(/Docker version ([\d.]+)/);
      status.installed = true;
      status.version = versionMatch ? versionMatch[1] : stdout.trim();
    } catch (error: any) {
      status.error = 'Docker 未安装';
      status.errorType = 'NOT_INSTALLED';
      if (this.platform === 'darwin') {
        status.error += '\n\n提示：请启动 Docker Desktop 应用，或确保 docker 命令在 PATH 中。';
      }
      return status;
    }

    if (this.platform === 'darwin' || this.platform === 'win32') {
      try {
        await execWithDockerPath('osascript -e "tell application \\"Docker\\" to get running" 2>/dev/null');
        status.isDesktop = true;
      } catch (e) {}
    }

    try {
      await execWithDockerPath('docker info');
      status.running = true;
    } catch (error) {
      status.error = 'Docker Daemon 未运行';
      status.errorType = 'DAEMON_NOT_RUNNING';
      if (this.platform === 'darwin') {
        status.error += '\n\n提示：请启动 Docker Desktop 应用。';
      }
      return status;
    }

    try {
      await execWithDockerPath('docker ps');
      status.hasPermission = true;
    } catch (error) {
      status.error = 'Docker 权限不足';
      status.errorType = 'NO_PERMISSION';
      return status;
    }

    status.available = true;
    return status;
  }

  getFriendlyErrorMessage(status: DockerStatus): { title: string; message: string; action: string; actionUrl?: string } {
    if (!status.error) {
      return { title: 'Docker 已就绪', message: 'Docker 环境配置正确，可以启动 SmartClaw。', action: '继续' };
    }
    switch (status.errorType) {
      case 'NOT_INSTALLED':
        return { title: 'Docker 未安装', message: status.error, action: '查看安装指南', actionUrl: this.getInstallGuide().url };
      case 'DAEMON_NOT_RUNNING':
        return { title: 'Docker 未运行', message: status.error, action: status.isDesktop ? '打开 Docker Desktop' : '启动 Docker 服务' };
      case 'NO_PERMISSION':
        return { title: 'Docker 权限不足', message: status.error, action: '查看权限设置' };
      default:
        return { title: 'Docker 检测失败', message: status.error, action: '重试' };
    }
  }

  getInstallGuide(): { url: string; title: string } {
    return INSTALL_GUIDES[this.platform] || INSTALL_GUIDES.linux;
  }
}

export default DockerDetector;
