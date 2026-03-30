/**
 * SmartClaw Log Viewer Component
 *
 * 容器日志查看器
 */

import React, { useState, useEffect, useRef } from 'react';

interface LogViewerProps {
  onClose?: () => void;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
}

/**
 * 安全获取 Electron API
 */
const getElectronAPI = (): IElectronAPI => {
  if (!window.electronAPI) {
    throw new Error('Electron API not available. Please ensure preload script is loaded correctly.');
  }
  return window.electronAPI;
};

/**
 * 日志查看器组件
 */
export const LogViewer: React.FC<LogViewerProps> = ({ onClose, autoRefresh = true, refreshInterval = 3000 }) => {
  const [logs, setLogs] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tailLines, setTailLines] = useState(200);
  const [isFollowing, setIsFollowing] = useState(true);
  const [filterText, setFilterText] = useState('');
  const logsEndRef = useRef<HTMLDivElement>(null);

  // 加载日志
  const loadLogs = async () => {
    try {
      setIsLoading(true);
      const api = getElectronAPI();

      // 使用 preload 中的 docker 日志方法
      let logData: string;

      if (tailLines === 99999) {
        // 获取全部日志
        logData = await api.getContainerLogs();
      } else {
        // 获取指定行数的日志
        const logs = await api.getContainerLogs();
        const lines = logs.split('\n');
        const tailLines_ = lines.slice(-tailLines);
        logData = tailLines_.join('\n');
      }

      setLogs(logData || '');
      setError(null);
    } catch (err: any) {
      setError(err.message || '获取日志失败');
    } finally {
      setIsLoading(false);
    }
  };

  // 初始加载
  useEffect(() => {
    loadLogs();
  }, [tailLines]);

  // 自动刷新
  useEffect(() => {
    if (!autoRefresh || !isFollowing) return;

    const interval = setInterval(() => {
      loadLogs();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, isFollowing, refreshInterval]);

  // 滚动到底部
  useEffect(() => {
    if (isFollowing && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, isFollowing]);

  // 过滤日志
  const filteredLogs = filterText
    ? logs
        .split('\n')
        .filter((line) => line.toLowerCase().includes(filterText.toLowerCase()))
        .join('\n')
    : logs;

  // 复制日志
  const copyLogs = async () => {
    try {
      // 使用浏览器原生方法复制文本
      await navigator.clipboard.writeText(logs);
      // 可选：显示成功提示
      console.log('日志已复制到剪贴板');
    } catch (err: any) {
      setError('复制失败: ' + err.message);
    }
  };

  // 导出日志
  const exportLogs = async () => {
    try {
      const api = getElectronAPI();

      // 获取当前时间作为文件名
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `smartclaw-matrix-${timestamp}.log`;

      // 使用 Electron 的 shell API 来保存文件
      // 注意：preload 中没有直接的保存文件方法，需要添加
      // 这里使用浏览器原生的下载方法作为替代
      const blob = new Blob([logs], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setError('导出失败: ' + err.message);
    }
  };

  // 清除日志（只清除显示，不清除实际日志）
  const clearLogs = () => {
    setLogs('');
  };

  // 解析日志级别（用于高亮）
  const parseLogLevel = (line: string): 'info' | 'warn' | 'error' | 'debug' | null => {
    if (line.includes('ERROR') || line.includes('error') || line.includes('❌')) return 'error';
    if (line.includes('WARN') || line.includes('warn') || line.includes('⚠️')) return 'warn';
    if (line.includes('DEBUG') || line.includes('debug') || line.includes('🔍')) return 'debug';
    if (line.includes('INFO') || line.includes('info') || line.includes('ℹ️')) return 'info';
    return null;
  };

  // 渲染高亮的日志行
  const renderLogLine = (line: string, index: number) => {
    const level = parseLogLevel(line);
    let className = 'log-line';

    if (level === 'error') className += ' log-error';
    else if (level === 'warn') className += ' log-warn';
    else if (level === 'debug') className += ' log-debug';

    return (
      <div key={index} className={className}>
        {line || ' '}
      </div>
    );
  };

  return (
    <div className="log-viewer">
      <div className="log-header">
        <h2>容器日志</h2>
        <div className="log-actions">
          <button className={`btn ${isFollowing ? 'active' : ''}`} onClick={() => setIsFollowing(!isFollowing)} title="自动滚动到底部">
            {isFollowing ? '📍 跟随' : '⏸ 暂停'}
          </button>
          <button className="btn" onClick={loadLogs} title="刷新">
            🔄 刷新
          </button>
          <button className="btn" onClick={copyLogs} title="复制">
            📋 复制
          </button>
          <button className="btn" onClick={exportLogs} title="导出">
            💾 导出
          </button>
          <button className="btn" onClick={clearLogs} title="清除">
            🗑 清除
          </button>
          {onClose && (
            <button className="btn close" onClick={onClose}>
              ×
            </button>
          )}
        </div>
      </div>

      <div className="log-toolbar">
        <div className="log-filter">
          <input type="text" placeholder="过滤日志..." value={filterText} onChange={(e) => setFilterText(e.target.value)} className="filter-input" />
          {filterText && (
            <button onClick={() => setFilterText('')} className="clear-filter">
              ×
            </button>
          )}
        </div>

        <div className="log-tail">
          <label>显示行数：</label>
          <select value={tailLines} onChange={(e) => setTailLines(parseInt(e.target.value))}>
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value={200}>200</option>
            <option value={500}>500</option>
            <option value={1000}>1000</option>
            <option value={99999}>全部</option>
          </select>
        </div>
      </div>

      <div className="log-content">
        {isLoading && (
          <div className="log-loading">
            <div className="spinner" />
            <p>加载日志中...</p>
          </div>
        )}

        {error && (
          <div className="log-error">
            <p>❌ {error}</p>
            <button onClick={loadLogs}>重试</button>
          </div>
        )}

        {!isLoading && !error && (
          <div className="log-text">
            {filteredLogs ? filteredLogs.split('\n').map((line, index) => renderLogLine(line, index)) : <div className="no-logs">暂无日志</div>}
            <div ref={logsEndRef} />
          </div>
        )}
      </div>

      <div className="log-footer">
        <span className="log-stats">
          {logs ? `${logs.split('\n').length} 行日志` : '无日志'}
          {filterText && ` (过滤后：${filteredLogs.split('\n').length} 行)`}
        </span>
        {isFollowing && <span className="live-indicator">🔴 实时</span>}
      </div>
    </div>
  );
};

export default LogViewer;
