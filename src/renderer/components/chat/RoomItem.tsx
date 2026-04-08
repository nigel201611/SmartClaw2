// src/renderer/components/chat/RoomItem.tsx
import React from 'react';
import { Avatar, Badge, Typography, Space, Tooltip } from 'antd';
import { UserOutlined, TeamOutlined } from '@ant-design/icons';
import type { RoomInfo } from '../../types';

const { Text } = Typography;

interface RoomItemProps {
  room: RoomInfo;
  isSelected: boolean;
  unreadCount: number;
  onClick: () => void;
}

export const RoomItem: React.FC<RoomItemProps> = ({ room, isSelected, unreadCount, onClick }) => {
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

  return (
    <div
      onClick={onClick}
      style={{
        padding: '12px 16px',
        cursor: 'pointer',
        transition: 'all 0.3s',
        backgroundColor: isSelected ? '#e6f7ff' : 'transparent',
        borderLeft: isSelected ? '3px solid #667eea' : '3px solid transparent',
      }}
      onMouseEnter={(e) => {
        if (!isSelected) {
          e.currentTarget.style.backgroundColor = '#f5f5f5';
        }
      }}
      onMouseLeave={(e) => {
        if (!isSelected) {
          e.currentTarget.style.backgroundColor = 'transparent';
        }
      }}
    >
      <Space align="start" style={{ width: '100%' }}>
        <Avatar
          size={40}
          style={{
            backgroundColor: room.isDirect ? '#52c41a' : '#667eea',
            flexShrink: 0,
          }}
        >
          {room.isDirect ? <UserOutlined /> : room.name.charAt(0).toUpperCase()}
        </Avatar>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text strong={isSelected} style={{ fontSize: 14 }}>
              {room.name}
            </Text>
            {room.lastMessage && (
              <Text type="secondary" style={{ fontSize: 11 }}>
                {formatTime(room.lastMessage.timestamp)}
              </Text>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
            <Text type="secondary" style={{ fontSize: 12 }} ellipsis={{ tooltip: true }}>
              {getLastMessagePreview()}
            </Text>
            {unreadCount > 0 && <Badge count={unreadCount} size="small" />}
          </div>
        </div>
      </Space>
    </div>
  );
};

export default RoomItem;
