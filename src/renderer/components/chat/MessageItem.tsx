/**
 * SmartClaw Message Item Component
 * 
 * 单个消息气泡
 */

import React, { useState } from 'react';
import { MessageContent } from '../../hooks/useMatrix';

interface MessageItemProps {
  message: MessageContent;
  isOwn: boolean;
  showAvatar?: boolean;
}

/**
 * 消息项组件
 */
export const MessageItem: React.FC<MessageItemProps> = ({
  message,
  isOwn,
  showAvatar = true
}) => {
  const [showTime, setShowTime] = useState(false);

  // 格式化时间
  const formatTime = (timestamp: number): string => {
    return new Date(timestamp).toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // 格式化日期
  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleDateString('zh-CN', {
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // 获取发送者名称
  const getSenderName = (): string => {
    return message.sender.split(':')[0].replace('@', '');
  };

  // 渲染消息内容（支持简单 Markdown）
  const renderContent = (): React.ReactNode => {
    let content = message.content.body;
    
    // 简单的 Markdown 解析
    // 粗体
    content = content.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    // 斜体
    content = content.replace(/\*(.+?)\*/g, '<em>$1</em>');
    // 代码
    content = content.replace(/`(.+?)`/g, '<code>$1</code>');
    // 链接
    content = content.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    
    return <span dangerouslySetInnerHTML={{ __html: content }} />;
  };

  return (
    <div
      className={`message-item ${isOwn ? 'own' : 'other'} ${showAvatar ? 'show-avatar' : ''}`}
      onMouseEnter={() => setShowTime(true)}
      onMouseLeave={() => setShowTime(false)}
    >
      {!isOwn && showAvatar && (
        <div className="message-avatar">
          <div className="avatar">
            {getSenderName().charAt(0).toUpperCase()}
          </div>
        </div>
      )}
      
      <div className="message-content">
        {!isOwn && showAvatar && (
          <div className="message-sender">
            {getSenderName()}
          </div>
        )}
        
        <div className="message-bubble">
          <div className="message-text">
            {renderContent()}
          </div>
          
          <div className={`message-meta ${showTime ? 'visible' : ''}`}>
            <span className="message-time" title={formatDate(message.timestamp)}>
              {formatTime(message.timestamp)}
            </span>
          </div>
        </div>
      </div>
      
      {isOwn && showAvatar && (
        <div className="message-avatar">
          <div className="avatar own">
            👤
          </div>
        </div>
      )}
    </div>
  );
};

export default MessageItem;
