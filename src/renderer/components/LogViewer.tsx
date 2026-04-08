// src/renderer/components/logs/LogViewer.tsx
import React, { useState, useEffect, useRef } from 'react';
import { Modal, Button, Space, Input, Select, Switch, Typography, Tooltip, message, Spin, Tag, Tabs } from 'antd';
import { DownloadOutlined, CopyOutlined, ReloadOutlined, CloseOutlined, PlayCircleOutlined, PauseCircleOutlined, ClearOutlined, SearchOutlined } from '@ant-design/icons';

const { Text } = Typography;
const { TextArea } = Input;

interface LogViewerProps {
  open: boolean;
  onClose?: () => void;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

const getElectronAPI = (): IElectronAPI => {
  if (!window.electronAPI) {
    throw new Error('Electron API not available');
  }
  return window.electronAPI;
};

export const LogViewer: React.FC<LogViewerProps> = ({ open, onClose, autoRefresh = true, refreshInterval = 3000 }) => {
  const [logs, setLogs] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [tailLines, setTailLines] = useState(200);
  const [isFollowing, setIsFollowing] = useState(true);
  const [filterText, setFilterText] = useState('');
  const logsEndRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const api = getElectronAPI();
      let logData = await api.getContainerLogs();

      if (tailLines !== 99999 && logData) {
        const lines = logData.split('\n');
        logData = lines.slice(-tailLines).join('\n');
      }

      setLogs(logData || '');
    } catch (error: any) {
      message.error(error.message || '获取日志失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadLogs();
    }
  }, [open, tailLines]);

  useEffect(() => {
    if (open && autoRefresh && isFollowing) {
      intervalRef.current = setInterval(loadLogs, refreshInterval);
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [open, autoRefresh, isFollowing, refreshInterval]);

  useEffect(() => {
    if (isFollowing && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, isFollowing]);

  const filteredLogs = filterText
    ? logs
        .split('\n')
        .filter((line) => line.toLowerCase().includes(filterText.toLowerCase()))
        .join('\n')
    : logs;

  const copyLogs = async () => {
    try {
      await navigator.clipboard.writeText(logs);
      message.success('日志已复制到剪贴板');
    } catch (error) {
      message.error('复制失败');
    }
  };

  const exportLogs = () => {
    try {
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `smartclaw-matrix-${timestamp}.log`;
      const blob = new Blob([logs], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      message.success('日志已导出');
    } catch (error) {
      message.error('导出失败');
    }
  };

  const clearLogs = () => {
    setLogs('');
    message.info('显示已清除');
  };

  const getLogColor = (line: string): string | undefined => {
    if (line.includes('ERROR') || line.includes('error')) return '#ff4d4f';
    if (line.includes('WARN') || line.includes('warn')) return '#faad14';
    if (line.includes('DEBUG') || line.includes('debug')) return '#1890ff';
  };

  return (
    <Modal title="容器日志" open={open} onCancel={onClose} width="90%" style={{ top: 20 }} footer={null} bodyStyle={{ height: '70vh', padding: 0, display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: 12, borderBottom: '1px solid #f0f0f0', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <Space>
          <Tooltip title={isFollowing ? '暂停跟随' : '开始跟随'}>
            <Button icon={isFollowing ? <PauseCircleOutlined /> : <PlayCircleOutlined />} onClick={() => setIsFollowing(!isFollowing)} type={isFollowing ? 'primary' : 'default'}>
              {isFollowing ? '跟随' : '暂停'}
            </Button>
          </Tooltip>

          <Tooltip title="刷新">
            <Button icon={<ReloadOutlined />} onClick={loadLogs} />
          </Tooltip>

          <Tooltip title="复制">
            <Button icon={<CopyOutlined />} onClick={copyLogs} />
          </Tooltip>

          <Tooltip title="导出">
            <Button icon={<DownloadOutlined />} onClick={exportLogs} />
          </Tooltip>

          <Tooltip title="清除显示">
            <Button icon={<ClearOutlined />} onClick={clearLogs} />
          </Tooltip>
        </Space>

        <Input placeholder="过滤日志..." prefix={<SearchOutlined />} value={filterText} onChange={(e) => setFilterText(e.target.value)} allowClear style={{ width: 200 }} />

        <Select
          value={tailLines}
          onChange={setTailLines}
          style={{ width: 100 }}
          options={[
            { value: 50, label: '50 行' },
            { value: 100, label: '100 行' },
            { value: 200, label: '200 行' },
            { value: 500, label: '500 行' },
            { value: 1000, label: '1000 行' },
            { value: 99999, label: '全部' },
          ]}
        />
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: 12, background: '#1e1e1e', color: '#d4d4d4', fontFamily: 'monospace' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <Spin />
          </div>
        ) : (
          <>
            {filteredLogs.split('\n').map((line, index) => (
              <div key={index} style={{ color: getLogColor(line), fontSize: 12, lineHeight: 1.5 }}>
                {line || ' '}
              </div>
            ))}
            <div ref={logsEndRef} />
          </>
        )}
      </div>

      <div style={{ padding: 8, borderTop: '1px solid #f0f0f0', background: '#fafafa', display: 'flex', justifyContent: 'space-between' }}>
        <Text type="secondary" style={{ fontSize: 12 }}>
          {logs ? `${logs.split('\n').length} 行日志` : '无日志'}
          {filterText && ` (过滤后：${filteredLogs.split('\n').length} 行)`}
        </Text>
        {isFollowing && (
          <Tag color="red" icon={<PlayCircleOutlined />}>
            实时
          </Tag>
        )}
      </div>
    </Modal>
  );
};

export default LogViewer;
