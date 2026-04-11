// src/renderer/hooks/useMatrix.ts

import { useState, useEffect, useCallback, useRef } from 'react';
import { useMatrixStore } from '../stores/matrixStore';
import type { RoomInfo, MessageContent, MatrixSession, SyncState } from '../types';

interface UseMatrixReturn {
  isConnected: boolean;
  isLoggedIn: boolean;
  session: MatrixSession | null;
  syncState: SyncState | null;
  rooms: RoomInfo[];
  currentRoom: RoomInfo | null;
  messages: MessageContent[];
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
  deleteRoom: (roomId: string) => Promise<{ success: boolean; method?: string; message?: string }>;
  deleteRoomIntelligent: (roomId: string) => Promise<{ success: boolean; method?: string; message?: string }>;
  getUserPowerInfo: (roomId: string) => Promise<any>;
  checkRoomNameExists: (roomName: string, excludeRoomId?: string) => Promise<boolean>;
  setCurrentRoomById: (roomId: string) => void;
  setCurrentRoom: (room: RoomInfo | null) => void;
  removeRoom: (roomId: string) => void;
  clearError: () => void;
  isLoading: boolean;
  error: string | null;
}

export function useMatrix(options?: {
  autoConnect?: boolean;
  homeserverUrl?: string;
  onMessage?: (message: MessageContent) => void;
  onRoomUpdate?: (rooms: RoomInfo[]) => void;
  onSyncStateChange?: (state: SyncState) => void;
}): UseMatrixReturn {
  const { autoConnect = false, homeserverUrl = 'http://localhost:8008', onMessage, onRoomUpdate, onSyncStateChange } = options || {};

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
    clearError,
    reset,
    removeRoom,
  } = useMatrixStore();

  const messageCallbackRef = useRef(onMessage);
  const roomUpdateCallbackRef = useRef(onRoomUpdate);
  const syncStateCallbackRef = useRef(onSyncStateChange);

  useEffect(() => {
    messageCallbackRef.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    roomUpdateCallbackRef.current = onRoomUpdate;
  }, [onRoomUpdate]);

  useEffect(() => {
    syncStateCallbackRef.current = onSyncStateChange;
  }, [onSyncStateChange]);

  const checkElectronAPI = useCallback((): boolean => {
    if (!window.electronAPI) {
      const errorMsg = 'Electron API not available. Make sure preload script is loaded.';
      console.error(errorMsg);
      setError(errorMsg);
      return false;
    }
    return true;
  }, [setError]);

  const connect = useCallback(
    async (url?: string): Promise<boolean> => {
      if (!checkElectronAPI()) return false;
      setIsLoading(true);
      setError(null);
      try {
        await window.electronAPI.connect(url || homeserverUrl);
        setIsConnected(true);
        return true;
      } catch (err: any) {
        console.error('Connection failed:', err);
        setError(err.message || '连接失败');
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [checkElectronAPI, homeserverUrl, setIsConnected, setIsLoading, setError],
  );

  const getRooms = useCallback(async (): Promise<RoomInfo[]> => {
    if (!checkElectronAPI()) return [];
    try {
      const roomsData = await window.electronAPI.getRooms();
      if (!roomsData || !Array.isArray(roomsData)) {
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

  const login = useCallback(
    async (username: string, password: string, homeserver?: string): Promise<boolean> => {
      if (!checkElectronAPI()) return false;
      setIsLoading(true);
      setError(null);
      try {
        const server = homeserver || homeserverUrl;
        console.log('Attempting login to:', server);

        const result = await window.electronAPI.login(server, username, password);
        console.log('Login result:', result);

        if (result && result.success === false) {
          const errorMsg = result.error || '登录失败，请检查用户名或密码';
          console.error('Login failed:', errorMsg);
          setError(errorMsg);
          return false;
        }

        if (result.success && result.data.userId) {
          // const accessToken = await window.electronAPI.getAccessToken();
          const sessionData: MatrixSession = {
            userId: result.data.userId,
            deviceId: result.data.deviceId || 'unknown',
            accessToken: result.data.accessToken || '',
            homeserverUrl: server,
          };
          setSession(sessionData);
          setIsLoggedIn(true);
          setIsConnected(true);
          const roomsList = await getRooms();
          console.log(`Retrieved ${roomsList.length} rooms`);
          if (roomUpdateCallbackRef.current) {
            roomUpdateCallbackRef.current(roomsList);
          }
          return true;
        } else {
          let errorMsg = '登录失败';
          if (result?.error) {
            errorMsg = result.error;
          } else if (result?.message) {
            errorMsg = result.message;
          } else if (result && result.httpStatus === 401) {
            errorMsg = '用户名或密码错误';
          } else if (result && result.httpStatus === 403) {
            errorMsg = '账户已被禁用';
          }
          console.error('Login failed:', errorMsg);
          setError(errorMsg);
          return false;
        }
      } catch (err: any) {
        console.error('Login exception:', err);
        let errorMsg = '登录失败，请检查网络连接或服务器地址';
        if (err.message) {
          if (err.message.includes('401')) {
            errorMsg = '用户名或密码错误';
          } else if (err.message.includes('403')) {
            errorMsg = '账户已被禁用';
          } else if (err.message.includes('ECONNREFUSED')) {
            errorMsg = '无法连接到服务器，请检查服务器地址';
          } else {
            errorMsg = err.message;
          }
        }
        setError(errorMsg);
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
        console.log('Attempting registration to:', server);

        const result = await window.electronAPI.register(server, username, password, email);
        console.log('Register result:', result);

        if (result && result.success === false) {
          const errorMsg = result.error || '注册失败';
          setError(errorMsg);
          return false;
        }

        if (result.success && result.data.userId) {
          const loginSuccess = await login(username, password, server);
          return loginSuccess;
        } else {
          let errorMsg = '注册失败';
          if (result?.error) {
            errorMsg = result.error;
          } else if (result?.message) {
            errorMsg = result.message;
          } else if (result && result.errcode === 'M_USER_IN_USE') {
            errorMsg = '用户名已被使用';
          } else if (result && result.errcode === 'M_INVALID_USERNAME') {
            errorMsg = '用户名无效，只允许包含小写字母、数字、点和下划线';
          }
          setError(errorMsg);
          return false;
        }
      } catch (err: any) {
        console.error('Register exception:', err);
        let errorMsg = '注册失败，请检查网络连接';
        if (err.message) {
          if (err.message.includes('ECONNREFUSED')) {
            errorMsg = '无法连接到服务器';
          } else {
            errorMsg = err.message;
          }
        }
        setError(errorMsg);
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [checkElectronAPI, homeserverUrl, login, setError, setIsLoading],
  );

  const logout = useCallback(async (): Promise<void> => {
    if (!checkElectronAPI()) return;
    setIsLoading(true);
    try {
      await window.electronAPI.logout();
      reset();
    } catch (err: any) {
      console.error('Logout failed:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [checkElectronAPI, reset, setError, setIsLoading]);

  const sendMessage = useCallback(
    async (roomId: string, text: string): Promise<boolean> => {
      if (!checkElectronAPI()) return false;
      try {
        const content = { msgtype: 'm.text', body: text };
        await window.electronAPI.sendMessage(roomId, content);
        return true;
      } catch (err: any) {
        console.error('Failed to send message:', err);
        setError(err.message);
        return false;
      }
    },
    [checkElectronAPI, setError],
  );

  const getRoomMessages = useCallback(
    async (roomId: string, limit: number = 50): Promise<MessageContent[] | undefined> => {
      if (!checkElectronAPI()) return [];
      try {
        const result = await window.electronAPI.getRoomMessages(roomId, limit);
        if (result && result.success) {
          const formattedMessages: MessageContent[] = result.data.map((msg: any) => ({
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
        } else if (result && result.data) {
          const formattedMessages: MessageContent[] = result.data.map((msg: any) => ({
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
        return [];
      } catch (err: any) {
        console.error('Failed to get messages:', err);
        setError(err.message);
        return [];
      }
    },
    [currentRoom, checkElectronAPI, setMessages, setError],
  );

  const createRoom = useCallback(
    async (options?: { name?: string; topic?: string; isDirect?: boolean }): Promise<string | undefined> => {
      if (!checkElectronAPI()) return undefined;
      try {
        const result = await window.electronAPI.createRoom(options);
        if (result && result.success) {
          await getRooms();
          return result.data;
        } else {
          setError(result?.error || '创建房间失败');
          return undefined;
        }
      } catch (err: any) {
        console.error('Failed to create room:', err);
        setError(err.message);
        return undefined;
      }
    },
    [checkElectronAPI, getRooms, setError],
  );

  const joinRoom = useCallback(
    async (roomIdOrAlias: string): Promise<RoomInfo> => {
      if (!checkElectronAPI()) throw new Error('Electron API not available');
      try {
        const result = await window.electronAPI.joinRoom(roomIdOrAlias);
        if (result && result.success) {
          const roomsList = await getRooms();
          const joinedRoom = roomsList.find((r) => r.roomId === roomIdOrAlias);
          if (!joinedRoom) throw new Error('Failed to find joined room');
          return joinedRoom;
        } else {
          throw new Error(result?.error || '加入房间失败');
        }
      } catch (err: any) {
        console.error('Failed to join room:', err);
        setError(err.message);
        throw err;
      }
    },
    [checkElectronAPI, getRooms, setError],
  );

  const leaveRoom = useCallback(
    async (roomId: string): Promise<void> => {
      if (!checkElectronAPI()) return;
      try {
        await window.electronAPI.leaveRoom(roomId);
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

  const deleteRoom = useCallback(
    async (roomId: string): Promise<{ success: boolean; method?: string; message?: string }> => {
      if (!checkElectronAPI()) return { success: false };
      try {
        const result = await window.electronAPI.deleteRoom(roomId);
        if (result.success) {
          removeRoom(roomId);
          if (currentRoom?.roomId === roomId) {
            setCurrentRoom(null);
          }
          await getRooms();
          return { success: true, method: result.data?.method, message: result.data?.message };
        } else {
          setError(result.error || '删除房间失败');
          return { success: false };
        }
      } catch (err: any) {
        console.error('Failed to delete room:', err);
        setError(err.message);
        return { success: false };
      }
    },
    [checkElectronAPI, getRooms, currentRoom, setCurrentRoom, setError, removeRoom],
  );

  const deleteRoomIntelligent = useCallback(
    async (roomId: string): Promise<{ success: boolean; method?: string; message?: string }> => {
      if (!checkElectronAPI()) return { success: false };
      try {
        const result = await window.electronAPI.deleteRoomIntelligent(roomId);
        console.log('Delete room result:', result);
        if (result.success) {
          // 立即从本地 store 中移除
          removeRoom(roomId);
          // 如果当前选中的房间是被删除的房间，清空选中状态
          if (currentRoom?.roomId === roomId) {
            setCurrentRoom(null);
          }

          // 强制刷新房间列表以确保同步
          await getRooms();

          // 再次确保从缓存中移除（双重保障）
          setTimeout(() => {
            removeRoom(roomId);
            getRooms();
          }, 500);

          return {
            success: true,
            method: result.data?.method,
            message: result.data?.message,
          };
        } else {
          setError(result.error || '删除房间失败');
          return { success: false };
        }
      } catch (err: any) {
        console.error('Failed to delete room:', err);
        setError(err.message);
        return { success: false };
      }
    },
    [checkElectronAPI, getRooms, currentRoom, setCurrentRoom, setError, removeRoom],
  );

  const getUserPowerInfo = useCallback(
    async (roomId: string): Promise<any> => {
      if (!checkElectronAPI()) return null;
      try {
        const result = await window.electronAPI.getUserPowerInfo(roomId);
        if (result.success) {
          return result.data;
        } else {
          setError(result.error || '获取权限信息失败');
          return null;
        }
      } catch (err: any) {
        console.error('Failed to get user power info:', err);
        setError(err.message);
        return null;
      }
    },
    [checkElectronAPI, setError],
  );

  const checkRoomNameExists = useCallback(
    async (roomName: string, excludeRoomId?: string): Promise<boolean> => {
      if (!checkElectronAPI()) return false;
      try {
        const result = await window.electronAPI.checkRoomNameExists(roomName, excludeRoomId);
        return result.exists || false;
      } catch (err: any) {
        console.error('Failed to check room name:', err);
        return false;
      }
    },
    [checkElectronAPI],
  );

  useEffect(() => {
    if (!window.electronAPI) return;

    const syncUnsubscribe = window.electronAPI.onMatrixSync((state: string) => {
      console.log('Sync state changed:', state);
      setSyncState(state as SyncState);
      syncStateCallbackRef.current?.(state as SyncState);
    });

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
      if (currentRoom?.roomId === message.roomId) {
        addMessage(formattedMessage);
      }
    });

    const authUnsubscribe = window.electronAPI.onAuthStatus((authenticated: boolean) => {
      console.log('Auth status changed:', authenticated);
      if (!authenticated) {
        reset();
      }
    });

    if (autoConnect && !isConnected) {
      connect(homeserverUrl).catch(console.error);
    }

    return () => {
      syncUnsubscribe();
      roomsUnsubscribe();
      messageUnsubscribe();
      authUnsubscribe();
    };
  }, [autoConnect, homeserverUrl, connect, currentRoom, setSyncState, setRooms, addMessage, reset, isConnected]);

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
    isConnected,
    isLoggedIn,
    session,
    syncState,
    rooms,
    currentRoom,
    messages,
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
    deleteRoom,
    deleteRoomIntelligent,
    getUserPowerInfo,
    checkRoomNameExists,
    setCurrentRoomById,
    setCurrentRoom,
    removeRoom,
    clearError,
    isLoading,
    error,
  };
}

export default useMatrix;
