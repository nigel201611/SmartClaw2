// RoomList.tsx
import React, { useState } from 'react';
import logo from '@/images/icon.png';

export interface DisplayRoom {
  roomId: string;
  name: string;
  topic?: string;
  memberCount: number;
  isDirect: boolean;
  lastMessage?: string;
  lastMessageTime?: Date;
  unreadCount: number;
}

interface RoomListProps {
  rooms: DisplayRoom[];
  selectedRoomId: string | null;
  onRoomSelect: (roomId: string) => void;
  onLogoutClick: () => void;
  onCreateRoomClick: () => void;
}

export const RoomList: React.FC<RoomListProps> = ({ rooms, selectedRoomId, onRoomSelect, onLogoutClick, onCreateRoomClick }) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredRooms = rooms.filter((room) => room.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="room-list">
      <div className="room-list-header">
        <div className="logo-area">
          <div className="logo-icon">
            <img src={logo} width={30} height={30} alt="Logo" />
          </div>
          <div className="logo-text">SmartClaw</div>
        </div>
      </div>

      <div className="room-search">
        <input type="text" className="search-input" placeholder="搜索房间..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
      </div>

      <div className="rooms-container">
        {filteredRooms.length === 0 ? (
          <div className="empty-state">
            <p>{rooms.length === 0 ? '暂无房间' : '未找到匹配的房间'}</p>
            {rooms.length === 0 && (
              <button className="create-first-room-btn" onClick={onCreateRoomClick}>
                创建第一个房间
              </button>
            )}
          </div>
        ) : (
          filteredRooms.map((room) => (
            <div key={room.roomId} className={`room-item ${selectedRoomId === room.roomId ? 'active' : ''}`} onClick={() => onRoomSelect(room.roomId)}>
              <div className="room-info">
                <span className="room-name">{room.name}</span>
                {room.topic && <span className="room-topic">{room.topic}</span>}
              </div>
              {room.isDirect && <span className="direct-badge">私聊</span>}
              {room.unreadCount > 0 && <span className="unread-badge">{room.unreadCount}</span>}
            </div>
          ))
        )}
      </div>

      <div className="room-list-footer">
        <button className="logout-btn" onClick={onLogoutClick}>
          <span>退出登录</span>
        </button>
      </div>
    </div>
  );
};
