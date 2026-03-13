/**
 * SmartClaw Register Dialog Component
 * 
 * 注册对话框
 */

import React, { useState } from 'react';

interface RegisterDialogProps {
  onRegister: (username: string, password: string, homeserverUrl: string) => Promise<boolean>;
  onSwitchToLogin?: () => void;
  onClose?: () => void;
  defaultHomeserver?: string;
}

/**
 * 注册对话框组件
 */
export const RegisterDialog: React.FC<RegisterDialogProps> = ({
  onRegister,
  onSwitchToLogin,
  onClose,
  defaultHomeserver = 'http://localhost:8008'
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [homeserverUrl, setHomeserverUrl] = useState(defaultHomeserver);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 处理注册
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      // 验证输入
      if (!username.trim()) {
        setError('请输入用户名');
        return;
      }
      if (username.length < 3) {
        setError('用户名至少 3 个字符');
        return;
      }
      if (!password) {
        setError('请输入密码');
        return;
      }
      if (password.length < 6) {
        setError('密码至少 6 个字符');
        return;
      }
      if (password !== confirmPassword) {
        setError('两次输入的密码不一致');
        return;
      }

      // 执行注册
      const success = await onRegister(username.trim(), password, homeserverUrl);
      
      if (!success) {
        setError('注册失败，请稍后重试');
      }
      // 成功时由父组件处理跳转
    } catch (err: any) {
      setError(err.message || '注册失败');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-dialog-overlay" onClick={onClose}>
      <div className="auth-dialog" onClick={e => e.stopPropagation()}>
        <div className="auth-dialog-header">
          <h1>注册账户</h1>
          <p>创建您的 SmartClaw 账户</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {error && (
            <div className="form-error">
              <span>⚠️</span>
              {error}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="reg-homeserver">服务器地址</label>
            <input
              id="reg-homeserver"
              type="url"
              value={homeserverUrl}
              onChange={e => setHomeserverUrl(e.target.value)}
              placeholder="http://localhost:8008"
              disabled={isLoading}
              required
            />
            <p className="form-hint">Matrix 服务器的 URL 地址</p>
          </div>

          <div className="form-group">
            <label htmlFor="reg-username">用户名</label>
            <input
              id="reg-username"
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="yourname"
              disabled={isLoading}
              autoComplete="username"
              minLength={3}
              required
            />
            <p className="form-hint">至少 3 个字符</p>
          </div>

          <div className="form-group">
            <label htmlFor="reg-password">密码</label>
            <div className="password-input">
              <input
                id="reg-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={isLoading}
                autoComplete="new-password"
                minLength={6}
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
            <p className="form-hint">至少 6 个字符</p>
          </div>

          <div className="form-group">
            <label htmlFor="reg-confirm-password">确认密码</label>
            <div className="password-input">
              <input
                id="reg-confirm-password"
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                disabled={isLoading}
                autoComplete="new-password"
                required
              />
            </div>
          </div>

          <div className="form-actions">
            <button
              type="submit"
              className="btn btn-primary btn-block"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <span className="spinner-small"></span>
                  注册中...
                </>
              ) : (
                '注册'
              )}
            </button>
          </div>
        </form>

        <div className="auth-dialog-footer">
          {onSwitchToLogin && (
            <p>
              已有账户？{' '}
              <button
                type="button"
                className="btn-link"
                onClick={onSwitchToLogin}
              >
                登录
              </button>
            </p>
          )}
          <p className="hint">
            注意：部分服务器可能不支持在线注册
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterDialog;
