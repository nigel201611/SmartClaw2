// CreateRoomDialog.tsx
import React, { useState, useEffect } from 'react';

interface CreateRoomDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateRoom: (options: { name: string; topic?: string; isDirect?: boolean; inviteUserIds?: string[] }) => Promise<void>;
  isLoading?: boolean;
}

export const CreateRoomDialog: React.FC<CreateRoomDialogProps> = ({ isOpen, onClose, onCreateRoom, isLoading = false }) => {
  const [roomName, setRoomName] = useState('');
  const [roomTopic, setRoomTopic] = useState('');
  const [isDirect, setIsDirect] = useState(false);
  const [inviteUsers, setInviteUsers] = useState('');
  const [errors, setErrors] = useState<{ name?: string }>({});

  // 重置表单
  useEffect(() => {
    if (isOpen) {
      setRoomName('');
      setRoomTopic('');
      setIsDirect(false);
      setInviteUsers('');
      setErrors({});
    }
  }, [isOpen]);

  const validateForm = (): boolean => {
    const newErrors: { name?: string } = {};

    if (!roomName.trim()) {
      newErrors.name = '房间名称不能为空';
    } else if (roomName.length > 50) {
      newErrors.name = '房间名称不能超过50个字符';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const inviteUserIds = inviteUsers
      .split(/[,\s]+/)
      .map((id) => id.trim())
      .filter((id) => id);

    await onCreateRoom({
      name: roomName.trim(),
      topic: roomTopic.trim() || undefined,
      isDirect,
      inviteUserIds: inviteUserIds.length > 0 ? inviteUserIds : undefined,
    });
  };

  const handleClose = () => {
    if (!isLoading) {
      onClose();
    }
  };

  // 点击遮罩层关闭
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !isLoading) {
      onClose();
    }
  };

  // ESC 键关闭
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isLoading) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [isOpen, isLoading, onClose]);

  if (!isOpen) return null;

  return (
    <div className="dialog-overlay" onClick={handleOverlayClick}>
      <div className="create-room-dialog">
        <div className="dialog-header">
          <h2>创建新房间</h2>
          <button className="dialog-close" onClick={handleClose} disabled={isLoading} aria-label="关闭">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="roomName">
              房间名称 <span className="required">*</span>
            </label>
            <input
              id="roomName"
              type="text"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              placeholder="输入房间名称"
              maxLength={50}
              autoFocus
              className={errors.name ? 'error' : ''}
              disabled={isLoading}
            />
            {errors.name && <span className="error-message">{errors.name}</span>}
            <span className="char-count">{roomName.length}/50</span>
          </div>

          <div className="form-group">
            <label htmlFor="roomTopic">房间主题</label>
            <input id="roomTopic" type="text" value={roomTopic} onChange={(e) => setRoomTopic(e.target.value)} placeholder="可选，描述房间主题" maxLength={200} disabled={isLoading} />
            <span className="char-count">{roomTopic.length}/200</span>
          </div>

          {/* <div className="form-group">
            <label className="checkbox-label">
              <input type="checkbox" checked={isDirect} onChange={(e) => setIsDirect(e.target.checked)} disabled={isLoading} />
              <span>私密房间（仅限邀请的用户加入）</span>
            </label>
          </div>

          <div className="form-group">
            <label htmlFor="inviteUsers">邀请用户（可选）</label>
            <input id="inviteUsers" type="text" value={inviteUsers} onChange={(e) => setInviteUsers(e.target.value)} placeholder="输入用户ID，多个用逗号或空格分隔" disabled={isLoading} />
            <span className="hint-text">例如：@user1:matrix.org, @user2:matrix.org</span>
          </div> */}

          <div className="dialog-footer">
            <button type="button" className="btn-cancel" onClick={handleClose} disabled={isLoading}>
              取消
            </button>
            <button type="submit" className="btn-create" disabled={isLoading}>
              {isLoading ? (
                <>
                  <span className="spinner"></span>
                  创建中...
                </>
              ) : (
                '创建房间'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
