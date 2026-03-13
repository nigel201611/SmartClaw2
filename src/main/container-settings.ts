/**
 * SmartClaw Container Settings
 * 
 * 容器配置管理：设置、持久化、验证
 */

import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';

/**
 * 容器设置接口
 */
export interface ContainerSettings {
  /** 应用启动时自动启动容器 */
  autoStartOnLaunch: boolean;
  /** 应用退出时自动停止容器 */
  autoStopOnQuit: boolean;
  /** 后台运行模式（最小化到托盘） */
  runInBackground: boolean;
  /** 内存限制 */
  memoryLimit: string;
  /** CPU 限制 */
  cpuLimit: number;
  /** 日志级别 */
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  /** 健康检查超时（秒） */
  healthCheckTimeout: number;
  /** 启动超时（秒） */
  startupTimeout: number;
  /** 端口配置 */
  portConfig: {
    matrixPort: number;
    autoSelectPort: boolean;
  };
}

/**
 * 默认设置
 */
const DEFAULT_SETTINGS: ContainerSettings = {
  autoStartOnLaunch: true,
  autoStopOnQuit: false, // 默认后台模式，不停止容器
  runInBackground: true,
  memoryLimit: '100MB',
  cpuLimit: 0.5,
  logLevel: 'info',
  healthCheckTimeout: 5,
  startupTimeout: 60,
  portConfig: {
    matrixPort: 8008,
    autoSelectPort: false
  }
};

/**
 * 设置文件路径
 */
const SETTINGS_FILE = path.join(
  app.getPath('userData'),
  'container-settings.json'
);

/**
 * 容器设置管理器
 */
export class ContainerSettingsManager {
  private settings: ContainerSettings;
  private settingsLoaded: boolean = false;

  constructor() {
    this.settings = { ...DEFAULT_SETTINGS };
  }

  /**
   * 加载设置
   */
  async loadSettings(): Promise<ContainerSettings> {
    try {
      if (fs.existsSync(SETTINGS_FILE)) {
        const data = fs.readFileSync(SETTINGS_FILE, 'utf-8');
        const loaded = JSON.parse(data);
        this.settings = { ...DEFAULT_SETTINGS, ...loaded };
      } else {
        this.settings = { ...DEFAULT_SETTINGS };
      }
      this.settingsLoaded = true;
      return this.settings;
    } catch (error: any) {
      console.error('Failed to load settings:', error);
      this.settings = { ...DEFAULT_SETTINGS };
      this.settingsLoaded = true;
      return this.settings;
    }
  }

  /**
   * 保存设置
   */
  async saveSettings(settings: Partial<ContainerSettings>): Promise<ContainerSettings> {
    try {
      // 验证设置
      const validated = this.validateSettings(settings);
      
      // 合并设置
      this.settings = { ...this.settings, ...validated };
      
      // 确保目录存在
      const dir = path.dirname(SETTINGS_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      // 写入文件
      fs.writeFileSync(SETTINGS_FILE, JSON.stringify(this.settings, null, 2));
      
      return this.settings;
    } catch (error: any) {
      console.error('Failed to save settings:', error);
      throw new Error(`保存设置失败：${error.message}`);
    }
  }

  /**
   * 验证设置
   */
  private validateSettings(settings: Partial<ContainerSettings>): Partial<ContainerSettings> {
    const validated: Partial<ContainerSettings> = { ...settings };

    // 验证内存限制格式
    if (settings.memoryLimit) {
      const memRegex = /^(\d+)(MB|GB)$/i;
      if (!memRegex.test(settings.memoryLimit)) {
        throw new Error('无效的内存限制格式，例如：100MB, 1GB');
      }
    }

    // 验证 CPU 限制
    if (settings.cpuLimit !== undefined) {
      if (settings.cpuLimit < 0.1 || settings.cpuLimit > 4) {
        throw new Error('CPU 限制必须在 0.1 到 4 之间');
      }
    }

    // 验证日志级别
    if (settings.logLevel) {
      const validLevels = ['debug', 'info', 'warn', 'error'];
      if (!validLevels.includes(settings.logLevel)) {
        throw new Error('无效的日志级别');
      }
    }

    // 验证端口
    if (settings.portConfig) {
      if (settings.portConfig.matrixPort) {
        if (settings.portConfig.matrixPort < 1024 || settings.portConfig.matrixPort > 65535) {
          throw new Error('端口号必须在 1024 到 65535 之间');
        }
      }
    }

    // 验证超时
    if (settings.healthCheckTimeout !== undefined) {
      if (settings.healthCheckTimeout < 1 || settings.healthCheckTimeout > 300) {
        throw new Error('健康检查超时必须在 1 到 300 秒之间');
      }
    }

    if (settings.startupTimeout !== undefined) {
      if (settings.startupTimeout < 10 || settings.startupTimeout > 600) {
        throw new Error('启动超时必须在 10 到 600 秒之间');
      }
    }

    return validated;
  }

  /**
   * 获取当前设置
   */
  getSettings(): ContainerSettings {
    return { ...this.settings };
  }

  /**
   * 重置为默认设置
   */
  async resetToDefaults(): Promise<ContainerSettings> {
    try {
      this.settings = { ...DEFAULT_SETTINGS };
      
      if (fs.existsSync(SETTINGS_FILE)) {
        fs.unlinkSync(SETTINGS_FILE);
      }
      
      return this.settings;
    } catch (error: any) {
      console.error('Failed to reset settings:', error);
      throw new Error(`重置设置失败：${error.message}`);
    }
  }

  /**
   * 导出设置
   */
  exportSettings(): string {
    return JSON.stringify(this.settings, null, 2);
  }

  /**
   * 导入设置
   */
  async importSettings(json: string): Promise<ContainerSettings> {
    try {
      const imported = JSON.parse(json);
      return await this.saveSettings(imported);
    } catch (error: any) {
      throw new Error(`导入设置失败：无效的 JSON 格式`);
    }
  }

  /**
   * 获取设置文件路径
   */
  getSettingsFilePath(): string {
    return SETTINGS_FILE;
  }
}

// 单例实例
let settingsManager: ContainerSettingsManager | null = null;

/**
 * 获取设置管理器单例
 */
export function getContainerSettingsManager(): ContainerSettingsManager {
  if (!settingsManager) {
    settingsManager = new ContainerSettingsManager();
  }
  return settingsManager;
}

export default ContainerSettingsManager;
