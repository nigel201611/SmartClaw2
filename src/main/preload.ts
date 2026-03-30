/**
 * Preload Script for SmartClaw
 * Exposes Electron API to renderer process via contextBridge
 */

import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';

// Types for the exposed API
export interface IElectronAPI {
  // App methods
  getAppStatus: () => Promise<any>;
  restartApp: () => Promise<void>;
  quitApp: () => Promise<void>;

  // Startup window methods (新增)
  onStartupProgress: (callback: (data: any) => void) => () => void;
  onDockerStatus: (callback: (status: any) => void) => () => void;
  onMatrixStatus: (callback: (status: any) => void) => () => void;
  onStartupError: (callback: (error: any) => void) => () => void;
  getStartupState: () => Promise<any>;
  openGuide: () => Promise<void>;

  // Docker methods
  checkDocker: () => Promise<any>;
  startContainer: () => Promise<void>;
  stopContainer: () => Promise<void>;
  restartContainer: () => Promise<void>;
  getContainerStatus: () => Promise<any>;
  getContainerLogs: () => Promise<string>;
  isDockerInstalled: () => Promise<boolean>;
  getDockerInfo: () => Promise<any>;
  startConduit: () => Promise<void>;
  stopConduit: () => Promise<void>;
  getConduitStatus: () => Promise<any>;
  getConduitLogs: () => Promise<string>;
  configureDocker: (config: any) => Promise<void>;

  // Auth methods
  checkAuth: () => Promise<any>;
  login: (homeserver: string, username: string, password: string) => Promise<any>;
  register: (homeserver: string, username: string, password: string, email?: string) => Promise<any>;
  logout: () => Promise<void>;
  getAuthStatus: () => Promise<any>;
  getCurrentUser: () => Promise<any>;
  getAccessToken: () => Promise<string | null>;
  getHomeserver: () => Promise<string | null>;
  saveCredentials: (homeserver: string, userId: string, accessToken: string) => Promise<void>;
  clearCredentials: () => Promise<void>;

  // Matrix methods
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  getSyncState: () => Promise<string>;
  getRooms: () => Promise<any[]>;
  joinRoom: (roomId: string) => Promise<void>;
  leaveRoom: (roomId: string) => Promise<void>;
  sendMessage: (roomId: string, content: any) => Promise<any>;
  sendTyping: (roomId: string, typing: boolean) => Promise<void>;
  sendReadReceipt: (roomId: string, eventId: string) => Promise<void>;
  getRoomMessages: (roomId: string, limit?: number) => Promise<any[]>;
  getRoomMembers: (roomId: string) => Promise<any[]>;
  getEvent: (roomId: string, eventId: string) => Promise<any>;
  sendReaction: (roomId: string, eventId: string, reaction: string) => Promise<void>;
  uploadFile: (roomId: string, file: File) => Promise<any>;

  // Message methods
  getMessages: (roomId: string, limit?: number) => Promise<any[]>;
  saveMessage: (message: any) => Promise<void>;
  deleteMessages: (roomId: string) => Promise<void>;
  searchMessages: (query: string, roomId?: string) => Promise<any[]>;

  // Settings methods
  getSettings: () => Promise<any>;
  saveSettings: (settings: any) => Promise<void>;
  getContainerSettings: () => Promise<any>;
  saveContainerSettings: (settings: any) => Promise<void>;

  // Event listeners (原有的)
  onAuthStatus: (callback: (authenticated: boolean) => void) => () => void;
  onMatrixSync: (callback: (state: string) => void) => () => void;
  onRoomUpdate: (callback: (rooms: any[]) => void) => () => void;
  onMessageReceived: (callback: (message: any) => void) => () => void;
}

