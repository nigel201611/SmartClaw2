/**
 * SmartClaw Docker Manager
 * 
 * 管理 Conduit 容器的生命周期：启动、停止、健康检查、日志收集
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { app } from 'electron';

const execAsync = promisify(exec);

/**
 * Get the path to docker-compose.yml in the app resources
 * Works in both development and packaged modes
 */
export function getDockerComposePath(): string {
  // In packaged app, resources are in app.getPath('exe')/../Resources/
  // In development, they're in the project root
  
  if (process.resourcesPath) {
    // Packaged app - use resourcesPath
    return path.join(process.resourcesPath, 'resources', 'docker-compose.yml');
  }
  
  // Development - use app path
  const appPath = app.getAppPath();
  const composePath = path.join(appPath, 'docker-compose.yml');
  
  // If file doesn't exist at app path, try relative to __dirname
  if (!fs.existsSync(composePath)) {
    return path.join(__dirname, '../../docker-compose.yml');
  }
  
  return composePath;
}

/**
 * Get the path to config files in the app resources
 */
export function getConfigPath(filename: string): string {
  if (process.resourcesPath) {
    return path.join(process.resourcesPath, 'resources', 'config', filename);
  }
  const appPath = app.getAppPath();
  return path.join(appPath, 'config', filename);
}

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
    '/Applications/Docker.app/Contents/Resources/bin'
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
    exec(command, {
      env: {
        ...process.env,
        PATH: getDockerPath()
      },
      shell: '/bin/bash'
    }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(stderr || error.message));
      } else {
        resolve({ stdout, stderr });
      }
    });
  });
}

/**
 * 容器状态
 */
export type ContainerState = 
  | 'not-created'    // 容器未创建
  | 'created'        // 已创建但未启动
  | 'running'        // 运行中
  | 'paused'         // 已暂停
  | 'restarting'     // 重启中
  | 'exited'         // 已退出
  | 'dead';          // 异常终止

/**
 * 容器信息
 */
export interface ContainerInfo {
  name: string;
  state: ContainerState;
  running: boolean;
  status: string;
  createdAt: string;
  startedAt: string | null;
  ports: string[];
  image: string;
}

/**
 * 健康检查结果
 */
export interface HealthCheckResult {
  healthy: boolean;
  status: 'healthy' | 'unhealthy' | 'starting' | 'none';
  failingStreak: number;
  lastCheck: string | null;
  log: string[];
}

/**
 * Docker 管理器配置
 */
export interface DockerManagerConfig {
  /** 容器名称 */
  containerName: string;
  /** Docker Compose 文件路径 */
  composeFilePath: string;
  /** 环境变量文件路径 */
  envFilePath?: string;
  /** 健康检查超时（毫秒） */
  healthCheckTimeout: number;
  /** 启动等待超时（毫秒） */
  startupTimeout: number;
  /** 停止宽限期（秒） */
  stopGracePeriod: number;
}

/**
 * Docker 管理器类
 */
export class DockerManager {
  private config: DockerManagerConfig;

  constructor(config: Partial<DockerManagerConfig> = {}) {
    this.config = {
      containerName: config.containerName || 'smartclaw-matrix',
      composeFilePath: config.composeFilePath || './docker-compose.yml',
      envFilePath: config.envFilePath,
      healthCheckTimeout: config.healthCheckTimeout || 5000,
      startupTimeout: config.startupTimeout || 60000,
      stopGracePeriod: config.stopGracePeriod || 30
    };
  }

  /**
   * 获取 Docker Compose 命令
   */
  private getComposeCommand(): string {
    let cmd = `docker compose -f "${this.config.composeFilePath}"`;
    if (this.config.envFilePath) {
      cmd += ` --env-file "${this.config.envFilePath}"`;
    }
    return cmd;
  }

  /**
   * Get user data directory for Docker volumes
   * Uses app.getPath('userData') which points to:
   * - macOS: ~/Library/Application Support/<app-name>
   * - Windows: %APPDATA%/<app-name>
   * - Linux: ~/.config/<app-name>
   */
  private getUserDataDir(): string {
    return path.join(app.getPath('userData'), 'data', 'conduit');
  }

