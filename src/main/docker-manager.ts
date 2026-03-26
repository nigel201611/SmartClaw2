/**
 * Docker Manager
 * 管理 Docker 容器的生命周期
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import { app } from 'electron';
import * as fs from 'fs';

const execAsync = promisify(exec);

export function getDockerComposePath(): string {
  // Packaged app - use resourcesPath
  if (process.resourcesPath) {
    return path.join(process.resourcesPath, 'resources', 'docker-compose.yml');
  }

  // Development - try multiple paths to find docker-compose.yml
  const possiblePaths = [
    // 1. Current working directory (when running from project root)
    path.join(process.cwd(), 'docker-compose.yml'),
    // 2. Relative to __dirname (compiled JS file location)
    path.join(__dirname, '../../docker-compose.yml'),
    // 3. Electron app path (when running via npm start)
    path.join(app.getAppPath(), 'docker-compose.yml'),
  ];

  for (const composePath of possiblePaths) {
    if (fs.existsSync(composePath)) {
      return composePath;
    }
  }

  // Fallback to __dirname relative path
  return path.join(__dirname, '../../docker-compose.yml');
}

/**
 * 容器状态
 */
export type ContainerState =
  | 'not-created' // 容器未创建
  | 'created' // 已创建但未启动
  | 'running' // 运行中
  | 'paused' // 已暂停
  | 'restarting' // 重启中
  | 'exited' // 已退出
  | 'dead'; // 异常终止

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

export interface DockerManagerConfig {
  containerName: string;
  composeFilePath: string;
  startupTimeout?: number;
  stopGracePeriod?: number;
}

export interface StartResult {
  success: boolean;
  error?: string;
}

export interface HealthResult {
  success: boolean;
  error?: string;
}

export class DockerManager {
  private config: DockerManagerConfig;
  private healthCheckInterval: NodeJS.Timeout | null = null;

  constructor(config: DockerManagerConfig) {
    this.config = {
      startupTimeout: 60000,
      stopGracePeriod: 30,
      ...config,
    };
  }

  /**
   * 检查容器是否存在
   */
  async checkContainerExists(): Promise<boolean> {
    try {
      const { stdout } = await execAsync(`docker ps -a --filter "name=${this.config.containerName}" --format "{{.Names}}"`);
      const exists = stdout.trim() === this.config.containerName;
      console.log(`Container ${this.config.containerName} exists: ${exists}`);
      return exists;
    } catch (error) {
      console.error('Failed to check container existence:', error);
      return false;
    }
  }

  /**
   * 检查容器是否正在运行
   */
  async isContainerRunning(): Promise<boolean> {
    try {
      const { stdout } = await execAsync(`docker ps --filter "name=${this.config.containerName}" --format "{{.Names}}"`);
      const isRunning = stdout.trim() === this.config.containerName;
      console.log(`Container ${this.config.containerName} is running: ${isRunning}`);
      return isRunning;
    } catch (error) {
      console.error('Failed to check container running status:', error);
      return false;
    }
  }

  /**
   * 获取容器状态
   */
  async getContainerStatus(): Promise<{ exists: boolean; running: boolean; status: string }> {
    try {
      const exists = await this.checkContainerExists();
      if (!exists) {
        return { exists: false, running: false, status: 'not_found' };
      }

      const running = await this.isContainerRunning();
      if (!running) {
        return { exists: true, running: false, status: 'stopped' };
      }

      // 获取详细状态
      const { stdout } = await execAsync(`docker inspect ${this.config.containerName} --format '{{.State.Status}}'`);
      const status = stdout.trim();
      return { exists: true, running: status === 'running', status };
    } catch (error) {
      console.error('Failed to get container status:', error);
      return { exists: false, running: false, status: 'error' };
    }
  }

