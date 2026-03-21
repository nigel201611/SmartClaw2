/**
 * SmartClaw Docker Detector
 * 
 * 检测系统 Docker 环境状态，提供友好的错误提示和安装引导
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as os from 'os';

const execAsync = promisify(exec);

/**
 * Docker 检测结果接口
 */
export interface DockerStatus {
  /** Docker 是否可用（完全就绪） */
  available: boolean;
  /** docker 命令是否已安装 */
  installed: boolean;
  /** Docker Daemon 是否运行 */
  running: boolean;
  /** 用户是否有权限运行 Docker */
  hasPermission: boolean;
  /** 是否使用 Docker Desktop */
  isDesktop: boolean;
  /** 错误信息（如果有） */
  error: string | null;
  /** 错误类型 */
  errorType: DockerErrorType | null;
  /** 版本信息 */
  version: string | null;
}

/**
 * Docker 错误类型
 */
export type DockerErrorType =
  | 'NOT_INSTALLED'
  | 'DAEMON_NOT_RUNNING'
  | 'NO_PERMISSION'
  | 'UNKNOWN';

/**
 * 平台特定的安装引导链接
 */
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

/**
 * Docker 检测器类
 */
export class DockerDetector {
  private platform: string;

  constructor() {
    this.platform = process.platform;
  }

  /**
   * 完整 Docker 环境检测
   */
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

    // 1. 检查 docker 命令是否存在
    const versionCheck = await this.checkDockerVersion();
    if (!versionCheck.success) {
      status.error = versionCheck.error || 'Docker 未安装';
      status.errorType = 'NOT_INSTALLED';
      // 在 macOS 上，docker 命令可能不在 PATH 中
      if (this.platform === 'darwin') {
        status.error += '\n\n提示：请确保 Docker Desktop 已安装，并且 docker 命令在 PATH 中。\n您可以尝试在终端运行 "docker --version" 来验证。';
      }
      return status;
    }
    status.installed = true;
    status.version = versionCheck.version;

    // 2. 检查 Docker Desktop (macOS/Windows)
    if (this.platform === 'darwin' || this.platform === 'win32') {
      status.isDesktop = await this.checkDockerDesktop();
    }

    // 3. 检查 Docker Daemon 是否运行
    const daemonCheck = await this.checkDaemonRunning();
    if (!daemonCheck.success) {
      status.error = daemonCheck.error || 'Docker Daemon 未运行';
      status.errorType = 'DAEMON_NOT_RUNNING';
      return status;
    }
    status.running = true;

    // 4. 检查用户权限
    const permissionCheck = await this.checkPermissions();
    if (!permissionCheck.success) {
      status.error = this.getPermissionErrorMessage();
      status.errorType = 'NO_PERMISSION';
      return status;
    }
    status.hasPermission = true;

    // 全部检查通过
    status.available = true;
    return status;
  }

  /**
   * 检查 Docker 版本
   */
  private async checkDockerVersion(): Promise<{ success: boolean; version: string | null; error?: string }> {
    try {
      const { stdout, stderr } = await execAsync('docker --version');
      if (stderr && !stdout) {
        return { success: false, version: null, error: stderr };
      }
      // 解析版本字符串，例如："Docker version 24.0.7, build afdd53b"
      const versionMatch = stdout.match(/Docker version ([\d.]+)/);
      const version = versionMatch ? versionMatch[1] : stdout.trim();
      return { success: true, version };
    } catch (error: any) {
      return { 
        success: false, 
        version: null, 
        error: error.message || 'docker command not found' 
      };
    }
  }

  /**
   * 检查 Docker Desktop 是否运行 (macOS)
   */
  private async checkDockerDesktop(): Promise<boolean> {
    if (this.platform === 'darwin') {
      try {
        // 检查 Docker Desktop 应用是否运行
        await execAsync('osascript -e "tell application \\"Docker\\" to get running" 2>/dev/null');
        return true;
      } catch (error) {
        return false;
      }
    }

    if (this.platform === 'win32') {
      try {
        // Windows: 检查 Docker Desktop 进程
        await execAsync('tasklist /FI "IMAGENAME eq Docker Desktop.exe" 2>nul | find /I "Docker Desktop.exe"');
        return true;
      } catch (error) {
        return false;
      }
    }

    return false;
  }

  /**
   * 检查 Docker Daemon 是否运行
   */
  private async checkDaemonRunning(): Promise<{ success: boolean; error?: string }> {
    try {
      const { stderr } = await execAsync('docker info');
      if (stderr && stderr.includes('Cannot connect to the Docker daemon')) {
        return { 
          success: false, 
          error: '无法连接到 Docker Daemon。请确保 Docker Desktop 已启动。' 
        };
      }
      return { success: true };
    } catch (error: any) {
      const msg = error.message || '';
      if (msg.includes('Cannot connect to the Docker daemon')) {
        return { 
          success: false, 
          error: 'Docker Daemon 未运行。请启动 Docker Desktop 应用。' 
        };
      }
      if (msg.includes('permission denied')) {
        return { 
          success: false, 
          error: 'Docker 权限不足。请确保当前用户有权限运行 Docker 命令。' 
        };
      }
      return { success: false, error: msg };
    }
  }

  /**
   * 检查 Docker 权限
   */
  private async checkPermissions(): Promise<{ success: boolean }> {
    try {
      // 尝试运行一个简单的容器来验证权限
      await execAsync('docker run --rm hello-world', { timeout: 30000 });
      return { success: true };
    } catch (error) {
      // 如果 hello-world 镜像不存在，尝试其他简单命令
      try {
        await execAsync('docker ps');
        return { success: true };
      } catch (error2) {
        return { success: false };
      }
    }
  }

  /**
   * 获取平台特定的权限错误消息
   */
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

  /**
   * 获取安装引导链接
   */
  getInstallGuide(): { url: string; title: string } {
    return INSTALL_GUIDES[this.platform] || INSTALL_GUIDES.linux;
  }

  /**
   * 获取友好的错误提示（用于 UI 显示）
   */
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
          message: this.getPermissionErrorMessage(),
          action: '查看解决方案'
        };

      default:
        return {
          title: 'Docker 检测失败',
          message: status.error || '未知错误',
          action: '重试'
        };
    }
  }

  /**
   * 快速检测（仅检查是否可用）
   */
  async isDockerAvailable(): Promise<boolean> {
    try {
      await execAsync('docker --version');
      await execAsync('docker info');
      await execAsync('docker ps');
      return true;
    } catch (error) {
      return false;
    }
  }
}

/**
 * 便捷函数：检测 Docker 环境
 */
export async function detectDocker(): Promise<DockerStatus> {
  const detector = new DockerDetector();
  return detector.detectDocker();
}

/**
 * 便捷函数：快速检查 Docker 可用性
 */
export async function isDockerAvailable(): Promise<boolean> {
  const detector = new DockerDetector();
  return detector.isDockerAvailable();
}

export default DockerDetector;
