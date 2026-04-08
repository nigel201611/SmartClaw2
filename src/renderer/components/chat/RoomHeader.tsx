// src/renderer/components/chat/RoomHeader.tsx
import React from 'react';
import { Typography, Space, Tag, Avatar } from 'antd';
import { TeamOutlined, UserOutlined } from '@ant-design/icons';
import type { DisplayRoom } from '../../types';

const { Title, Text } = Typography;

interface RoomHeaderProps {
  room: DisplayRoom;
}

export const RoomHeader: React.FC<RoomHeaderProps> = ({ room }) => {
  return (
    <div
      style={{
        height: 70,
        padding: '0 24px',
        borderBottom: '1px solid #f0f0f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <Space>
        <Avatar size={40} style={{ backgroundColor: room.isDirect ? '#52c41a' : '#667eea' }}>
          {room.isDirect ? <UserOutlined /> : room.name.charAt(0).toUpperCase()}
        </Avatar>
        <div>
          <Title level={4} style={{ margin: 0 }}>
            {room.name}
          </Title>
          <Space size={4}>
            <TeamOutlined style={{ fontSize: 12, color: '#8c8c8c' }} />
            <Text type="secondary" style={{ fontSize: 12 }}>
              {room.memberCount} 位成员
            </Text>
            {room.topic && (
              <>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  •
                </Text>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {room.topic}
                </Text>
              </>
            )}
          </Space>
        </div>
      </Space>
    </div>
  );
};
