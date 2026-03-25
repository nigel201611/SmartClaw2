/**
 * Global type declarations for SmartClaw Renderer Process
 * 
 * This file declares the global window.electronAPI type
 * that is exposed by the preload script via contextBridge.
 */

import type { IElectronAPI } from '../main/preload';

declare global {
  interface Window {
    electronAPI?: IElectronAPI;
  }
}
