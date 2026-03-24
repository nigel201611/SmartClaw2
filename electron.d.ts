// electron.d.ts
// Global type declarations for Electron API exposed via preload.ts
// This file provides TypeScript types for window.electronAPI

interface ElectronAPI {
    onDockerStatus: (callback: (status: any) => void) => () => void;
    onAuthStatus: (callback: (authenticated: boolean) => void) => () => void;
}

declare global {
    interface Window {
        electronAPI: ElectronAPI;
    }
}

// Make this a module augmentation, not a standalone module
export {};
