// ChatWindow.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useMatrix, type RoomInfo, type MessageContent } from '../../hooks/useMatrix';
import { RoomList } from './RoomList';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { RoomHeader } from './RoomHeader';
import { TypingIndicator } from './TypingIndicator';

interface ChatWindowProps {
  onLogout?: () => void;
}

/**
 * 转换消息格式，使其更易于显示
 */
const formatMessageForDisplay = (message: MessageContent) => {
  return {
    id: message.eventId,
    text: message.content.body,
    sender: message.sender,
    timestamp: new Date(message.timestamp),
    isOwn: false, // 需要在组件中根据当前用户判断
    eventId: message.eventId,
  };
};

/**
 * 转换房间格式
 */
const formatRoomForDisplay = (room: RoomInfo) => {
  return {
    roomId: room.roomId,
    name: room.name,
    topic: room.topic,
    memberCount: room.members,
    isDirect: room.isDirect,
    lastMessage: room.lastMessage?.content.body,
    lastMessageTime: room.lastMessage ? new Date(room.lastMessage.timestamp) : undefined,
    unreadCount: 0, // 如果 RoomInfo 中没有 unreadCount，默认为 0
  };
};

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
    error,
    currentRoom: hookCurrentRoom,
  } = useMatrix({
    autoConnect: true,
    homeserverUrl: 'http://localhost:8008',
  });

  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [isRoomListCollapsed, setIsRoomListCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const messageListRef = useRef<HTMLDivElement>(null);

  // 格式化房间列表
  const formattedRooms = rooms.map(formatRoomForDisplay);

  // 获取当前选中的房间（使用格式化后的数据）
  const selectedRoom = formattedRooms.find((r) => r.roomId === selectedRoomId) || null;

  // 格式化消息列表，并标记是否为当前用户发送
  const formattedMessages = messages.map((msg) => ({
    ...formatMessageForDisplay(msg),
    isOwn: msg.sender === session?.userId,
  }));

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
      // 移动端自动关闭侧边栏
      if (window.innerWidth <= 768) {
        setIsMobileMenuOpen(false);
      }
    }
  }, [selectedRoomId, getRoomMessages]);

  // 自动滚动到底部
  useEffect(() => {
    if (messageListRef.current && messages.length > 0) {
      messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async (text: string) => {
    if (!selectedRoomId) return;

    const success = await sendMessage(selectedRoomId, text);
    if (success) {
      await getRoomMessages(selectedRoomId, 100);
    }
  };

  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    }
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  // 如果没有选中房间，显示空状态
  if (!selectedRoom) {
    return (
      <div className={`chat-window ${isMobileMenuOpen ? 'menu-open' : ''}`}>
        <RoomList
          rooms={formattedRooms}
          selectedRoomId={selectedRoomId}
          onRoomSelect={setSelectedRoomId}
          onLogout={handleLogout}
          onCollapseToggle={setIsRoomListCollapsed}
          isCollapsed={isRoomListCollapsed}
          isMobileOpen={isMobileMenuOpen}
          onMobileClose={() => setIsMobileMenuOpen(false)}
        />
        <div className="chat-main empty-state">
          <div className="empty-content">
            <div className="empty-icon">💬</div>
            <h2>欢迎使用 SmartClaw</h2>
            <p>选择一个房间开始聊天</p>
            {error && <p className="error-text">{error}</p>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`chat-window ${isMobileMenuOpen ? 'menu-open' : ''}`}>
      <RoomList
        rooms={formattedRooms}
        selectedRoomId={selectedRoomId}
        onRoomSelect={setSelectedRoomId}
        onLogout={handleLogout}
        onCollapseToggle={setIsRoomListCollapsed}
        isCollapsed={isRoomListCollapsed}
        isMobileOpen={isMobileMenuOpen}
        onMobileClose={() => setIsMobileMenuOpen(false)}
      />

      <div className="chat-main">
        <RoomHeader room={selectedRoom} onLogout={handleLogout} onMenuToggle={toggleMobileMenu} isMobile={window.innerWidth <= 768} />

        <MessageList messages={formattedMessages} currentUserId={session?.userId} isLoading={isLoading} ref={messageListRef} />

        <TypingIndicator roomId={selectedRoomId} />

        <MessageInput onSend={handleSendMessage} disabled={isLoading} />
      </div>
    </div>
  );
};

export default ChatWindow;