const electronAPI: IElectronAPI = {
  // App methods
  getAppStatus: () => ipcRenderer.invoke('app:get-status'),
  restartApp: () => ipcRenderer.invoke('app:restart'),
  quitApp: () => ipcRenderer.invoke('app:quit'),

  // Startup window methods
  onStartupProgress: (callback: (data: any) => void) => {
    console.log('[Preload] onStartupProgress registered');
    const listener = (_event: IpcRendererEvent, data: any) => {
      console.log('[Preload] startup-progress received:', data);
      callback(data);
    };
    ipcRenderer.on('startup-progress', listener);
    return () => {
      console.log('[Preload] Removing startup-progress listener');
      ipcRenderer.removeListener('startup-progress', listener);
    };
  },

  onDockerStatus: (callback: (status: any) => void) => {
    console.log('[Preload] onDockerStatus registered');
    const listener = (_event: IpcRendererEvent, status: any) => {
      console.log('[Preload] docker-status received:', status);
      callback(status);
    };
    ipcRenderer.on('docker-status', listener);
    return () => {
      console.log('[Preload] Removing docker-status listener');
      ipcRenderer.removeListener('docker-status', listener);
    };
  },

  onMatrixStatus: (callback: (status: any) => void) => {
    console.log('[Preload] onMatrixStatus registered');
    const listener = (_event: IpcRendererEvent, status: any) => {
      console.log('[Preload] matrix-status received:', status);
      callback(status);
    };
    ipcRenderer.on('matrix-status', listener);
    return () => {
      console.log('[Preload] Removing matrix-status listener');
      ipcRenderer.removeListener('matrix-status', listener);
    };
  },

  onStartupError: (callback: (error: any) => void) => {
    console.log('[Preload] onStartupError registered');
    const listener = (_event: IpcRendererEvent, error: any) => {
      console.log('[Preload] startup-error received:', error);
      callback(error);
    };
    ipcRenderer.on('startup-error', listener);
    return () => {
      console.log('[Preload] Removing startup-error listener');
      ipcRenderer.removeListener('startup-error', listener);
    };
  },

  getStartupState: () => {
    console.log('[Preload] getStartupState called');
    return ipcRenderer.invoke('startup:get-state');
  },

  openGuide: () => {
    console.log('[Preload] openGuide called');
    return ipcRenderer.invoke('open:guide');
  },

  // Docker methods
  checkDocker: () => {
    console.log('[Preload] checkDocker called');
    return ipcRenderer.invoke('docker:check');
  },
  startContainer: () => ipcRenderer.invoke('docker:start-container'),
  stopContainer: () => ipcRenderer.invoke('docker:stop-container'),
  restartContainer: () => ipcRenderer.invoke('docker:restart-container'),
  getContainerStatus: () => ipcRenderer.invoke('docker:get-container-status'),
  getContainerLogs: () => ipcRenderer.invoke('docker:get-container-logs'),
  isDockerInstalled: () => ipcRenderer.invoke('docker:is-installed'),
  getDockerInfo: () => ipcRenderer.invoke('docker:get-info'),
  startConduit: () => ipcRenderer.invoke('docker:start-conduit'),
  stopConduit: () => ipcRenderer.invoke('docker:stop-conduit'),
  getConduitStatus: () => ipcRenderer.invoke('docker:get-conduit-status'),
  getConduitLogs: () => ipcRenderer.invoke('docker:get-conduit-logs'),
  configureDocker: (config: any) => ipcRenderer.invoke('docker:configure', config),

  // Auth methods
  checkAuth: () => ipcRenderer.invoke('auth:check'),
  login: (homeserver: string, username: string, password: string) => ipcRenderer.invoke('auth:login', homeserver, username, password),
  register: (homeserver: string, username: string, password: string, email?: string) => ipcRenderer.invoke('auth:register', homeserver, username, password, email),
  logout: () => ipcRenderer.invoke('auth:logout'),
  getAuthStatus: () => ipcRenderer.invoke('auth:get-status'),
  getCurrentUser: () => ipcRenderer.invoke('auth:get-current-user'),
  getAccessToken: () => ipcRenderer.invoke('auth:get-access-token'),
  getHomeserver: () => ipcRenderer.invoke('auth:get-homeserver'),
  saveCredentials: (homeserver: string, userId: string, accessToken: string) => ipcRenderer.invoke('auth:save-credentials', homeserver, userId, accessToken),
  clearCredentials: () => ipcRenderer.invoke('auth:clear-credentials'),

  // Matrix methods
  connect: () => ipcRenderer.invoke('matrix:connect'),
  disconnect: () => ipcRenderer.invoke('matrix:disconnect'),
  getSyncState: () => ipcRenderer.invoke('matrix:get-sync-state'),
  getRooms: () => ipcRenderer.invoke('matrix:get-rooms'),
  joinRoom: (roomId: string) => ipcRenderer.invoke('matrix:join-room', roomId),
  leaveRoom: (roomId: string) => ipcRenderer.invoke('matrix:leave-room', roomId),
  sendMessage: (roomId: string, content: any) => ipcRenderer.invoke('matrix:send-message', roomId, content),
  sendTyping: (roomId: string, typing: boolean) => ipcRenderer.invoke('matrix:send-typing', roomId, typing),
  sendReadReceipt: (roomId: string, eventId: string) => ipcRenderer.invoke('matrix:send-read-receipt', roomId, eventId),
  getRoomMessages: (roomId: string, limit?: number) => ipcRenderer.invoke('matrix:get-room-messages', roomId, limit),
  getRoomMembers: (roomId: string) => ipcRenderer.invoke('matrix:get-room-members', roomId),
  getEvent: (roomId: string, eventId: string) => ipcRenderer.invoke('matrix:get-event', roomId, eventId),
  sendReaction: (roomId: string, eventId: string, reaction: string) => ipcRenderer.invoke('matrix:send-reaction', roomId, eventId, reaction),
  uploadFile: (roomId: string, file: File) => ipcRenderer.invoke('matrix:upload-file', roomId, file),

  // Message methods
  getMessages: (roomId: string, limit?: number) => ipcRenderer.invoke('messages:get', roomId, limit),
  saveMessage: (message: any) => ipcRenderer.invoke('messages:save', message),
  deleteMessages: (roomId: string) => ipcRenderer.invoke('messages:delete', roomId),
  searchMessages: (query: string, roomId?: string) => ipcRenderer.invoke('messages:search', query, roomId),

  // Settings methods
  getSettings: () => ipcRenderer.invoke('settings:get'),
  saveSettings: (settings: any) => ipcRenderer.invoke('settings:save', settings),
  getContainerSettings: () => ipcRenderer.invoke('settings:get-container'),
  saveContainerSettings: (settings: any) => ipcRenderer.invoke('settings:save-container', settings),

  // Event listeners (原有的)
  onAuthStatus: (callback: (authenticated: boolean) => void) => {
    const listener = (_event: IpcRendererEvent, authenticated: boolean) => callback(authenticated);
    ipcRenderer.on('auth:status', listener);
    return () => ipcRenderer.removeListener('auth:status', listener);
  },
  onMatrixSync: (callback: (state: string) => void) => {
    const listener = (_event: IpcRendererEvent, state: string) => callback(state);
    ipcRenderer.on('matrix:sync', listener);
    return () => ipcRenderer.removeListener('matrix:sync', listener);
  },
  onRoomUpdate: (callback: (rooms: any[]) => void) => {
    const listener = (_event: IpcRendererEvent, rooms: any[]) => callback(rooms);
    ipcRenderer.on('matrix:rooms', listener);
    return () => ipcRenderer.removeListener('matrix:rooms', listener);
  },
  onMessageReceived: (callback: (message: any) => void) => {
    const listener = (_event: IpcRendererEvent, message: any) => callback(message);
    ipcRenderer.on('matrix:message', listener);
    return () => ipcRenderer.removeListener('matrix:message', listener);
  },
};

// Expose the API to the renderer process
contextBridge.exposeInMainWorld('electronAPI', electronAPI);
