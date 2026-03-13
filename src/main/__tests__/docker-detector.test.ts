/**
 * DockerDetector Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DockerDetector, DockerStatus } from '../docker-detector';

// Mock child_process
vi.mock('child_process', () => ({
  exec: vi.fn()
}));

describe('DockerDetector', () => {
  let detector: DockerDetector;

  beforeEach(() => {
    detector = new DockerDetector();
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create instance with current platform', () => {
      expect(detector).toBeInstanceOf(DockerDetector);
    });
  });

  describe('getFriendlyErrorMessage', () => {
    it('should return friendly message for NOT_INSTALLED error', () => {
      const status: DockerStatus = {
        available: false,
        installed: false,
        running: false,
        hasPermission: false,
        isDesktop: false,
        error: 'docker command not found',
        errorType: 'NOT_INSTALLED',
        version: null
      };

      const result = detector.getFriendlyErrorMessage(status);
      
      expect(result.title).toBe('Docker 未安装');
      expect(result.message).toContain('需要 Docker');
      expect(result.actionUrl).toBeDefined();
    });

    it('should return friendly message for DAEMON_NOT_RUNNING error', () => {
      const status: DockerStatus = {
        available: false,
        installed: true,
        running: false,
        hasPermission: false,
        isDesktop: false,
        error: 'Cannot connect to the Docker daemon',
        errorType: 'DAEMON_NOT_RUNNING',
        version: null
      };

      const result = detector.getFriendlyErrorMessage(status);
      
      expect(result.title).toContain('Docker');
      expect(result.message).toContain('未运行');
    });

    it('should return friendly message for NO_PERMISSION error', () => {
      const status: DockerStatus = {
        available: false,
        installed: true,
        running: true,
        hasPermission: false,
        isDesktop: false,
        error: 'permission denied',
        errorType: 'NO_PERMISSION',
        version: null
      };

      const result = detector.getFriendlyErrorMessage(status);
      
      expect(result.title).toContain('权限');
      expect(result.message).toContain('权限不足');
    });

    it('should return generic message for unknown error', () => {
      const status: DockerStatus = {
        available: false,
        installed: true,
        running: true,
        hasPermission: true,
        isDesktop: false,
        error: 'Unknown error',
        errorType: 'UNKNOWN',
        version: null
      };

      const result = detector.getFriendlyErrorMessage(status);
      
      expect(result.title).toContain('Docker');
    });

    it('should return success message when Docker is available', () => {
      const status: DockerStatus = {
        available: true,
        installed: true,
        running: true,
        hasPermission: true,
        isDesktop: false,
        error: null,
        errorType: null,
        version: '24.0.0'
      };

      const result = detector.getFriendlyErrorMessage(status);
      
      expect(result.title).toBe('Docker 已就绪');
      expect(result.message).toContain('配置正确');
      expect(result.actionUrl).toBeUndefined();
    });
  });

  describe('detectDocker', () => {
    it('should handle docker not installed', async () => {
      const { exec } = await import('child_process');
      vi.mocked(exec).mockImplementation((cmd: any, callback: any) => {
        callback(new Error('Command not found: docker'), {});
        return {} as any;
      });

      const status = await detector.detectDocker();
      
      expect(status.installed).toBe(false);
      expect(status.available).toBe(false);
    });
  });
});
