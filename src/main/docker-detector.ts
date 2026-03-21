/**
 * SmartClaw Docker Detector
 * 
 * 检测系统 Docker 环境状态，提供友好的错误提示和安装引导
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as os from 'os';

const execAsync = promisify(exec);

/**
 * Docker 检测结果接口
 */
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

export type DockerErrorType =
  | 'NOT_INSTALLED'
  | 'DAEMON_NOT_RUNNING'
  | 'NO_PERMISSION'
  | 'UNKNOWN';

const INSTALL_GUIDES: Record<string, { url: string; title: string }> = {
  darwin: {
    url: 'https://docs.docker.com/desktop/install-mac/',
    title: 'macOS 安装 Docker Desktop'
  },
  win32: {
    url: 'https://docs.docker.com/desktop/install-windows-install/',
    title: 'Windows 安装 Docker Desktop'
  },
  linux: {
    url: 'https://docs.docker.com/engine/install/',
    title: 'Linux 安装 Docker Engine'
  }
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
      version: null
    };

    // macOS: Check Docker Desktop socket first (more reliable than CLI)
    if (this.platform === 'darwin') {
      const desktopSocket = '/var/run/docker.sock';
      const desktopSocketAlt = `${os.homedir()}/.docker/run/docker.sock`;
      
      if (fs.existsSync(desktopSocket) || fs.existsSync(desktopSocketAlt)) {
        status.installed = true;
        status.isDesktop = true;
        status.running = true;
        
        // Try to get version via socket
        try {
          const { stdout } = await execAsync('docker --version 2>/dev/null || echo "Docker Desktop"');
          status.version = stdout.trim() || 'Docker Desktop';
          status.hasPermission = true;
          status.available = true;
          return status;
        } catch (error) {
          // Socket exists but CLI not available
          status.hasPermission = true;
          status.available = true;
          status.version = 'Docker Desktop';
          return status;
        }
      }
    }

    // Linux: Check Docker socket
    if (this.platform === 'linux') {
      const linuxSocket = '/var/run/docker.sock';
      if (fs.existsSync(linuxSocket)) {
        status.installed = true;
        status.running = true;
        
        try {
          const { stdout } = await execAsync('docker --version');
          const versionMatch = stdout.match(/Docker version ([\d.]+)/);
          status.version = versionMatch ? versionMatch[1] : stdout.trim();
          
          try {
            await execAsync('docker ps');
            status.hasPermission = true;
            status.available = true;
            return status;
          } catch (permError) {
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
    const versionCheck = await this.checkDockerVersion();
    if (!versionCheck.success) {
      status.error = 'Docker 未安装';
      status.errorType = 'NOT_INSTALLED';
      return status;
    }
    status.installed = true;
    status.version = versionCheck.version;

    // Check Docker Desktop (macOS/Windows)
    if (this.platform === 'darwin' || this.platform === 'win32') {
      status.isDesktop = await this.checkDockerDesktop();
    }

    // Check Docker Daemon
    const daemonCheck = await this.checkDaemonRunning();
    if (!daemonCheck.success) {
      status.error = 'Docker Daemon 未运行';
      status.errorType = 'DAEMON_NOT_RUNNING';
      return status;
    }
    status.running = true;

    // Check permissions
    const permissionCheck = await this.checkPermissions();
    if (!permissionCheck.success) {
      status.error = this.getPermissionErrorMessage();
      status.errorType = 'NO_PERMISSION';
      return status;
    }
    status.hasPermission = true;

    status.available = true;
    return status;
  }

  private async checkDockerVersion(): Promise<{ success: boolean; version: string | null }> {
    try {
      const { stdout } = await execAsync('docker --version');
      const versionMatch = stdout.match(/Docker version ([\d.]+)/);
      const version = versionMatch ? versionMatch[1] : stdout.trim();
      return { success: true, version };
    } catch (error) {
      return { success: false, version: null };
    }
  }

  private async checkDockerDesktop(): Promise<boolean> {
    if (this.platform === 'darwin') {
      try {
        await execAsync('osascript -e "tell application \\"Docker\\" to get running" 2>/dev/null');
        return true;
      } catch (error) {
        return false;
      }
    }

    if (this.platform === 'win32') {
      try {
        await execAsync('tasklist /FI "IMAGENAME eq Docker Desktop.exe" 2>nul | find /I "Docker Desktop.exe"');
        return true;
      } catch (error) {
        return false;
      }
    }

    return false;
  }

  private async checkDaemonRunning(): Promise<{ success: boolean }> {
    try {
      await execAsync('docker info');
      return { success: true };
    } catch (error) {
      return { success: false };
    }
  }

  private async checkPermissions(): Promise<{ success: boolean }> {
    try {
      await execAsync('docker ps');
      return { success: true };
    } catch (error) {
      return { success: false };
    }
  }

  private getPermissionErrorMessage(): string {
    switch (this.platform) {
      case 'linux':
        return 'Docker 权限不足。请将当前用户加入 docker 组：\nsudo usermod -aG docker $USER\n然后重新登录。';
      case 'darwin':
        return 'Docker 权限不足。请确保 Docker Desktop 已正确安装并授予必要权限。';
      case 'win32':
        return 'Docker 权限不足。请以管理员身份运行或检查 Docker Desktop 权限设置。';
      default:
        return 'Docker 权限不足。请检查系统权限配置。';
    }
  }

  getInstallGuide(): { url: string; title: string } {
    return INSTALL_GUIDES[this.platform] || INSTALL_GUIDES.linux;
  }

  getFriendlyErrorMessage(status: DockerStatus): {
    title: string;
    message: string;
    action: string;
    actionUrl?: string;
  } {
    if (!status.error) {
      return {
        title: 'Docker 已就绪',
        message: 'Docker 环境配置正确，可以启动 SmartClaw。',
        action: '继续'
      };
    }

    switch (status.errorType) {
      case 'NOT_INSTALLED':
        const guide = this.getInstallGuide();
        return {
          title: 'Docker 未安装',
          message: 'SmartClaw 需要 Docker 才能运行。请先安装 Docker。',
          action: '查看安装指南',
          actionUrl: guide.url
        };

      case 'DAEMON_NOT_RUNNING':
        return {
          title: 'Docker 未运行',
          message: status.isDesktop
            ? 'Docker Desktop 已安装但未运行。请启动 Docker Desktop 应用。'
            : 'Docker Daemon 未运行。请启动 Docker 服务。',
          action: status.isDesktop ? '打开 Docker Desktop' : '启动 Docker 服务'
        };

      case 'NO_PERMISSION':
        return {
          title: 'Docker 权限不足',
          message: status.error || '无法访问 Docker。请检查权限设置。',
          action: '查看权限设置'
        };

      default:
        return {
          title: 'Docker 检测失败',
          message: status.error || '未知错误',
          action: '重试'
        };
    }
  }
}

export default DockerDetector;
