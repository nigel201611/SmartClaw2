// RoomHeader.tsx
import React, { useState } from 'react';
import type { DisplayRoom } from './RoomList';

interface RoomHeaderProps {
  room: DisplayRoom;
  onLogout: () => void;
  onMenuToggle?: () => void;
  isMobile?: boolean;
}

export const RoomHeader: React.FC<RoomHeaderProps> = ({ room, onLogout, onMenuToggle, isMobile = false }) => {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div className="room-header">
      <div className="room-header-left">
        {isMobile && (
          <button className="back-btn" onClick={onMenuToggle}>
            ☰
          </button>
        )}
        <div className="room-header-info">
          <h2>{room.name}</h2>
          <p>
            {room.memberCount} 位成员
            {room.topic && ` • ${room.topic}`}
          </p>
        </div>
      </div>
      <div className="room-header-actions">
        <button className="header-btn" title="搜索">
          🔍
        </button>
        <button className="header-btn" title="更多选项" onClick={() => setShowMenu(!showMenu)}>
          ⋮
        </button>
        {showMenu && (
          <div className="dropdown-menu">
            <button onClick={onLogout}>退出登录</button>
          </div>
        )}
      </div>
    </div>
  );
};
