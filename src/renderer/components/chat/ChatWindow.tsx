// src/renderer/components/chat/ChatWindow.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { message, Modal } from 'antd';
import { ExclamationCircleOutlined } from '@ant-design/icons';
import { useMatrix } from '../../hooks/useMatrix';
import { RoomList } from './RoomList';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { RoomHeader } from './RoomHeader';
import { TypingIndicator } from './TypingIndicator';
import { CreateRoomDialog } from './CreateRoomDialog';
import type { DisplayRoom, Message, MessageContent, RoomInfo } from '../../types';

interface ChatWindowProps {
  onLogout?: () => void;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({ onLogout }) => {
  const { isLoggedIn, session, rooms, messages, getRooms, getRoomMessages, sendMessage, logout, isLoading, error, createRoom, deleteRoomIntelligent, checkRoomNameExists, clearError } = useMatrix();

  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const messageListRef = useRef<HTMLDivElement>(null);

  const loadRooms = useCallback(async () => {
    if (isLoggedIn) {
      console.log('Loading rooms in ChatWindow...');
      await getRooms();
    }
  }, [isLoggedIn, getRooms]);

  useEffect(() => {
    loadRooms();
  }, [loadRooms]);

  // 清除错误当切换房间时
  useEffect(() => {
    if (error && clearError) {
      clearError();
    }
  }, [selectedRoomId, error, clearError]);

  const formattedRooms: DisplayRoom[] = rooms.map((room: RoomInfo) => ({
    roomId: room.roomId,
    name: room.name,
    topic: room.topic,
    memberCount: room.members,
    isDirect: room.isDirect || false,
    lastMessage: room.lastMessage?.content?.body,
    lastMessageTime: room.lastMessage ? new Date(room.lastMessage.timestamp) : undefined,
    unreadCount: 0,
  }));

  const selectedRoom = formattedRooms.find((r) => r.roomId === selectedRoomId) || null;

  const formattedMessages: Message[] = messages.map((msg: MessageContent) => ({
    id: msg.eventId,
    roomId: msg.roomId,
    sender: msg.sender,
    senderName: msg.sender.split(':')[0].replace('@', ''),
    content: msg.content.body,
    timestamp: msg.timestamp,
    type: msg.type === 'm.room.message' ? 'text' : msg.type,
  }));

  useEffect(() => {
    if (selectedRoomId) {
      getRoomMessages(selectedRoomId, 100);
    }
  }, [selectedRoomId, getRoomMessages]);

  useEffect(() => {
    if (messageListRef.current && messages.length > 0) {
      const scrollElement = messageListRef.current;
      scrollElement.scrollTop = scrollElement.scrollHeight;
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
    Modal.confirm({
      title: '确认退出',
      icon: <ExclamationCircleOutlined />,
      content: '确定要退出登录吗？',
      okText: '确定',
      cancelText: '取消',
      onOk: async () => {
        try {
          await logout();
          if (onLogout) onLogout();
          message.success('已退出登录');
        } catch (error) {
          message.error('退出登录失败');
        }
      },
    });
  };

  const handleCreateRoom = async (options: { name: string; topic?: string }) => {
    if (isCreatingRoom) return;
    setIsCreatingRoom(true);
    try {
      const result = await createRoom({
        name: options.name,
        topic: options.topic,
        isDirect: false,
      });
      if (result) {
        message.success(`房间 "${options.name}" 创建成功`);
        await getRooms();
        setSelectedRoomId(result);
        setIsCreateDialogOpen(false);
      } else {
        message.error('创建房间失败');
      }
    } catch (error: any) {
      message.error(error.message || '创建房间失败');
    } finally {
      setIsCreatingRoom(false);
    }
  };

  const handleDeleteRoom = async (roomId: string): Promise<{ success: boolean; method?: string; message?: string }> => {
    try {
      const result = await deleteRoomIntelligent(roomId);
      if (result.success) {
        message.success(result.message || '房间已删除');

        // 如果删除的是当前选中的房间，清空选中状态
        if (selectedRoomId === roomId) {
          setSelectedRoomId(null);
        }

        return { success: true, method: result.method, message: result.message };
      } else {
        message.error('删除房间失败');
        return { success: false };
      }
    } catch (error: any) {
      message.error(error.message || '删除房间失败');
      return { success: false };
    }
  };

  const handleOpenCreateDialog = () => setIsCreateDialogOpen(true);
  const handleCloseCreateDialog = () => setIsCreateDialogOpen(false);

  useEffect(() => {
    if (window.electronAPI?.onRoomDeleted) {
      const unsubscribe = window.electronAPI.onRoomDeleted((roomId: string) => {
        if (selectedRoomId === roomId) {
          setSelectedRoomId(null);
        }
        getRooms();
      });
      return unsubscribe;
    }
  }, [selectedRoomId, getRooms]);

  if (!selectedRoom) {
    return (
      <>
        <div style={{ display: 'flex', height: '100vh' }}>
          <RoomList
            rooms={formattedRooms}
            selectedRoomId={selectedRoomId}
            onRoomSelect={setSelectedRoomId}
            onLogoutClick={handleLogoutClick}
            onCreateRoomClick={handleOpenCreateDialog}
            onDeleteRoom={handleDeleteRoom}
          />
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15, 23, 42, 0.8)' }}>
            <div style={{ textAlign: 'center' }}>
              <h2 style={{ color: '#f1f5f9', marginBottom: 16 }}>欢迎使用 SmartClaw</h2>
              <p style={{ color: '#94a3b8', marginBottom: 24 }}>选择一个房间开始聊天</p>
              {error && <div style={{ color: '#ef4444', padding: 12, background: 'rgba(239, 68, 68, 0.1)', borderRadius: 8 }}>{error}</div>}
            </div>
          </div>
        </div>
        <CreateRoomDialog isOpen={isCreateDialogOpen} onClose={handleCloseCreateDialog} onCreateRoom={handleCreateRoom} isLoading={isCreatingRoom} checkRoomNameExists={checkRoomNameExists} />
      </>
    );
  }

  return (
    <>
      <div style={{ display: 'flex', height: '100vh' }}>
        <RoomList
          rooms={formattedRooms}
          selectedRoomId={selectedRoomId}
          onRoomSelect={setSelectedRoomId}
          onLogoutClick={handleLogoutClick}
          onCreateRoomClick={handleOpenCreateDialog}
          onDeleteRoom={handleDeleteRoom}
        />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'rgba(15, 23, 42, 0.8)' }}>
          <RoomHeader room={selectedRoom} />
          <MessageList messages={formattedMessages} currentUserId={session?.userId} isLoading={isLoading} ref={messageListRef} />
          <TypingIndicator roomId={selectedRoomId} typingUsers={typingUsers} />
          <MessageInput onSend={handleSendMessage} disabled={isLoading} />
        </div>
      </div>
      <CreateRoomDialog isOpen={isCreateDialogOpen} onClose={handleCloseCreateDialog} onCreateRoom={handleCreateRoom} isLoading={isCreatingRoom} checkRoomNameExists={checkRoomNameExists} />
    </>
  );
};

export default ChatWindow;
