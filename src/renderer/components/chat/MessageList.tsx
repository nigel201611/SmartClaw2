// src/renderer/components/chat/MessageList.tsx
import React, { forwardRef } from 'react';
import { Spin, Empty } from 'antd';
import { MessageOutlined } from '@ant-design/icons';
import MessageItem from './MessageItem';
import type { MessageContent } from '../../types';

interface MessageListProps {
  messages: MessageContent[];
  currentUserId?: string;
  isLoading: boolean;
}

export const MessageList = forwardRef<HTMLDivElement, MessageListProps>(({ messages, currentUserId, isLoading }, ref) => {
  if (isLoading && messages.length === 0) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100%',
        }}
      >
        <Spin size="large" />
      </div>
    );
  }

  if (messages.length === 0 && !isLoading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100%',
        }}
      >
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无消息，发送第一条消息吧！" />
      </div>
    );
  }

  return (
    <div
      ref={ref}
      style={{
        flex: 1,
        overflowY: 'auto',
        padding: '20px 24px',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {messages.map((message, index) => {
        const isOwn = message.sender === currentUserId;
        const showAvatar = index === 0 || messages[index - 1]?.sender !== message.sender;

        return <MessageItem key={message.eventId || index} message={message} isOwn={isOwn} showAvatar={showAvatar} />;
      })}
    </div>
  );
});

MessageList.displayName = 'MessageList';
