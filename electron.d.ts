// electron.d.ts
export interface ElectronAPI {
    onDockerStatus: (callback: (status: any) => void) => () => void;
    onAuthStatus: (callback: (authenticated: boolean) => void) => () => void;
}

declare global {
    interface Window {
        electronAPI: ElectronAPI;
    }
}

export {};
