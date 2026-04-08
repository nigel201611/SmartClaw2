// src/renderer/components/chat/CreateRoomDialog.tsx
import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Switch, Button, Space, Alert, Tag, message } from 'antd';
import { PlusOutlined, UserAddOutlined, LockOutlined, UnlockOutlined } from '@ant-design/icons';

interface CreateRoomDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateRoom: (options: { name: string; topic?: string; isDirect?: boolean; inviteUserIds?: string[] }) => Promise<void>;
  isLoading?: boolean;
}

export const CreateRoomDialog: React.FC<CreateRoomDialogProps> = ({ isOpen, onClose, onCreateRoom, isLoading = false }) => {
  const [form] = Form.useForm();
  const [inviteUsers, setInviteUsers] = useState<string[]>([]);
  const [currentInvite, setCurrentInvite] = useState('');

  useEffect(() => {
    if (isOpen) {
      form.resetFields();
      setInviteUsers([]);
    }
  }, [isOpen, form]);

  const handleAddUser = () => {
    if (currentInvite && !inviteUsers.includes(currentInvite)) {
      setInviteUsers([...inviteUsers, currentInvite]);
      setCurrentInvite('');
    }
  };

  const handleRemoveUser = (user: string) => {
    setInviteUsers(inviteUsers.filter((u) => u !== user));
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      await onCreateRoom({
        name: values.name,
        topic: values.topic,
        isDirect: values.isDirect,
        inviteUserIds: inviteUsers.length > 0 ? inviteUsers : undefined,
      });
      form.resetFields();
      setInviteUsers([]);
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  return (
    <Modal
      title="创建新房间"
      open={isOpen}
      onCancel={onClose}
      footer={[
        <Button key="cancel" onClick={onClose} disabled={isLoading}>
          取消
        </Button>,
        <Button key="submit" type="primary" onClick={handleSubmit} loading={isLoading} icon={<PlusOutlined />}>
          创建
        </Button>,
      ]}
      width={500}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          isDirect: false,
        }}
      >
        <Form.Item
          label="房间名称"
          name="name"
          rules={[
            { required: true, message: '请输入房间名称' },
            { max: 50, message: '房间名称不能超过50个字符' },
          ]}
        >
          <Input placeholder="输入房间名称" maxLength={50} showCount />
        </Form.Item>

        <Form.Item label="房间主题" name="topic">
          <Input placeholder="可选，描述房间主题" maxLength={200} showCount />
        </Form.Item>

        <Form.Item label="房间类型" name="isDirect" valuePropName="checked">
          <Switch checkedChildren={<LockOutlined />} unCheckedChildren={<UnlockOutlined />} />
          <span style={{ marginLeft: 8 }}>私密房间（仅限邀请的用户加入）</span>
        </Form.Item>

        <Form.Item label="邀请用户">
          <Space.Compact style={{ width: '100%' }}>
            <Input placeholder="输入用户ID" value={currentInvite} onChange={(e) => setCurrentInvite(e.target.value)} onPressEnter={handleAddUser} />
            <Button type="primary" onClick={handleAddUser} icon={<UserAddOutlined />}>
              添加
            </Button>
          </Space.Compact>
          <div style={{ marginTop: 8 }}>
            {inviteUsers.map((user) => (
              <Tag key={user} closable onClose={() => handleRemoveUser(user)} style={{ marginBottom: 4 }}>
                {user}
              </Tag>
            ))}
          </div>
          <div style={{ marginTop: 4, fontSize: 12, color: '#8c8c8c' }}>例如：@user:matrix.org</div>
        </Form.Item>
      </Form>
    </Modal>
  );
};
