/**
 * Global type declarations for SmartClaw Renderer Process
 */

import type { IElectronAPI } from '../main/preload';

declare global {
  interface Window {
    electronAPI?: IElectronAPI;
  }
}

export {};
