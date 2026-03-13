/**
 * SmartClaw System Tray
 * 
 * 系统托盘菜单：容器控制、状态显示、快速操作
 */

import { Tray, Menu, app, dialog, shell } from 'electron';
import * as path from 'path';
import { DockerManager } from './docker-manager';
import { getContainerSettingsManager } from './container-settings';

/**
 * 系统托盘管理器
 */
export class TrayManager {
  private tray: Tray | null = null;
  private dockerManager: DockerManager;
  private settingsManager = getContainerSettingsManager();
  private containerRunning: boolean = false;
  private onQuitCallback?: () => void;

  constructor() {
    this.dockerManager = new DockerManager({
      containerName: 'smartclaw-matrix',
      composeFilePath: path.join(__dirname, '../../docker-compose.yml')
    });
  }

  /**
   * 创建托盘
   */
  async createTray(onQuit: () => void): Promise<void> {
    this.onQuitCallback = onQuit;

    // 创建托盘图标（需要根据平台准备不同的图标）
    const iconPath = this.getTrayIconPath();
    this.tray = new Tray(iconPath);

    this.tray.setToolTip('SmartClaw - Matrix 本地服务器');

    // 双击托盘图标打开主窗口
    this.tray.on('double-click', () => {
      this.showMainWindow();
    });

    // 更新托盘菜单
    await this.updateTrayMenu();

    // 定期更新状态（每 5 秒）
    setInterval(() => this.updateTrayMenu(), 5000);
  }

  /**
   * 获取托盘图标路径
   */
  private getTrayIconPath(): string {
    const platform = process.platform;
    
    // 根据平台选择图标
    if (platform === 'darwin') {
      return path.join(__dirname, '../../public/icons/trayTemplate.png');
    } else if (platform === 'win32') {
      return path.join(__dirname, '../../public/icons/tray.ico');
    } else {
      return path.join(__dirname, '../../public/icons/tray.png');
    }
  }

  /**
   * 更新托盘菜单
   */
  private async updateTrayMenu(): Promise<void> {
    if (!this.tray) return;

    // 获取容器状态
    const containerInfo = await this.dockerManager.getContainerInfo();
    this.containerRunning = containerInfo?.running ?? false;

    // 获取设置
    const settings = this.settingsManager.getSettings();

    // 构建菜单
    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'SmartClaw v2.0',
        enabled: false
      },
      {
        type: 'separator'
      },
      {
        label: this.containerRunning ? '● 运行中' : '○ 已停止',
        enabled: false,
        icon: this.containerRunning ? '🟢' : '🔴'
      },
      {
        type: 'separator'
      },
      {
        label: this.containerRunning ? '停止容器' : '启动容器',
        click: async () => {
          await this.toggleContainer();
        }
      },
      {
        label: '重启容器',
        click: async () => {
          await this.restartContainer();
        },
        enabled: this.containerRunning
      },
      {
        type: 'separator'
      },
      {
        label: '查看日志',
        click: async () => {
          await this.showLogs();
        }
      },
      {
        label: '设置...',
        click: () => {
          this.showSettings();
        }
      },
      {
        type: 'separator'
      },
      {
        label: '开机自启',
        type: 'checkbox',
        checked: settings.autoStartOnLaunch,
        click: async (menuItem) => {
          await this.settingsManager.saveSettings({
            autoStartOnLaunch: menuItem.checked
          });
        }
      },
      {
        label: '退出时停止容器',
        type: 'checkbox',
        checked: settings.autoStopOnQuit,
        click: async (menuItem) => {
          await this.settingsManager.saveSettings({
            autoStopOnQuit: menuItem.checked
          });
        }
      },
      {
        type: 'separator'
      },
      {
        label: '打开主窗口',
        click: () => {
          this.showMainWindow();
        }
      },
      {
        type: 'separator'
      },
      {
        label: '退出 SmartClaw',
        click: () => {
          this.quit();
        }
      }
    ]);

    this.tray.setContextMenu(contextMenu);
  }

  /**
   * 切换容器状态
   */
  private async toggleContainer(): Promise<void> {
    try {
      if (this.containerRunning) {
        const result = await this.dockerManager.stopContainer();
        if (!result.success) {
          this.showError('停止失败', result.error || '未知错误');
        }
      } else {
        const result = await this.dockerManager.startContainer();
        if (!result.success) {
          this.showError('启动失败', result.error || '未知错误');
        }
      }
      await this.updateTrayMenu();
    } catch (error: any) {
      this.showError('操作失败', error.message);
    }
  }

  /**
   * 重启容器
   */
  private async restartContainer(): Promise<void> {
    try {
      const result = await this.dockerManager.restartContainer();
      if (!result.success) {
        this.showError('重启失败', result.error || '未知错误');
      }
      await this.updateTrayMenu();
    } catch (error: any) {
      this.showError('重启失败', error.message);
    }
  }

  /**
   * 显示日志
   */
  private async showLogs(): Promise<void> {
    try {
      const logs = await this.dockerManager.getLogs({ tail: 200 });
      
      // 显示日志对话框
      await dialog.showMessageBox({
        type: 'info',
        title: '容器日志',
        message: '最近 200 行日志',
        detail: logs || '暂无日志',
        buttons: ['复制日志', '导出文件', '关闭'],
        defaultId: 2
      }).then(async (result) => {
        if (result.response === 0) {
          // 复制到剪贴板
          const { clipboard } = require('electron');
          clipboard.writeText(logs || '');
        } else if (result.response === 1) {
          // 导出文件
          const { dialog } = require('electron');
          const filePath = await dialog.showSaveDialog({
            defaultPath: 'smartclaw-matrix.log',
            filters: [{ name: 'Log Files', extensions: ['log'] }]
          });
          
          if (!filePath.canceled && filePath.filePath) {
            const fs = require('fs');
            fs.writeFileSync(filePath.filePath, logs || '');
          }
        }
      });
    } catch (error: any) {
      this.showError('无法获取日志', error.message);
    }
  }

  /**
   * 显示设置窗口
   */
  private showSettings(): void {
    // TODO: 打开设置窗口
    dialog.showMessageBox({
      type: 'info',
      title: '设置',
      message: '设置功能开发中',
      detail: '容器设置功能将在后续版本中提供。',
      buttons: ['确定']
    });
  }

  /**
   * 显示主窗口
   */
  private showMainWindow(): void {
    // TODO: 实现主窗口显示逻辑
    console.log('Show main window');
  }

  /**
   * 退出应用
   */
  private quit(): void {
    if (this.onQuitCallback) {
      this.onQuitCallback();
    } else {
      app.quit();
    }
  }

  /**
   * 显示错误对话框
   */
  private async showError(title: string, message: string): Promise<void> {
    await dialog.showMessageBox({
      type: 'error',
      title,
      message,
      buttons: ['确定']
    });
  }

  /**
   * 销毁托盘
   */
  destroy(): void {
    if (this.tray) {
      this.tray.destroy();
      this.tray = null;
    }
  }
}

export default TrayManager;
