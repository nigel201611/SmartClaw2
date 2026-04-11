// src/renderer/components/chat/RoomList.tsx
import React, { useState } from 'react';
import { Input, Button, Avatar, Badge, Empty, Typography, Space, Modal, message } from 'antd';
import { SearchOutlined, PlusOutlined, LogoutOutlined, UserOutlined, DeleteOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import type { DisplayRoom } from '../../types';

const { Text } = Typography;
const { confirm } = Modal;

interface RoomListProps {
  rooms: DisplayRoom[];
  selectedRoomId: string | null;
  onRoomSelect: (roomId: string) => void;
  onLogoutClick: () => void;
  onCreateRoomClick: () => void;
  onDeleteRoom?: (roomId: string) => Promise<{ success: boolean; method?: string; message?: string }>;
}

export const RoomList: React.FC<RoomListProps> = ({ rooms, selectedRoomId, onRoomSelect, onLogoutClick, onCreateRoomClick, onDeleteRoom }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingRoomId, setDeletingRoomId] = useState<string | null>(null);

  const filteredRooms = rooms.filter((room) => room.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const handleDeleteClick = (e: React.MouseEvent, roomId: string, roomName: string) => {
    e.stopPropagation();

    confirm({
      title: '确认删除房间',
      icon: <ExclamationCircleOutlined />,
      content: (
        <div>
          <p>
            确定要删除房间 <strong>{roomName}</strong> 吗？
          </p>
          <p style={{ color: '#eab308', fontSize: 12, marginTop: 8 }}>提示：系统将根据您的权限自动选择删除方式</p>
          <p style={{ color: '#ef4444', fontSize: 12 }}>注意：删除后将无法恢复，所有聊天记录将丢失！</p>
        </div>
      ),
      okText: '确认删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        if (onDeleteRoom) {
          await onDeleteRoom(roomId);
        }
      },
    });
  };

  return (
    <div
      style={{
        width: 280,
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: 'rgba(15, 23, 42, 0.95)',
        backdropFilter: 'blur(20px)',
        borderRight: '1px solid rgba(71, 85, 105, 0.3)',
      }}
    >
      {/* 头部 */}
      <div style={{ padding: '20px 16px', borderBottom: '1px solid rgba(71, 85, 105, 0.15)' }}>
        <Space align="center">
          <Avatar size="large" style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' }}>
            SC
          </Avatar>
          <div>
            <Text strong style={{ fontSize: 20, background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              SmartClaw
            </Text>
          </div>
        </Space>
      </div>

      {/* 搜索框 */}
      <div style={{ padding: 16 }}>
        <Input
          placeholder="搜索房间..."
          prefix={<SearchOutlined style={{ color: '#64748b' }} />}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          allowClear
          style={{
            background: 'rgba(0, 0, 0, 0.3)',
            border: '1px solid rgba(71, 85, 105, 0.2)',
            color: '#f1f5f9',
          }}
        />
      </div>

      {/* 房间列表头部 */}
      <div style={{ padding: '0 16px 8px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text strong style={{ color: '#f1f5f9' }}>
          房间列表 ({filteredRooms.length})
        </Text>
        <Button type="primary" icon={<PlusOutlined />} size="small" onClick={onCreateRoomClick} style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', border: 'none' }}>
          创建房间
        </Button>
      </div>

      {/* 房间列表 */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '0 8px' }}>
        {filteredRooms.length === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={<span style={{ color: '#94a3b8' }}>{rooms.length === 0 ? '暂无房间' : '未找到匹配的房间'}</span>} style={{ marginTop: 40 }}>
            {rooms.length === 0 && (
              <Button type="primary" onClick={onCreateRoomClick} icon={<PlusOutlined />}>
                创建第一个房间
              </Button>
            )}
          </Empty>
        ) : (
          filteredRooms.map((room) => (
            <div
              key={room.roomId}
              onClick={() => onRoomSelect(room.roomId)}
              style={{
                cursor: 'pointer',
                padding: '12px',
                borderRadius: 12,
                marginBottom: 4,
                transition: 'all 0.2s',
                background: selectedRoomId === room.roomId ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
                borderLeft: selectedRoomId === room.roomId ? '3px solid #6366f1' : '3px solid transparent',
                overflow: 'hidden',
                position: 'relative',
              }}
              onMouseEnter={(e) => {
                if (selectedRoomId !== room.roomId) {
                  e.currentTarget.style.background = 'rgba(99, 102, 241, 0.1)';
                }
              }}
              onMouseLeave={(e) => {
                if (selectedRoomId !== room.roomId) {
                  e.currentTarget.style.background = 'transparent';
                }
              }}
            >
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', minWidth: 0 }}>
                {room.isDirect ? (
                  <Avatar icon={<UserOutlined />} style={{ background: '#10b981', flexShrink: 0 }} />
                ) : (
                  <Avatar style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', flexShrink: 0 }}>{room.name.charAt(0).toUpperCase()}</Avatar>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                    <Text strong={selectedRoomId === room.roomId} style={{ color: '#f1f5f9', fontSize: 14 }} ellipsis={{ tooltip: true }}>
                      {room.name}
                    </Text>
                    {room.unreadCount > 0 && <Badge count={room.unreadCount} size="small" style={{ flexShrink: 0 }} />}
                  </div>
                  {room.lastMessage && (
                    <Text type="secondary" style={{ fontSize: 12, color: '#94a3b8', display: 'block' }} ellipsis={{ tooltip: true }}>
                      {room.lastMessage}
                    </Text>
                  )}
                </div>

                {/* 删除按钮 */}
                {!room.isDirect && onDeleteRoom && (
                  <Button
                    type="text"
                    icon={<DeleteOutlined />}
                    size="small"
                    loading={deletingRoomId === room.roomId}
                    style={{
                      opacity: 0.6,
                      transition: 'opacity 0.2s',
                      color: '#ef4444',
                      flexShrink: 0,
                    }}
                    onClick={(e) => handleDeleteClick(e, room.roomId, room.name)}
                  />
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* 底部 */}
      <div style={{ padding: 16, borderTop: '1px solid rgba(71, 85, 105, 0.15)' }}>
        <Button
          danger
          icon={<LogoutOutlined />}
          onClick={onLogoutClick}
          block
          style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
          }}
        >
          退出登录
        </Button>
      </div>
    </div>
  );
};
