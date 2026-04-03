// AuthScreen.tsx
import React, { useState, useEffect } from 'react';
import { LoginDialog } from './LoginDialog';
import { RegisterDialog } from './RegisterDialog';

interface AuthScreenProps {
  onAuthenticated: () => void;
}

type AuthView = 'login' | 'register';

export const AuthScreen: React.FC<AuthScreenProps> = ({ onAuthenticated }) => {
  const [view, setView] = useState<AuthView>('login');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null); // 添加这行

  // 检查 Electron API 是否可用
  useEffect(() => {
    if (!window.electronAPI) {
      console.error('Electron API not available!');
      setError('Electron API 不可用，请重启应用');
    } else {
      console.log('Electron API available:', Object.keys(window.electronAPI));
    }
  }, []);

  const handleLogin = async (username: string, password: string, homeserverUrl: string, rememberMe: boolean): Promise<boolean> => {
    console.log('=== Login Started ===');
    console.log('Username:', username);
    console.log('Homeserver:', homeserverUrl);

    setError(null);
    setIsLoading(true);

    try {
      if (!window.electronAPI) {
        throw new Error('Electron API 不可用');
      }

      // 测试连接
      console.log('Testing connection to:', homeserverUrl);
      const testUrl = `${homeserverUrl}/_matrix/client/versions`;
      const testResponse = await fetch(testUrl);
      if (!testResponse.ok) {
        throw new Error(`服务器连接失败: ${testResponse.status}`);
      }
      console.log('Connection test successful');

      // 调用登录
      console.log('Calling electronAPI.login...');
      const result = await window.electronAPI.login(homeserverUrl, username, password);
      console.log('Login result:', result);

      if (result && result.userId) {
        console.log('Login successful! User ID:', result.userId);

        if (rememberMe) {
          await window.electronAPI.saveCredentials(homeserverUrl, result.userId, result.accessToken);
        }

        console.log('Connecting to Matrix...');
        await window.electronAPI.connect();

        onAuthenticated();
        return true;
      } else {
        const errorMsg = result?.error || '登录失败';
        console.error('Login failed:', errorMsg);
        setError(errorMsg);
        return false;
      }
    } catch (err: any) {
      console.error('Login exception:', err);
      setError(err.message || '登录失败');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (username: string, password: string, homeserverUrl: string, token?: string, email?: string): Promise<boolean> => {
    console.log('=== Register Started ===');
    console.log('Username:', username);
    console.log('Homeserver:', homeserverUrl);

    setError(null);
    setIsLoading(true);

    try {
      if (!window.electronAPI) {
        throw new Error('Electron API 不可用');
      }

      // 调用注册
      console.log('Calling electronAPI.register...');
      const result = await window.electronAPI.register(homeserverUrl, username, password, token);
      console.log('Register result:', result);

      if (result && result.userId) {
        console.log('Registration successful!');

        // 自动登录
        const loginResult = await window.electronAPI.login(homeserverUrl, username, password);
        if (loginResult && loginResult.userId) {
          await window.electronAPI.saveCredentials(homeserverUrl, loginResult.userId, loginResult.accessToken);
          await window.electronAPI.connect();
          onAuthenticated();
          return true;
        } else {
          setError('注册成功但自动登录失败，请手动登录');
          setView('login');
          return false;
        }
      } else {
        setError(result?.error || '注册失败，请检查令牌是否正确');
        return false;
      }
    } catch (err: any) {
      console.error('Register exception:', err);
      setError(err.message || '注册失败');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const switchToLogin = () => {
    setView('login');
    setError(null);
  };

  const switchToRegister = () => {
    setView('register');
    setError(null);
  };

  return (
    <div className="auth-screen">
      <div className="auth-background">
        <div className="gradient-bg" />
      </div>

      <div className="auth-content">
        {view === 'login' ? (
          <LoginDialog onLogin={handleLogin} onSwitchToRegister={switchToRegister} error={error} isLoading={isLoading} />
        ) : (
          <RegisterDialog onRegister={handleRegister} onSwitchToLogin={switchToLogin} error={error} isLoading={isLoading} />
        )}
      </div>

      <div className="auth-footer">
        <p>✨ SmartClaw v2.0 Standalone</p>
        <p className="hint">本地 Matrix 服务器桌面客户端</p>
      </div>
    </div>
  );
};

export default AuthScreen;
