// src/renderer/components/auth/LoginDialog.tsx
import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Button, Checkbox, Alert, Space, Typography } from 'antd';
import { UserOutlined, LockOutlined, GlobalOutlined, EyeInvisibleOutlined, EyeTwoTone } from '@ant-design/icons';

const { Text, Link } = Typography;

interface LoginDialogProps {
  open: boolean;
  onLogin: (username: string, password: string, homeserverUrl: string, rememberMe: boolean) => Promise<boolean>;
  onSwitchToRegister?: () => void;
  onClose?: () => void;
  defaultHomeserver?: string;
  error?: string | null;
  isLoading?: boolean;
}

export const LoginDialog: React.FC<LoginDialogProps> = ({
  open,
  onLogin,
  onSwitchToRegister,
  onClose,
  defaultHomeserver = 'http://localhost:8008',
  error: externalError,
  isLoading: externalLoading = false,
}) => {
  const [form] = Form.useForm();
  const [internalLoading, setInternalLoading] = useState(false);
  const [internalError, setInternalError] = useState<string | null>(null);

  const isLoading = externalLoading || internalLoading;
  const error = externalError || internalError;

  // 加载保存的凭证
  useEffect(() => {
    const loadSavedCredentials = async () => {
      try {
        const { success, data: savedHomeserver } = await window.electronAPI.getHomeserver();
        const { data: savedUserId } = await window.electronAPI.getCurrentUser();

        if (savedHomeserver) {
          form.setFieldValue('homeserverUrl', savedHomeserver);
        }
        if (savedUserId) {
          const username = savedUserId.split(':')[0].replace('@', '');
          form.setFieldValue('username', username);
        }
      } catch (error) {
        console.error('Failed to load saved credentials:', error);
      }
    };

    if (open) {
      loadSavedCredentials();
    }
  }, [open, form]);

  const handleSubmit = async (values: any) => {
    setInternalError(null);
    setInternalLoading(true);

    try {
      const success = await onLogin(values.username.trim(), values.password, values.homeserverUrl, values.rememberMe);

      if (!success) {
        throw new Error('登录失败，请检查用户名和密码');
      }
    } catch (err: any) {
      setInternalError(err.message || '登录失败');
    } finally {
      setInternalLoading(false);
    }
  };

  return (
    <Modal title="欢迎回来" open={open} onCancel={onClose} footer={null} width={450} centered>
      <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
        登录以继续使用 SmartClaw
      </Text>

      <Form
        form={form}
        name="login"
        onFinish={handleSubmit}
        autoComplete="off"
        layout="vertical"
        initialValues={{
          homeserverUrl: defaultHomeserver,
          rememberMe: true,
        }}
      >
        {error && (
          <Form.Item>
            <Alert message="错误" description={error} type="error" showIcon />
          </Form.Item>
        )}

        <Form.Item
          name="homeserverUrl"
          label="Matrix 服务器"
          rules={[
            { required: true, message: '请输入服务器地址' },
            { type: 'url', message: '请输入有效的 URL 地址' },
          ]}
        >
          <Input prefix={<GlobalOutlined />} placeholder="http://localhost:8008" disabled={isLoading} />
        </Form.Item>

        <Form.Item
          name="username"
          label="用户名"
          rules={[
            { required: true, message: '请输入用户名' },
            { min: 3, message: '用户名至少3个字符' },
          ]}
        >
          <Input prefix={<UserOutlined />} placeholder="username" disabled={isLoading} autoComplete="username" />
        </Form.Item>

        <Form.Item name="password" label="密码" rules={[{ required: true, message: '请输入密码' }]}>
          <Input.Password
            prefix={<LockOutlined />}
            placeholder="请输入密码"
            disabled={isLoading}
            autoComplete="current-password"
            iconRender={(visible) => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
          />
        </Form.Item>

        <Form.Item name="rememberMe" valuePropName="checked">
          <Checkbox disabled={isLoading}>记住我</Checkbox>
        </Form.Item>

        <Form.Item>
          <Button type="primary" htmlType="submit" loading={isLoading} block size="large">
            登录
          </Button>
        </Form.Item>

        <div style={{ textAlign: 'center' }}>
          <Text type="secondary">
            还没有账户？ <Link onClick={onSwitchToRegister}>立即注册</Link>
          </Text>
        </div>

        <div style={{ marginTop: 16, textAlign: 'center' }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            💡 提示：默认服务器地址为 http://localhost:8008
          </Text>
        </div>
      </Form>
    </Modal>
  );
};

export default LoginDialog;
