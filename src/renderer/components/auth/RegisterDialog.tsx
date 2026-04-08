// src/renderer/components/auth/RegisterDialog.tsx
import React, { useState } from 'react';
import { Modal, Form, Input, Button, Alert, Typography, Space } from 'antd';
import { UserOutlined, LockOutlined, GlobalOutlined, MailOutlined, KeyOutlined, EyeInvisibleOutlined, EyeTwoTone } from '@ant-design/icons';

const { Text, Link } = Typography;

interface RegisterDialogProps {
  open: boolean;
  onRegister: (username: string, password: string, homeserverUrl: string, token?: string, email?: string) => Promise<boolean>;
  onSwitchToLogin?: () => void;
  onClose?: () => void;
  defaultHomeserver?: string;
  defaultToken?: string;
  error?: string | null;
  isLoading?: boolean;
}

export const RegisterDialog: React.FC<RegisterDialogProps> = ({
  open,
  onRegister,
  onSwitchToLogin,
  onClose,
  defaultHomeserver = 'http://localhost:8008',
  defaultToken = 'smartclaw123',
  error: externalError,
  isLoading: externalLoading = false,
}) => {
  const [form] = Form.useForm();
  const [internalLoading, setInternalLoading] = useState(false);
  const [internalError, setInternalError] = useState<string | null>(null);

  const isLoading = externalLoading || internalLoading;
  const error = externalError || internalError;

  const handleSubmit = async (values: any) => {
    setInternalError(null);
    setInternalLoading(true);

    try {
      const success = await onRegister(values.username.trim(), values.password, values.homeserverUrl, values.registrationToken, values.email);

      if (!success) {
        throw new Error('注册失败，请检查令牌是否正确或用户名是否已存在');
      }
    } catch (err: any) {
      setInternalError(err.message || '注册失败');
    } finally {
      setInternalLoading(false);
    }
  };

  return (
    <Modal title="创建新账户" open={open} onCancel={onClose} footer={null} width={450} centered>
      <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
        加入 SmartClaw 聊天网络
      </Text>

      <Form
        form={form}
        name="register"
        onFinish={handleSubmit}
        autoComplete="off"
        layout="vertical"
        initialValues={{
          homeserverUrl: defaultHomeserver,
          registrationToken: defaultToken,
        }}
      >
        {error && (
          <Form.Item>
            <Alert message="错误" description={error} type="error" showIcon />
          </Form.Item>
        )}

        <Form.Item
          name="homeserverUrl"
          label="服务器地址"
          rules={[
            { required: true, message: '请输入服务器地址' },
            { type: 'url', message: '请输入有效的 URL 地址' },
          ]}
        >
          <Input prefix={<GlobalOutlined />} placeholder="http://localhost:8008" disabled={isLoading} />
        </Form.Item>

        <Form.Item name="registrationToken" label="注册令牌" rules={[{ required: true, message: '请输入注册令牌' }]}>
          <Input prefix={<KeyOutlined />} placeholder="请输入注册令牌" disabled={isLoading} />
        </Form.Item>

        <Form.Item
          name="username"
          label="用户名"
          rules={[
            { required: true, message: '请输入用户名' },
            { min: 3, message: '用户名至少3个字符' },
            { pattern: /^[a-z0-9._=-]+$/i, message: '用户名只能包含字母、数字、点、下划线、连字符' },
          ]}
        >
          <Input prefix={<UserOutlined />} placeholder="username" disabled={isLoading} autoComplete="username" />
        </Form.Item>

        <Form.Item name="email" label="邮箱（可选）" rules={[{ type: 'email', message: '请输入有效的邮箱地址' }]}>
          <Input prefix={<MailOutlined />} placeholder="your@email.com" disabled={isLoading} autoComplete="email" />
        </Form.Item>

        <Form.Item
          name="password"
          label="密码"
          rules={[
            { required: true, message: '请输入密码' },
            { min: 6, message: '密码至少6个字符' },
          ]}
        >
          <Input.Password
            prefix={<LockOutlined />}
            placeholder="请输入密码（至少6位）"
            disabled={isLoading}
            autoComplete="new-password"
            iconRender={(visible) => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
          />
        </Form.Item>

        <Form.Item
          name="confirmPassword"
          label="确认密码"
          dependencies={['password']}
          rules={[
            { required: true, message: '请确认密码' },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('password') === value) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error('两次输入的密码不一致'));
              },
            }),
          ]}
        >
          <Input.Password
            prefix={<LockOutlined />}
            placeholder="请再次输入密码"
            disabled={isLoading}
            autoComplete="new-password"
            iconRender={(visible) => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
          />
        </Form.Item>

        <Form.Item>
          <Button type="primary" htmlType="submit" loading={isLoading} block size="large">
            注册
          </Button>
        </Form.Item>

        <div style={{ textAlign: 'center' }}>
          <Text type="secondary">
            已有账户？ <Link onClick={onSwitchToLogin}>立即登录</Link>
          </Text>
        </div>

        <div style={{ marginTop: 16, textAlign: 'center' }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            💡 注册令牌: <code>smartclaw123</code>
          </Text>
        </div>
      </Form>
    </Modal>
  );
};

export default RegisterDialog;
