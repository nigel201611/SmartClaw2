/**
 * AuthManager Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuthManager, Credentials, AuthResult } from '../auth-manager';

// Mock keytar
vi.mock('keytar', () => ({
  setPassword: vi.fn(),
  getPassword: vi.fn(),
  deletePassword: vi.fn()
}));

// Mock matrix-client
vi.mock('../matrix-client', () => ({
  getMatrixClient: vi.fn(() => ({
    connect: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
    getClient: vi.fn()
  })),
  MatrixClientWrapper: vi.fn()
}));

describe('AuthManager', () => {
  let authManager: AuthManager;

  beforeEach(() => {
    authManager = new AuthManager();
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create instance', () => {
      expect(authManager).toBeInstanceOf(AuthManager);
    });

    it('should initialize with unauthenticated status', () => {
      expect(authManager.getStatus()).toBe('unauthenticated');
    });

    it('should not be authenticated initially', () => {
      expect(authManager.isAuthenticated()).toBe(false);
    });

    it('should return null session initially', () => {
      expect(authManager.getSession()).toBeNull();
    });
  });

  describe('login', () => {
    it('should initialize correctly', () => {
      expect(authManager.getStatus()).toBe('unauthenticated');
    });

    it('should return not authenticated initially', () => {
      expect(authManager.isAuthenticated()).toBe(false);
    });
  });

  describe('login mocks', () => {
    it('should mock matrix client', async () => {
      const { getMatrixClient } = await import('../matrix-client');
      expect(getMatrixClient).toBeDefined();
    });
  });

  describe('logout', () => {
    it('should logout successfully', async () => {
      const { getMatrixClient } = await import('../matrix-client');
      const mockClient = getMatrixClient();
      mockClient.logout = vi.fn().mockResolvedValue(undefined);

      await authManager.logout();
      
      expect(authManager.isAuthenticated()).toBe(false);
      expect(authManager.getStatus()).toBe('unauthenticated');
      expect(authManager.getSession()).toBeNull();
    });

    it('should clear credentials on logout', async () => {
      const keytar = await import('keytar');
      const { getMatrixClient } = await import('../matrix-client');
      const mockClient = getMatrixClient();
      mockClient.logout = vi.fn().mockResolvedValue(undefined);
      keytar.getPassword = vi.fn().mockResolvedValue(JSON.stringify({ username: 'test', rememberMe: true }));

      await authManager.logout();
      
      expect(keytar.deletePassword).toHaveBeenCalled();
    });
  });

  describe('saveCredentials', () => {
    it('should save credentials without password when rememberMe is false', async () => {
      const keytar = await import('keytar');
      keytar.setPassword = vi.fn().mockResolvedValue(undefined);

      const credentials: Credentials = {
        username: 'testuser',
        password: 'password123',
        homeserverUrl: 'http://localhost:8008',
        rememberMe: false
      };

      await authManager.saveCredentials(credentials);
      
      expect(keytar.setPassword).toHaveBeenCalledWith(
        'smartclaw-credentials',
        'config',
        expect.any(String)
      );
    });

    it('should save credentials with password when rememberMe is true', async () => {
      const keytar = await import('keytar');
      keytar.setPassword = vi.fn().mockResolvedValue(undefined);

      const credentials: Credentials = {
        username: 'testuser',
        password: 'password123',
        homeserverUrl: 'http://localhost:8008',
        rememberMe: true
      };

      await authManager.saveCredentials(credentials);
      
      expect(keytar.setPassword).toHaveBeenCalledTimes(2);
    });
  });

  describe('getCredentials', () => {
    it('should return null when no credentials saved', async () => {
      const keytar = await import('keytar');
      keytar.getPassword = vi.fn().mockResolvedValue(null);

      const result = await authManager.getCredentials();
      
      expect(result).toBeNull();
    });

    it('should return credentials when saved', async () => {
      const keytar = await import('keytar');
      keytar.getPassword = vi.fn()
        .mockResolvedValueOnce(JSON.stringify({
          username: 'testuser',
          homeserverUrl: 'http://localhost:8008',
          rememberMe: true
        }))
        .mockResolvedValueOnce('password123');

      const result = await authManager.getCredentials();
      
      expect(result).toEqual({
        username: 'testuser',
        password: 'password123',
        homeserverUrl: 'http://localhost:8008',
        rememberMe: true
      });
    });
  });

  describe('restoreSession', () => {
    it('should return null when no credentials saved', async () => {
      const keytar = await import('keytar');
      keytar.getPassword = vi.fn().mockResolvedValue(null);

      const result = await authManager.restoreSession();
      
      expect(result).toBeNull();
    });

    it('should return null when rememberMe is false', async () => {
      const keytar = await import('keytar');
      keytar.getPassword = vi.fn().mockResolvedValue(
        JSON.stringify({ username: 'test', rememberMe: false })
      );

      const result = await authManager.restoreSession();
      
      expect(result).toBeNull();
    });
  });

  describe('getAuthErrorMessage', () => {
    it('should handle 403 error', () => {
      const result = (authManager as any).getAuthErrorMessage({ httpStatus: 403 });
      expect(result).toContain('账户已被禁用');
    });

    it('should handle 404 error', () => {
      const result = (authManager as any).getAuthErrorMessage({ httpStatus: 404 });
      expect(result).toContain('服务器地址错误');
    });

    it('should handle ENOTFOUND error', () => {
      const result = (authManager as any).getAuthErrorMessage({ code: 'ENOTFOUND' });
      expect(result).toContain('服务器地址无效');
    });
  });
});
