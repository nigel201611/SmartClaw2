// RegisterDialog.tsx
import React, { useState } from 'react';

interface RegisterDialogProps {
  onRegister: (username: string, password: string, homeserverUrl: string, token?: string, email?: string) => Promise<boolean>;
  onSwitchToLogin?: () => void;
  onClose?: () => void;
  defaultHomeserver?: string;
  defaultToken?: string;
  error?: string | null;
  isLoading?: boolean;
}

export const RegisterDialog: React.FC<RegisterDialogProps> = ({
  onRegister,
  onSwitchToLogin,
  onClose,
  defaultHomeserver = 'http://localhost:8008',
  defaultToken = 'smartclaw123', // 预设默认 token
  error: externalError,
  isLoading: externalLoading = false,
}) => {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    email: '',
    homeserverUrl: defaultHomeserver,
    registrationToken: defaultToken,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [internalLoading, setInternalLoading] = useState(false);
  const [internalError, setInternalError] = useState<string | null>(null);

  const isLoading = externalLoading || internalLoading;
  const error = externalError || internalError;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (internalError) setInternalError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setInternalError(null);
    setInternalLoading(true);

    try {
      // 验证用户名
      if (!formData.username.trim()) {
        throw new Error('请输入用户名');
      }

      const usernameRegex = /^[a-z0-9._=-]+$/i;
      if (!usernameRegex.test(formData.username.trim())) {
        throw new Error('用户名只能包含字母、数字、点、下划线、连字符');
      }

      if (formData.username.length < 3) {
        throw new Error('用户名长度至少为 3 个字符');
      }

      // 验证密码
      if (!formData.password) {
        throw new Error('请输入密码');
      }

      if (formData.password.length < 6) {
        throw new Error('密码长度至少为 6 位');
      }

      if (formData.password !== formData.confirmPassword) {
        throw new Error('两次输入的密码不一致');
      }

      // 验证注册令牌
      if (!formData.registrationToken) {
        throw new Error('请输入注册令牌');
      }

      // 验证服务器地址
      if (!formData.homeserverUrl) {
        throw new Error('请输入服务器地址');
      }

      // 验证邮箱（可选）
      if (formData.email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
          throw new Error('邮箱格式不正确');
        }
      }

      const success = await onRegister(formData.username.trim(), formData.password, formData.homeserverUrl, formData.registrationToken, formData.email || undefined);

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
    <div className="auth-dialog-overlay" onClick={onClose}>
      <div className="auth-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="auth-dialog-header">
          <h1>创建新账户</h1>
          <p>加入 SmartClaw 聊天网络</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {error && (
            <div className="form-error">
              <span>⚠️</span>
              {error}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="homeserverUrl">服务器地址</label>
            <input id="homeserverUrl" name="homeserverUrl" type="url" value={formData.homeserverUrl} onChange={handleChange} placeholder="http://localhost:8008" disabled={isLoading} required />
            <p className="form-hint">Matrix 服务器的 URL 地址</p>
          </div>

          <div className="form-group">
            <label htmlFor="registrationToken">注册令牌</label>
            <input id="registrationToken" name="registrationToken" type="text" value={formData.registrationToken} onChange={handleChange} placeholder="请输入注册令牌" disabled={isLoading} required />
            <p className="form-hint">
              🔑 注册令牌: <code>smartclaw123</code>
            </p>
          </div>

          <div className="form-group">
            <label htmlFor="username">用户名</label>
            <input id="username" name="username" type="text" value={formData.username} onChange={handleChange} placeholder="username" disabled={isLoading} autoComplete="username" required />
            <p className="form-hint">用户名将显示为 @username:localhost</p>
          </div>

          <div className="form-group">
            <label htmlFor="email">邮箱（可选）</label>
            <input id="email" name="email" type="email" value={formData.email} onChange={handleChange} placeholder="your@email.com" disabled={isLoading} autoComplete="email" />
            <p className="form-hint">用于密码找回和通知</p>
          </div>

          <div className="form-group">
            <label htmlFor="password">密码</label>
            <div className="password-input">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={handleChange}
                placeholder="请输入密码（至少6位）"
                disabled={isLoading}
                autoComplete="new-password"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">确认密码</label>
            <div className="password-input">
              <input
                id="confirmPassword"
                name="confirmPassword"
                type={showPassword ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="请再次输入密码"
                disabled={isLoading}
                autoComplete="new-password"
                required
              />
              <button type="button" className="password-toggle" onClick={() => setShowPassword(!showPassword)} tabIndex={-1}>
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" className="btn btn-primary btn-block" disabled={isLoading}>
              {isLoading ? (
                <>
                  <span className="spinner-small" />
                  注册中...
                </>
              ) : (
                '注册'
              )}
            </button>
          </div>
        </form>

        <div className="auth-dialog-footer">
          <p>
            已有账户？{' '}
            <button type="button" className="btn-link" onClick={onSwitchToLogin}>
              立即登录
            </button>
          </p>
          <p className="hint">
            💡 注册令牌: <code>smartclaw123</code>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterDialog;
