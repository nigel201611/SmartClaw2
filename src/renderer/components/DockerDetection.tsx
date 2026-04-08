// src/renderer/components/onboarding/DockerDetection.tsx
import React, { useEffect } from 'react';
import { Card, Button, Space, Typography, Spin, Alert, Result } from 'antd';
import { DockerOutlined, CheckCircleOutlined, CloseCircleOutlined, WarningOutlined, ReloadOutlined, ArrowRightOutlined } from '@ant-design/icons';
import { useDocker } from '../hooks/useDocker';

const { Title, Text, Paragraph } = Typography;

interface DockerDetectionProps {
  onDockerReady?: () => void;
  onSkip?: () => void;
}

export const DockerDetection: React.FC<DockerDetectionProps> = ({ onDockerReady, onSkip }) => {
  const { dockerStatus, isDetecting, containerRunning, startContainer, detectDocker, isLoading, error } = useDocker(true);

  useEffect(() => {
    if (dockerStatus?.available && onDockerReady) {
      onDockerReady();
    }
  }, [dockerStatus?.available, onDockerReady]);

  const getInstallGuideUrl = (): string => {
    const platform = navigator.platform.toLowerCase();
    if (platform.includes('mac')) {
      return 'https://docs.docker.com/desktop/install-mac/';
    } else if (platform.includes('win')) {
      return 'https://docs.docker.com/desktop/install-windows-install/';
    }
    return 'https://docs.docker.com/engine/install/';
  };

  if (isDetecting) {
    return (
      <Card style={{ textAlign: 'center', padding: 40 }}>
        <Spin size="large" />
        <Title level={4} style={{ marginTop: 20 }}>
          正在检测 Docker 环境...
        </Title>
        <Text type="secondary">请稍候</Text>
      </Card>
    );
  }

  if (!dockerStatus?.installed) {
    return (
      <Result
        status="error"
        icon={<CloseCircleOutlined />}
        title="Docker 未安装"
        subTitle="SmartClaw 需要 Docker 才能运行。请先安装 Docker。"
        extra={
          <Space>
            <Button type="primary" href={getInstallGuideUrl()} target="_blank">
              查看安装指南
            </Button>
            <Button onClick={detectDocker}>重新检测</Button>
            {onSkip && <Button onClick={onSkip}>跳过（不推荐）</Button>}
          </Space>
        }
      >
        <div style={{ marginTop: 16 }}>
          <Text type="secondary">💡 推荐使用 Docker Desktop（macOS/Windows）或 Docker Engine（Linux）</Text>
        </div>
      </Result>
    );
  }

  if (!dockerStatus?.running) {
    return (
      <Result
        status="warning"
        icon={<WarningOutlined />}
        title="Docker 未运行"
        subTitle={dockerStatus?.isDesktop ? 'Docker Desktop 已安装但未运行。请启动 Docker Desktop 应用。' : 'Docker Daemon 未运行。请启动 Docker 服务。'}
        extra={
          <Space>
            <Button type="primary" onClick={detectDocker}>
              重新检测
            </Button>
            {onSkip && <Button onClick={onSkip}>跳过</Button>}
          </Space>
        }
      />
    );
  }

  if (!dockerStatus?.hasPermission) {
    return (
      <Result
        status="error"
        icon={<CloseCircleOutlined />}
        title="Docker 权限不足"
        subTitle={
          process.platform === 'linux' ? (
            <div>
              <Text>请将当前用户加入 docker 组：</Text>
              <pre style={{ marginTop: 8, padding: 8, background: '#f5f5f5' }}>sudo usermod -aG docker $USER</pre>
              <Text>然后重新登录系统。</Text>
            </div>
          ) : (
            <Text>请确保 Docker Desktop 已正确安装并授予必要权限。</Text>
          )
        }
        extra={
          <Space>
            <Button type="primary" onClick={detectDocker}>
              重新检测
            </Button>
            {onSkip && <Button onClick={onSkip}>跳过</Button>}
          </Space>
        }
      />
    );
  }

  // Docker 已就绪
  return (
    <Card style={{ textAlign: 'center', padding: 20 }}>
      <CheckCircleOutlined style={{ fontSize: 64, color: '#52c41a' }} />
      <Title level={3} style={{ marginTop: 16 }}>
        Docker 已就绪
      </Title>
      {dockerStatus?.version && <Text type="secondary">检测到 Docker {dockerStatus.version}</Text>}

      {!containerRunning && (
        <div style={{ marginTop: 24 }}>
          <Paragraph>Matrix 服务尚未启动</Paragraph>
          <Button type="primary" size="large" icon={<DockerOutlined />} onClick={startContainer} loading={isLoading}>
            启动 Matrix 服务
          </Button>
        </div>
      )}

      {containerRunning && (
        <div style={{ marginTop: 16 }}>
          <Alert message="✨ Matrix 服务正在运行" type="success" showIcon />
          <Button type="primary" size="large" icon={<ArrowRightOutlined />} style={{ marginTop: 16 }} onClick={onDockerReady}>
            继续
          </Button>
        </div>
      )}

      {onSkip && !containerRunning && (
        <div style={{ marginTop: 16 }}>
          <Button type="link" onClick={onSkip}>
            稍后启动
          </Button>
        </div>
      )}
    </Card>
  );
};

export default DockerDetection;
