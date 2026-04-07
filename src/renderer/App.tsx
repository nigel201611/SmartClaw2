import React, { useState, useEffect } from 'react';
import { AuthScreen } from './components/auth/AuthScreen';
import { ChatWindow } from './components/chat/ChatWindow';
import './styles/index.css';

interface AppState {
  dockerReady: boolean;
}

export function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const handleAuthSuccess = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
  };

  useEffect(() => {
    window.electronAPI?.onAuthStatus?.((authenticated: boolean) => {
      setIsAuthenticated(authenticated);
    });
  }, []);

  if (!isAuthenticated) {
    return <AuthScreen onAuthenticated={handleAuthSuccess} />;
  }

  return <ChatWindow onLogout={handleLogout} />;
}

export default App;
