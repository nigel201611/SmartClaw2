// TypingIndicator.tsx
import React, { useEffect, useState } from 'react';

interface TypingIndicatorProps {
  roomId: string | null;
  typingUsers?: string[];
}

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({ roomId, typingUsers = [] }) => {
  const [displayText, setDisplayText] = useState('');

  useEffect(() => {
    if (typingUsers.length === 0) {
      setDisplayText('');
    } else if (typingUsers.length === 1) {
      setDisplayText(`${typingUsers[0]} 正在输入...`);
    } else if (typingUsers.length === 2) {
      setDisplayText(`${typingUsers[0]} 和 ${typingUsers[1]} 正在输入...`);
    } else {
      setDisplayText(`${typingUsers.length} 个人正在输入...`);
    }
  }, [typingUsers]);

  if (!displayText) return null;

  return (
    <div className="typing-indicator">
      <div className="typing-dots">
        <span></span>
        <span></span>
        <span></span>
      </div>
      <span>{displayText}</span>
    </div>
  );
};
