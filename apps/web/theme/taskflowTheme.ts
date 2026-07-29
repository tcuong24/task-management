import type { ThemeConfig } from 'antd';

export const taskflowTheme: ThemeConfig = {
  token: {
    colorPrimary: '#2563eb',
    colorPrimaryHover: '#1d4ed8',
    colorPrimaryActive: '#1e40af',
    colorInfo: '#2563eb',
    colorWarning: '#b45309',
    colorError: '#dc2626',
    colorTextBase: '#1f2937',
    colorTextSecondary: '#6b7280',
    colorBorder: '#e5e7eb',
    colorBorderSecondary: '#f3f4f6',
    colorBgLayout: '#f9fafb',
    colorBgContainer: '#ffffff',
    borderRadius: 12,
    borderRadiusLG: 16,
    controlHeight: 40,
    controlHeightLG: 44,
    fontFamily:
      "var(--font-inter), 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    motionDurationFast: '0.15s',
    motionDurationMid: '0.2s',
    motionDurationSlow: '0.3s',
  },
  components: {
    Button: {
      controlHeightLG: 44,
      fontWeight: 600,
      primaryShadow: '0 4px 6px -1px rgb(37 99 235 / 0.2)',
    },
    Card: {
      colorBgContainer: '#ffffff',
      boxShadow:
        '0 4px 6px -1px rgb(0 0 0 / 0.08), 0 2px 4px -2px rgb(0 0 0 / 0.08)',
    },
    Checkbox: {
      colorPrimary: '#2563eb',
      colorPrimaryHover: '#1d4ed8',
    },
    Input: {
      colorBgContainer: '#ffffff',
      colorBorder: '#e5e7eb',
      colorTextPlaceholder: '#9ca3af',
      controlHeightLG: 44,
      activeBorderColor: '#3b82f6',
      hoverBorderColor: '#9ca3af',
    },
    Modal: {
      borderRadiusLG: 16,
    },
    Table: {
      headerBg: '#f9fafb',
      headerColor: '#6b7280',
      borderColor: '#f3f4f6',
      rowHoverBg: '#f3f4f6',
    },
    Tag: {
      borderRadiusSM: 6,
    },
  },
};
