/**
 * SmartClaw React Hook - useDocker
 *
 * 用于渲染进程中 Docker 状态检测和容器管理的 React Hook
 */

import { useState, useEffect, useCallback } from 'react';

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
 * 安全获取 Electron API
 */
const getElectronAPI = (): IElectronAPI => {
  if (!window.electronAPI) {
    throw new Error('Electron API not available. Please ensure preload script is loaded correctly.');
  }
  return window.electronAPI;
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
      const api = getElectronAPI();
      const result = await api.checkDocker();

      // 转换返回格式为 DockerStatus
      const dockerStatusData: DockerStatus = {
        available: result.installed && result.running,
        installed: result.installed,
        running: result.running,
        hasPermission: result.hasPermission ?? true,
        isDesktop: result.isDesktop ?? false,
        error: result.error || null,
        errorType: result.errorType || null,
        version: result.version || null,
      };

      setDockerStatus(dockerStatusData);
      return dockerStatusData;
    } catch (err: any) {
      const errorMsg = err.message || 'Docker 检测失败';
      setError(errorMsg);
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
      const api = getElectronAPI();
      await api.startContainer();

      // 启动成功后刷新状态
      await refreshContainerStatus();
      return true;
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
      const api = getElectronAPI();
      await api.stopContainer();

      // 停止成功后刷新状态
      await refreshContainerStatus();
      return true;
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
      const api = getElectronAPI();
      await api.restartContainer();

      // 重启成功后刷新状态
      await refreshContainerStatus();
      return true;
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
      const api = getElectronAPI();
      const logs = await api.getContainerLogs();

      // 如果指定了行数，只返回最后 tail 行
      if (tail && tail > 0 && logs) {
        const lines = logs.split('\n');
        const tailLines = lines.slice(-tail);
        return tailLines.join('\n');
      }

      return logs || '';
    } catch (err: any) {
      setError(err.message || '获取日志失败');
      return '';
    }
  }, []);

  /**
   * 获取容器信息
   */
  const getContainerInfo = useCallback(async () => {
    try {
      const api = getElectronAPI();
      const status = await api.getContainerStatus();
      const info = (await api.getContainerInfo?.()) || {};

      // 构建容器信息
      const containerInfoData: ContainerInfo = {
        name: info.name || 'smartclaw-matrix',
        state: status.running ? 'running' : 'exited',
        running: status.running,
        status: status.running ? 'Up' : 'Exited',
        createdAt: info.createdAt || new Date().toISOString(),
        startedAt: info.startedAt || null,
        ports: info.ports || [],
        image: info.image || 'conduit:latest',
      };

      setContainerInfo(containerInfoData);

      // 构建健康状态
      const healthStatusData: HealthStatus = {
        healthy: status.healthy,
        status: status.healthy ? 'healthy' : status.running ? 'starting' : 'none',
        failingStreak: 0,
      };

      setHealthStatus(healthStatusData);

      return { containerInfoData, healthStatusData };
    } catch (err) {
      console.error('Failed to get container info:', err);
      return null;
    }
  }, []);

  /**
   * 刷新容器状态
   */
  const refreshContainerStatus = useCallback(async () => {
    try {
      await getContainerInfo();
    } catch (err) {
      // 忽略刷新错误
      console.error('Refresh container status error:', err);
    }
  }, [getContainerInfo]);

  /**
   * 计算容器是否运行
   */
  const containerRunning = containerInfo?.running ?? false;

  // 自动检测和状态轮询
  useEffect(() => {
    if (autoDetect) {
      detectDocker();
      getContainerInfo();
    }

    // 设置轮询间隔（每3秒更新一次容器状态）
    let intervalId: NodeJS.Timeout | null = null;

    if (autoDetect) {
      intervalId = setInterval(() => {
        getContainerInfo();
      }, 3000);
    }

    // 监听 Docker 状态事件（如果 preload 中有相关事件）
    const handleDockerStatus = (status: any) => {
      if (status && status.containerInfo) {
        setContainerInfo(status.containerInfo);
      }
    };

    // 注意：preload 中没有 STATUS_UPDATE 事件，但可以添加
    // 如果有 onDockerStatus 事件，可以监听
    const dockerStatusUnsubscribe = window.electronAPI?.onDockerStatus?.(handleDockerStatus);

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
      if (dockerStatusUnsubscribe) {
        dockerStatusUnsubscribe();
      }
    };
  }, [autoDetect, detectDocker, getContainerInfo]);

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
    error,
  };
}

export default useDocker;
