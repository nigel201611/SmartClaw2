/**
 * SmartClaw React Hook - useMatrix
 * 
 * 用于渲染进程中 Matrix 客户端操作的 React Hook
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { ipcRenderer } from 'electron';

/**
 * Matrix 会话接口
 */
export interface MatrixSession {
  userId: string;
  deviceId: string;
  accessToken: string;
  homeserverUrl: string;
}

/**
 * 消息内容接口
 */
export interface MessageContent {
  roomId: string;
  eventId: string;
  sender: string;
  timestamp: number;
  content: {
    msgtype: string;
    body: string;
    formatted_body?: string;
  };
  type: string;
}

/**
 * 房间信息接口
 */
export interface RoomInfo {
  roomId: string;
  name: string;
  topic?: string;
  members: number;
  isDirect: boolean;
  lastMessage?: MessageContent;
}

/**
 * 同步状态
 */
export type SyncState = 'PREPARED' | 'SYNCING' | 'ERROR' | 'RECONNECTING' | 'STOPPED';

/**
 * useMatrix Hook 返回值
 */
interface UseMatrixReturn {
  // 连接状态
  isConnected: boolean;
  isLoggedIn: boolean;
  session: MatrixSession | null;
  syncState: SyncState | null;
  
  // 数据
  rooms: RoomInfo[];
  currentRoom: RoomInfo | null;
  messages: MessageContent[];
  
  // 操作函数
  connect: (homeserverUrl: string) => Promise<boolean>;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  sendMessage: (roomId: string, text: string) => Promise<boolean>;
  getRooms: () => Promise<RoomInfo[]>;
  getRoomMessages: (roomId: string, limit?: number) => Promise<MessageContent[]>;
  createRoom: (options?: { name?: string; isDirect?: boolean }) => Promise<string>;
  joinRoom: (roomIdOrAlias: string) => Promise<RoomInfo>;
  leaveRoom: (roomId: string) => Promise<void>;
  
  // 事件回调
  onMessage?: (message: MessageContent) => void;
  onRoomUpdate?: (room: RoomInfo) => void;
  onSyncStateChange?: (state: SyncState) => void;
  
  // 状态
  isLoading: boolean;
  error: string | null;
}

/**
 * Matrix IPC 通道
 */
const IPC_CHANNELS = {
  CONNECT: 'matrix:connect',
  LOGIN: 'matrix:login',
  LOGOUT: 'matrix:logout',
  RESTORE_SESSION: 'matrix:restore-session',
  GET_SESSION: 'matrix:get-session',
  IS_LOGGED_IN: 'matrix:is-logged-in',
  GET_ROOMS: 'matrix:get-rooms',
  GET_ROOM: 'matrix:get-room',
  CREATE_ROOM: 'matrix:create-room',
  JOIN_ROOM: 'matrix:join-room',
  LEAVE_ROOM: 'matrix:leave-room',
  SEND_MESSAGE: 'matrix:send-message',
  SEND_FORMATTED_MESSAGE: 'matrix:send-formatted-message',
  GET_ROOM_MESSAGES: 'matrix:get-room-messages',
  SUBSCRIBE_EVENTS: 'matrix:subscribe-events',
  
  // 事件
  LOGGED_IN: 'matrix:logged-in',
  LOGGED_OUT: 'matrix:logged-out',
  MESSAGE: 'matrix:message',
  ROOM: 'matrix:room',
  SYNC: 'matrix:sync',
  ERROR: 'matrix:error'
};

/**
 * useMatrix Hook
 */
