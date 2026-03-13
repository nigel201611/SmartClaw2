/**
 * SmartClaw Authentication Manager
 * 
 * 用户认证管理：登录/注册/会话恢复/凭证存储
 */

import * as keytar from 'keytar';
import { getMatrixClient, MatrixClientWrapper, MatrixSession } from './matrix-client';
import * as crypto from 'crypto';

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
export type AuthStatus = 
  | 'unauthenticated'  // 未认证
  | 'authenticating'   // 认证中
  | 'authenticated'    // 已认证
  | 'error';           // 错误

/**
 * 认证结果
 */
export interface AuthResult {
  success: boolean;
  session?: MatrixSession;
  error?: string;
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
  async login(username: string, password: string, homeserverUrl: string): Promise<AuthResult> {
    try {
      this.status = 'authenticating';

      // 连接服务器
      await this.matrixClient.connect(homeserverUrl);

      // 执行登录
      const session = await this.matrixClient.login(username, password);

      // 保存会话
      this.currentSession = session;
      this.status = 'authenticated';

      console.log('Login successful:', username);
      return { success: true, session };
    } catch (error: any) {
      this.status = 'error';
      console.error('Login failed:', error);
      
      return {
        success: false,
        error: this.getAuthErrorMessage(error)
      };
    }
  }

  /**
   * 注册（如果服务器支持）
   */
  async register(
    username: string,
    password: string,
    homeserverUrl: string
  ): Promise<AuthResult> {
    try {
      this.status = 'authenticating';

      // 连接服务器
      await this.matrixClient.connect(homeserverUrl);

      // 检查服务器是否支持注册
      const client = this.matrixClient.getClient();
      if (!client) {
        throw new Error('Matrix 客户端未初始化');
      }

      // 获取注册流程（简化处理，实际需要根据服务器响应）
      // Conduit 默认不支持注册，需要手动创建用户
      throw new Error(
        '当前服务器不支持在线注册。\n请使用管理员工具创建用户后登录。'
      );
    } catch (error: any) {
      this.status = 'error';
      console.error('Registration failed:', error);
      
      return {
        success: false,
        error: error.message || '注册失败'
      };
    }
  }

  /**
   * 登出
   */
  async logout(): Promise<void> {
    try {
      // 登出 Matrix
      await this.matrixClient.logout();

      // 清除本地凭证
      await this.clearCredentials();

      // 重置状态
      this.currentSession = null;
      this.status = 'unauthenticated';

      console.log('Logout successful');
    } catch (error: any) {
      console.error('Logout failed:', error);
      // 即使出错也清除本地状态
      this.currentSession = null;
      this.status = 'unauthenticated';
    }
  }

  /**
   * 恢复会话
   */
  async restoreSession(): Promise<MatrixSession | null> {
    try {
      // 尝试从 Keychain 获取凭证
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

      // 使用保存的凭证登录
      const result = await this.login(
        credentials.username,
        credentials.password,
        credentials.homeserverUrl
      );

      if (result.success && result.session) {
        console.log('Session restored successfully');
        return result.session;
      } else {
        console.log('Session restore failed:', result.error);
        // 清除无效凭证
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
        // 不记住密码，只保存用户名和服务器
        const data = JSON.stringify({
          username: credentials.username,
          homeserverUrl: credentials.homeserverUrl,
          rememberMe: false
        });
        await keytar.setPassword(KEYCHAIN_SERVICE, 'config', data);
      } else {
        // 记住密码，保存完整凭证
        const data = JSON.stringify({
          username: credentials.username,
          homeserverUrl: credentials.homeserverUrl,
          rememberMe: true
        });
        await keytar.setPassword(KEYCHAIN_SERVICE, 'config', data);
        await keytar.setPassword(
          KEYCHAIN_SERVICE,
          credentials.username,
          credentials.password
        );
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
        rememberMe: config.rememberMe
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
