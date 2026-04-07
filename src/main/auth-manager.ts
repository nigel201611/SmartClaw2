// auth-manager.ts
import * as keytar from 'keytar';
import { getMatrixClient, MatrixClientWrapper, MatrixSession } from './matrix-client';

/**
 * 认证凭据
 */
export interface Credentials {
  username: string;
  password: string;
  homeserverUrl: string;
  rememberMe: boolean;
}

/**
 * 认证状态
 */
export type AuthStatus = 'unauthenticated' | 'authenticating' | 'authenticated' | 'error';

/**
 * 认证结果
 */
export interface AuthResult {
  success: boolean;
  session?: MatrixSession;
  error?: string;
  // 注册返回的字段
  userId?: string;
  deviceId?: string;
  accessToken?: string;
}

/**
 * 服务名（用于 Keychain）
 */
const KEYCHAIN_SERVICE = 'smartclaw-credentials';

/**
 * 认证管理器
 */
export class AuthManager {
  private matrixClient: MatrixClientWrapper;
  private status: AuthStatus = 'unauthenticated';
  private currentSession: MatrixSession | null = null;

  constructor() {
    this.matrixClient = getMatrixClient();
  }

  /**
   * 登录
   */
  async login(homeserverUrl: string, username: string, password: string): Promise<AuthResult> {
    try {
      this.status = 'authenticating';

      await this.matrixClient.connect(homeserverUrl);
      const session = await this.matrixClient.login(username, password);

      this.currentSession = session;
      this.status = 'authenticated';

      console.log('Login successful:', username);
      return { success: true, session };
    } catch (error: any) {
      this.status = 'error';
      console.error('Login failed:', error);

      return {
        success: false,
        error: this.getAuthErrorMessage(error),
      };
    }
  }

