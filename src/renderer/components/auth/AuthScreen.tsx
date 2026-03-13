/**
 * SmartClaw Auth Screen Component
 * 
 * 认证界面包装器
 */

import React, { useState, useEffect } from 'react';
import { useMatrix } from '../../hooks/useMatrix';
import { LoginDialog } from './LoginDialog';
import { RegisterDialog } from './RegisterDialog';

interface AuthScreenProps {
  onAuthenticated: () => void;
}

/**
 * 认证类型
 */
type AuthView = 'login' | 'register';

/**
 * 认证包装组件
 */
export const AuthScreen: React.FC<AuthScreenProps> = ({ onAuthenticated }) => {
  const [view, setView] = useState<AuthView>('login');
  
  const {
    connect,
    login,
    isLoading,
    error
  } = useMatrix({
    autoConnect: false
  });

  // 处理登录
  const handleLogin = async (
    username: string,
    password: string,
    homeserverUrl: string,
    rememberMe: boolean
  ): Promise<boolean> => {
    try {
      // 连接服务器
      await connect(homeserverUrl);
      
      // 执行登录
      const success = await login(username, password);
      
      if (success) {
        // 登录成功，通知父组件
        onAuthenticated();
      }
      
      return success;
    } catch (err: any) {
      console.error('Login failed:', err);
      return false;
    }
  };

  // 处理注册
  const handleRegister = async (
    username: string,
    password: string,
    homeserverUrl: string
  ): Promise<boolean> => {
    try {
      // 连接服务器
      await connect(homeserverUrl);
      
      // 执行注册（如果服务器支持）
      // 注意：Conduit 默认不支持在线注册
      throw new Error('当前服务器不支持在线注册');
    } catch (err: any) {
      console.error('Registration failed:', err);
      return false;
    }
  };

  // 切换到登录视图
  const switchToLogin = () => {
    setView('login');
  };

  // 切换到注册视图
  const switchToRegister = () => {
    setView('register');
  };

  return (
    <div className="auth-screen">
      <div className="auth-background">
        <div className="gradient-bg"></div>
      </div>

      <div className="auth-content">
        {view === 'login' ? (
          <LoginDialog
            onLogin={handleLogin}
            onSwitchToRegister={switchToRegister}
          />
        ) : (
          <RegisterDialog
            onRegister={handleRegister}
            onSwitchToLogin={switchToLogin}
          />
        )}
      </div>

      <div className="auth-footer">
        <p>SmartClaw v2.0 Standalone</p>
        <p className="hint">本地 Matrix 服务器桌面客户端</p>
      </div>
    </div>
  );
};

export default AuthScreen;
