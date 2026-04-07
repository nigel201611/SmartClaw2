// RoomHeader.tsx - 简化版本
import React from 'react';
import type { DisplayRoom } from './RoomList';

interface RoomHeaderProps {
  room: DisplayRoom;
}

export const RoomHeader: React.FC<RoomHeaderProps> = ({ room }) => {
  return (
    <div className="room-header">
      <div className="room-header-info">
        <h2>{room.name}</h2>
        <p>
          {room.memberCount} 位成员
          {room.topic && ` • ${room.topic}`}
        </p>
      </div>
    </div>
  );
};
