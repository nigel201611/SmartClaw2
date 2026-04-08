// src/renderer/components/chat/MessageItem.tsx
import React from 'react';
import { Avatar, Typography, Space, Tooltip } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import type { MessageContent } from '../../types';

const { Text } = Typography;

interface MessageItemProps {
  message: MessageContent;
  isOwn: boolean;
  showAvatar?: boolean;
}

export const MessageItem: React.FC<MessageItemProps> = ({ message, isOwn, showAvatar = true }) => {
  const formatTime = (timestamp: number): string => {
    return new Date(timestamp).toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleDateString('zh-CN', {
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getSenderName = (): string => {
    return message.sender.split(':')[0].replace('@', '');
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: isOwn ? 'row-reverse' : 'row',
        gap: 12,
        marginBottom: 16,
        alignItems: 'flex-start',
      }}
    >
      {!isOwn && showAvatar && <Avatar style={{ backgroundColor: '#667eea' }}>{getSenderName().charAt(0).toUpperCase()}</Avatar>}

      <div
        style={{
          maxWidth: '70%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: isOwn ? 'flex-end' : 'flex-start',
          gap: 4,
        }}
      >
        {!isOwn && showAvatar && (
          <Text type="secondary" style={{ fontSize: 12, marginLeft: 4 }}>
            {getSenderName()}
          </Text>
        )}

        <div
          style={{
            padding: '8px 12px',
            borderRadius: 12,
            backgroundColor: isOwn ? '#667eea' : '#f5f5f5',
            color: isOwn ? 'white' : 'inherit',
            wordBreak: 'break-word',
          }}
        >
          <Text style={{ color: isOwn ? 'white' : 'inherit' }}>{message.content.body}</Text>
        </div>

        <Tooltip title={formatDate(message.timestamp)}>
          <Text type="secondary" style={{ fontSize: 11 }}>
            {formatTime(message.timestamp)}
          </Text>
        </Tooltip>
      </div>

      {isOwn && showAvatar && <Avatar icon={<UserOutlined />} style={{ backgroundColor: '#52c41a' }} />}
    </div>
  );
};

export default MessageItem;
