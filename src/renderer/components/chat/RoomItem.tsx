/**
 * SmartClaw Room Item Component
 * 
 * 房间列表项
 */

import React from 'react';
import { RoomInfo } from '../../hooks/useMatrix';

interface RoomItemProps {
  room: RoomInfo;
  isSelected: boolean;
  unreadCount: number;
  onClick: () => void;
}

/**
 * 房间项组件
 */
export const RoomItem: React.FC<RoomItemProps> = ({
  room,
  isSelected,
  unreadCount,
  onClick
}) => {
  // 格式化最后消息时间
  const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) {
      return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
      return '昨天';
    } else if (days < 7) {
      return date.toLocaleDateString('zh-CN', { weekday: 'short' });
    } else {
      return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
    }
  };

  // 获取最后消息预览
  const getLastMessagePreview = (): string => {
    if (!room.lastMessage) {
      return '暂无消息';
    }
    
    const content = room.lastMessage.content.body;
    return content.length > 30 ? content.substring(0, 30) + '...' : content;
  };

  // 获取房间头像
  const getRoomAvatar = (): string => {
    if (room.isDirect) {
      return '👤';
    } else {
      return room.name.charAt(0).toUpperCase();
    }
  };

  return (
    <div
      className={`room-item ${isSelected ? 'selected' : ''}`}
      onClick={onClick}
    >
      <div className="room-avatar">
        {room.isDirect ? (
          <span className="avatar-direct">👤</span>
        ) : (
          <span className="avatar-group">{getRoomAvatar()}</span>
        )}
      </div>
      
      <div className="room-content">
        <div className="room-header">
          <h3 className="room-name" title={room.name}>
            {room.name}
          </h3>
          {room.lastMessage && (
            <span className="room-time">
              {formatTime(room.lastMessage.timestamp)}
            </span>
          )}
        </div>
        
        <div className="room-footer">
          <p className="room-last-message" title={getLastMessagePreview()}>
            {getLastMessagePreview()}
          </p>
          {unreadCount > 0 && (
            <span className="unread-badge">{unreadCount}</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default RoomItem;
