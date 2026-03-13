const { app, BrowserWindow, Tray, Menu, ipcMain, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow = null;
let tray = null;

// Create main window
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: 'SmartClaw',
    icon: path.join(__dirname, 'tray/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: true,
      contextIsolation: false,
      sandbox: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));

  // Open DevTools in development
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Create system tray
function createTray() {
  const iconPath = path.join(__dirname, 'tray', 'icon.png');
  
  // Check if icon exists, if not use default
  let icon;
  if (fs.existsSync(iconPath)) {
    icon = nativeImage.createFromPath(iconPath);
  } else {
    icon = nativeImage.createEmpty();
  }
  
  icon = icon.resize({ width: 16, height: 16 });
  
  tray = new Tray(icon);
  
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open SmartClaw',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        } else {
          createWindow();
        }
      },
    },
    {
      label: 'Hide to Tray',
      click: () => {
        if (mainWindow) {
          mainWindow.hide();
        }
      },
    },
    { type: 'separator' },
    {
      label: 'Quit SmartClaw',
      click: () => {
        app.isQuiting = true;
        app.quit();
      },
    },
  ]);
  
  tray.setToolTip('SmartClaw - AI Desktop Chatbot');
  tray.setContextMenu(contextMenu);
  
  tray.on('click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.focus();
      } else {
        mainWindow.show();
      }
    } else {
      createWindow();
    }
  });
}

// Handle app ready
app.whenReady().then(() => {
  createWindow();
  createTray();
  
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Handle window close - hide to tray instead of quit
app.on('window-all-closed', (e) => {
  e.preventDefault();
  if (mainWindow) {
    mainWindow.hide();
  }
});

// Quit when explicitly requested
app.on('before-quit', () => {
  app.isQuiting = true;
});

// IPC handlers
ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

ipcMain.handle('get-platform', () => {
  return process.platform;
});

ipcMain.handle('minimize-window', () => {
  if (mainWindow) {
    mainWindow.minimize();
  }
});

ipcMain.handle('maximize-window', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.handle('close-window', () => {
  if (mainWindow) {
    mainWindow.hide();
  }
});

// Export for testing
module.exports = { createWindow, createTray };
