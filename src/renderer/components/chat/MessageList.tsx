// MessageList.tsx
import React, { forwardRef } from 'react';

// 定义组件内部使用的消息类型
export interface DisplayMessage {
  id: string;
  text: string;
  sender: string;
  timestamp: Date;
  isOwn: boolean;
  eventId?: string;
}

interface MessageListProps {
  messages: DisplayMessage[];
  currentUserId?: string;
  isLoading: boolean;
}

export const MessageList = forwardRef<HTMLDivElement, MessageListProps>(({ messages, currentUserId, isLoading }, ref) => {
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getInitials = (sender: string) => {
    // 从 sender 中提取用户名（Matrix ID 格式：@username:server）
    const username = sender.split(':')[0].replace('@', '');
    return username.charAt(0).toUpperCase();
  };

  const getDisplayName = (sender: string) => {
    // 从 sender 中提取用户名
    return sender.split(':')[0].replace('@', '');
  };

  if (isLoading && messages.length === 0) {
    return (
      <div className="message-list">
        <div className="message-loading">
          <div className="loading-spinner"></div>
        </div>
      </div>
    );
  }

  if (messages.length === 0 && !isLoading) {
    return (
      <div className="message-list">
        <div className="empty-messages">
          <p>✨ 暂无消息，发送第一条消息吧！</p>
        </div>
      </div>
    );
  }

  return (
    <div className="message-list" ref={ref}>
      {messages.map((message, index) => {
        const isOwn = message.isOwn || message.sender === currentUserId;
        const showAvatar = index === 0 || messages[index - 1]?.sender !== message.sender;

        return (
          <div key={message.id || index} className={`message-item ${isOwn ? 'own' : ''}`}>
            {!isOwn && showAvatar && <div className="message-avatar">{getInitials(message.sender)}</div>}
            {!isOwn && !showAvatar && <div className="message-avatar" style={{ visibility: 'hidden' }} />}
            <div className="message-content">
              {!isOwn && showAvatar && <div className="message-sender-name">{getDisplayName(message.sender)}</div>}
              <div className="message-bubble">
                <div className="message-text">{message.text}</div>
              </div>
              <div className="message-meta">
                <span className="message-time">{formatTime(message.timestamp)}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
});

MessageList.displayName = 'MessageList';
