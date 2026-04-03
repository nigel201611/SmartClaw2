// RoomList.tsx
import React, { useState } from 'react';

// 定义组件内部使用的房间类型
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
  onLogout: () => void;
  onCollapseToggle: (collapsed: boolean) => void;
  isCollapsed: boolean;
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
}

export const RoomList: React.FC<RoomListProps> = ({ rooms, selectedRoomId, onRoomSelect, onLogout, onCollapseToggle, isCollapsed, isMobileOpen, onMobileClose }) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredRooms = rooms.filter((room) => room.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const formatTime = (date?: Date) => {
    if (!date) return '';
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = diff / (1000 * 60 * 60);

    if (hours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (hours < 48) {
      return '昨天';
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  // 关闭移动端侧边栏（点击内容区域时）
  const handleContentClick = () => {
    if (isMobileOpen && onMobileClose) {
      onMobileClose();
    }
  };

  return (
    <>
      {/* 移动端遮罩层 */}
      {isMobileOpen && <div className="mobile-overlay" onClick={onMobileClose} />}

      <div className={`room-list ${isCollapsed ? 'collapsed' : ''} ${isMobileOpen ? 'mobile-open' : ''}`}>
        <div className="room-list-header">
          <div className="logo-area">
            <div className="logo-icon">🦞</div>
            <div className="logo-text">SmartClaw</div>
          </div>
          <button className="toggle-btn" onClick={() => onCollapseToggle(!isCollapsed)} title={isCollapsed ? '展开侧边栏' : '收起侧边栏'}>
            {isCollapsed ? '☰' : '◀'}
          </button>
        </div>

        {!isCollapsed && (
          <>
            <div className="room-search">
              <div className="search-input-wrapper">
                <span className="search-icon">🔍</span>
                <input type="text" className="search-input" placeholder="搜索房间..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
              </div>
            </div>

            <div className="rooms-container" onClick={handleContentClick}>
              {filteredRooms.map((room) => (
                <div key={room.roomId} className={`room-item ${selectedRoomId === room.roomId ? 'active' : ''}`} onClick={() => onRoomSelect(room.roomId)}>
                  <div className="room-avatar">
                    {room.name.charAt(0).toUpperCase()}
                    {room.unreadCount > 0 && <span className="unread-badge">{room.unreadCount > 99 ? '99+' : room.unreadCount}</span>}
                  </div>
                  <div className="room-info">
                    <div className="room-name">{room.name}</div>
                    {room.lastMessage && <div className="room-last-message">{room.lastMessage}</div>}
                  </div>
                  {room.lastMessageTime && <div className="room-time">{formatTime(room.lastMessageTime)}</div>}
                </div>
              ))}

              {filteredRooms.length === 0 && (
                <div className="text-muted" style={{ textAlign: 'center', padding: '2rem' }}>
                  {searchQuery ? '未找到匹配的房间' : '暂无房间'}
                </div>
              )}
            </div>

            <div className="room-list-footer">
              <button className="logout-btn" onClick={onLogout}>
                <span>🚪</span>
                <span>退出登录</span>
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
};
