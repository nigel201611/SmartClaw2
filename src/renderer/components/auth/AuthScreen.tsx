// src/renderer/components/auth/AuthScreen.tsx
import React, { useState, useEffect } from 'react';
import { LoginDialog } from './LoginDialog';
import { RegisterDialog } from './RegisterDialog';
import { useMatrix } from '../../hooks/useMatrix';

interface AuthScreenProps {
  onAuthenticated: () => void;
}

type AuthView = 'login' | 'register';

export const AuthScreen: React.FC<AuthScreenProps> = ({ onAuthenticated }) => {
  const [view, setView] = useState<AuthView>('login');
  const [error, setError] = useState<string | null>(null);

  // 使用 useMatrix Hook
  const {
    login,
    isLoggedIn,
    isLoading,
    error: matrixError,
    rooms, // 添加 rooms 用于调试
  } = useMatrix({
    autoConnect: false,
    onSyncStateChange: (state) => {
      console.log('Sync state:', state);
    },
    onRoomUpdate: (rooms) => {
      console.log('Rooms updated in AuthScreen:', rooms);
    },
  });

  useEffect(() => {
    if (!window.electronAPI) {
      setError('Electron API 不可用，请重启应用');
    }
  }, []);

  // 监听登录状态变化
  useEffect(() => {
    if (isLoggedIn) {
      console.log('Login successful, triggering onAuthenticated');
      onAuthenticated();
    }
  }, [isLoggedIn, onAuthenticated]);

  // 调试：监听 rooms 变化
  useEffect(() => {
    if (rooms.length > 0) {
      console.log('Rooms available in AuthScreen:', rooms);
    }
  }, [rooms]);

  const handleLogin = async (username: string, password: string, homeserverUrl: string, rememberMe: boolean): Promise<boolean> => {
    setError(null);

    try {
      console.log('Testing server connection:', homeserverUrl);
      const testUrl = `${homeserverUrl}/_matrix/client/versions`;
      const testResponse = await fetch(testUrl);
      if (!testResponse.ok) {
        throw new Error(`服务器连接失败: ${testResponse.status}`);
      }
      // 使用 useMatrix 的 login 方法
      const success = await login(username, password, homeserverUrl);
      console.log('Login result:', success);

      // 如果需要记住密码，保存用户名和服务器地址
      if (success && rememberMe) {
        localStorage.setItem('lastHomeserver', homeserverUrl);
        localStorage.setItem('lastUsername', username);
      }

      return success;
    } catch (err: any) {
      console.error('Login exception:', err);
      setError(err.message || '登录失败');
      return false;
    }
  };

  const handleRegister = async (username: string, password: string, homeserverUrl: string, token?: string): Promise<boolean> => {
    setError(null);

    try {
      if (!window.electronAPI) {
        throw new Error('Electron API 不可用');
      }

      console.log('Registering user:', username);
      const result = await window.electronAPI.register(homeserverUrl, username, password, token);

      console.log('Register result:', result);

      if (result && result.userId) {
        console.log('Registration successful, auto-logging in...');

        // 注册成功后自动登录
        const loginSuccess = await login(username, password, homeserverUrl);

        if (loginSuccess) {
          return true;
        } else {
          setError('注册成功但自动登录失败，请手动登录');
          setView('login');
          return false;
        }
      } else {
        setError(result?.error || '注册失败');
        return false;
      }
    } catch (err: any) {
      console.error('Register exception:', err);
      setError(err.message || '注册失败');
      return false;
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

  const displayError = error || matrixError;

  return (
    <div className="auth-screen">
      <div className="auth-content">
        {view === 'login' ? (
          <LoginDialog onLogin={handleLogin} onSwitchToRegister={switchToRegister} error={displayError} isLoading={isLoading} />
        ) : (
          <RegisterDialog onRegister={handleRegister} onSwitchToLogin={switchToLogin} error={displayError} isLoading={isLoading} />
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
