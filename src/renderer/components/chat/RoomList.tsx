/**
 * SmartClaw Room List Component
 * 
 * 房间列表侧边栏
 */

import React from 'react';
import { RoomInfo } from '../../hooks/useMatrix';
import { RoomItem } from './RoomItem';

interface RoomListProps {
  rooms: RoomInfo[];
  selectedRoomId: string | null;
  onRoomSelect: (roomId: string) => void;
  onLogout?: () => void;
  onCollapseToggle?: (collapsed: boolean) => void;
  isCollapsed?: boolean;
}

/**
 * 房间列表组件
 */
export const RoomList: React.FC<RoomListProps> = ({
  rooms,
  selectedRoomId,
  onRoomSelect,
  onLogout,
  onCollapseToggle,
  isCollapsed = false
}) => {
  // 按最后消息时间排序
  const sortedRooms = [...rooms].sort((a, b) => {
    const aTime = a.lastMessage?.timestamp || 0;
    const bTime = b.lastMessage?.timestamp || 0;
    return bTime - aTime;
  });

  // 计算未读消息数（示例）
  const getUnreadCount = (room: RoomInfo): number => {
    // TODO: 实现未读消息计数逻辑
    return 0;
  };

  const handleCollapseToggle = () => {
    if (onCollapseToggle) {
      onCollapseToggle(!isCollapsed);
    }
  };

  return (
    <div className={`room-list ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="room-list-header">
        <h2>SmartClaw</h2>
        <button 
          className="collapse-btn"
          onClick={handleCollapseToggle}
          title={isCollapsed ? '展开' : '收起'}
        >
          {isCollapsed ? '→' : '←'}
        </button>
      </div>
      
      {!isCollapsed && (
        <>
          <div className="room-list-actions">
            <button className="btn-new-room" title="新建房间">
              + 新建
            </button>
          </div>
          
          <div className="room-list-search">
            <input
              type="text"
              placeholder="搜索房间..."
              className="search-input"
            />
          </div>
          
          <div className="room-list-content">
            {sortedRooms.length === 0 ? (
              <div className="empty-rooms">
                <p>暂无房间</p>
                <button className="btn-create">创建第一个房间</button>
              </div>
            ) : (
              sortedRooms.map(room => (
                <RoomItem
                  key={room.roomId}
                  room={room}
                  isSelected={room.roomId === selectedRoomId}
                  unreadCount={getUnreadCount(room)}
                  onClick={() => onRoomSelect(room.roomId)}
                />
              ))
            )}
          </div>
          
          <div className="room-list-footer">
            <div className="user-info">
              <div className="avatar">👤</div>
              <span className="username">用户</span>
            </div>
            {onLogout && (
              <button className="btn-logout" onClick={onLogout}>
                登出
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default RoomList;
