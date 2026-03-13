/**
 * SmartClaw Room Header Component
 * 
 * 房间标题栏
 */

import React from 'react';
import { RoomInfo } from '../../hooks/useMatrix';

interface RoomHeaderProps {
  room: RoomInfo;
  onLogout?: () => void;
}

/**
 * 房间标题组件
 */
export const RoomHeader: React.FC<RoomHeaderProps> = ({ room, onLogout }) => {
  // 获取房间头像
  const getRoomAvatar = (): string => {
    if (room.isDirect) {
      return '👤';
    } else {
      return room.name.charAt(0).toUpperCase();
    }
  };

  return (
    <div className="room-header">
      <div className="room-info">
        <div className="room-avatar">
          {room.isDirect ? (
            <span className="avatar-direct">👤</span>
          ) : (
            <span className="avatar-group">{getRoomAvatar()}</span>
          )}
        </div>
        
        <div className="room-details">
          <h2 className="room-name">{room.name}</h2>
          {room.topic && (
            <p className="room-topic">{room.topic}</p>
          )}
          {!room.topic && (
            <p className="room-members">
              {room.members} {room.members === 1 ? '成员' : '成员'}
            </p>
          )}
        </div>
      </div>
      
      <div className="room-actions">
        <button className="btn-action" title="搜索">
          🔍
        </button>
        <button className="btn-action" title="房间信息">
          ℹ️
        </button>
        <button className="btn-action" title="更多">
          ⋮
        </button>
        {onLogout && (
          <button className="btn-logout-small" onClick={onLogout} title="登出">
            登出
          </button>
        )}
      </div>
    </div>
  );
};

export default RoomHeader;
