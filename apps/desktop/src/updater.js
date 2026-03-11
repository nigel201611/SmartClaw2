/**
 * SmartClaw Auto-Updater
 * 
 * Handles automatic updates using electron-updater
 */

const { app, dialog } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');

class AppUpdater {
  constructor(mainWindow) {
    this.mainWindow = mainWindow;
    this.autoCheckForUpdates = true;
    this.autoDownload = true;
    
    this.init();
  }

  init() {
    // Configure auto-updater
    autoUpdater.autoDownload = this.autoDownload;
    autoUpdater.autoInstallOnAppQuit = true;
    autoUpdater.allowDowngrade = false;
    autoUpdater.allowPrerelease = false;

    // Set up event listeners
    autoUpdater.on('checking-for-update', () => {
      console.log('Checking for updates...');
      this.sendStatus('Checking for updates...');
    });

    autoUpdater.on('update-available', (info) => {
      console.log('Update available:', info.version);
      this.sendStatus(`Update available: v${info.version}`);
      
      if (this.autoDownload) {
        this.notifyUser('Update Available', `Version ${info.version} is available. Downloading...`);
      } else {
        this.askUserToUpdate(info);
      }
    });

    autoUpdater.on('update-not-available', (info) => {
      console.log('Update not available');
      this.sendStatus('You have the latest version.');
    });

    autoUpdater.on('download-progress', (progressObj) => {
      const percent = Math.round(progressObj.percent);
      const speed = (progressObj.bytesPerSecond / 1024 / 1024).toFixed(2);
      console.log(`Download progress: ${percent}% (${speed} MB/s)`);
      this.sendStatus(`Downloading: ${percent}% (${speed} MB/s)`);
      
      if (this.mainWindow) {
        this.mainWindow.setProgressBar(percent / 100);
      }
    });

    autoUpdater.on('update-downloaded', (info) => {
      console.log('Update downloaded:', info.version);
      this.sendStatus('Update downloaded. Restart to apply.');
      this.notifyUser(
        'Update Ready',
        `Version ${info.version} has been downloaded. Restart the application to apply the update.`,
        [
          { text: 'Restart Now', action: () => this.quitAndInstall() },
          { text: 'Later', action: () => {} }
        ]
      );
      
      if (this.mainWindow) {
        this.mainWindow.setProgressBar(0);
      }
    });

    autoUpdater.on('error', (err) => {
      console.error('Update error:', err);
      this.sendStatus(`Update error: ${err.message}`);
    });

    // Start checking for updates after app is ready
    if (this.autoCheckForUpdates) {
      app.whenReady().then(() => {
        // Delay initial check
        setTimeout(() => {
          this.checkForUpdates();
        }, 5000);
      });
    }
  }

  /**
   * Check for updates manually
   */
  async checkForUpdates() {
    try {
      await autoUpdater.checkForUpdates();
    } catch (error) {
      console.error('Failed to check for updates:', error);
    }
  }

  /**
   * Download update manually
   */
  async downloadUpdate() {
    try {
      await autoUpdater.downloadUpdate();
    } catch (error) {
      console.error('Failed to download update:', error);
    }
  }

  /**
   * Quit and install update
   */
  quitAndInstall() {
    autoUpdater.quitAndInstall();
  }

  /**
   * Send status to renderer process
   */
  sendStatus(message) {
    if (this.mainWindow) {
      this.mainWindow.webContents.send('update-status', { message });
    }
  }

  /**
   * Show notification to user
   */
  notifyUser(title, message, actions = []) {
    if (this.mainWindow) {
      this.mainWindow.webContents.send('update-notification', {
        title,
        message,
        actions
      });
    }
  }

  /**
   * Ask user if they want to update
   */
  askUserToUpdate(info) {
    if (this.mainWindow) {
      dialog.showMessageBox(this.mainWindow, {
        type: 'info',
        title: 'Update Available',
        message: `A new version of SmartClaw is available!`,
        detail: `Current version will be upgraded to v${info.version}.\n\nWould you like to download and install it now?`,
        buttons: ['Download', 'Later'],
        defaultId: 0,
        cancelId: 1
      }).then(({ response }) => {
        if (response === 0) {
          this.downloadUpdate();
        }
      });
    }
  }

  /**
   * Enable/disable auto check for updates
   */
  setAutoCheck(enabled) {
    this.autoCheckForUpdates = enabled;
  }

  /**
   * Enable/disable auto download
   */
  setAutoDownload(enabled) {
    this.autoDownload = enabled;
    autoUpdater.autoDownload = enabled;
  }
}

module.exports = AppUpdater;
