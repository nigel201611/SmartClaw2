// src/renderer/components/chat/MessageList.tsx
import React, { forwardRef } from 'react';
import { Avatar, Typography, Space } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import type { Message } from '../../types';

const { Text, Paragraph } = Typography;

interface MessageListProps {
  messages: Message[];
  currentUserId?: string;
  isLoading?: boolean;
}

export const MessageList = forwardRef<HTMLDivElement, MessageListProps>(({ messages, currentUserId, isLoading }, ref) => {
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    if (isToday) {
      return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const isOwnMessage = (senderId: string) => {
    return senderId === currentUserId;
  };

  if (isLoading && messages.length === 0) {
    return (
      <div ref={ref} style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: '#94a3b8' }}>加载消息中...</Text>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div ref={ref} style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: '#94a3b8' }}>暂无消息，发送第一条消息吧~</Text>
      </div>
    );
  }

  return (
    <div ref={ref} style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        {messages.map((message, index) => {
          const isOwn = isOwnMessage(message.sender);
          const showAvatar = index === 0 || messages[index - 1]?.sender !== message.sender;

          return (
            <div
              key={message.id}
              style={{
                display: 'flex',
                justifyContent: isOwn ? 'flex-end' : 'flex-start',
                alignItems: 'flex-start',
                gap: 12,
              }}
            >
              {!isOwn && showAvatar && <Avatar icon={<UserOutlined />} style={{ background: '#6366f1', flexShrink: 0 }} />}
              {!isOwn && !showAvatar && <div style={{ width: 40, flexShrink: 0 }} />}

              <div style={{ maxWidth: '70%' }}>
                {!isOwn && showAvatar && (
                  <Text type="secondary" style={{ fontSize: 12, marginLeft: 8, display: 'block', marginBottom: 4 }}>
                    {message.senderName || message.sender}
                  </Text>
                )}
                <div
                  style={{
                    background: isOwn ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' : 'rgba(51, 65, 85, 0.8)',
                    padding: '8px 12px',
                    borderRadius: isOwn ? '12px 4px 12px 12px' : '4px 12px 12px 12px',
                    wordBreak: 'break-word',
                  }}
                >
                  <Paragraph style={{ color: '#f1f5f9', margin: 0 }} ellipsis={{ rows: 10, expandable: true, symbol: '展开' }}>
                    {message.content}
                  </Paragraph>
                </div>
                <Text type="secondary" style={{ fontSize: 10, marginTop: 4, display: 'block', textAlign: isOwn ? 'right' : 'left' }}>
                  {formatTime(message.timestamp)}
                  {isOwn && message.status === 'read' && ' ✓✓'}
                  {isOwn && message.status === 'delivered' && ' ✓✓'}
                  {isOwn && message.status === 'sent' && ' ✓'}
                  {isOwn && message.status === 'sending' && ' ⟳'}
                  {isOwn && message.status === 'failed' && ' !'}
                </Text>
              </div>

              {isOwn && showAvatar && <Avatar icon={<UserOutlined />} style={{ background: '#10b981', flexShrink: 0 }} />}
              {isOwn && !showAvatar && <div style={{ width: 40, flexShrink: 0 }} />}
            </div>
          );
        })}
      </Space>
    </div>
  );
});

MessageList.displayName = 'MessageList';
