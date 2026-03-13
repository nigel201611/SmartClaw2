/**
 * SmartClaw Log Viewer Component
 * 
 * 容器日志查看器
 */

import React, { useState, useEffect, useRef } from 'react';
import { ipcRenderer } from 'electron';

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
 * 日志查看器组件
 */
export const LogViewer: React.FC<LogViewerProps> = ({
  onClose,
  autoRefresh = true,
  refreshInterval = 3000
}) => {
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
      const result = await ipcRenderer.invoke('docker:logs', { tail: tailLines });
      if (result.success) {
        setLogs(result.data || '');
        setError(null);
      } else {
        setError(result.error);
      }
    } catch (err: any) {
      setError(err.message);
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
  }, [autoRefresh, isFollowing, refreshInterval, tailLines]);

  // 滚动到底部
  useEffect(() => {
    if (isFollowing && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, isFollowing]);

  // 过滤日志
  const filteredLogs = filterText
    ? logs.split('\n').filter(line => line.toLowerCase().includes(filterText.toLowerCase())).join('\n')
    : logs;

  // 复制日志
  const copyLogs = () => {
    const { clipboard } = require('electron');
    clipboard.writeText(logs);
  };

  // 导出日志
  const exportLogs = async () => {
    try {
      const { dialog } = require('electron');
      const filePath = await dialog.showSaveDialog({
        defaultPath: `smartclaw-matrix-${new Date().toISOString().split('T')[0]}.log`,
        filters: [{ name: 'Log Files', extensions: ['log'] }]
      });

      if (!filePath.canceled && filePath.filePath) {
        const fs = require('fs');
        fs.writeFileSync(filePath.filePath, logs);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  // 清除日志
  const clearLogs = () => {
    setLogs('');
  };

  return (
    <div className="log-viewer">
      <div className="log-header">
        <h2>容器日志</h2>
        <div className="log-actions">
          <button
            className={`btn ${isFollowing ? 'active' : ''}`}
            onClick={() => setIsFollowing(!isFollowing)}
            title="自动滚动到底部"
          >
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
          <input
            type="text"
            placeholder="过滤日志..."
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            className="filter-input"
          />
          {filterText && (
            <button onClick={() => setFilterText('')} className="clear-filter">
              ×
            </button>
          )}
        </div>

        <div className="log-tail">
          <label>显示行数：</label>
          <select
            value={tailLines}
            onChange={(e) => setTailLines(parseInt(e.target.value))}
          >
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
          <pre className="log-text">
            {filteredLogs || <span className="no-logs">暂无日志</span>}
            <div ref={logsEndRef} />
          </pre>
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
