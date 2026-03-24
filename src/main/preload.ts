/**
 * SmartClaw Electron Preload Script
 * 
 * Exposes secure IPC bridges between renderer and main process
 */

import { contextBridge, ipcRenderer } from 'electron';

// Docker IPC channels (matching docker-ipc.ts)
const DOCKER_CHANNELS = {
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

// Expose electronAPI to renderer
contextBridge.exposeInMainWorld('electronAPI', {
  // === App Lifecycle ===
  getAppStatus: () => ipcRenderer.invoke('app:get-status'),
  quitApp: () => ipcRenderer.invoke('app:quit'),
  restartApp: () => ipcRenderer.invoke('app:restart'),
  
  // === Docker Detection (for App.tsx) ===
  onDockerStatus: (callback: (status: any) => void) => {
    ipcRenderer.on('docker-status', (_, status) => callback(status));
  },
  onAuthStatus: (callback: (authenticated: boolean) => void) => {
    ipcRenderer.on('auth-status', (_, authenticated) => callback(authenticated));
  },
  getDockerStatus: () => ipcRenderer.invoke('docker:get-status'),
  startDocker: () => ipcRenderer.invoke('docker:start'),
  
  // === Docker Management (for useDocker hook) ===
  docker: {
    detect: () => ipcRenderer.invoke(DOCKER_CHANNELS.DETECT_DOCKER),
    isAvailable: () => ipcRenderer.invoke(DOCKER_CHANNELS.IS_DOCKER_AVAILABLE),
    startContainer: () => ipcRenderer.invoke(DOCKER_CHANNELS.START_CONTAINER),
    stopContainer: () => ipcRenderer.invoke(DOCKER_CHANNELS.STOP_CONTAINER),
    restartContainer: () => ipcRenderer.invoke(DOCKER_CHANNELS.RESTART_CONTAINER),
    getContainerInfo: () => ipcRenderer.invoke(DOCKER_CHANNELS.GET_CONTAINER_INFO),
    getHealthStatus: () => ipcRenderer.invoke(DOCKER_CHANNELS.GET_HEALTH_STATUS),
    getLogs: (options?: { tail?: number }) => ipcRenderer.invoke(DOCKER_CHANNELS.GET_LOGS, options),
    startStatusPolling: (interval: number) => ipcRenderer.invoke(DOCKER_CHANNELS.START_STATUS_POLLING, interval),
    stopStatusPolling: () => ipcRenderer.invoke(DOCKER_CHANNELS.STOP_STATUS_POLLING),
    onStatusUpdate: (callback: (data: any) => void) => {
      ipcRenderer.on(DOCKER_CHANNELS.STATUS_UPDATE, (_, data) => callback(data));
    }
  }
});

console.log('SmartClaw preload script loaded');
