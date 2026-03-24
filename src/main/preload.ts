/**
 * SmartClaw Electron Preload Script
 * 
 * Exposes secure IPC bridges between renderer and main process
 */

import { contextBridge, ipcRenderer } from 'electron';

// Docker IPC handlers
contextBridge.exposeInMainWorld('electronAPI', {
  // Docker status
  onDockerStatus: (callback: (status: any) => void) => {
    ipcRenderer.on('docker-status', (_, status) => callback(status));
  },
  
  // Auth status
  onAuthStatus: (callback: (authenticated: boolean) => void) => {
    ipcRenderer.on('auth-status', (_, authenticated) => callback(authenticated));
  },
  
  // Get initial Docker status
  getDockerStatus: () => ipcRenderer.invoke('docker:get-status'),
  
  // Start Docker containers
  startDocker: () => ipcRenderer.invoke('docker:start'),
  
  // Get app status
  getAppStatus: () => ipcRenderer.invoke('app:get-status'),
  
  // Quit app
  quitApp: () => ipcRenderer.invoke('app:quit'),
  
  // Restart app
  restartApp: () => ipcRenderer.invoke('app:restart'),
});

console.log('SmartClaw preload script loaded');
