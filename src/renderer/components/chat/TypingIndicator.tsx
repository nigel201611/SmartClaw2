// src/renderer/components/chat/TypingIndicator.tsx
import React, { useEffect, useState } from 'react';
import { Space, Typography } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';

const { Text } = Typography;

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
    <div
      style={{
        padding: '8px 24px',
        borderTop: '1px solid #f0f0f0',
        backgroundColor: '#fafafa',
      }}
    >
      <Space>
        <LoadingOutlined style={{ color: '#667eea' }} />
        <Text type="secondary" style={{ fontSize: 12 }}>
          {displayText}
        </Text>
      </Space>
    </div>
  );
};
