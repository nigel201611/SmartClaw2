// src/renderer/components/chat/CreateRoomDialog.tsx
import React, { useState } from 'react';
import { Modal, Input, Form, message } from 'antd';

interface CreateRoomDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateRoom: (options: { name: string; topic?: string }) => Promise<void>;
  isLoading: boolean;
  checkRoomNameExists?: (name: string) => Promise<boolean>;
}

export const CreateRoomDialog: React.FC<CreateRoomDialogProps> = ({ isOpen, onClose, onCreateRoom, isLoading, checkRoomNameExists }) => {
  const [form] = Form.useForm();
  const [checking, setChecking] = useState(false);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      // 检查房间名称是否已存在
      if (checkRoomNameExists) {
        setChecking(true);
        const exists = await checkRoomNameExists(values.name);
        setChecking(false);

        if (exists) {
          message.error('房间名称已存在，请使用其他名称');
          return;
        }
      }

      await onCreateRoom(values);
      form.resetFields();
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    onClose();
  };

  return (
    <Modal
      title="创建新房间"
      open={isOpen}
      onOk={handleSubmit}
      onCancel={handleCancel}
      confirmLoading={isLoading || checking}
      okText="创建"
      cancelText="取消"
      width={480}
      styles={{
        body: { padding: '24px' },
      }}
    >
      <Form form={form} layout="vertical" initialValues={{ name: '', topic: '' }}>
        <Form.Item
          name="name"
          label="房间名称"
          rules={[
            { required: true, message: '请输入房间名称' },
            { min: 1, max: 50, message: '房间名称长度为1-50个字符' },
            {
              pattern: /^[a-zA-Z0-9\u4e00-\u9fa5\s_-]+$/,
              message: '房间名称只能包含字母、数字、中文、空格、下划线和中划线',
            },
          ]}
        >
          <Input placeholder="请输入房间名称" autoComplete="off" showCount maxLength={50} style={{ background: 'rgba(0, 0, 0, 0.3)', border: '1px solid rgba(71, 85, 105, 0.2)', color: '#f1f5f9' }} />
        </Form.Item>

        <Form.Item name="topic" label="房间主题（可选）" rules={[{ max: 200, message: '主题不能超过200个字符' }]}>
          <Input.TextArea placeholder="请输入房间主题" rows={3} showCount maxLength={200} style={{ background: 'rgba(0, 0, 0, 0.3)', border: '1px solid rgba(71, 85, 105, 0.2)', color: '#f1f5f9' }} />
        </Form.Item>
      </Form>
    </Modal>
  );
};
