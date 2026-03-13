/**
 * SmartClaw Settings IPC Handlers
 * 
 * 设置相关的 IPC 通信处理
 */

import { ipcMain, BrowserWindow } from 'electron';
import { getContainerSettingsManager, ContainerSettings } from './container-settings';

/**
 * 设置 IPC 通道
 */
export const SETTINGS_IPC_CHANNELS = {
  LOAD: 'settings:load',
  SAVE: 'settings:save',
  RESET: 'settings:reset',
  EXPORT: 'settings:export',
  IMPORT: 'settings:import'
} as const;

/**
 * IPC 响应类型
 */
export interface SettingsIPCResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * 注册设置 IPC 处理器
 */
export function registerSettingsIPCHandlers(mainWindow: BrowserWindow) {
  const settingsManager = getContainerSettingsManager();

  // 加载设置
  ipcMain.handle(
    SETTINGS_IPC_CHANNELS.LOAD,
    async (): Promise<SettingsIPCResponse<ContainerSettings>> => {
      try {
        const settings = await settingsManager.loadSettings();
        return { success: true, data: settings };
      } catch (error: any) {
        return { 
          success: false, 
          error: error.message || '加载设置失败' 
        };
      }
    }
  );

  // 保存设置
  ipcMain.handle(
    SETTINGS_IPC_CHANNELS.SAVE,
    async (event, settings: Partial<ContainerSettings>): Promise<SettingsIPCResponse<ContainerSettings>> => {
      try {
        const result = await settingsManager.saveSettings(settings);
        
        // 通知渲染进程设置已更新
        mainWindow.webContents.send('settings:updated', result);
        
        return { success: true, data: result };
      } catch (error: any) {
        return { 
          success: false, 
          error: error.message || '保存设置失败' 
        };
      }
    }
  );

  // 重置设置
  ipcMain.handle(
    SETTINGS_IPC_CHANNELS.RESET,
    async (): Promise<SettingsIPCResponse<ContainerSettings>> => {
      try {
        const result = await settingsManager.resetToDefaults();
        mainWindow.webContents.send('settings:updated', result);
        return { success: true, data: result };
      } catch (error: any) {
        return { 
          success: false, 
          error: error.message || '重置设置失败' 
        };
      }
    }
  );

  // 导出设置
  ipcMain.handle(
    SETTINGS_IPC_CHANNELS.EXPORT,
    async (): Promise<SettingsIPCResponse<string>> => {
      try {
        const result = settingsManager.exportSettings();
        return { success: true, data: result };
      } catch (error: any) {
        return { 
          success: false, 
          error: error.message || '导出设置失败' 
        };
      }
    }
  );

  // 导入设置
  ipcMain.handle(
    SETTINGS_IPC_CHANNELS.IMPORT,
    async (event, json: string): Promise<SettingsIPCResponse<ContainerSettings>> => {
      try {
        const result = await settingsManager.importSettings(json);
        mainWindow.webContents.send('settings:updated', result);
        return { success: true, data: result };
      } catch (error: any) {
        return { 
          success: false, 
          error: error.message || '导入设置失败' 
        };
      }
    }
  );
}

/**
 * 清理设置 IPC 处理器
 */
export function cleanupSettingsIPC() {
  Object.values(SETTINGS_IPC_CHANNELS).forEach(channel => {
    ipcMain.removeHandler(channel);
  });
}

export default registerSettingsIPCHandlers;
