const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // App info
  getVersion: () => ipcRenderer.invoke('get-app-version'),
  getPlatform: () => ipcRenderer.invoke('get-platform'),
  
  // Window controls
  minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
  maximizeWindow: () => ipcRenderer.invoke('maximize-window'),
  closeWindow: () => ipcRenderer.invoke('close-window'),
  
  // Platform info
  platform: process.platform,
  versions: {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron,
  },
  
  // Matrix client events
  onMatrixConnected: (callback) => {
    ipcRenderer.on('matrix-connected', (event, data) => callback(data));
  },
  
  onMatrixMessage: (callback) => {
    ipcRenderer.on('matrix-message', (event, data) => callback(data));
  },
  
  sendMatrixMessage: (roomId, message) => {
    ipcRenderer.send('matrix-send-message', { roomId, message });
  },
});

// Log platform info for debugging
console.log('SmartClaw Preload loaded');
console.log('Platform:', process.platform);