export function useMatrix(options?: {
  autoConnect?: boolean;
  homeserverUrl?: string;
  onMessage?: (message: MessageContent) => void;
  onRoomUpdate?: (room: RoomInfo) => void;
  onSyncStateChange?: (state: SyncState) => void;
}): UseMatrixReturn {
  const {
    autoConnect = false,
    homeserverUrl = 'http://localhost:8008',
    onMessage,
    onRoomUpdate,
    onSyncStateChange
  } = options || {};

  // 连接状态
  const [isConnected, setIsConnected] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [session, setSession] = useState<MatrixSession | null>(null);
  const [syncState, setSyncState] = useState<SyncState | null>(null);
  
  // 数据
  const [rooms, setRooms] = useState<RoomInfo[]>([]);
  const [currentRoom, setCurrentRoom] = useState<RoomInfo | null>(null);
  const [messages, setMessages] = useState<MessageContent[]>([]);
  
  // 状态
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // 事件监听引用
  const messageCallbackRef = useRef(onMessage);
  const roomUpdateCallbackRef = useRef(onRoomUpdate);
  const syncStateCallbackRef = useRef(onSyncStateChange);

  // 更新回调引用
  useEffect(() => {
    messageCallbackRef.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    roomUpdateCallbackRef.current = onRoomUpdate;
  }, [onRoomUpdate]);

  useEffect(() => {
    syncStateCallbackRef.current = onSyncStateChange;
  }, [onSyncStateChange]);

  /**
   * 连接服务器
   */
  const connect = useCallback(async (url: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await ipcRenderer.invoke(IPC_CHANNELS.CONNECT, url);
      if (result.success) {
        setIsConnected(true);
        return true;
      } else {
        setError(result.error);
        return false;
      }
    } catch (err: any) {
      setError(err.message || '连接失败');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * 登录
   */
  const login = useCallback(async (username: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await ipcRenderer.invoke(IPC_CHANNELS.LOGIN, username, password);
      if (result.success && result.data) {
        setSession(result.data);
        setIsLoggedIn(true);
        return true;
      } else {
        setError(result.error);
        return false;
      }
    } catch (err: any) {
      setError(err.message || '登录失败');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * 登出
   */
  const logout = useCallback(async () => {
    try {
      await ipcRenderer.invoke(IPC_CHANNELS.LOGOUT);
      setSession(null);
      setIsLoggedIn(false);
      setRooms([]);
      setMessages([]);
      setCurrentRoom(null);
    } catch (err: any) {
      setError(err.message);
    }
  }, []);

  /**
   * 发送消息
   */
  const sendMessage = useCallback(async (roomId: string, text: string): Promise<boolean> => {
    try {
      const result = await ipcRenderer.invoke(IPC_CHANNELS.SEND_MESSAGE, roomId, text);
      if (result.success) {
        return true;
      } else {
        setError(result.error);
        return false;
      }
    } catch (err: any) {
      setError(err.message);
      return false;
    }
  }, []);

  /**
   * 获取房间列表
   */
  const getRooms = useCallback(async (): Promise<RoomInfo[]> => {
    try {
      const result = await ipcRenderer.invoke(IPC_CHANNELS.GET_ROOMS);
      if (result.success && result.data) {
        setRooms(result.data);
        return result.data;
      } else {
        throw new Error(result.error);
      }
    } catch (err: any) {
      setError(err.message);
      return [];
    }
  }, []);

  /**
   * 获取房间消息
   */
  const getRoomMessages = useCallback(async (roomId: string, limit: number = 50): Promise<MessageContent[]> => {
    try {
      const result = await ipcRenderer.invoke(IPC_CHANNELS.GET_ROOM_MESSAGES, roomId, limit);
      if (result.success && result.data) {
        if (roomId === currentRoom?.roomId) {
          setMessages(result.data);
        }
        return result.data;
      } else {
        throw new Error(result.error);
      }
    } catch (err: any) {
      setError(err.message);
      return [];
    }
  }, [currentRoom]);

  /**
   * 创建房间
   */
  const createRoom = useCallback(async (options?: { name?: string; isDirect?: boolean }): Promise<string> => {
    try {
      const result = await ipcRenderer.invoke(IPC_CHANNELS.CREATE_ROOM, options);
      if (result.success && result.data) {
        return result.data;
      } else {
        throw new Error(result.error);
      }
    } catch (err: any) {
      setError(err.message);
      return '';
    }
  }, []);

  /**
   * 加入房间
   */
  const joinRoom = useCallback(async (roomIdOrAlias: string): Promise<RoomInfo> => {
    try {
      const result = await ipcRenderer.invoke(IPC_CHANNELS.JOIN_ROOM, roomIdOrAlias);
      if (result.success && result.data) {
        return result.data;
      } else {
        throw new Error(result.error);
      }
    } catch (err: any) {
      setError(err.message);
      return null as any;
    }
  }, []);

  /**
   * 离开房间
   */
  const leaveRoom = useCallback(async (roomId: string): Promise<void> => {
    try {
      const result = await ipcRenderer.invoke(IPC_CHANNELS.LEAVE_ROOM, roomId);
      if (!result.success) {
        throw new Error(result.error);
      }
    } catch (err: any) {
      setError(err.message);
    }
  }, []);

  // 自动连接和事件监听
  useEffect(() => {
    if (autoConnect && homeserverUrl) {
      connect(homeserverUrl);
    }

    // 监听登录事件
    const handleLoggedIn = (event: any, session: MatrixSession) => {
      setSession(session);
      setIsLoggedIn(true);
    };

    const handleLoggedOut = () => {
      setSession(null);
      setIsLoggedIn(false);
      setRooms([]);
      setMessages([]);
    };

    // 监听消息事件
    const handleMessage = (event: any, message: MessageContent) => {
      messageCallbackRef.current?.(message);
    };

    // 监听房间更新
    const handleRoom = (event: any, room: RoomInfo) => {
      roomUpdateCallbackRef.current?.(room);
      setRooms(prev => {
        const exists = prev.find(r => r.roomId === room.roomId);
        if (exists) {
          return prev.map(r => r.roomId === room.roomId ? room : r);
        } else {
          return [...prev, room];
        }
      });
    };

    // 监听同步状态
    const handleSync = (event: any, data: any) => {
      const state = data.state as SyncState;
      setSyncState(state);
      syncStateCallbackRef.current?.(state);
    };

    // 监听错误
    const handleError = (event: any, errorData: any) => {
      setError(errorData.message || '未知错误');
    };

    // 注册监听器
    ipcRenderer.on(IPC_CHANNELS.LOGGED_IN, handleLoggedIn);
    ipcRenderer.on(IPC_CHANNELS.LOGGED_OUT, handleLoggedOut);
    ipcRenderer.on(IPC_CHANNELS.MESSAGE, handleMessage);
    ipcRenderer.on(IPC_CHANNELS.ROOM, handleRoom);
    ipcRenderer.on(IPC_CHANNELS.SYNC, handleSync);
    ipcRenderer.on(IPC_CHANNELS.ERROR, handleError);

    // 订阅 Matrix 事件
    ipcRenderer.invoke(IPC_CHANNELS.SUBSCRIBE_EVENTS, [
      'message',
      'room',
      'sync',
      'error'
    ]);

    // 清理
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.LOGGED_IN, handleLoggedIn);
      ipcRenderer.removeListener(IPC_CHANNELS.LOGGED_OUT, handleLoggedOut);
      ipcRenderer.removeListener(IPC_CHANNELS.MESSAGE, handleMessage);
      ipcRenderer.removeListener(IPC_CHANNELS.ROOM, handleRoom);
      ipcRenderer.removeListener(IPC_CHANNELS.SYNC, handleSync);
      ipcRenderer.removeListener(IPC_CHANNELS.ERROR, handleError);
    };
  }, [autoConnect, homeserverUrl, connect]);

  return {
    // 连接状态
    isConnected,
    isLoggedIn,
    session,
    syncState,
    
    // 数据
    rooms,
    currentRoom,
    messages,
    
    // 操作函数
    connect,
    login,
    logout,
    sendMessage,
    getRooms,
    getRoomMessages,
    createRoom,
    joinRoom,
    leaveRoom,
    
    // 状态
    isLoading,
    error
  };
}

export default useMatrix;