  /**
   * Create .env file for docker-compose to read environment variables
   */
  private async createEnvFile(): Promise<string> {
    const userDataDir = this.getUserDataDir();
    const envFilePath = path.join(app.getPath('userData'), 'docker-compose.env');
    
    // Ensure directory exists
    fs.mkdirSync(path.dirname(envFilePath), { recursive: true });
    
    // Write environment variables
    const envContent = `CONDUIT_DATA_DIR=${userDataDir}
CONDUIT_SERVER_NAME=localhost
CONDUIT_PORT=6167
MATRIX_PORT=8008
`;
    fs.writeFileSync(envFilePath, envContent);
    
    return envFilePath;
  }

  /**
   * 启动容器
   */
  async startContainer(): Promise<{ success: boolean; error?: string }> {
    try {
      // 创建 .env 文件供 docker-compose 读取环境变量
      const envFilePath = await this.createEnvFile();
      
      // 检查容器是否已存在
      const exists = await this.containerExists();
      
      if (exists) {
        // 容器已存在，检查状态
        const info = await this.getContainerInfo();
        if (info?.running) {
          return { success: true }; // 已在运行
        }
        // 启动已存在的容器，使用 --env-file 传递环境变量
        await execWithDockerPath(
          `${this.getComposeCommand()} --env-file "${envFilePath}" start`
        );
      } else {
        // 创建并启动新容器，使用 --env-file 传递环境变量
        await execWithDockerPath(
          `${this.getComposeCommand()} --env-file "${envFilePath}" up -d`
        );
      }

      // 等待容器就绪
      await this.waitForHealthy();
      
      return { success: true };
    } catch (error: any) {
      return { 
        success: false, 
        error: error.message || '启动容器失败' 
      };
    }
  }

  /**
   * 停止容器
   */
  async stopContainer(): Promise<{ success: boolean; error?: string }> {
    try {
      await execWithDockerPath(
        `${this.getComposeCommand()} stop -t ${this.config.stopGracePeriod}`
      );
      return { success: true };
    } catch (error: any) {
      // 如果正常停止失败，尝试强制停止
      try {
        await execWithDockerPath(`${this.getComposeCommand()} kill`);
        return { success: true };
      } catch (killError: any) {
        return { 
          success: false, 
          error: killError.message || '停止容器失败' 
        };
      }
    }
  }

  /**
   * 重启容器
   */
  async restartContainer(): Promise<{ success: boolean; error?: string }> {
    try {
      await execWithDockerPath(`${this.getComposeCommand()} restart`);
      await this.waitForHealthy();
      return { success: true };
    } catch (error: any) {
      return { 
        success: false, 
        error: error.message || '重启容器失败' 
      };
    }
  }

  /**
   * 删除容器
   */
  async removeContainer(): Promise<{ success: boolean; error?: string }> {
    try {
      await execWithDockerPath(`${this.getComposeCommand()} down`);
      return { success: true };
    } catch (error: any) {
      return { 
        success: false, 
        error: error.message || '删除容器失败' 
      };
    }
  }

  /**
   * 检查容器是否存在
   */
  async containerExists(): Promise<boolean> {
    try {
      const { stdout } = await execWithDockerPath(
        `docker ps -a --format '{{.Names}}' | grep "^${this.config.containerName}$"`
      );
      return stdout.trim() === this.config.containerName;
    } catch (error) {
      return false;
    }
  }

