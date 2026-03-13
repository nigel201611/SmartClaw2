/**
 * SmartClaw Electron Main Process Entry Point
 * 
 * 应用主入口，集成 Docker 启动流程
 */

import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import { getAppStartupManager, AppStartupManager, StartupState } from './app-startup';
import { registerDockerIPCHandlers, cleanupDockerIPC } from './docker-ipc';

// 禁用 GPU 加速（可选，节省资源）
app.disableHardwareAcceleration();

// 应用启动管理器
let startupManager: AppStartupManager;

// 主窗口引用
let mainWindow: BrowserWindow | null = null;

/**
 * 应用启动主流程
 */
async function onAppReady() {
  console.log('SmartClaw starting...');
  
  // 获取启动管理器
  startupManager = getAppStartupManager();
  
  // 执行启动流程
  const result = await startupManager.onAppReady();
  
  if (result.success) {
    console.log('SmartClaw started successfully');
    mainWindow = startupManager.getMainWindow();
    
    // 注册 IPC 处理器
    if (mainWindow) {
      registerDockerIPCHandlers(mainWindow);
    }
  } else {
    console.error('SmartClaw startup failed:', result.error);
    // 应用可能已退出或显示错误对话框
  }
}

/**
 * 创建主窗口（备用，如果 app-startup 中未创建）
 */
function createMainWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: 'SmartClaw',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // 加载应用
  if (process.env.NODE_ENV === 'development') {
    win.loadURL('http://localhost:3000');
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  win.on('closed', () => {
    mainWindow = null;
  });

  return win;
}

// ========== Electron 生命周期事件 ==========

// macOS: 所有窗口关闭时
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// macOS: 点击 Dock 图标
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createMainWindow();
  }
});

// 应用准备就绪
app.whenReady().then(async () => {
  try {
    await onAppReady();
  } catch (error: any) {
    console.error('Fatal startup error:', error);
    
    // 显示致命错误对话框
    const { dialog } = require('electron');
    await dialog.showErrorBox(
      'SmartClaw 启动失败',
      `发生致命错误：${error.message}\n\n应用将退出。`
    );
    
    app.quit();
  }
});

// 应用即将退出
app.on('will-quit', async (event) => {
  event.preventDefault();
  
  console.log('SmartClaw shutting down...');
  
  // 清理 IPC 处理器
  cleanupDockerIPC();
  
  // 停止容器（如果配置为退出时停止）
  try {
    await startupManager?.onAppClosing();
  } catch (error) {
    console.error('Error during shutdown:', error);
  }
  
  // 延迟退出，确保清理完成
  setTimeout(() => {
    app.exit(0);
  }, 500);
});

// 子进程意外退出
app.on('child-process-gone', (details) => {
  console.warn('Child process gone:', details);
});

// 渲染进程崩溃
app.on('render-process-gone', (event, webContents, details) => {
  console.error('Render process gone:', details);
  
  if (mainWindow) {
    dialog.showMessageBox(mainWindow, {
      type: 'error',
      title: '渲染进程崩溃',
      message: '应用界面发生错误',
      detail: details.reason,
      buttons: ['重新加载', '退出应用']
    }).then((result) => {
      if (result.response === 0) {
        mainWindow?.reload();
      } else {
        app.quit();
      }
    });
  }
});

// ========== 全局 IPC 处理器 ==========

// 获取应用状态
ipcMain.handle('app:get-status', () => {
  return {
    state: startupManager?.getCurrentState() || 'unknown',
    version: app.getVersion(),
    platform: process.platform
  };
});

// 重启应用
ipcMain.handle('app:restart', () => {
  app.relaunch();
  app.exit(0);
});

// 退出应用
ipcMain.handle('app:quit', () => {
  app.quit();
});

// ========== 错误处理 ==========

process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  
  dialog.showErrorBox(
    '未处理的异常',
    `发生错误：${error.message}\n\n应用可能不稳定。`
  );
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled rejection at:', promise, 'reason:', reason);
});

// ========== 开发模式热重载 ==========

if (process.env.NODE_ENV === 'development') {
  // 动态加载 React DevTools
  app.whenReady().then(() => {
    import('electron-devtools-installer').then(({ default: installExtension, REACT_DEVELOPER_TOOLS }) => {
      installExtension(REACT_DEVELOPER_TOOLS)
        .then((name) => console.log(`Added Extension: ${name}`))
        .catch((err) => console.log('An error occurred: ', err));
    }).catch(() => {
      // 忽略安装错误
    });
  });
}

console.log('SmartClaw main process initialized');
