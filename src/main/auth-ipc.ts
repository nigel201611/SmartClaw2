/**
 * SmartClaw Auth IPC Handlers
 *
 * 认证相关的 IPC 通信处理
 */

import { ipcMain, BrowserWindow } from 'electron';
import { getAuthManager, AuthManager, Credentials, AuthResult } from './auth-manager';

/**
 * 认证 IPC 通道
 */
export const AUTH_IPC_CHANNELS = {
  LOGIN: 'auth:login',
  REGISTER: 'auth:register',
  LOGOUT: 'auth:logout',
  RESTORE_SESSION: 'auth:restore-session',
  GET_STATUS: 'auth:get-status',
  IS_AUTHENTICATED: 'auth:is-authenticated',
  GET_SESSION: 'auth:get-session',
  SAVE_CREDENTIALS: 'auth:save-credentials',
  GET_CREDENTIALS: 'auth:get-credentials',
  CLEAR_CREDENTIALS: 'auth:clear-credentials',
  GET_CURRENT_USER: 'auth:get-current-user',
  GET_HOMESERVER: 'auth:get-homeserver',
  GET_ACCESS_TOKEN: 'auth:get-access-token',
} as const;

/**
 * IPC 响应类型
 */
export interface AuthIPCResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * 注册认证 IPC 处理器
 */
export function registerAuthIPCHandlers(mainWindow: BrowserWindow) {
  const authManager = getAuthManager();

  // ========== 认证操作 ==========

  // 登录
  ipcMain.handle(AUTH_IPC_CHANNELS.LOGIN, async (event, homeserverUrl: string, username: string, password: string, rememberMe: boolean): Promise<AuthIPCResponse<any>> => {
    try {
      const result = await authManager.login(homeserverUrl, username, password);

      if (result.success && result.session) {
        // 保存凭证（如果需要）
        if (rememberMe) {
          await authManager.saveCredentials({
            username,
            password,
            homeserverUrl,
            rememberMe,
          });
        }

        // 通知渲染进程登录成功
        mainWindow.webContents.send('auth:logged-in', result.session);

        return { success: true, data: result.session };
      } else {
        return {
          success: false,
          error: result.error || '登录失败',
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || '登录失败',
      };
    }
  });

  // 注册
  ipcMain.handle(AUTH_IPC_CHANNELS.REGISTER, async (event, homeserverUrl: string, username: string, password: string, token: string): Promise<AuthIPCResponse<void>> => {
    try {
      const result = await authManager.register(homeserverUrl, username, password, token);

      if (result.success) {
        return { success: true };
      } else {
        return {
          success: false,
          error: result.error || '注册失败',
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || '注册失败',
      };
    }
  });

  // 登出
  ipcMain.handle(AUTH_IPC_CHANNELS.LOGOUT, async (): Promise<AuthIPCResponse<void>> => {
    try {
      await authManager.logout();
      mainWindow.webContents.send('auth:logged-out', {});
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || '登出失败',
      };
    }
  });

  // 恢复会话
  ipcMain.handle(AUTH_IPC_CHANNELS.RESTORE_SESSION, async (): Promise<AuthIPCResponse<any>> => {
    try {
      const session = await authManager.restoreSession();

      if (session) {
        return { success: true, data: session };
      } else {
        return {
          success: false,
          error: '无法恢复会话',
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || '恢复会话失败',
      };
    }
  });

  // ========== 状态查询 ==========

  // 获取认证状态
  ipcMain.handle(AUTH_IPC_CHANNELS.GET_STATUS, async (): Promise<AuthIPCResponse<string>> => {
    try {
      return { success: true, data: authManager.getStatus() };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || '获取状态失败',
      };
    }
  });

  // 检查是否已认证
  ipcMain.handle(AUTH_IPC_CHANNELS.IS_AUTHENTICATED, async (): Promise<AuthIPCResponse<boolean>> => {
    try {
      return { success: true, data: authManager.isAuthenticated() };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || '检查认证状态失败',
      };
    }
  });

  // 获取当前会话
  ipcMain.handle(AUTH_IPC_CHANNELS.GET_SESSION, async (): Promise<AuthIPCResponse<any>> => {
    try {
      const session = authManager.getSession();
      return { success: true, data: session };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || '获取会话失败',
      };
    }
  });

  // ========== 凭证管理 ==========

  // 保存凭证
  ipcMain.handle(AUTH_IPC_CHANNELS.SAVE_CREDENTIALS, async (event, credentials: Credentials): Promise<AuthIPCResponse<void>> => {
    try {
      await authManager.saveCredentials(credentials);
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || '保存凭证失败',
      };
    }
  });

  // 获取凭证
  ipcMain.handle(AUTH_IPC_CHANNELS.GET_CREDENTIALS, async (): Promise<AuthIPCResponse<Credentials | null>> => {
    try {
      const credentials = await authManager.getCredentials();
      return { success: true, data: credentials };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || '获取凭证失败',
      };
    }
  });

  // 清除凭证
  ipcMain.handle(AUTH_IPC_CHANNELS.CLEAR_CREDENTIALS, async (): Promise<AuthIPCResponse<void>> => {
    try {
      await authManager.clearCredentials();
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || '清除凭证失败',
      };
    }
  });

  ipcMain.handle(AUTH_IPC_CHANNELS.GET_CURRENT_USER, async (): Promise<AuthIPCResponse<string | null>> => {
    try {
      const session = authManager.getSession();
      const userId = session?.userId || null;
      return { success: true, data: userId };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || '获取当前用户失败',
      };
    }
  });

  // 获取当前 homeserver
  ipcMain.handle(AUTH_IPC_CHANNELS.GET_HOMESERVER, async (): Promise<AuthIPCResponse<string | null>> => {
    try {
      const session = authManager.getSession();
      const homeserver = session?.homeserverUrl || null;
      return { success: true, data: homeserver };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || '获取 homeserver 失败',
      };
    }
  });

  // 获取访问令牌
  ipcMain.handle(AUTH_IPC_CHANNELS.GET_ACCESS_TOKEN, async (): Promise<AuthIPCResponse<string | null>> => {
    try {
      const session = authManager.getSession();
      const accessToken = session?.accessToken || null;

      // 安全考虑：可以选择脱敏处理
      if (accessToken) {
        console.log('Access token retrieved (length: ${accessToken.length})');
      }

      return { success: true, data: accessToken };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || '获取访问令牌失败',
      };
    }
  });
}

/**
 * 清理认证 IPC 处理器
 */
export function cleanupAuthIPC() {
  Object.values(AUTH_IPC_CHANNELS).forEach((channel) => {
    ipcMain.removeHandler(channel);
  });
}

export default registerAuthIPCHandlers;
