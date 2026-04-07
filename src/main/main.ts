/**
 * SmartClaw Electron Main Process Entry Point
 *
 * 应用主入口，集成 Docker 启动流程
 */

import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import { getAppStartupManager, AppStartupManager } from './app-startup';
import { registerDockerIPCHandlers, cleanupDockerIPC } from './docker-ipc';
import { registerAuthIPCHandlers, cleanupAuthIPC } from './auth-ipc';
import { registerMatrixIPCHandlers, cleanupMatrixIPC } from './matrix-ipc';
import { registerSettingsIPCHandlers } from './settings-ipc';
import { registerMessageIPCHandlers, cleanupMessageIPC } from './message-ipc';

// 禁用 GPU 加速（可选，节省资源）
app.disableHardwareAcceleration();
// 应用启动管理器
let startupManager: AppStartupManager;
// 主窗口引用
let mainWindow: BrowserWindow | null = null;
// 标记是否正在关闭
let isQuitting = false;

/**
 * 应用启动主流程
 */
async function onAppReady() {
  startupManager = getAppStartupManager();
  const result = await startupManager.onAppReady();
  if (result.success) {
    mainWindow = startupManager.getMainWindow();
    // 注册 IPC 处理器
    if (mainWindow) {
      registerAuthIPCHandlers(mainWindow);
      registerDockerIPCHandlers(mainWindow);
      registerMatrixIPCHandlers(mainWindow);
      registerSettingsIPCHandlers(mainWindow);
      registerMessageIPCHandlers(mainWindow);
      mainWindow.on('close', async (event) => {
        if (isQuitting) {
          return;
        }
        event.preventDefault();
        await handleAppClose();
      });
    }
  } else {
    console.error('SmartClaw startup failed:', result.error);
    // 应用可能已退出或显示错误对话框
  }
}

async function handleAppClose(): Promise<void> {
  if (isQuitting) return;
  isQuitting = true;
  const forceExitTimeout = setTimeout(() => {
    console.warn('Force quitting after timeout');
    app.exit(0);
  }, 3000);

  try {
    // 显示关闭提示（可选）
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('app:closing');
    }
    await performCleanup();
    console.log('Cleanup completed, exiting...');
    clearTimeout(forceExitTimeout);
    app.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    clearTimeout(forceExitTimeout);
    app.exit(1);
  }
}

async function performCleanup(): Promise<void> {
  cleanupDockerIPC();
  cleanupAuthIPC();
  cleanupMatrixIPC();
  cleanupMessageIPC();
  if (startupManager) {
    await startupManager.onAppClosing();
  }
}
// macOS: 所有窗口关闭时
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin' && !isQuitting) {
    handleAppClose();
  }
});

// 应用准备就绪
app.whenReady().then(async () => {
  try {
    await onAppReady();
  } catch (error: any) {
    await dialog.showErrorBox('SmartClaw 启动失败', `发生致命错误：${error.message}\n\n应用将退出。`);
    app.quit();
  }
});

// 应用即将退出 - 修复版
app.on('will-quit', async (event) => {
  if (!isQuitting) {
    event.preventDefault();
    await handleAppClose();
  }
});

// 子进程意外退出
app.on('child-process-gone', (details) => {
  console.warn('Child process gone:', details);
});

// 渲染进程崩溃
app.on('render-process-gone', (event, webContents, details) => {
  console.error('Render process gone:', details);

  if (mainWindow) {
    dialog
      .showMessageBox({
        type: 'error',
        title: '渲染进程崩溃',
        message: '应用界面发生错误',
        detail: details.reason,
        buttons: ['重新加载', '退出应用'],
      })
      .then((result: { response: number }) => {
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
    platform: process.platform,
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

process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);

  // 避免在退出过程中显示错误框
  if (!isQuitting) {
    dialog.showErrorBox('未处理的异常', `发生错误：${error.message}\n\n应用可能不稳定。`);
  }
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled rejection at:', promise, 'reason:', reason);
});

// 处理 SIGINT (Ctrl+C) 和 SIGTERM 信号
process.on('SIGINT', () => {
  console.log('Received SIGINT (Ctrl+C), quitting application...');
  handleAppClose();
});

process.on('SIGTERM', () => {
  console.log('Received SIGTERM, quitting application...');
  handleAppClose();
});

// if (process.env.NODE_ENV === 'development') {
//   // 动态加载 React DevTools
//   app.whenReady().then(() => {
//     import('electron-devtools-installer')
//       .then(({ default: installExtension, REACT_DEVELOPER_TOOLS }) => {
//         installExtension(REACT_DEVELOPER_TOOLS)
//           .then((ext: any) => console.log(`Added Extension: ${ext.name || ext}`))
//           .catch((err: Error) => console.log('An error occurred: ', err));
//       })
//       .catch(() => {
//         // 忽略安装错误
//       });
//   });
// }
