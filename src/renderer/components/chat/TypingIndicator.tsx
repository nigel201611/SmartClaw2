/**
 * SmartClaw Typing Indicator Component
 * 
 * 输入状态指示器
 */

import React, { useState, useEffect } from 'react';

interface TypingIndicatorProps {
  roomId: string | null;
}

/**
 * 输入状态指示器组件
 */
export const TypingIndicator: React.FC<TypingIndicatorProps> = ({ roomId }) => {
  const [typingUsers, setTypingUsers] = useState<string[]>([]);

  // TODO: 实现真实的输入状态监听
  // 这里使用模拟数据演示
  useEffect(() => {
    if (!roomId) {
      setTypingUsers([]);
      return;
    }

    // 模拟：监听 Matrix 输入状态事件
    // 实际实现需要订阅 matrix:typing 事件
    
    // 示例：模拟用户输入
    const timer = setTimeout(() => {
      // setTypingUsers(['user1']);
    }, 0);

    return () => clearTimeout(timer);
  }, [roomId]);

  // 生成显示文本
  const getTypingText = (): string => {
    if (typingUsers.length === 0) {
      return '';
    } else if (typingUsers.length === 1) {
      return `${typingUsers[0]} 正在输入...`;
    } else if (typingUsers.length === 2) {
      return `${typingUsers[0]} 和 ${typingUsers[1]} 正在输入...`;
    } else {
      return `${typingUsers.length} 人正在输入...`;
    }
  };

  if (typingUsers.length === 0) {
    return null;
  }

  return (
    <div className="typing-indicator">
      <div className="typing-dots">
        <span className="dot"></span>
        <span className="dot"></span>
        <span className="dot"></span>
      </div>
      <span className="typing-text">{getTypingText()}</span>
    </div>
  );
};

export default TypingIndicator;
