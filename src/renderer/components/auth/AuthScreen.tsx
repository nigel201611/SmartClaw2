// src/renderer/components/auth/AuthScreen.tsx
import React, { useState } from 'react';
import { Form, Input, Button, Card, Typography, Alert, Tabs } from 'antd';
import { UserOutlined, LockOutlined, CloudServerOutlined, MailOutlined } from '@ant-design/icons';
import { useMatrix } from '../../hooks/useMatrix';

const { Title, Text } = Typography;

interface AuthScreenProps {
  onAuthenticated?: () => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onAuthenticated }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const { login, register, error, clearError } = useMatrix();

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      if (isLogin) {
        const success = await login(values.username, values.password, values.homeserver);
        if (success && onAuthenticated) {
          onAuthenticated();
        }
      } else {
        const success = await register(values.username, values.password, values.email, values.homeserver);
        if (success && onAuthenticated) {
          onAuthenticated();
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (activeKey: string) => {
    setIsLogin(activeKey === 'login');
    if (clearError) {
      clearError();
    }
  };

  const handleFormChange = () => {
    if (error && clearError) {
      clearError();
    }
  };

  return (
    <div
      style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        overflowY: 'auto',
      }}
    >
      <Card
        style={{
          width: 450,
          maxWidth: '100%',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Title level={2}>SmartClaw</Title>
          <Text type="secondary">Matrix 即时通讯客户端</Text>
        </div>

        <Tabs
          activeKey={isLogin ? 'login' : 'register'}
          onChange={handleTabChange}
          items={[
            { key: 'login', label: '登录' },
            { key: 'register', label: '注册' },
          ]}
        />

        <Form name="auth" onFinish={onFinish} onValuesChange={handleFormChange} autoComplete="off" layout="vertical">
          <Form.Item label="服务器地址" name="homeserver" initialValue="http://localhost:8008" rules={[{ required: true, message: '请输入服务器地址' }]}>
            <Input disabled prefix={<CloudServerOutlined />} placeholder="http://localhost:8008" size="large" />
          </Form.Item>

          <Form.Item label="用户名" name="username" rules={[{ required: true, message: '请输入用户名' }]}>
            <Input prefix={<UserOutlined />} placeholder="username" size="large" />
          </Form.Item>

          {!isLogin && (
            <Form.Item label="邮箱" name="email" rules={[{ type: 'email', message: '请输入有效的邮箱地址' }]}>
              <Input prefix={<MailOutlined />} placeholder="email@example.com" size="large" />
            </Form.Item>
          )}

          <Form.Item label="密码" name="password" rules={[{ required: true, message: '请输入密码' }]}>
            <Input.Password prefix={<LockOutlined />} placeholder="password" size="large" />
          </Form.Item>

          {error && (
            <Form.Item>
              <Alert description={`认证失败：${error}`} type="error" showIcon closable />
            </Form.Item>
          )}

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block size="large">
              {isLogin ? '登录' : '注册'}
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};