  /**
   * 启动容器
   */
  async startContainer(): Promise<StartResult> {
    try {
      const exists = await this.checkContainerExists();

      if (!exists) {
        // 容器不存在，使用 docker-compose up
        console.log('Container does not exist, starting with docker-compose...');
        await execAsync(`docker-compose -f "${this.config.composeFilePath}" up -d`);
      } else {
        // 容器存在，启动容器
        console.log('Container exists, starting container...');
        await execAsync(`docker start ${this.config.containerName}`);
      }

      console.log('Container started successfully');
      return { success: true };
    } catch (error: any) {
      console.error('Failed to start container:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 停止容器
   */
  async stopContainer(): Promise<StartResult> {
    try {
      const exists = await this.checkContainerExists();
      if (!exists) {
        console.log('Container does not exist, nothing to stop');
        return { success: true };
      }

      const isRunning = await this.isContainerRunning();
      if (!isRunning) {
        console.log('Container is not running');
        return { success: true };
      }

      await execAsync(`docker stop -t ${this.config.stopGracePeriod} ${this.config.containerName}`);
      console.log('Container stopped successfully');
      return { success: true };
    } catch (error: any) {
      console.error('Failed to stop container:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 重启容器
   */
  async restartContainer(): Promise<StartResult> {
    try {
      await execAsync(`docker restart ${this.config.containerName}`);
      console.log('Container restarted successfully');
      return { success: true };
    } catch (error: any) {
      console.error('Failed to restart container:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 等待容器健康
   */
  async waitForHealthy(): Promise<HealthResult> {
    const startTime = Date.now();
    const timeout = this.config.startupTimeout || 60000;
    const checkInterval = 2000; // 2秒检查一次

    return new Promise((resolve) => {
      const checkHealth = async () => {
        try {
          // 检查容器是否在运行
          const isRunning = await this.isContainerRunning();
          if (!isRunning) {
            if (Date.now() - startTime > timeout) {
              resolve({ success: false, error: '容器启动超时' });
              return;
            }
            setTimeout(checkHealth, checkInterval);
            return;
          }

          // 获取容器健康状态
          const healthStatus = await this.getHealthStatus();

          if (healthStatus.healthy) {
            console.log('Container is healthy');
            resolve({ success: true });
            return;
          }

          // 如果健康检查显示 unhealthy 但容器在运行，可能是没有配置健康检查
          if (healthStatus.status === 'running' || healthStatus.status === 'unhealthy') {
            // 尝试进行应用层健康检查
            const appHealthy = await this.checkApplicationHealth();
            if (appHealthy) {
              console.log('Application is healthy (no Docker healthcheck)');
              resolve({ success: true });
              return;
            }
          }

          // 检查是否超时
          if (Date.now() - startTime > timeout) {
            resolve({
              success: false,
              error: `容器启动超时，当前状态: ${healthStatus.status}`,
            });
            return;
          }

          console.log(`Waiting for container to be healthy, current status: ${healthStatus.status}`);
          setTimeout(checkHealth, checkInterval);
        } catch (error: any) {
          console.error('Error checking health:', error);

          if (Date.now() - startTime > timeout) {
            resolve({ success: false, error: error.message });
            return;
          }
          setTimeout(checkHealth, checkInterval);
        }
      };

      checkHealth();
    });
  }

  /**
   * 获取容器健康状态
   */
  async getHealthStatus(): Promise<{ healthy: boolean; status: string }> {
    try {
      const { stdout } = await execAsync(`docker inspect ${this.config.containerName}`);
      const containerInfo = JSON.parse(stdout)[0];

      if (!containerInfo) {
        return { healthy: false, status: 'not_found' };
      }

      const state = containerInfo.State;

      // 如果有健康检查配置
      if (state.Health) {
        return {
          healthy: state.Health.Status === 'healthy',
          status: state.Health.Status,
        };
      }

      // 没有健康检查，根据运行状态判断
      return {
        healthy: state.Status === 'running',
        status: state.Status,
      };
    } catch (error: any) {
      console.error('Failed to get health status:', error);
      return { healthy: false, status: 'error' };
    }
  }

  /**
   * 检查应用健康状态（通过 HTTP 请求）
   */
  private async checkApplicationHealth(): Promise<boolean> {
    try {
      // 尝试请求 Matrix API
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch('http://localhost:8008/_matrix/client/versions', {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        return data && Array.isArray(data.versions);
      }
      return false;
    } catch (error) {
      return false;
    }
  }

  /**
   * 获取容器日志
   */
  async getLogs(options?: { tail?: number }): Promise<string> {
    try {
      const tail = options?.tail || 100;
      const { stdout } = await execAsync(`docker logs --tail ${tail} ${this.config.containerName}`);
      return stdout;
    } catch (error: any) {
      console.error('Failed to get logs:', error);
      return `获取日志失败: ${error.message}`;
    }
  }

  /**
   * 获取容器详细信息
   */
  async getContainerInfo(): Promise<any> {
    try {
      const { stdout } = await execAsync(`docker inspect ${this.config.containerName}`);
      return JSON.parse(stdout)[0];
    } catch (error: any) {
      console.error('Failed to get container info:', error);
      return null;
    }
  }

  /**
   * 清理资源
   */
  dispose(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }
}
