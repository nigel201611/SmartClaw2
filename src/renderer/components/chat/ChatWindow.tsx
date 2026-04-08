// ChatWindow.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useMatrix } from '../../hooks/useMatrix';
import { RoomList } from './RoomList';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { RoomHeader } from './RoomHeader';
import { TypingIndicator } from './TypingIndicator';
import { CreateRoomDialog } from './CreateRoomDialog';
import { ConfirmDialog } from './ConfirmDialog';

interface ChatWindowProps {
  onLogout?: () => void;
}

interface CreateRoomOptions {
  name: string;
  topic?: string;
  isDirect?: boolean;
  inviteUserIds?: string[];
}

export const ChatWindow: React.FC<ChatWindowProps> = ({ onLogout }) => {
  const { isLoggedIn, session, rooms, messages, getRooms, getRoomMessages, sendMessage, logout, isLoading, error, createRoom } = useMatrix({
    homeserverUrl: 'http://localhost:8008',
  });

  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const messageListRef = useRef<HTMLDivElement>(null);

  // 加载房间列表 - 确保登录后能获取到房间
  useEffect(() => {
    const loadRooms = async () => {
      if (isLoggedIn) {
        console.log('Loading rooms in ChatWindow...');
        await getRooms();
      }
    };

    loadRooms();
  }, [isLoggedIn, getRooms]);
  // 格式化房间列表

  const formattedRooms = rooms.map((room) => ({
    roomId: room.roomId,
    name: room.name,
    topic: room.topic,
    memberCount: room.members,
    isDirect: room.isDirect,
    lastMessage: room.lastMessage?.content.body,
    lastMessageTime: room.lastMessage ? new Date(room.lastMessage.timestamp) : undefined,
    unreadCount: 0,
  }));

  // 获取当前选中的房间
  const selectedRoom = formattedRooms.find((r) => r.roomId === selectedRoomId) || null;

  // 格式化消息列表
  const formattedMessages = messages.map((msg) => ({
    roomId: msg.roomId,
    eventId: msg.eventId,
    sender: msg.sender,
    timestamp: msg.timestamp,
    content: {
      msgtype: 'm.text',
      body: msg.content.body,
      formatted_body: msg.content.formatted_body,
    },
    type: msg.type,
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

  const handleLogoutClick = () => {
    setShowLogoutConfirm(true);
  };

  const handleConfirmLogout = async () => {
    if (isLoggingOut) return;

    setIsLoggingOut(true);
    setShowLogoutConfirm(false);

    try {
      setSelectedRoomId(null);
      await logout();
      if (onLogout) {
        onLogout();
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleCancelLogout = () => {
    setShowLogoutConfirm(false);
  };

  const handleCreateRoom = async (options: CreateRoomOptions) => {
    if (isCreatingRoom) return;

    setIsCreatingRoom(true);
    try {
      const roomId = await createRoom(options);
      if (roomId) {
        console.log('Room created:', roomId);
        // 刷新房间列表
        await getRooms();
        // 自动选中新创建的房间
        setSelectedRoomId(roomId);
        // 关闭对话框
        setIsCreateDialogOpen(false);
      }
    } catch (error) {
      console.error('Failed to create room:', error);
    } finally {
      setIsCreatingRoom(false);
    }
  };

  const handleOpenCreateDialog = () => {
    setIsCreateDialogOpen(true);
  };

  const handleCloseCreateDialog = () => {
    setIsCreateDialogOpen(false);
  };

  // 如果没有选中房间，显示空状态
  if (!selectedRoom) {
    return (
      <>
        <div className="chat-window">
          <RoomList rooms={formattedRooms} selectedRoomId={selectedRoomId} onRoomSelect={setSelectedRoomId} onLogoutClick={handleLogoutClick} onCreateRoomClick={handleOpenCreateDialog} />
          <div className="chat-main empty-state">
            <div className="empty-content">
              <h2>欢迎使用 SmartClaw</h2>
              <p>选择一个房间开始聊天</p>
              {error && <div className="error-message">{error}</div>}
            </div>
          </div>
        </div>

        {/* 确认退出对话框 */}
        <ConfirmDialog
          isOpen={showLogoutConfirm}
          title="确认退出"
          message="确定要退出登录吗？"
          confirmText="确定"
          cancelText="取消"
          onConfirm={handleConfirmLogout}
          onCancel={handleCancelLogout}
          isLoading={isLoggingOut}
          confirmVariant="danger"
        />

        {/* 创建房间对话框 */}
        <CreateRoomDialog isOpen={isCreateDialogOpen} onClose={handleCloseCreateDialog} onCreateRoom={handleCreateRoom} isLoading={isCreatingRoom} />
      </>
    );
  }

  return (
    <>
      <div className="chat-window">
        <RoomList rooms={formattedRooms} selectedRoomId={selectedRoomId} onRoomSelect={setSelectedRoomId} onLogoutClick={handleLogoutClick} onCreateRoomClick={handleOpenCreateDialog} />

        <div className="chat-main">
          <RoomHeader room={selectedRoom} />

          <MessageList messages={formattedMessages} currentUserId={session?.userId} isLoading={isLoading} ref={messageListRef} />

          <TypingIndicator roomId={selectedRoomId} typingUsers={typingUsers} />

          <MessageInput onSend={handleSendMessage} disabled={isLoading} />
        </div>
      </div>

      {/* 确认退出对话框 */}
      <ConfirmDialog
        isOpen={showLogoutConfirm}
        title="确认退出"
        message="确定要退出登录吗？"
        confirmText="确定"
        cancelText="取消"
        onConfirm={handleConfirmLogout}
        onCancel={handleCancelLogout}
        isLoading={isLoggingOut}
        confirmVariant="danger"
      />

      {/* 创建房间对话框 */}
      <CreateRoomDialog isOpen={isCreateDialogOpen} onClose={handleCloseCreateDialog} onCreateRoom={handleCreateRoom} isLoading={isCreatingRoom} />
    </>
  );
};

export default ChatWindow;