  /**
   * 注册（如果服务器支持）
   */
  async register(homeserver: string, username: string, password: string, token?: string): Promise<AuthResult> {
    console.log('[Main] auth:register called', { homeserver, username, hasToken: !!token });

    try {
      const registrationBody: any = {
        username: username,
        password: password,
      };

      if (token) {
        registrationBody.auth = {
          type: 'm.login.registration_token',
          token: token,
        };
      } else {
        registrationBody.auth = {
          type: 'm.login.dummy',
        };
      }

      const response = await fetch(`${homeserver}/_matrix/client/v3/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(registrationBody),
      });

      const data = await response.json();

      if (response.ok) {
        console.log('[Main] Registration successful:', data.user_id);

        // 创建会话对象
        const session: MatrixSession = {
          userId: data.user_id,
          deviceId: data.device_id || 'unknown',
          accessToken: data.access_token,
          homeserverUrl: homeserver,
        };

        return {
          success: true,
          session: session,
          userId: data.user_id,
          deviceId: data.device_id,
          accessToken: data.access_token,
        };
      } else {
        console.error('[Main] Registration failed:', data);
        return {
          success: false,
          error: data.error || '注册失败',
        };
      }
    } catch (error: any) {
      console.error('[Main] Registration error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * 登出
   */
  async logout(): Promise<void> {
    try {
      await this.matrixClient.logout();
      await this.clearCredentials();
      this.currentSession = null;
      this.status = 'unauthenticated';
      console.log('Logout successful');
    } catch (error: any) {
      console.error('Logout failed:', error);
      this.currentSession = null;
      this.status = 'unauthenticated';
    }
  }

  /**
   * 恢复会话
   */
  async restoreSession(): Promise<MatrixSession | null> {
    try {
      const credentials = await this.getCredentials();

      if (!credentials) {
        console.log('No saved credentials found');
        return null;
      }

      if (!credentials.rememberMe) {
        console.log('Remember me not enabled');
        return null;
      }

      this.status = 'authenticating';

      const result = await this.login(credentials.username, credentials.password, credentials.homeserverUrl);

      if (result.success && result.session) {
        console.log('Session restored successfully');
        return result.session;
      } else {
        console.log('Session restore failed:', result.error);
        await this.clearCredentials();
        return null;
      }
    } catch (error: any) {
      console.error('Failed to restore session:', error);
      return null;
    }
  }

  /**
   * 保存凭证（到系统密钥链）
   */
  async saveCredentials(credentials: Credentials): Promise<void> {
    try {
      if (!credentials.rememberMe) {
        const data = JSON.stringify({
          username: credentials.username,
          homeserverUrl: credentials.homeserverUrl,
          rememberMe: false,
        });
        await keytar.setPassword(KEYCHAIN_SERVICE, 'config', data);
      } else {
        const data = JSON.stringify({
          username: credentials.username,
          homeserverUrl: credentials.homeserverUrl,
          rememberMe: true,
        });
        await keytar.setPassword(KEYCHAIN_SERVICE, 'config', data);
        await keytar.setPassword(KEYCHAIN_SERVICE, credentials.username, credentials.password);
      }

      console.log('Credentials saved');
    } catch (error: any) {
      console.error('Failed to save credentials:', error);
      throw new Error(`保存凭证失败：${error.message}`);
    }
  }

  /**
   * 获取凭证
   */
  async getCredentials(): Promise<Credentials | null> {
    try {
      const configData = await keytar.getPassword(KEYCHAIN_SERVICE, 'config');

      if (!configData) {
        return null;
      }

      const config = JSON.parse(configData);

      let password = '';
      if (config.rememberMe) {
        const retrievedPassword = await keytar.getPassword(KEYCHAIN_SERVICE, config.username);
        password = retrievedPassword || '';
      }

      return {
        username: config.username,
        password: password,
        homeserverUrl: config.homeserverUrl,
        rememberMe: config.rememberMe,
      };
    } catch (error: any) {
      console.error('Failed to get credentials:', error);
      return null;
    }
  }

  /**
   * 清除凭证
   */
  async clearCredentials(): Promise<void> {
    try {
      const configData = await keytar.getPassword(KEYCHAIN_SERVICE, 'config');

      if (configData) {
        const config = JSON.parse(configData);
        if (config.username) {
          await keytar.deletePassword(KEYCHAIN_SERVICE, config.username);
        }
        await keytar.deletePassword(KEYCHAIN_SERVICE, 'config');
      }

      console.log('Credentials cleared');
    } catch (error: any) {
      console.error('Failed to clear credentials:', error);
    }
  }

  /**
   * 获取当前认证状态
   */
  getStatus(): AuthStatus {
    return this.status;
  }

  /**
   * 检查是否已认证
   */
  isAuthenticated(): boolean {
    return this.status === 'authenticated' && this.currentSession !== null;
  }

  /**
   * 获取当前会话
   */
  getSession(): MatrixSession | null {
    return this.currentSession ? { ...this.currentSession } : null;
  }

  /**
   * 获取当前用户 ID
   */
  getCurrentUserId(): string | null {
    return this.currentSession?.userId || null;
  }

  /**
   * 获取当前 homeserver URL
   */
  getCurrentHomeserver(): string | null {
    return this.currentSession?.homeserverUrl || null;
  }

  /**
   * 获取访问令牌
   */
  getAccessToken(): string | null {
    return this.currentSession?.accessToken || null;
  }

  /**
   * 获取认证错误消息
   */
  private getAuthErrorMessage(error: any): string {
    if (error.httpStatus === 401) {
      return '用户名或密码错误';
    } else if (error.httpStatus === 403) {
      return '账户已被禁用';
    } else if (error.httpStatus === 404) {
      return '服务器地址错误';
    } else if (error.httpStatus === 0 || error.code === 'ECONNREFUSED') {
      return '无法连接到服务器，请检查服务器是否运行';
    } else if (error.code === 'ENOTFOUND') {
      return '服务器地址无效';
    } else {
      return error.message || '登录失败';
    }
  }
}

// 单例实例
let authManagerInstance: AuthManager | null = null;

/**
 * 获取认证管理器单例
 */
export function getAuthManager(): AuthManager {
  if (!authManagerInstance) {
    authManagerInstance = new AuthManager();
  }
  return authManagerInstance;
}

export default AuthManager;
