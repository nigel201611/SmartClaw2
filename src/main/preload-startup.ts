/**
 * Preload Script for SmartClaw Startup Window
 * Exposes startup-specific Electron API to renderer process via contextBridge
 */

import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';

// Types for the exposed API
export interface IStartupAPI {
  // Startup progress listeners
  onStartupProgress: (callback: (data: any) => void) => () => void;
  onDockerStatus: (callback: (status: any) => void) => () => void;
  onMatrixStatus: (callback: (status: any) => void) => () => void;
  onStartupError: (callback: (error: any) => void) => () => void;

  // Get current startup state
  getStartupState: () => Promise<any>;

  // Close startup window
  closeStartupWindow: () => Promise<void>;

  // Open external links
  openGuide: () => Promise<void>;
  openRegistration: () => Promise<void>;

  // Docker operations
  checkDocker: () => Promise<any>;
  startContainer: () => Promise<void>;
  stopContainer: () => Promise<void>;
  getContainerStatus: () => Promise<any>;
  getContainerLogs: () => Promise<string>;

  // Matrix operations
  matrixLogin: (credentials: { username: string; password: string }) => Promise<any>;
  matrixGetStatus: () => Promise<any>;
  matrixLogout: () => Promise<void>;
}

const startupAPI: IStartupAPI = {
  // Startup progress listeners
  onStartupProgress: (callback: (data: any) => void) => {
    console.log('[Preload-Startup] onStartupProgress registered');
    const listener = (_event: IpcRendererEvent, data: any) => {
      console.log('[Preload-Startup] startup-progress received:', data);
      callback(data);
    };
    ipcRenderer.on('startup-progress', listener);
    return () => {
      console.log('[Preload-Startup] Removing startup-progress listener');
      ipcRenderer.removeListener('startup-progress', listener);
    };
  },

  onDockerStatus: (callback: (status: any) => void) => {
    console.log('[Preload-Startup] onDockerStatus registered');
    const listener = (_event: IpcRendererEvent, status: any) => {
      console.log('[Preload-Startup] docker-status received:', status);
      callback(status);
    };
    ipcRenderer.on('docker-status', listener);
    return () => {
      console.log('[Preload-Startup] Removing docker-status listener');
      ipcRenderer.removeListener('docker-status', listener);
    };
  },

  onMatrixStatus: (callback: (status: any) => void) => {
    console.log('[Preload-Startup] onMatrixStatus registered');
    const listener = (_event: IpcRendererEvent, status: any) => {
      console.log('[Preload-Startup] matrix-status received:', status);
      callback(status);
    };
    ipcRenderer.on('matrix-status', listener);
    return () => {
      console.log('[Preload-Startup] Removing matrix-status listener');
      ipcRenderer.removeListener('matrix-status', listener);
    };
  },

  onStartupError: (callback: (error: any) => void) => {
    console.log('[Preload-Startup] onStartupError registered');
    const listener = (_event: IpcRendererEvent, error: any) => {
      console.log('[Preload-Startup] startup-error received:', error);
      callback(error);
    };
    ipcRenderer.on('startup-error', listener);
    return () => {
      console.log('[Preload-Startup] Removing startup-error listener');
      ipcRenderer.removeListener('startup-error', listener);
    };
  },

  // Get current startup state
  getStartupState: () => {
    console.log('[Preload-Startup] getStartupState called');
    return ipcRenderer.invoke('startup:get-state');
  },

  // Close startup window
  closeStartupWindow: () => {
    console.log('[Preload-Startup] closeStartupWindow called');
    return ipcRenderer.invoke('startup:close');
  },

  // Open external links
  openGuide: () => {
    console.log('[Preload-Startup] openGuide called');
    return ipcRenderer.invoke('open:guide');
  },

  openRegistration: () => {
    console.log('[Preload-Startup] openRegistration called');
    return ipcRenderer.invoke('open:registration');
  },

  // Docker operations
  checkDocker: () => {
    console.log('[Preload-Startup] checkDocker called');
    return ipcRenderer.invoke('docker:check');
  },

  startContainer: () => {
    console.log('[Preload-Startup] startContainer called');
    return ipcRenderer.invoke('docker:start-container');
  },

  stopContainer: () => {
    console.log('[Preload-Startup] stopContainer called');
    return ipcRenderer.invoke('docker:stop-container');
  },

  getContainerStatus: () => {
    console.log('[Preload-Startup] getContainerStatus called');
    return ipcRenderer.invoke('docker:get-container-status');
  },

  getContainerLogs: () => {
    console.log('[Preload-Startup] getContainerLogs called');
    return ipcRenderer.invoke('docker:get-container-logs');
  },

  // Matrix operations
  matrixLogin: (credentials: { username: string; password: string }) => {
    console.log('[Preload-Startup] matrixLogin called');
    return ipcRenderer.invoke('matrix:login', credentials);
  },

  matrixGetStatus: () => {
    console.log('[Preload-Startup] matrixGetStatus called');
    return ipcRenderer.invoke('matrix:get-status');
  },

  matrixLogout: () => {
    console.log('[Preload-Startup] matrixLogout called');
    return ipcRenderer.invoke('matrix:logout');
  },
};

// Expose the API to the renderer process
contextBridge.exposeInMainWorld('electronAPI', startupAPI);

// Also expose a flag to indicate which preload is loaded
contextBridge.exposeInMainWorld('isStartupWindow', true);
