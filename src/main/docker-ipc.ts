/**
 * SmartClaw Electron Main Process - Docker IPC Handlers
 * 
 * 处理渲染进程与 Docker 相关的 IPC 通信
 */

import { ipcMain, BrowserWindow } from 'electron';
import { DockerDetector, DockerStatus } from './docker-detector';
import { DockerManager, ContainerInfo, HealthCheckResult } from './docker-manager';

/**
 * Docker IPC 通道定义
 */
export const DOCKER_IPC_CHANNELS = {
  // 检测
  DETECT_DOCKER: 'docker:detect',
  IS_DOCKER_AVAILABLE: 'docker:is-available',
  
  // 容器控制
  START_CONTAINER: 'docker:start',
  STOP_CONTAINER: 'docker:stop',
  RESTART_CONTAINER: 'docker:restart',
  REMOVE_CONTAINER: 'docker:remove',
  
  // 容器状态
  GET_CONTAINER_INFO: 'docker:container-info',
  GET_HEALTH_STATUS: 'docker:health-status',
  CONTAINER_EXISTS: 'docker:container-exists',
  
  // 日志
  GET_LOGS: 'docker:logs',
  
  // 镜像
  PULL_LATEST: 'docker:pull-latest'
} as const;

/**
 * Docker IPC 响应类型
 */
export interface DockerIPCResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * 注册 Docker IPC 处理器
 */
export function registerDockerIPCHandlers(mainWindow: BrowserWindow) {
  const detector = new DockerDetector();
  const manager = new DockerManager({
    containerName: 'smartclaw-matrix',
    composeFilePath: './docker-compose.yml',
    startupTimeout: 60000,
    stopGracePeriod: 30
  });

  // ========== 检测相关 ==========

  // 完整 Docker 检测
  ipcMain.handle(
    DOCKER_IPC_CHANNELS.DETECT_DOCKER,
    async (): Promise<DockerIPCResponse<DockerStatus>> => {
      try {
        const status = await detector.detectDocker();
        return { success: true, data: status };
      } catch (error: any) {
        return { 
          success: false, 
          error: error.message || 'Docker 检测失败' 
        };
      }
    }
  );

  // 快速可用性检查
  ipcMain.handle(
    DOCKER_IPC_CHANNELS.IS_DOCKER_AVAILABLE,
    async (): Promise<DockerIPCResponse<boolean>> => {
      try {
        const status = await detector.detectDocker();
        const available = status.available;
        return { success: true, data: available };
      } catch (error: any) {
        return { 
          success: false, 
          error: error.message || 'Docker 可用性检查失败' 
        };
      }
    }
  );

  // ========== 容器控制 ==========

  // 启动容器
  ipcMain.handle(
    DOCKER_IPC_CHANNELS.START_CONTAINER,
    async (): Promise<DockerIPCResponse<void>> => {
      const result = await manager.startContainer();
      if (result.success) {
        return { success: true };
      } else {
        return { success: false, error: result.error };
      }
    }
  );

  // 停止容器
  ipcMain.handle(
    DOCKER_IPC_CHANNELS.STOP_CONTAINER,
    async (): Promise<DockerIPCResponse<void>> => {
      const result = await manager.stopContainer();
      if (result.success) {
        return { success: true };
      } else {
        return { success: false, error: result.error };
      }
    }
  );

  // 重启容器
  ipcMain.handle(
    DOCKER_IPC_CHANNELS.RESTART_CONTAINER,
    async (): Promise<DockerIPCResponse<void>> => {
      const result = await manager.restartContainer();
      if (result.success) {
        return { success: true };
      } else {
        return { success: false, error: result.error };
      }
    }
  );

  // 删除容器
  ipcMain.handle(
    DOCKER_IPC_CHANNELS.REMOVE_CONTAINER,
    async (): Promise<DockerIPCResponse<void>> => {
      const result = await manager.removeContainer();
      if (result.success) {
        return { success: true };
      } else {
        return { success: false, error: result.error };
      }
    }
  );

  // ========== 容器状态 ==========

  // 获取容器信息
  ipcMain.handle(
    DOCKER_IPC_CHANNELS.GET_CONTAINER_INFO,
    async (): Promise<DockerIPCResponse<ContainerInfo | null>> => {
      try {
        const info = await manager.getContainerInfo();
        return { success: true, data: info };
      } catch (error: any) {
        return { 
          success: false, 
          error: error.message || '获取容器信息失败' 
        };
      }
    }
  );

  // 获取健康状态
  ipcMain.handle(
    DOCKER_IPC_CHANNELS.GET_HEALTH_STATUS,
    async (): Promise<DockerIPCResponse<HealthCheckResult>> => {
      try {
        const health = await manager.getHealthStatus();
        return { success: true, data: health };
      } catch (error: any) {
        return { 
          success: false, 
          error: error.message || '获取健康状态失败' 
        };
      }
    }
  );

  // 检查容器是否存在
  ipcMain.handle(
    DOCKER_IPC_CHANNELS.CONTAINER_EXISTS,
    async (): Promise<DockerIPCResponse<boolean>> => {
      try {
        const exists = await manager.containerExists();
        return { success: true, data: exists };
      } catch (error: any) {
        return { 
          success: false, 
          error: error.message || '检查容器失败' 
        };
      }
    }
  );

  // ========== 日志 ==========

  // 获取容器日志
  ipcMain.handle(
    DOCKER_IPC_CHANNELS.GET_LOGS,
    async (
      event,
      options?: { tail?: number; since?: string }
    ): Promise<DockerIPCResponse<string>> => {
      try {
        const logs = await manager.getLogs(options);
        return { success: true, data: logs };
      } catch (error: any) {
        return { 
          success: false, 
          error: error.message || '获取日志失败' 
        };
      }
    }
  );

  // ========== 镜像 ==========

  // 拉取最新镜像
  ipcMain.handle(
    DOCKER_IPC_CHANNELS.PULL_LATEST,
    async (): Promise<DockerIPCResponse<void>> => {
      const result = await manager.pullLatestImage();
      if (result.success) {
        return { success: true };
      } else {
        return { success: false, error: result.error };
      }
    }
  );

  // ========== 主动推送状态更新 ==========

  // 启动状态轮询（用于 UI 实时更新）
  let statusPollingInterval: NodeJS.Timeout | null = null;

  ipcMain.handle(
    'docker:start-status-polling',
    (event, intervalMs: number = 3000) => {
      if (statusPollingInterval) {
        clearInterval(statusPollingInterval);
      }

      statusPollingInterval = setInterval(async () => {
        try {
          const info = await manager.getContainerInfo();
          const health = await manager.getHealthStatus();
          
          mainWindow.webContents.send('docker:status-update', {
            containerInfo: info,
            healthStatus: health,
            timestamp: Date.now()
          });
        } catch (error) {
          // 忽略轮询错误
        }
      }, intervalMs);

      return { success: true };
    }
  );

  // 停止状态轮询
  ipcMain.handle(
    'docker:stop-status-polling',
    () => {
      if (statusPollingInterval) {
        clearInterval(statusPollingInterval);
        statusPollingInterval = null;
      }
      return { success: true };
    }
  );
}

/**
 * 清理 IPC 处理器（应用退出时调用）
 */
export function cleanupDockerIPC() {
  // 停止状态轮询
  Object.values(DOCKER_IPC_CHANNELS).forEach(channel => {
    ipcMain.removeHandler(channel);
  });
  ipcMain.removeHandler('docker:start-status-polling');
  ipcMain.removeHandler('docker:stop-status-polling');
}

export default registerDockerIPCHandlers;
