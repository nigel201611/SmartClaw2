// src/renderer/components/chat/ConfirmDialog.tsx
import React from 'react';
import { Modal, Button, Space } from 'antd';
import { ExclamationCircleOutlined, LogoutOutlined } from '@ant-design/icons';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
  confirmVariant?: 'danger' | 'primary';
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmText = '确定',
  cancelText = '取消',
  onConfirm,
  onCancel,
  isLoading = false,
  confirmVariant = 'danger',
}) => {
  return (
    <Modal
      title={
        <Space>
          <ExclamationCircleOutlined style={{ color: confirmVariant === 'danger' ? '#ff4d4f' : '#1890ff' }} />
          <span>{title}</span>
        </Space>
      }
      open={isOpen}
      onCancel={onCancel}
      footer={[
        <Button key="cancel" onClick={onCancel} disabled={isLoading}>
          {cancelText}
        </Button>,
        <Button key="confirm" type="primary" danger={confirmVariant === 'danger'} onClick={onConfirm} loading={isLoading} icon={confirmVariant === 'danger' ? <LogoutOutlined /> : undefined}>
          {confirmText}
        </Button>,
      ]}
      centered
    >
      <p>{message}</p>
    </Modal>
  );
};
