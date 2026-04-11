// src/renderer/stores/matrixStore.ts

import { create } from 'zustand';
import type { RoomInfo, MessageContent, MatrixSession, SyncState } from '../types';

interface MatrixStore {
  isConnected: boolean;
  isLoggedIn: boolean;
  session: MatrixSession | null;
  syncState: SyncState | null;
  rooms: RoomInfo[];
  currentRoom: RoomInfo | null;
  messages: MessageContent[];
  isLoading: boolean;
  error: string | null;

  setIsConnected: (value: boolean) => void;
  setIsLoggedIn: (value: boolean) => void;
  setSession: (session: MatrixSession | null) => void;
  setSyncState: (state: SyncState | null) => void;
  setRooms: (rooms: RoomInfo[]) => void;
  setCurrentRoom: (room: RoomInfo | null) => void;
  setMessages: (messages: MessageContent[]) => void;
  addMessage: (message: MessageContent) => void;
  setIsLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  reset: () => void;
  removeRoom: (roomId: string) => void;
  updateRoom: (roomId: string, updates: Partial<RoomInfo>) => void;
}

export const useMatrixStore = create<MatrixStore>((set, get) => ({
  isConnected: false,
  isLoggedIn: false,
  session: null,
  syncState: null,
  rooms: [],
  currentRoom: null,
  messages: [],
  isLoading: false,
  error: null,

  setIsConnected: (value) => set({ isConnected: value }),
  setIsLoggedIn: (value) => set({ isLoggedIn: value }),
  setSession: (session) => set({ session }),
  setSyncState: (state) => set({ syncState: state }),
  setRooms: (rooms) => set({ rooms }),
  setCurrentRoom: (room) => set({ currentRoom: room }),
  setMessages: (messages) => set({ messages }),
  addMessage: (message) =>
    set((state) => ({
      messages: [...state.messages, message],
    })),
  setIsLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
  clearError: () => set({ error: null }),

  reset: () =>
    set({
      isConnected: false,
      isLoggedIn: false,
      session: null,
      syncState: null,
      rooms: [],
      currentRoom: null,
      messages: [],
      isLoading: false,
      error: null,
    }),

  removeRoom: (roomId) =>
    set((state) => {
      const newRooms = state.rooms.filter((room) => room.roomId !== roomId);
      const newCurrentRoom = state.currentRoom?.roomId === roomId ? null : state.currentRoom;
      console.log(`Removing room ${roomId}, rooms left: ${newRooms.length}`);
      return {
        rooms: newRooms,
        currentRoom: newCurrentRoom,
      };
    }),

  updateRoom: (roomId, updates) =>
    set((state) => ({
      rooms: state.rooms.map((room) => (room.roomId === roomId ? { ...room, ...updates } : room)),
      currentRoom: state.currentRoom?.roomId === roomId ? { ...state.currentRoom, ...updates } : state.currentRoom,
    })),
}));
