// TypingIndicator.tsx - 打字指示器组件
import React, { useEffect, useState } from 'react';

interface TypingIndicatorProps {
  roomId: string | null;
}

// 模拟打字状态（实际应从 Matrix SDK 获取）
export const TypingIndicator: React.FC<TypingIndicatorProps> = ({ roomId }) => {
  const [typingUsers, setTypingUsers] = useState<string[]>([]);

  useEffect(() => {
    if (!roomId) return;

    // 这里应该监听 Matrix 的 typing 事件
    // 现在是模拟数据
    const interval = setInterval(() => {
      // 随机模拟有人正在输入
      const hasTyping = Math.random() > 0.7;
      setTypingUsers(hasTyping ? ['someone'] : []);
    }, 5000);

    return () => clearInterval(interval);
  }, [roomId]);

  if (typingUsers.length === 0) return null;

  return (
    <div className="typing-indicator">
      <div className="typing-dots">
        <span></span>
        <span></span>
        <span></span>
      </div>
      <span>有人正在输入...</span>
    </div>
  );
};
