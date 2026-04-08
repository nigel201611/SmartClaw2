// src/renderer/App.tsx
import React, { useEffect } from 'react';
import { ConfigProvider } from 'antd';
import { AuthScreen } from './components/auth/AuthScreen';
import { ChatWindow } from './components/chat/ChatWindow';
import { useMatrixStore } from './stores/matrixStore';
import { antdTheme } from './theme/antd-theme';
import './styles/index.css';

export function App() {
  const isLoggedIn = useMatrixStore((state) => state.isLoggedIn);
  const reset = useMatrixStore((state) => state.reset);

  useEffect(() => {
    const unsubscribe = window.electronAPI?.onAuthStatus?.((authenticated: boolean) => {
      if (!authenticated) {
        reset();
      }
    });

    return () => {
      unsubscribe?.();
    };
  }, [reset]);

  return <ConfigProvider theme={antdTheme}>{!isLoggedIn ? <AuthScreen /> : <ChatWindow />}</ConfigProvider>;
}

export default App;
