// src/renderer/stores/matrixStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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
 * Matrix Store 状态
 */
interface MatrixStore {
  // 连接状态
  isConnected: boolean;
  isLoggedIn: boolean;
  session: MatrixSession | null;
  syncState: SyncState | null;

  // 数据
  rooms: RoomInfo[];
  currentRoom: RoomInfo | null;
  messages: MessageContent[];

  // 状态
  isLoading: boolean;
  error: string | null;

  // Actions
  setIsConnected: (isConnected: boolean) => void;
  setIsLoggedIn: (isLoggedIn: boolean) => void;
  setSession: (session: MatrixSession | null) => void;
  setSyncState: (syncState: SyncState | null) => void;
  setRooms: (rooms: RoomInfo[]) => void;
  setCurrentRoom: (currentRoom: RoomInfo | null) => void;
  setMessages: (messages: MessageContent[]) => void;
  addMessage: (message: MessageContent) => void;
  setIsLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;

  // 批量更新
  updateRooms: (rooms: RoomInfo[]) => void;

  // 重置所有状态
  reset: () => void;
}

/**
 * 初始状态
 */
const initialState = {
  isConnected: false,
  isLoggedIn: false,
  session: null,
  syncState: null,
  rooms: [],
  currentRoom: null,
  messages: [],
  isLoading: false,
  error: null,
};

/**
 * Matrix Store
 */
export const useMatrixStore = create<MatrixStore>()(
  persist(
    (set) => ({
      ...initialState,

      setIsConnected: (isConnected) => set({ isConnected }),
      setIsLoggedIn: (isLoggedIn) => set({ isLoggedIn }),
      setSession: (session) => set({ session }),
      setSyncState: (syncState) => set({ syncState }),
      setRooms: (rooms) => set({ rooms }),
      setCurrentRoom: (currentRoom) => set({ currentRoom }),
      setMessages: (messages) => set({ messages }),
      addMessage: (message) =>
        set((state) => ({
          messages: [...state.messages, message],
        })),
      setIsLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),

      updateRooms: (rooms) => set({ rooms }),

      reset: () => set(initialState),
    }),
    {
      name: 'matrix-storage', // localStorage key
      partialize: (state) => ({
        // 只持久化这些字段
        isLoggedIn: state.isLoggedIn,
        session: state.session,
        rooms: state.rooms,
        isConnected: state.isConnected,
      }),
    },
  ),
);
