/**
 * SmartClaw Message List Component
 * 
 * 消息列表区域
 */

import React, { useEffect, useRef } from 'react';
import { MessageContent } from '../../hooks/useMatrix';
import { MessageItem } from './MessageItem';

interface MessageListProps {
  messages: MessageContent[];
  currentUserId?: string | null;
  isLoading?: boolean;
}

/**
 * 消息列表组件
 */
export const MessageList: React.FC<MessageListProps> = ({
  messages,
  currentUserId,
  isLoading
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 按时间分组消息
  const groupMessagesByDate = (): Map<string, MessageContent[]> => {
    const groups = new Map<string, MessageContent[]>();
    
    messages.forEach(message => {
      const date = new Date(message.timestamp).toLocaleDateString('zh-CN');
      const existing = groups.get(date) || [];
      existing.push(message);
      groups.set(date, existing);
    });
    
    return groups;
  };

  const messageGroups = groupMessagesByDate();

  // 渲染日期分隔符
  const renderDateSeparator = (date: string) => (
    <div className="message-date-separator">
      <span>{date}</span>
    </div>
  );

  // 渲染加载状态
  if (isLoading && messages.length === 0) {
    return (
      <div className="message-list loading">
        <div className="loading-spinner">
          <div className="spinner" />
          <p>加载消息中...</p>
        </div>
      </div>
    );
  }

  // 渲染空状态
  if (messages.length === 0) {
    return (
      <div className="message-list empty">
        <div className="empty-content">
          <div className="empty-icon">💬</div>
          <p>暂无消息</p>
          <p className="hint">发送第一条消息开始聊天</p>
        </div>
      </div>
    );
  }

  return (
    <div className="message-list">
      {Array.from(messageGroups.entries()).map(([date, groupMessages]) => (
        <div key={date} className="message-group">
          {renderDateSeparator(date)}
          {groupMessages.map((message, index) => (
            <MessageItem
              key={message.eventId || index}
              message={message}
              isOwn={message.sender === currentUserId}
              showAvatar={
                index === 0 || 
                groupMessages[index - 1]?.sender !== message.sender
              }
            />
          ))}
        </div>
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default MessageList;
