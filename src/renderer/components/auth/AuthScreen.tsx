// src/renderer/components/auth/AuthScreen.tsx
import React, { useState } from 'react';
import { Form, Input, Button, Card, Typography, Alert, Space, Switch, Tabs } from 'antd';
import { UserOutlined, LockOutlined, CloudServerOutlined, MailOutlined } from '@ant-design/icons';
import { useMatrix } from '../../hooks/useMatrix';

const { Title, Text } = Typography;

interface AuthScreenProps {
  onAuthenticated?: () => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onAuthenticated }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const { login, register, error } = useMatrix();

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

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      }}
    >
      <Card style={{ width: 450, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Title level={2}>SmartClaw</Title>
          <Text type="secondary">Matrix 即时通讯客户端</Text>
        </div>

        <Tabs activeKey={isLogin ? 'login' : 'register'} onChange={(key) => setIsLogin(key === 'login')}>
          <Tabs.TabPane tab="登录" key="login" />
          <Tabs.TabPane tab="注册" key="register" />
        </Tabs>

        <Form name="auth" onFinish={onFinish} autoComplete="off" layout="vertical">
          <Form.Item label="服务器地址" name="homeserver" initialValue="http://localhost:8008" rules={[{ required: true, message: '请输入服务器地址' }]}>
            <Input prefix={<CloudServerOutlined />} placeholder="http://localhost:8008" />
          </Form.Item>

          <Form.Item label="用户名" name="username" rules={[{ required: true, message: '请输入用户名' }]}>
            <Input prefix={<UserOutlined />} placeholder="username" />
          </Form.Item>

          {!isLogin && (
            <Form.Item label="邮箱" name="email" rules={[{ type: 'email', message: '请输入有效的邮箱地址' }]}>
              <Input prefix={<MailOutlined />} placeholder="email@example.com" />
            </Form.Item>
          )}

          <Form.Item label="密码" name="password" rules={[{ required: true, message: '请输入密码' }]}>
            <Input.Password prefix={<LockOutlined />} placeholder="password" />
          </Form.Item>

          {error && (
            <Form.Item>
              <Alert message="错误" description={error} type="error" showIcon />
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
