/**
 * SmartClaw React Hook - useDocker
 * 
 * 用于渲染进程中 Docker 状态检测和容器管理的 React Hook
 */

import { useState, useEffect, useCallback } from 'react';
import { ipcRenderer } from 'electron';

/**
 * Docker 状态接口（与 docker-detector.ts 保持一致）
 */
export interface DockerStatus {
  available: boolean;
  installed: boolean;
  running: boolean;
  hasPermission: boolean;
  isDesktop: boolean;
  error: string | null;
  errorType: 'NOT_INSTALLED' | 'DAEMON_NOT_RUNNING' | 'NO_PERMISSION' | 'unknown' | null;
  version: string | null;
}

/**
 * 容器信息接口
 */
export interface ContainerInfo {
  name: string;
  state: string;
  running: boolean;
  status: string;
  createdAt: string;
  startedAt: string | null;
  ports: string[];
  image: string;
}

/**
 * 健康状态接口
 */
export interface HealthStatus {
  healthy: boolean;
  status: 'healthy' | 'unhealthy' | 'starting' | 'none';
  failingStreak: number;
}

/**
 * useDocker Hook 返回值
 */
interface UseDockerReturn {
  // Docker 检测状态
  dockerStatus: DockerStatus | null;
  isDetecting: boolean;
  
  // 容器状态
  containerInfo: ContainerInfo | null;
  healthStatus: HealthStatus | null;
  containerRunning: boolean;
  
  // 操作函数
  detectDocker: () => Promise<DockerStatus | null>;
  startContainer: () => Promise<boolean>;
  stopContainer: () => Promise<boolean>;
  restartContainer: () => Promise<boolean>;
  getLogs: (tail?: number) => Promise<string>;
  
  // 状态
  isLoading: boolean;
  error: string | null;
}

/**
 * Docker IPC 通道（与 docker-ipc.ts 保持一致）
 */
const IPC_CHANNELS = {
  DETECT_DOCKER: 'docker:detect',
  IS_DOCKER_AVAILABLE: 'docker:is-available',
  START_CONTAINER: 'docker:start',
  STOP_CONTAINER: 'docker:stop',
  RESTART_CONTAINER: 'docker:restart',
  GET_CONTAINER_INFO: 'docker:container-info',
  GET_HEALTH_STATUS: 'docker:health-status',
  GET_LOGS: 'docker:logs',
  START_STATUS_POLLING: 'docker:start-status-polling',
  STOP_STATUS_POLLING: 'docker:stop-status-polling',
  STATUS_UPDATE: 'docker:status-update'
};

/**
 * useDocker Hook
 */
export function useDocker(autoDetect: boolean = true): UseDockerReturn {
  // Docker 检测状态
  const [dockerStatus, setDockerStatus] = useState<DockerStatus | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  
  // 容器状态
  const [containerInfo, setContainerInfo] = useState<ContainerInfo | null>(null);
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null);
  
  // 加载和错误状态
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * 检测 Docker 环境
   */
  const detectDocker = useCallback(async (): Promise<DockerStatus | null> => {
    setIsDetecting(true);
    setError(null);
    
    try {
      const result = await ipcRenderer.invoke(IPC_CHANNELS.DETECT_DOCKER);
      if (result.success) {
        setDockerStatus(result.data);
        return result.data;
      } else {
        setError(result.error);
        return null;
      }
    } catch (err: any) {
      setError(err.message || 'Docker 检测失败');
      return null;
    } finally {
      setIsDetecting(false);
    }
  }, []);

  /**
   * 启动容器
   */
  const startContainer = useCallback(async (): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await ipcRenderer.invoke(IPC_CHANNELS.START_CONTAINER);
      if (result.success) {
        // 启动成功后刷新状态
        await refreshContainerStatus();
        return true;
      } else {
        setError(result.error);
        return false;
      }
    } catch (err: any) {
      setError(err.message || '启动容器失败');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * 停止容器
   */
  const stopContainer = useCallback(async (): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await ipcRenderer.invoke(IPC_CHANNELS.STOP_CONTAINER);
      if (result.success) {
        await refreshContainerStatus();
        return true;
      } else {
        setError(result.error);
        return false;
      }
    } catch (err: any) {
      setError(err.message || '停止容器失败');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * 重启容器
   */
  const restartContainer = useCallback(async (): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await ipcRenderer.invoke(IPC_CHANNELS.RESTART_CONTAINER);
      if (result.success) {
        await refreshContainerStatus();
        return true;
      } else {
        setError(result.error);
        return false;
      }
    } catch (err: any) {
      setError(err.message || '重启容器失败');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * 获取容器日志
   */
  const getLogs = useCallback(async (tail: number = 100): Promise<string> => {
    try {
      const result = await ipcRenderer.invoke(IPC_CHANNELS.GET_LOGS, { tail });
      if (result.success) {
        return result.data || '';
      } else {
        throw new Error(result.error);
      }
    } catch (err: any) {
      setError(err.message || '获取日志失败');
      return '';
    }
  }, []);

  /**
   * 刷新容器状态
   */
  const refreshContainerStatus = useCallback(async () => {
    try {
      const [infoResult, healthResult] = await Promise.all([
        ipcRenderer.invoke(IPC_CHANNELS.GET_CONTAINER_INFO),
        ipcRenderer.invoke(IPC_CHANNELS.GET_HEALTH_STATUS)
      ]);
      
      if (infoResult.success) {
        setContainerInfo(infoResult.data);
      }
      if (healthResult.success) {
        setHealthStatus(healthResult.data);
      }
    } catch (err) {
      // 忽略刷新错误
    }
  }, []);

  /**
   * 计算容器是否运行
   */
  const containerRunning = containerInfo?.running ?? false;

  // 自动检测和状态轮询
  useEffect(() => {
    if (autoDetect) {
      detectDocker();
    }
    
    // 监听状态更新推送
    const handleStatusUpdate = (event: any, data: any) => {
      if (data.containerInfo) {
        setContainerInfo(data.containerInfo);
      }
      if (data.healthStatus) {
        setHealthStatus(data.healthStatus);
      }
    };
    
    ipcRenderer.on(IPC_CHANNELS.STATUS_UPDATE, handleStatusUpdate);
    
    // 启动状态轮询
    ipcRenderer.invoke(IPC_CHANNELS.START_STATUS_POLLING, 3000);
    
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.STATUS_UPDATE, handleStatusUpdate);
      ipcRenderer.invoke(IPC_CHANNELS.STOP_STATUS_POLLING);
    };
  }, [autoDetect, detectDocker]);

  return {
    // Docker 检测状态
    dockerStatus,
    isDetecting,
    
    // 容器状态
    containerInfo,
    healthStatus,
    containerRunning,
    
    // 操作函数
    detectDocker,
    startContainer,
    stopContainer,
    restartContainer,
    getLogs,
    
    // 状态
    isLoading,
    error
  };
}

export default useDocker;
