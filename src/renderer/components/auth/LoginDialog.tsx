// src/renderer/components/auth/LoginDialog.tsx
import React, { useState, useEffect } from 'react';

interface LoginDialogProps {
  onLogin: (username: string, password: string, homeserverUrl: string, rememberMe: boolean) => Promise<boolean>;
  onSwitchToRegister?: () => void;
  onClose?: () => void;
  defaultHomeserver?: string;
  error?: string | null;
  isLoading?: boolean;
}

export const LoginDialog: React.FC<LoginDialogProps> = ({
  onLogin,
  onSwitchToRegister,
  onClose,
  defaultHomeserver = 'http://localhost:8008',
  error: externalError,
  isLoading: externalLoading = false,
}) => {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    homeserverUrl: defaultHomeserver,
    rememberMe: true,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [internalLoading, setInternalLoading] = useState(false);
  const [internalError, setInternalError] = useState<string | null>(null);

  const isLoading = externalLoading || internalLoading;
  const error = externalError || internalError;

  // 加载保存的凭证
  useEffect(() => {
    const loadSavedCredentials = async () => {
      try {
        const savedHomeserver = await window.electronAPI.getHomeserver();
        const savedUserId = await window.electronAPI.getCurrentUser();

        if (savedHomeserver) {
          setFormData((prev) => ({ ...prev, homeserverUrl: savedHomeserver }));
        }
        if (savedUserId) {
          // 从 userId 中提取用户名（格式：@username:server）
          const username = savedUserId.split(':')[0].replace('@', '');
          setFormData((prev) => ({ ...prev, username }));
        }
      } catch (error) {
        console.error('Failed to load saved credentials:', error);
      }
    };

    loadSavedCredentials();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    // 清除错误
    if (internalError) setInternalError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setInternalError(null);
    setInternalLoading(true);

    try {
      if (!formData.username.trim()) {
        throw new Error('请输入用户名');
      }
      if (!formData.password) {
        throw new Error('请输入密码');
      }
      if (!formData.homeserverUrl) {
        throw new Error('请输入服务器地址');
      }

      // 验证 URL 格式
      try {
        new URL(formData.homeserverUrl);
      } catch {
        throw new Error('服务器地址格式不正确');
      }

      const success = await onLogin(formData.username.trim(), formData.password, formData.homeserverUrl, formData.rememberMe);

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
    <div className="auth-dialog-overlay" onClick={onClose}>
      <div className="auth-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="auth-dialog-header">
          <h1>欢迎回来</h1>
          <p>登录以继续使用 SmartClaw</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {error && (
            <div className="form-error">
              <span>⚠️</span>
              {error}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="homeserverUrl">Matrix 服务器</label>
            <input id="homeserverUrl" name="homeserverUrl" type="url" value={formData.homeserverUrl} onChange={handleChange} placeholder="http://localhost:8008" disabled={isLoading} required />
            <p className="form-hint">输入您的 Matrix 服务器地址</p>
          </div>

          <div className="form-group">
            <label htmlFor="username">用户名</label>
            <input id="username" name="username" type="text" value={formData.username} onChange={handleChange} placeholder="username" disabled={isLoading} autoComplete="username" required />
            <p className="form-hint">输入您的 Matrix 用户名（不需要 @ 符号）</p>
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
                placeholder="请输入密码"
                disabled={isLoading}
                autoComplete="current-password"
                required
              />
              <button type="button" className="password-toggle" onClick={() => setShowPassword(!showPassword)} tabIndex={-1} aria-label={showPassword ? '隐藏密码' : '显示密码'}>
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          <div className="form-group checkbox-group">
            <label className="checkbox-label">
              <input name="rememberMe" type="checkbox" checked={formData.rememberMe} onChange={handleChange} disabled={isLoading} />
              <span>记住我</span>
            </label>
            <p className="form-hint">下次自动登录，凭证将安全存储</p>
          </div>

          <div className="form-actions">
            <button type="submit" className="btn btn-primary btn-block" disabled={isLoading}>
              {isLoading ? (
                <>
                  <span className="spinner-small" />
                  登录中...
                </>
              ) : (
                '登录'
              )}
            </button>
          </div>
        </form>

        <div className="auth-dialog-footer">
          {onSwitchToRegister && (
            <p>
              还没有账户？{' '}
              <button type="button" className="btn-link" onClick={onSwitchToRegister}>
                立即注册
              </button>
            </p>
          )}
          <p className="hint">💡 提示：默认服务器地址为 http://localhost:8008</p>
        </div>
      </div>
    </div>
  );
};

export default LoginDialog;
