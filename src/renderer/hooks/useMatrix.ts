// src/renderer/hooks/useMatrix.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import { useMatrixStore } from '../stores/matrixStore';
import type { RoomInfo, MessageContent, MatrixSession, SyncState } from '../stores/matrixStore';

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
  connect: (homeserverUrl?: string) => Promise<boolean>;
  login: (username: string, password: string, homeserver?: string) => Promise<boolean>;
  register: (username: string, password: string, email?: string, homeserver?: string) => Promise<boolean>;
  logout: () => Promise<void>;
  sendMessage: (roomId: string, text: string) => Promise<boolean>;
  getRooms: () => Promise<RoomInfo[]>;
  getRoomMessages: (roomId: string, limit?: number) => Promise<MessageContent[] | undefined>;
  createRoom: (options?: { name?: string; topic?: string; isDirect?: boolean }) => Promise<string | undefined>;
  joinRoom: (roomIdOrAlias: string) => Promise<RoomInfo>;
  leaveRoom: (roomId: string) => Promise<void>;
  setCurrentRoomById: (roomId: string) => void;

  // 状态
  isLoading: boolean;
  error: string | null;
}

/**
 * useMatrix Hook
 */
export function useMatrix(options?: {
  autoConnect?: boolean;
  homeserverUrl?: string;
  onMessage?: (message: MessageContent) => void;
  onRoomUpdate?: (rooms: RoomInfo[]) => void;
  onSyncStateChange?: (state: SyncState) => void;
}): UseMatrixReturn {
  const { autoConnect = false, homeserverUrl = 'http://localhost:8008', onMessage, onRoomUpdate, onSyncStateChange } = options || {};

  // 从 store 获取状态和 actions
  const {
    isConnected,
    isLoggedIn,
    session,
    syncState,
    rooms,
    currentRoom,
    messages,
    isLoading,
    error,
    setIsConnected,
    setIsLoggedIn,
    setSession,
    setSyncState,
    setRooms,
    setCurrentRoom,
    setMessages,
    addMessage,
    setIsLoading,
    setError,
    reset,
  } = useMatrixStore();

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
   * 检查 Electron API 是否可用
   */
  const checkElectronAPI = useCallback((): boolean => {
    if (!window.electronAPI) {
      const errorMsg = 'Electron API not available. Make sure preload script is loaded.';
      console.error(errorMsg);
      setError(errorMsg);
      return false;
    }
    return true;
  }, [setError]);

  /**
   * 连接服务器
   */
  const connect = useCallback(
    async (url?: string): Promise<boolean> => {
      if (!checkElectronAPI()) return false;

      setIsLoading(true);
      setError(null);

      try {
        await window.electronAPI.connect(url);
        setIsConnected(true);
        console.log('Connected to Matrix server');
        return true;
      } catch (err: any) {
        console.error('Connection failed:', err);
        setError(err.message || '连接失败');
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [checkElectronAPI, setIsConnected, setIsLoading, setError],
  );

  /**
   * 获取房间列表
   */
  const getRooms = useCallback(async (): Promise<RoomInfo[]> => {
    if (!checkElectronAPI()) return [];

    try {
      const roomsData = await window.electronAPI.getRooms();
      if (!roomsData || !Array.isArray(roomsData)) {
        console.warn('Rooms data is not an array:', roomsData);
        return [];
      }

      const formattedRooms: RoomInfo[] = roomsData.map((room: any) => ({
        roomId: room.roomId,
        name: room.name || room.roomId,
        topic: room.topic || '',
        members: room.members?.length || 0,
        isDirect: room.isDirect || false,
        lastMessage: room.lastMessage,
      }));

      setRooms(formattedRooms);
      return formattedRooms;
    } catch (err: any) {
      setError(err.message);
      return [];
    }
  }, [checkElectronAPI, setRooms, setError]);

  /**
   * 登录
   */
  const login = useCallback(
    async (username: string, password: string, homeserver?: string): Promise<boolean> => {
      if (!checkElectronAPI()) return false;

      setIsLoading(true);
      setError(null);

      try {
        const server = homeserver || homeserverUrl;
        console.log('Logging in to:', server);

        const { data: result } = await window.electronAPI.login(server, username, password);
        console.log('Login result:', result);

        if (result && result.userId) {
          const accessToken = await window.electronAPI.getAccessToken();
          const sessionData: MatrixSession = {
            userId: result.userId,
            deviceId: result.deviceId || 'unknown',
            accessToken: accessToken || '',
            homeserverUrl: server,
          };

          // 更新 store 状态
          setSession(sessionData);
          setIsLoggedIn(true);
          setIsConnected(true);

          // 获取房间列表
          const roomsList = await getRooms();
          console.log(`Retrieved ${roomsList.length} rooms`);

          // 触发房间更新回调
          if (roomUpdateCallbackRef.current) {
            roomUpdateCallbackRef.current(roomsList);
          }

          return true;
        } else {
          const errorMsg = result?.error || '登录失败';
          console.error('Login failed:', errorMsg);
          setError(errorMsg);
          return false;
        }
      } catch (err: any) {
        console.error('Login exception:', err);
        setError(err.message || '登录失败');
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [checkElectronAPI, homeserverUrl, getRooms, setSession, setIsLoggedIn, setIsConnected, setError, setIsLoading],
  );

  const register = useCallback(
    async (username: string, password: string, email?: string, homeserver?: string): Promise<boolean> => {
      if (!checkElectronAPI()) return false;

      setIsLoading(true);
      setError(null);

      try {
        const server = homeserver || homeserverUrl;
        console.log('Registering to:', server);

        const { success, data: result, error } = await window.electronAPI.register(server, username, password, email);

        if (success && result) {
          console.log('Registration successful:', result);

          // 注册成功后自动登录
          const loginSuccess = await login(username, password, server);
          return loginSuccess;
        } else {
          console.error('Registration failed:', error);
          setError(error || '注册失败');
          return false;
        }
      } catch (err: any) {
        console.error('Register exception:', err);
        setError(err.message || '注册失败');
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [checkElectronAPI, homeserverUrl, login, setError, setIsLoading],
  );

  /**
   * 登出
   */
  const logout = useCallback(async (): Promise<void> => {
    if (!checkElectronAPI()) return;

    setIsLoading(true);
    try {
    } catch (err: any) {
      console.error('Logout failed:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [checkElectronAPI, reset, setError, setIsLoading]);

  /**
   * 发送消息
   */
  const sendMessage = useCallback(
    async (roomId: string, text: string): Promise<boolean> => {
      if (!checkElectronAPI()) return false;

      try {
        const content = {
          msgtype: 'm.text',
          body: text,
        };
        await window.electronAPI.sendMessage(roomId, content);
        console.log('Message sent to room:', roomId);
        return true;
      } catch (err: any) {
        console.error('Failed to send message:', err);
        setError(err.message);
        return false;
      }
    },
    [checkElectronAPI, setError],
  );

  /**
   * 获取房间消息
   */
  const getRoomMessages = useCallback(
    async (roomId: string, limit: number = 50): Promise<MessageContent[] | undefined> => {
      if (!checkElectronAPI()) return [];

      try {
        const { success, data: messagesData, error } = await window.electronAPI.getRoomMessages(roomId, limit);
        console.log('getRoomMessages', messagesData, error);
        if (success) {
          const formattedMessages: MessageContent[] = messagesData.map((msg: any) => ({
            roomId: msg.roomId,
            eventId: msg.eventId,
            sender: msg.sender,
            timestamp: msg.timestamp,
            content: msg.content,
            type: msg.type,
          }));
          if (roomId === currentRoom?.roomId) {
            setMessages(formattedMessages);
          }
          return formattedMessages;
        }
      } catch (err: any) {
        console.error('Failed to get messages:', err);
        setError(err.message);
        return [];
      }
    },
    [currentRoom, checkElectronAPI, setMessages, setError],
  );

  /**
   * 创建房间
   */
  const createRoom = useCallback(
    async (options?: { name?: string; topic?: string; isDirect?: boolean }): Promise<string | undefined> => {
      if (!checkElectronAPI()) return '';

      try {
        const { success, data: result, error } = await window.electronAPI.createRoom(options);
        if (success) {
          // 创建成功后刷新房间列表
          await getRooms();
          return result;
        } else {
          setError(error);
        }
      } catch (err: any) {
        console.error('Failed to create room:', err);
        setError(err.message);
        return '';
      }
    },
    [checkElectronAPI, getRooms, setError],
  );

  /**
   * 加入房间
   */
  const joinRoom = useCallback(
    async (roomIdOrAlias: string): Promise<RoomInfo> => {
      if (!checkElectronAPI()) throw new Error('Electron API not available');

      try {
        await window.electronAPI.joinRoom(roomIdOrAlias);
        console.log('Joined room:', roomIdOrAlias);

        // 加入后重新获取房间列表
        const roomsList = await getRooms();
        const joinedRoom = roomsList.find((r) => r.roomId === roomIdOrAlias);

        if (!joinedRoom) {
          throw new Error('Failed to find joined room');
        }

        return joinedRoom;
      } catch (err: any) {
        console.error('Failed to join room:', err);
        setError(err.message);
        throw err;
      }
    },
    [checkElectronAPI, getRooms, setError],
  );

  /**
   * 离开房间
   */
  const leaveRoom = useCallback(
    async (roomId: string): Promise<void> => {
      if (!checkElectronAPI()) return;

      try {
        await window.electronAPI.leaveRoom(roomId);
        console.log('Left room:', roomId);

        // 离开后更新房间列表
        await getRooms();
        if (currentRoom?.roomId === roomId) {
          setCurrentRoom(null);
        }
      } catch (err: any) {
        console.error('Failed to leave room:', err);
        setError(err.message);
      }
    },
    [checkElectronAPI, getRooms, currentRoom, setCurrentRoom, setError],
  );

  // 监听 Matrix 事件
  useEffect(() => {
    if (!window.electronAPI) return;

    // 监听同步状态
    const syncUnsubscribe = window.electronAPI.onMatrixSync((state: string) => {
      console.log('Sync state changed:', state);
      const syncStateValue = state as SyncState;
      setSyncState(syncStateValue);
      syncStateCallbackRef.current?.(syncStateValue);
    });

    // 监听房间更新
    const roomsUnsubscribe = window.electronAPI.onRoomUpdate((roomsData: any[]) => {
      console.log('Room update event received:', roomsData);
      const formattedRooms: RoomInfo[] = roomsData.map((room: any) => ({
        roomId: room.roomId,
        name: room.name || room.roomId,
        topic: room.topic || '',
        members: room.members?.length || 0,
        isDirect: room.isDirect || false,
        lastMessage: room.lastMessage,
      }));
      setRooms(formattedRooms);
      roomUpdateCallbackRef.current?.(formattedRooms);
    });

    // 监听消息接收
    const messageUnsubscribe = window.electronAPI.onMessageReceived((message: any) => {
      console.log('Message received:', message);
      const formattedMessage: MessageContent = {
        roomId: message.roomId,
        eventId: message.eventId,
        sender: message.sender,
        timestamp: message.timestamp,
        content: message.content,
        type: message.type,
      };

      messageCallbackRef.current?.(formattedMessage);

      // 如果是当前房间的消息，添加到消息列表
      if (currentRoom?.roomId === message.roomId) {
        addMessage(formattedMessage);
      }
    });

    // 监听认证状态
    const authUnsubscribe = window.electronAPI.onAuthStatus((authenticated: boolean) => {
      console.log('Auth status changed:', authenticated);
      if (!authenticated) {
        reset();
      }
    });

    // 自动连接
    if (autoConnect && !isConnected) {
      connect(homeserverUrl).catch(console.error);
    }

    // 清理监听器
    return () => {
      syncUnsubscribe();
      roomsUnsubscribe();
      messageUnsubscribe();
      authUnsubscribe();
    };
  }, [autoConnect, homeserverUrl, connect, currentRoom, setSyncState, setRooms, addMessage, reset, isConnected]);

  /**
   * 通过房间ID设置当前房间
   */
  const setCurrentRoomById = useCallback(
    (roomId: string) => {
      const room = rooms.find((r) => r.roomId === roomId);
      if (room) {
        setCurrentRoom(room);
      } else {
        console.warn('Room not found with ID:', roomId);
      }
    },
    [rooms, setCurrentRoom],
  );

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
    register,
    logout,
    sendMessage,
    getRooms,
    getRoomMessages,
    createRoom,
    joinRoom,
    leaveRoom,
    setCurrentRoomById,

    // 状态
    isLoading,
    error,
  };
}

export default useMatrix;