  /**
   * 获取容器信息
   */
  async getContainerInfo(): Promise<ContainerInfo | null> {
    try {
      const { stdout } = await execWithDockerPath(
        `docker inspect ${this.config.containerName} --format '{{json .}}'`
      );
      const data = JSON.parse(stdout.trim());
      
      return {
        name: data.Name?.replace(/^\//, '') || this.config.containerName,
        state: data.State?.Status as ContainerState || 'exited',
        running: data.State?.Running || false,
        status: data.State?.Status || 'unknown',
        createdAt: data.Created || null,
        startedAt: data.State?.StartedAt || null,
        ports: Object.keys(data.NetworkSettings?.Ports || {}).map(
          p => `${p}->${data.NetworkSettings.Ports[p]?.[0]?.HostPort || 'unknown'}`
        ),
        image: data.Config?.Image || 'unknown'
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * 获取容器健康状态
   */
  async getHealthStatus(): Promise<HealthCheckResult> {
    try {
      const { stdout } = await execWithDockerPath(
        `docker inspect ${this.config.containerName} --format '{{json .State.Health}}'`
      );
      const health = JSON.parse(stdout.trim());
      
      return {
        healthy: health.Status === 'healthy',
        status: health.Status || 'none',
        failingStreak: health.FailingStreak || 0,
        lastCheck: health.Log?.[health.Log.length - 1]?.End || null,
        log: health.Log?.slice(-5).map((entry: any) => entry.Output) || []
      };
    } catch (error) {
      return {
        healthy: false,
        status: 'none',
        failingStreak: 0,
        lastCheck: null,
        log: []
      };
    }
  }

  /**
   * 等待容器健康
   */
  async waitForHealthy(): Promise<{ success: boolean; error?: string }> {
    const startTime = Date.now();
    const checkInterval = 2000; // 2 秒检查一次

    while (Date.now() - startTime < this.config.startupTimeout) {
      try {
        // 检查容器是否运行
        const info = await this.getContainerInfo();
        if (!info?.running) {
          await this.sleep(checkInterval);
          continue;
        }

        // 检查健康状态
        const health = await this.getHealthStatus();
        if (health.healthy) {
          return { success: true };
        }

        // 如果健康检查还未开始，尝试直接访问 Matrix API
        if (health.status === 'starting' || health.status === 'none') {
          const apiCheck = await this.checkMatrixAPI();
          if (apiCheck) {
            return { success: true };
          }
        }

        await this.sleep(checkInterval);
      } catch (error) {
        await this.sleep(checkInterval);
      }
    }

    return { 
      success: false, 
      error: `容器启动超时（${this.config.startupTimeout / 1000}秒）` 
    };
  }

  /**
   * 检查 Matrix API 是否可访问
   */
  private async checkMatrixAPI(): Promise<boolean> {
    try {
      // 尝试获取端口配置（简化版本，实际应从 docker-compose 解析）
      const port = process.env.MATRIX_PORT || '8008';
      const { stdout } = await execWithDockerPath(
        `curl -s -o /dev/null -w "%{http_code}" http://localhost:${port}/_matrix/client/versions`
      );
      return stdout.trim() === '200';
    } catch (error) {
      return false;
    }
  }

  /**
   * 获取容器日志
   */
  async getLogs(options?: { 
    tail?: number; 
    since?: string; 
    follow?: boolean 
  }): Promise<string> {
    const tail = options?.tail || 100;
    let cmd = `${this.getComposeCommand()} logs --tail ${tail}`;
    
    if (options?.since) {
      cmd += ` --since "${options.since}"`;
    }
    
    if (options?.follow) {
      cmd += ' -f';
    }

    try {
      const { stdout, stderr } = await execWithDockerPath(cmd);
      return stdout + stderr;
    } catch (error: any) {
      // 日志命令可能返回非零退出码，但仍会输出日志
      return error.stdout || error.stderr || '';
    }
  }

  /**
   * 拉取最新镜像
   */
  async pullLatestImage(): Promise<{ success: boolean; error?: string }> {
    try {
      await execWithDockerPath(`${this.getComposeCommand()} pull`);
      return { success: true };
    } catch (error: any) {
      return { 
        success: false, 
        error: error.message || '拉取镜像失败' 
      };
    }
  }

  /**
   * 检查 Docker 是否可用
   */
  async isDockerAvailable(): Promise<boolean> {
    try {
      await execWithDockerPath('docker --version');
      await execWithDockerPath('docker info');
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * 辅助函数：休眠
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default DockerManager;
