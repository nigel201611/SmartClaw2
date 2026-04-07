// src/renderer/hooks/useMatrix.ts
import { useState, useEffect, useCallback, useRef } from 'react';

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
 * 创建房间选项
 */
export interface CreateRoomOptions {
  name?: string; // 房间名称
  topic?: string; // 房间主题
  isDirect?: boolean; // 是否为私聊
  invite?: string[]; // 邀请的用户ID列表
  roomAliasName?: string; // 房间别名（如：myroom）
  visibility?: 'public' | 'private'; // 房间可见性
  preset?: 'private_chat' | 'public_chat' | 'trusted_private_chat'; // 预设配置
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
  connect: (homeserverUrl?: string) => Promise<boolean>;
  login: (username: string, password: string, homeserver?: string) => Promise<boolean>;
  logout: () => Promise<void>;
  sendMessage: (roomId: string, text: string) => Promise<boolean>;
  getRooms: () => Promise<RoomInfo[]>;
  getRoomMessages: (roomId: string, limit?: number) => Promise<MessageContent[]>;
  createRoom: (options?: { name?: string; topic?: string; isDirect?: boolean }) => Promise<string>;
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
  }, []);

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
    [checkElectronAPI],
  );

  /**
   * 获取房间列表
   */
  const getRooms = useCallback(async (): Promise<RoomInfo[]> => {
    if (!checkElectronAPI()) return [];

    try {
      console.log('Fetching rooms...');
      const roomsData = await window.electronAPI.getRooms();
      console.log('Raw rooms data:', roomsData);

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

      console.log('Formatted rooms:', formattedRooms);
      setRooms(formattedRooms);
      return formattedRooms;
    } catch (err: any) {
      console.error('Failed to get rooms:', err);
      setError(err.message);
      return [];
    }
  }, [checkElectronAPI]);

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

          setSession(sessionData);
          setIsLoggedIn(true);

          // 连接到 Matrix 服务器
          console.log('Connecting to Matrix...');
          await window.electronAPI.connect(server);
          setIsConnected(true);
          // 等待连接稳定
          await new Promise((resolve) => setTimeout(resolve, 1000));

          // 获取房间列表
          console.log('Fetching rooms after login...');
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
    [checkElectronAPI, homeserverUrl, getRooms],
  );

  /**
   * 登出
   */
  const logout = useCallback(async (): Promise<void> => {
    if (!checkElectronAPI()) return;

    setIsLoading(true);
    try {
      await window.electronAPI.logout();
      setSession(null);
      setIsLoggedIn(false);
      setIsConnected(false);
      setRooms([]);
      setMessages([]);
      setCurrentRoom(null);
      setSyncState(null);
      console.log('Logged out successfully');
    } catch (err: any) {
      console.error('Logout failed:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [checkElectronAPI]);

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
    [checkElectronAPI],
  );

  /**
   * 获取房间消息
   */
  const getRoomMessages = useCallback(
    async (roomId: string, limit: number = 50): Promise<MessageContent[]> => {
      if (!checkElectronAPI()) return [];

      try {
        const messagesData = await window.electronAPI.getRoomMessages(roomId, limit);
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
      } catch (err: any) {
        console.error('Failed to get messages:', err);
        setError(err.message);
        return [];
      }
    },
    [currentRoom, checkElectronAPI],
  );

  /**
   * 创建房间
   */
  const createRoom = useCallback(
    async (options?: { name?: string; topic?: string; isDirect?: boolean }): Promise<string> => {
      if (!checkElectronAPI()) return '';

      try {
        const result = await window.electronAPI.createRoom(options);
        console.log('Room created:', result);
        await getRooms(); // 刷新房间列表
        return result.roomId || '';
      } catch (err: any) {
        console.error('Failed to create room:', err);
        setError(err.message);
        return '';
      }
    },
    [checkElectronAPI, getRooms],
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
    [checkElectronAPI, getRooms],
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
    [checkElectronAPI, getRooms, currentRoom],
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
        setMessages((prev) => [...prev, formattedMessage]);
      }
    });

    // 监听认证状态
    const authUnsubscribe = window.electronAPI.onAuthStatus((authenticated: boolean) => {
      console.log('Auth status changed:', authenticated);
      setIsLoggedIn(authenticated);
      if (!authenticated) {
        setSession(null);
        setRooms([]);
        setMessages([]);
      }
    });

    // 自动连接
    if (autoConnect) {
      connect(homeserverUrl).catch(console.error);
    }

    // 清理监听器
    return () => {
      syncUnsubscribe();
      roomsUnsubscribe();
      messageUnsubscribe();
      authUnsubscribe();
    };
  }, [autoConnect, homeserverUrl, connect, currentRoom]);

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
    [rooms],
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
