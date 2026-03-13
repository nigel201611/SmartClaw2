/**
 * SmartClaw Docker Detection UI Component
 * 
 * 首次运行向导中的 Docker 检测组件
 */

import React from 'react';
import { useDocker } from '../hooks/useDocker';

interface DockerDetectionProps {
  onDockerReady?: () => void;
  onSkip?: () => void;
}

/**
 * Docker 检测组件
 */
export const DockerDetection: React.FC<DockerDetectionProps> = ({
  onDockerReady,
  onSkip
}) => {
  const {
    dockerStatus,
    isDetecting,
    containerRunning,
    startContainer,
    detectDocker,
    isLoading,
    error
  } = useDocker(true);

  // 检测完成且 Docker 可用
  React.useEffect(() => {
    if (dockerStatus?.available && onDockerReady) {
      onDockerReady();
    }
  }, [dockerStatus?.available, onDockerReady]);

  /**
   * 获取安装引导链接
   */
  const getInstallGuideUrl = (): string => {
    const platform = navigator.platform.toLowerCase();
    if (platform.includes('mac')) {
      return 'https://docs.docker.com/desktop/install-mac/';
    } else if (platform.includes('win')) {
      return 'https://docs.docker.com/desktop/install-windows-install/';
    }
    return 'https://docs.docker.com/engine/install/';
  };

  /**
   * 渲染检测中状态
   */
  const renderDetecting = () => (
    <div className="docker-detection detecting">
      <div className="spinner" />
      <h3>正在检测 Docker 环境...</h3>
      <p>请等待片刻</p>
    </div>
  );

  /**
   * 渲染 Docker 未安装状态
   */
  const renderNotInstalled = () => (
    <div className="docker-detection error">
      <div className="icon error">⚠️</div>
      <h3>Docker 未安装</h3>
      <p>SmartClaw 需要 Docker 才能运行。请先安装 Docker。</p>
      
      <div className="actions">
        <a
          href={getInstallGuideUrl()}
          target="_blank"
          rel="noopener noreferrer"
          className="btn primary"
        >
          查看安装指南
        </a>
        <button onClick={detectDocker} className="btn secondary">
          重新检测
        </button>
        {onSkip && (
          <button onClick={onSkip} className="btn text">
            跳过（不推荐）
          </button>
        )}
      </div>
      
      <div className="help-text">
        <p>💡 推荐使用 Docker Desktop（macOS/Windows）或 Docker Engine（Linux）</p>
      </div>
    </div>
  );

  /**
   * 渲染 Daemon 未运行状态
   */
  const renderDaemonNotRunning = () => (
    <div className="docker-detection error">
      <div className="icon warning">⚡</div>
      <h3>Docker 未运行</h3>
      <p>
        {dockerStatus?.isDesktop
          ? 'Docker Desktop 已安装但未运行。请启动 Docker Desktop 应用。'
          : 'Docker Daemon 未运行。请启动 Docker 服务。'}
      </p>
      
      <div className="actions">
        <button onClick={detectDocker} className="btn primary">
          重新检测
        </button>
        {onSkip && (
          <button onClick={onSkip} className="btn text">
            跳过
          </button>
        )}
      </div>
    </div>
  );

  /**
   * 渲染权限不足状态
   */
  const renderNoPermission = () => (
    <div className="docker-detection error">
      <div className="icon error">🔒</div>
      <h3>Docker 权限不足</h3>
      
      {process.platform === 'linux' ? (
        <div className="solution">
          <p>请将当前用户加入 docker 组：</p>
          <pre>sudo usermod -aG docker $USER</pre>
          <p>然后重新登录系统。</p>
        </div>
      ) : (
        <p>请确保 Docker Desktop 已正确安装并授予必要权限。</p>
      )}
      
      <div className="actions">
        <button onClick={detectDocker} className="btn primary">
          重新检测
        </button>
        {onSkip && (
          <button onClick={onSkip} className="btn text">
            跳过
          </button>
        )}
      </div>
    </div>
  );

  /**
   * 渲染 Docker 已就绪状态
   */
  const renderReady = () => (
    <div className="docker-detection ready">
      <div className="icon success">✅</div>
      <h3>Docker 已就绪</h3>
      <p>
        {dockerStatus?.version && (
          <span>检测到 Docker {dockerStatus.version}</span>
        )}
      </p>
      
      {!containerRunning && (
        <div className="start-container">
          <p>Matrix 服务尚未启动</p>
          <button
            onClick={startContainer}
            disabled={isLoading}
            className="btn primary"
          >
            {isLoading ? '启动中...' : '启动 Matrix 服务'}
          </button>
        </div>
      )}
      
      {containerRunning && (
        <p className="success-text">✨ Matrix 服务正在运行</p>
      )}
    </div>
  );

  /**
   * 渲染错误状态
   */
  const renderError = () => (
    <div className="docker-detection error">
      <div className="icon error">❌</div>
      <h3>检测失败</h3>
      <p>{error || '未知错误'}</p>
      
      <div className="actions">
        <button onClick={detectDocker} className="btn primary">
          重试
        </button>
        {onSkip && (
          <button onClick={onSkip} className="btn text">
            跳过
          </button>
        )}
      </div>
    </div>
  );

  // 主渲染逻辑
  if (isDetecting) {
    return renderDetecting();
  }

  if (!dockerStatus) {
    return renderError();
  }

  if (!dockerStatus.installed) {
    return renderNotInstalled();
  }

  if (!dockerStatus.running) {
    return renderDaemonNotRunning();
  }

  if (!dockerStatus.hasPermission) {
    return renderNoPermission();
  }

  return renderReady();
};

export default DockerDetection;
