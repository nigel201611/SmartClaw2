// src/renderer/theme/antd-theme.ts
import type { ThemeConfig } from 'antd';

export const antdTheme: ThemeConfig = {
  token: {
    colorPrimary: '#6366f1',
    colorSuccess: '#10b981',
    colorError: '#ef4444',
    colorWarning: '#f59e0b',
    colorBgBase: '#0f172a',
    colorBgContainer: '#1e293b',
    colorBgElevated: '#1e293b',
    colorTextBase: '#f1f5f9',
    colorTextSecondary: '#94a3b8',
    colorBorder: 'rgba(71, 85, 105, 0.3)',
    borderRadius: 8,
    fontSize: 14,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Inter", "Roboto", sans-serif',
  },
  components: {
    Button: {
      colorPrimary: '#6366f1',
      colorPrimaryHover: '#818cf8',
      colorPrimaryActive: '#4f46e5',
      borderRadius: 8,
      boxShadow: 'none',
      boxShadowSecondary: 'none',
    },
    Input: {
      colorBgContainer: 'rgba(15, 23, 42, 0.6)',
      colorBorder: 'rgba(71, 85, 105, 0.2)',
      colorText: '#f1f5f9',
      //   colorPlaceholderText: '#64748b',
      borderRadius: 8,
    },
    Modal: {
      colorBgElevated: '#1e293b',
      colorBgMask: 'rgba(0, 0, 0, 0.7)',
    },
    Card: {
      colorBgContainer: 'rgba(30, 41, 59, 0.8)',
      borderRadius: 12,
    },
    Select: {
      colorBgContainer: 'rgba(15, 23, 42, 0.6)',
      colorBorder: 'rgba(71, 85, 105, 0.2)',
    },
  },
};
