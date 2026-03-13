/**
 * SmartClaw Container Settings Panel (React)
 * 
 * 容器设置 UI 组件
 */

import React, { useState, useEffect } from 'react';
import { ipcRenderer } from 'electron';

/**
 * 容器设置接口
 */
interface ContainerSettings {
  autoStartOnLaunch: boolean;
  autoStopOnQuit: boolean;
  runInBackground: boolean;
  memoryLimit: string;
  cpuLimit: number;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  healthCheckTimeout: number;
  startupTimeout: number;
  portConfig: {
    matrixPort: number;
    autoSelectPort: boolean;
  };
}

interface SettingsPanelProps {
  onClose?: () => void;
}

/**
 * 设置面板组件
 */
export const ContainerSettingsPanel: React.FC<SettingsPanelProps> = ({ onClose }) => {
  const [settings, setSettings] = useState<ContainerSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // 加载设置
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      const result = await ipcRenderer.invoke('settings:load');
      if (result.success) {
        setSettings(result.data);
      } else {
        setError(result.error);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = async () => {
    if (!settings) return;

    try {
      setIsSaving(true);
      setError(null);
      setSuccess(false);

      const result = await ipcRenderer.invoke('settings:save', settings);
      if (result.success) {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } else {
        setError(result.error);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const resetToDefaults = async () => {
    try {
      const result = await ipcRenderer.invoke('settings:reset');
      if (result.success) {
        setSettings(result.data);
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const updateSetting = <K extends keyof ContainerSettings>(
    key: K,
    value: ContainerSettings[K]
  ) => {
    if (settings) {
      setSettings({ ...settings, [key]: value });
    }
  };

  if (isLoading) {
    return (
      <div className="settings-panel loading">
        <div className="spinner" />
        <p>加载设置中...</p>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="settings-panel error">
        <p>无法加载设置</p>
        <button onClick={loadSettings}>重试</button>
      </div>
    );
  }

  return (
    <div className="settings-panel">
      <div className="settings-header">
        <h2>容器设置</h2>
        {onClose && (
          <button className="close-btn" onClick={onClose}>×</button>
        )}
      </div>

      {success && (
        <div className="alert success">设置已保存</div>
      )}

      {error && (
        <div className="alert error">{error}</div>
      )}

      <div className="settings-content">
        {/* 启动行为 */}
        <section className="settings-section">
          <h3>启动行为</h3>
          
          <div className="setting-item">
            <label>
              <input
                type="checkbox"
                checked={settings.autoStartOnLaunch}
                onChange={(e) => updateSetting('autoStartOnLaunch', e.target.checked)}
              />
              <span>应用启动时自动启动容器</span>
            </label>
            <p className="help-text">启动应用时自动启动 Matrix 容器</p>
          </div>

          <div className="setting-item">
            <label>
              <input
                type="checkbox"
                checked={settings.autoStopOnQuit}
                onChange={(e) => updateSetting('autoStopOnQuit', e.target.checked)}
              />
              <span>应用退出时自动停止容器</span>
            </label>
            <p className="help-text">
              关闭时自动停止容器以节省资源。取消勾选则容器在后台继续运行。
            </p>
          </div>

          <div className="setting-item">
            <label>
              <input
                type="checkbox"
                checked={settings.runInBackground}
                onChange={(e) => updateSetting('runInBackground', e.target.checked)}
              />
              <span>后台运行模式</span>
            </label>
            <p className="help-text">关闭窗口时最小化到系统托盘</p>
          </div>
        </section>

        {/* 资源限制 */}
        <section className="settings-section">
          <h3>资源限制</h3>
          
          <div className="setting-item">
            <label>内存限制</label>
            <select
              value={settings.memoryLimit}
              onChange={(e) => updateSetting('memoryLimit', e.target.value)}
            >
              <option value="50MB">50 MB</option>
              <option value="100MB">100 MB</option>
              <option value="200MB">200 MB</option>
              <option value="500MB">500 MB</option>
              <option value="1GB">1 GB</option>
            </select>
            <p className="help-text">容器最大内存使用量</p>
          </div>

          <div className="setting-item">
            <label>CPU 限制</label>
            <select
              value={settings.cpuLimit}
              onChange={(e) => updateSetting('cpuLimit', parseFloat(e.target.value))}
            >
              <option value={0.25}>0.25 核心</option>
              <option value={0.5}>0.5 核心</option>
              <option value={1}>1 核心</option>
              <option value={2}>2 核心</option>
              <option value={4}>4 核心</option>
            </select>
            <p className="help-text">容器最大 CPU 使用量</p>
          </div>
        </section>

        {/* 超时设置 */}
        <section className="settings-section">
          <h3>超时设置</h3>
          
          <div className="setting-item">
            <label>健康检查超时（秒）</label>
            <input
              type="number"
              min={1}
              max={300}
              value={settings.healthCheckTimeout}
              onChange={(e) => updateSetting('healthCheckTimeout', parseInt(e.target.value))}
            />
            <p className="help-text">健康检查请求的超时时间</p>
          </div>

          <div className="setting-item">
            <label>启动超时（秒）</label>
            <input
              type="number"
              min={10}
              max={600}
              value={settings.startupTimeout}
              onChange={(e) => updateSetting('startupTimeout', parseInt(e.target.value))}
            />
            <p className="help-text">等待容器启动的最大时间</p>
          </div>
        </section>

        {/* 端口配置 */}
        <section className="settings-section">
          <h3>端口配置</h3>
          
          <div className="setting-item">
            <label>
              <input
                type="checkbox"
                checked={settings.portConfig.autoSelectPort}
                onChange={(e) => updateSetting('portConfig', { 
                  ...settings.portConfig, 
                  autoSelectPort: e.target.checked 
                })}
              />
              <span>自动选择可用端口</span>
            </label>
            <p className="help-text">如果端口被占用，自动尝试其他端口</p>
          </div>

          {!settings.portConfig.autoSelectPort && (
            <div className="setting-item">
              <label>Matrix 端口</label>
              <input
                type="number"
                min={1024}
                max={65535}
                value={settings.portConfig.matrixPort}
                onChange={(e) => updateSetting('portConfig', {
                  ...settings.portConfig,
                  matrixPort: parseInt(e.target.value)
                })}
              />
              <p className="help-text">Matrix 服务器监听端口（默认 8008）</p>
            </div>
          )}
        </section>

        {/* 日志级别 */}
        <section className="settings-section">
          <h3>日志级别</h3>
          
          <div className="setting-item">
            <label>日志详细程度</label>
            <select
              value={settings.logLevel}
              onChange={(e) => updateSetting('logLevel', e.target.value as any)}
            >
              <option value="error">仅错误</option>
              <option value="warn">警告及以上</option>
              <option value="info">信息及以上（推荐）</option>
              <option value="debug">调试（详细）</option>
            </select>
            <p className="help-text">控制日志输出的详细程度</p>
          </div>
        </section>
      </div>

      <div className="settings-footer">
        <button 
          className="btn secondary" 
          onClick={resetToDefaults}
          disabled={isSaving}
        >
          恢复默认
        </button>
        <button 
          className="btn primary" 
          onClick={saveSettings}
          disabled={isSaving}
        >
          {isSaving ? '保存中...' : '保存设置'}
        </button>
      </div>
    </div>
  );
};

export default ContainerSettingsPanel;
