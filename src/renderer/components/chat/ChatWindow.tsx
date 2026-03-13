/**
 * SmartClaw Chat Window Component
 * 
 * 主聊天界面容器
 */

import React, { useState, useEffect } from 'react';
import { useMatrix } from '../hooks/useMatrix';
import { RoomList } from './RoomList';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { RoomHeader } from './RoomHeader';
import { TypingIndicator } from './TypingIndicator';

interface ChatWindowProps {
  onLogout?: () => void;
}

/**
 * 聊天窗口组件
 */
export const ChatWindow: React.FC<ChatWindowProps> = ({ onLogout }) => {
  const {
    isLoggedIn,
    session,
    rooms,
    messages,
    getRooms,
    getRoomMessages,
    sendMessage,
    isLoading,
    error
  } = useMatrix({
    autoConnect: true,
    homeserverUrl: 'http://localhost:8008'
  });

  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [isRoomListCollapsed, setIsRoomListCollapsed] = useState(false);

  // 加载房间列表
  useEffect(() => {
    if (isLoggedIn) {
      getRooms();
    }
  }, [isLoggedIn, getRooms]);

  // 切换房间时加载消息
  useEffect(() => {
    if (selectedRoomId) {
      getRoomMessages(selectedRoomId, 100);
    }
  }, [selectedRoomId, getRoomMessages]);

  // 获取当前选中的房间
  const selectedRoom = rooms.find(r => r.roomId === selectedRoomId) || null;

  // 发送消息处理
  const handleSendMessage = async (text: string) => {
    if (!selectedRoomId) return;
    
    const success = await sendMessage(selectedRoomId, text);
    if (success) {
      // 消息发送成功后刷新消息列表
      await getRoomMessages(selectedRoomId, 100);
    }
  };

  // 登出处理
  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    }
  };

  // 渲染空状态
  if (!selectedRoom) {
    return (
      <div className="chat-window empty">
        <RoomList
          rooms={rooms}
          selectedRoomId={selectedRoomId}
          onRoomSelect={setSelectedRoomId}
          onLogout={handleLogout}
          onCollapseToggle={setIsRoomListCollapsed}
          isCollapsed={isRoomListCollapsed}
        />
        <div className="chat-main empty-state">
          <div className="empty-content">
            <div className="empty-icon">💬</div>
            <h2>欢迎使用 SmartClaw</h2>
            <p>选择一个房间开始聊天</p>
            {error && <p className="error">{error}</p>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-window">
      <RoomList
        rooms={rooms}
        selectedRoomId={selectedRoomId}
        onRoomSelect={setSelectedRoomId}
        onLogout={handleLogout}
        onCollapseToggle={setIsRoomListCollapsed}
        isCollapsed={isRoomListCollapsed}
      />
      
      <div className="chat-main">
        <RoomHeader
          room={selectedRoom}
          onLogout={handleLogout}
        />
        
        <MessageList
          messages={messages}
          currentUserId={session?.userId}
          isLoading={isLoading}
        />
        
        <TypingIndicator roomId={selectedRoomId} />
        
        <MessageInput
          onSend={handleSendMessage}
          disabled={isLoading}
        />
      </div>
    </div>
  );
};

export default ChatWindow;
