/**
 * Global type declarations for SmartClaw Renderer Process
 *
 * This file declares the global window.electronAPIAPI type
 * that is exposed by the preload script via contextBridge.
 */

import type { IElectronAPI } from '../main/preload';

declare global {
  interface Window {
    electronAPI: IElectronAPI;
  }
  type IElectronAPI = IElectronAPI;
}
