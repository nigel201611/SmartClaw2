// src/renderer/preload.ts

import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';

export interface IElectronAPI {
  // App methods
  getAppStatus: () => Promise<any>;
  restartApp: () => Promise<void>;
  quitApp: () => Promise<void>;

  // Startup window methods
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
  register: (homeserver: string, username: string, password: string, token?: string, email?: string) => Promise<any>;
  logout: () => Promise<void>;
  getAuthStatus: () => Promise<any>;
  getCurrentUser: () => Promise<any>;
  getAccessToken: () => Promise<string | null>;
  getHomeserver: () => Promise<string | null>;
  saveCredentials: (homeserver: string, userId: string, accessToken: string) => Promise<void>;
  clearCredentials: () => Promise<void>;

  // Matrix methods
  connect: (homeserverUrl: string) => Promise<void>;
  disconnect: () => Promise<void>;
  getSyncState: () => Promise<string>;
  getRooms: () => Promise<any[]>;
  joinRoom: (roomId: string) => Promise<void>;
  leaveRoom: (roomId: string) => Promise<void>;
  deleteRoom: (roomId: string) => Promise<{ success: boolean; data?: { method: string; message: string }; error?: string }>;
  deleteRoomIntelligent: (roomId: string) => Promise<{ success: boolean; data?: { method: string; message: string }; error?: string }>;
  getUserPowerInfo: (roomId: string) => Promise<{ success: boolean; data?: any; error?: string }>;
  sendMessage: (roomId: string, content: any) => Promise<any>;
  sendTyping: (roomId: string, typing: boolean) => Promise<void>;
  sendReadReceipt: (roomId: string, eventId: string) => Promise<void>;
  getRoomMessages: (roomId: string, limit?: number) => Promise<any>;
  getRoomMembers: (roomId: string) => Promise<any[]>;
  getEvent: (roomId: string, eventId: string) => Promise<any>;
  sendReaction: (roomId: string, eventId: string, reaction: string) => Promise<void>;
  uploadFile: (roomId: string, file: File) => Promise<any>;
  createRoom: (options?: { name?: string; topic?: string; isDirect?: boolean }) => Promise<any>;
  checkRoomNameExists: (roomName: string, excludeRoomId?: string) => Promise<{ exists: boolean }>;

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

  // Event listeners
  onAuthStatus: (callback: (authenticated: boolean) => void) => () => void;
  onMatrixSync: (callback: (state: string) => void) => () => void;
  onRoomUpdate: (callback: (rooms: any[]) => void) => () => void;
  onMessageReceived: (callback: (message: any) => void) => () => void;
  onRoomDeleted: (callback: (roomId: string) => void) => () => void;
}

const electronAPI: IElectronAPI = {
  // App methods
  getAppStatus: () => ipcRenderer.invoke('app:get-status'),
  restartApp: () => ipcRenderer.invoke('app:restart'),
  quitApp: () => ipcRenderer.invoke('app:quit'),

  // Startup window methods
  onStartupProgress: (callback: (data: any) => void) => {
    const listener = (_event: IpcRendererEvent, data: any) => callback(data);
    ipcRenderer.on('startup-progress', listener);
    return () => ipcRenderer.removeListener('startup-progress', listener);
  },
  onDockerStatus: (callback: (status: any) => void) => {
    const listener = (_event: IpcRendererEvent, status: any) => callback(status);
    ipcRenderer.on('docker-status', listener);
    return () => ipcRenderer.removeListener('docker-status', listener);
  },
  onMatrixStatus: (callback: (status: any) => void) => {
    const listener = (_event: IpcRendererEvent, status: any) => callback(status);
    ipcRenderer.on('matrix-status', listener);
    return () => ipcRenderer.removeListener('matrix-status', listener);
  },
  onStartupError: (callback: (error: any) => void) => {
    const listener = (_event: IpcRendererEvent, error: any) => callback(error);
    ipcRenderer.on('startup-error', listener);
    return () => ipcRenderer.removeListener('startup-error', listener);
  },
  getStartupState: () => ipcRenderer.invoke('startup:get-state'),
  openGuide: () => ipcRenderer.invoke('open:guide'),

  // Docker methods
  checkDocker: () => ipcRenderer.invoke('docker:check'),
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
  register: (homeserver: string, username: string, password: string, token?: string, email?: string) => ipcRenderer.invoke('auth:register', homeserver, username, password, token, email),
  logout: () => ipcRenderer.invoke('auth:logout'),
  getAuthStatus: () => ipcRenderer.invoke('auth:get-status'),
  getCurrentUser: () => ipcRenderer.invoke('auth:get-current-user'),
  getAccessToken: () => ipcRenderer.invoke('auth:get-access-token'),
  getHomeserver: () => ipcRenderer.invoke('auth:get-homeserver'),
  saveCredentials: (homeserver: string, userId: string, accessToken: string) => ipcRenderer.invoke('auth:save-credentials', homeserver, userId, accessToken),
  clearCredentials: () => ipcRenderer.invoke('auth:clear-credentials'),

  // Matrix methods
  connect: (homeserverUrl: string) => ipcRenderer.invoke('matrix:connect', homeserverUrl),
  disconnect: () => ipcRenderer.invoke('matrix:disconnect'),
  getSyncState: () => ipcRenderer.invoke('matrix:get-sync-state'),
  getRooms: () => ipcRenderer.invoke('matrix:get-rooms'),
  joinRoom: (roomId: string) => ipcRenderer.invoke('matrix:join-room', roomId),
  leaveRoom: (roomId: string) => ipcRenderer.invoke('matrix:leave-room', roomId),
  deleteRoom: (roomId: string) => ipcRenderer.invoke('matrix:delete-room', roomId),
  deleteRoomIntelligent: (roomId: string) => ipcRenderer.invoke('matrix:delete-room-intelligent', roomId),
  getUserPowerInfo: (roomId: string) => ipcRenderer.invoke('matrix:get-user-power-info', roomId),
  sendMessage: (roomId: string, content: any) => ipcRenderer.invoke('matrix:send-message', roomId, content),
  sendTyping: (roomId: string, typing: boolean) => ipcRenderer.invoke('matrix:send-typing', roomId, typing),
  sendReadReceipt: (roomId: string, eventId: string) => ipcRenderer.invoke('matrix:send-read-receipt', roomId, eventId),
  getRoomMessages: (roomId: string, limit?: number) => ipcRenderer.invoke('matrix:get-room-messages', roomId, limit),
  getRoomMembers: (roomId: string) => ipcRenderer.invoke('matrix:get-room-members', roomId),
  getEvent: (roomId: string, eventId: string) => ipcRenderer.invoke('matrix:get-event', roomId, eventId),
  sendReaction: (roomId: string, eventId: string, reaction: string) => ipcRenderer.invoke('matrix:send-reaction', roomId, eventId, reaction),
  uploadFile: (roomId: string, file: File) => ipcRenderer.invoke('matrix:upload-file', roomId, file),
  createRoom: async (options?: { name?: string; topic?: string; isDirect?: boolean }) => {
    return ipcRenderer.invoke('matrix:create-room', options);
  },
  checkRoomNameExists: async (roomName: string, excludeRoomId?: string) => {
    return ipcRenderer.invoke('matrix:check-room-name', roomName, excludeRoomId);
  },

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

  // Event listeners
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
  onRoomDeleted: (callback: (roomId: string) => void) => {
    const listener = (_event: IpcRendererEvent, roomId: string) => callback(roomId);
    ipcRenderer.on('matrix:room-deleted', listener);
    return () => ipcRenderer.removeListener('matrix:room-deleted', listener);
  },
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);
