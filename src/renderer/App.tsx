import React, { useState, useEffect } from 'react';
import { AuthScreen } from './components/auth/AuthScreen';
import { ChatWindow } from './components/chat/ChatWindow';
import { DockerDetection } from './components/DockerDetection';

interface AppState {
  authenticated: boolean;
  dockerReady: boolean;
}

export function App() {
  const [state, setState] = useState<AppState>({
    authenticated: false,
    dockerReady: false,
  });

  useEffect(() => {
    window.electronAPI?.onDockerStatus?.((status: any) => {
      setState((prev) => ({ ...prev, dockerReady: status.available }));
    });
    window.electronAPI?.onAuthStatus?.((authenticated: boolean) => {
      setState((prev) => ({ ...prev, authenticated }));
    });
  }, []);

  if (!state.dockerReady) {
    return <DockerDetection />;
  }
  if (!state.authenticated) {
    return <AuthScreen onAuthenticated={() => setState((prev) => ({ ...prev, authenticated: true }))} />;
  }
  return <ChatWindow />;
}

export default App;
