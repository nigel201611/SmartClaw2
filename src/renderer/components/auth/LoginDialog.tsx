/**
 * SmartClaw Login Dialog Component
 * 
 * 登录对话框
 */

import React, { useState } from 'react';

interface LoginDialogProps {
  onLogin: (username: string, password: string, homeserverUrl: string, rememberMe: boolean) => Promise<boolean>;
  onSwitchToRegister?: () => void;
  onClose?: () => void;
  defaultHomeserver?: string;
}

/**
 * 登录对话框组件
 */
export const LoginDialog: React.FC<LoginDialogProps> = ({
  onLogin,
  onSwitchToRegister,
  onClose,
  defaultHomeserver = 'http://localhost:8008'
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [homeserverUrl, setHomeserverUrl] = useState(defaultHomeserver);
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 处理登录
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
      if (!password) {
        setError('请输入密码');
        return;
      }

      // 执行登录
      const success = await onLogin(username.trim(), password, homeserverUrl, rememberMe);
      
      if (!success) {
        setError('登录失败，请检查用户名和密码');
      }
      // 成功时由父组件处理跳转
    } catch (err: any) {
      setError(err.message || '登录失败');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-dialog-overlay" onClick={onClose}>
      <div className="auth-dialog" onClick={e => e.stopPropagation()}>
        <div className="auth-dialog-header">
          <h1>登录 SmartClaw</h1>
          <p>连接到您的 Matrix 服务器</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {error && (
            <div className="form-error">
              <span>⚠️</span>
              {error}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="homeserver">服务器地址</label>
            <input
              id="homeserver"
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
            <label htmlFor="username">用户名</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="yourname"
              disabled={isLoading}
              autoComplete="username"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">密码</label>
            <div className="password-input">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={isLoading}
                autoComplete="current-password"
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
          </div>

          <div className="form-group checkbox-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={e => setRememberMe(e.target.checked)}
                disabled={isLoading}
              />
              <span>记住我</span>
            </label>
            <p className="form-hint">下次自动登录（凭证安全存储）</p>
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
              <button
                type="button"
                className="btn-link"
                onClick={onSwitchToRegister}
              >
                注册
              </button>
            </p>
          )}
          <p className="hint">
            需要帮助？查看{' '}
            <a href="#" className="link">使用文档</a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginDialog;
