/**
 * SmartClaw Message Input Component
 * 
 * 消息输入框
 */

import React, { useState, useRef, useEffect } from 'react';

interface MessageInputProps {
  onSend: (text: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

/**
 * 消息输入组件
 */
export const MessageInput: React.FC<MessageInputProps> = ({
  onSend,
  disabled = false,
  placeholder = '输入消息...'
}) => {
  const [message, setMessage] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 自动调整文本框高度
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [message]);

  // 处理发送
  const handleSend = () => {
    const text = message.trim();
    if (!text || disabled) return;
    
    onSend(text);
    setMessage('');
    
    // 重置高度
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  // 处理键盘事件
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // 处理粘贴（纯文本）
  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    // 可选：处理粘贴的图片等
  };

  return (
    <div className={`message-input ${isFocused ? 'focused' : ''} ${disabled ? 'disabled' : ''}`}>
      <div className="input-wrapper">
        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onPaste={handlePaste}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          className="message-textarea"
        />
        
        <div className="input-actions">
          <button
            className="btn-emoji"
            title="表情"
            disabled={disabled}
          >
            😊
          </button>
          
          <button
            className="btn-format"
            title="格式化"
            disabled={disabled}
          >
            **B**
          </button>
          
          <button
            className="btn-send"
            onClick={handleSend}
            disabled={disabled || !message.trim()}
            title="发送 (Enter)"
          >
            <span className="send-icon">➤</span>
          </button>
        </div>
      </div>
      
      <div className="input-hints">
        <span>按 Enter 发送，Shift + Enter 换行</span>
        <span>支持 **粗体** *斜体* `代码`</span>
      </div>
    </div>
  );
};

export default MessageInput;
