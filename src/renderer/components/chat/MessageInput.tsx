// MessageInput.tsx - 优化的消息输入组件
import React, { useState, KeyboardEvent } from 'react';

interface MessageInputProps {
  onSend: (text: string) => void;
  disabled?: boolean;
}

export const MessageInput: React.FC<MessageInputProps> = ({ onSend, disabled }) => {
  const [message, setMessage] = useState('');

  const handleSend = () => {
    if (message.trim() && !disabled) {
      onSend(message.trim());
      setMessage('');
    }
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    // 自动调整高度
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px';
  };

  return (
    <div className="message-input-container">
      <div className="input-wrapper">
        <textarea className="message-input" value={message} onChange={handleInput} onKeyPress={handleKeyPress} placeholder="输入消息... (Enter 发送，Shift+Enter 换行)" disabled={disabled} rows={1} />
        <button className="send-btn" onClick={handleSend} disabled={!message.trim() || disabled}>
          <span>📤</span>
          <span>发送</span>
        </button>
      </div>
    </div>
  );
};
