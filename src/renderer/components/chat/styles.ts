/**
 * SmartClaw Chat Components Styles
 * 
 * 聊天界面组件样式
 */

export const chatStyles = `
/* ========== Chat Window ========== */
.chat-window {
  display: flex;
  height: 100vh;
  overflow: hidden;
}

.chat-window.empty .chat-main {
  background: #f8fafc;
}

.chat-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: white;
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}

.empty-content {
  text-align: center;
  color: #64748b;
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
}

.empty-content h2 {
  font-size: 1.5rem;
  margin-bottom: 0.5rem;
  color: #334155;
}

.empty-content .error {
  color: #ef4444;
  margin-top: 1rem;
}

/* ========== Room List ========== */
.room-list {
  width: 300px;
  min-width: 300px;
  background: #f1f5f9;
  border-right: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  transition: all 0.3s ease;
}

.room-list.collapsed {
  width: 60px;
  min-width: 60px;
}

.room-list-header {
  padding: 1rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #e2e8f0;
}

.room-list-header h2 {
  font-size: 1.25rem;
  font-weight: 600;
  color: #1e293b;
}

.collapse-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.25rem 0.5rem;
  font-size: 1rem;
  color: #64748b;
}

.room-list-actions {
  padding: 0.75rem 1rem;
}

.btn-new-room {
  width: 100%;
  padding: 0.5rem;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
}

.room-list-search {
  padding: 0 1rem 0.75rem;
}

.search-input {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-size: 0.875rem;
}

.room-list-content {
  flex: 1;
  overflow-y: auto;
}

.empty-rooms {
  padding: 2rem 1rem;
  text-align: center;
  color: #64748b;
}

.btn-create {
  margin-top: 1rem;
  padding: 0.5rem 1rem;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

.room-list-footer {
  padding: 1rem;
  border-top: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.avatar {
  width: 32px;
  height: 32px;
  background: #3b82f6;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.875rem;
}

.btn-logout {
  padding: 0.25rem 0.75rem;
  background: #ef4444;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.875rem;
}

/* ========== Room Item ========== */
.room-item {
  display: flex;
  padding: 0.75rem 1rem;
  cursor: pointer;
  transition: background 0.2s;
  gap: 0.75rem;
}

.room-item:hover {
  background: #e2e8f0;
}

.room-item.selected {
  background: #dbeafe;
  border-left: 3px solid #3b82f6;
}

.room-avatar {
  flex-shrink: 0;
}

.avatar-direct,
.avatar-group {
  width: 40px;
  height: 40px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
}

.room-content {
  flex: 1;
  min-width: 0;
}

.room-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.25rem;
}

.room-name {
  font-size: 0.9375rem;
  font-weight: 500;
  color: #1e293b;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.room-time {
  font-size: 0.75rem;
  color: #94a3b8;
  flex-shrink: 0;
}

.room-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.room-last-message {
  font-size: 0.8125rem;
  color: #64748b;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.unread-badge {
  background: #ef4444;
  color: white;
  font-size: 0.6875rem;
  font-weight: 600;
  padding: 0.125rem 0.5rem;
  border-radius: 9999px;
  min-width: 20px;
  text-align: center;
}

/* ========== Room Header ========== */
.room-header {
  padding: 1rem 1.5rem;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: white;
}

.room-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.room-details {
  display: flex;
  flex-direction: column;
}

.room-details .room-name {
  font-size: 1.125rem;
  font-weight: 600;
  color: #1e293b;
}

.room-topic,
.room-members {
  font-size: 0.875rem;
  color: #64748b;
}

.room-actions {
  display: flex;
  gap: 0.5rem;
}

.btn-action,
.btn-logout-small {
  padding: 0.5rem;
  background: none;
  border: none;
  cursor: pointer;
  border-radius: 6px;
  font-size: 1rem;
  color: #64748b;
}

.btn-action:hover,
.btn-logout-small:hover {
  background: #f1f5f9;
}

.btn-logout-small {
  background: #ef4444;
  color: white;
  padding: 0.5rem 1rem;
}

/* ========== Message List ========== */
.message-list {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
}

.message-list.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}

.loading-spinner {
  text-align: center;
  color: #64748b;
}

.message-group {
  margin-bottom: 1.5rem;
}

.message-date-separator {
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 1rem 0;
}

.message-date-separator span {
  background: #f1f5f9;
  color: #64748b;
  font-size: 0.75rem;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
}

/* ========== Message Item ========== */
.message-item {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 1rem;
  padding: 0.25rem;
}

.message-item.show-avatar {
  margin-top: 1rem;
}

.message-item.own {
  flex-direction: row-reverse;
}

.message-avatar {
  flex-shrink: 0;
}

.message-avatar .avatar {
  width: 36px;
  height: 36px;
  font-size: 0.75rem;
}

.message-avatar .avatar.own {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
}

.message-content {
  flex: 1;
  max-width: 70%;
}

.message-item.own .message-content {
  max-width: 70%;
}

.message-sender {
  font-size: 0.8125rem;
  color: #64748b;
  margin-bottom: 0.25rem;
}

.message-bubble {
  background: #f1f5f9;
  padding: 0.75rem 1rem;
  border-radius: 12px;
  position: relative;
}

.message-item.own .message-bubble {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: white;
}

.message-text {
  font-size: 0.9375rem;
  line-height: 1.5;
  word-wrap: break-word;
}

.message-text code {
  background: rgba(0, 0, 0, 0.1);
  padding: 0.125rem 0.375rem;
  border-radius: 4px;
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 0.875rem;
}

.message-item.own .message-text code {
  background: rgba(255, 255, 255, 0.2);
}

.message-meta {
  opacity: 0;
  transition: opacity 0.2s;
  margin-top: 0.25rem;
  text-align: right;
}

.message-meta.visible {
  opacity: 1;
}

.message-time {
  font-size: 0.6875rem;
  color: #94a3b8;
}

.message-item.own .message-time {
  color: rgba(255, 255, 255, 0.7);
}

/* ========== Message Input ========== */
.message-input {
  padding: 1rem 1.5rem;
  border-top: 1px solid #e2e8f0;
  background: white;
}

.input-wrapper {
  display: flex;
  align-items: flex-end;
  gap: 0.5rem;
  background: #f1f5f9;
  border: 2px solid transparent;
  border-radius: 12px;
  padding: 0.5rem;
  transition: border-color 0.2s;
}

.message-input.focused .input-wrapper {
  border-color: #3b82f6;
}

.message-input.disabled .input-wrapper {
  opacity: 0.5;
}

.message-textarea {
  flex: 1;
  border: none;
  background: transparent;
  padding: 0.5rem;
  font-size: 0.9375rem;
  resize: none;
  max-height: 200px;
  min-height: 24px;
  outline: none;
  font-family: inherit;
}

.input-actions {
  display: flex;
  gap: 0.25rem;
}

.btn-emoji,
.btn-format {
  padding: 0.5rem;
  background: none;
  border: none;
  cursor: pointer;
  border-radius: 6px;
  font-size: 1.25rem;
}

.btn-emoji:hover,
.btn-format:hover {
  background: #e2e8f0;
}

.btn-send {
  padding: 0.5rem 1rem;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1rem;
  transition: background 0.2s;
}

.btn-send:hover:not(:disabled) {
  background: #2563eb;
}

.btn-send:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.input-hints {
  margin-top: 0.5rem;
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
  color: #94a3b8;
}

/* ========== Typing Indicator ========== */
.typing-indicator {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1.5rem;
  font-size: 0.875rem;
  color: #64748b;
}

.typing-dots {
  display: flex;
  gap: 0.25rem;
}

.typing-dots .dot {
  width: 6px;
  height: 6px;
  background: #94a3b8;
  border-radius: 50%;
  animation: typing 1.4s infinite;
}

.typing-dots .dot:nth-child(2) {
  animation-delay: 0.2s;
}

.typing-dots .dot:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes typing {
  0%, 60%, 100% {
    transform: translateY(0);
    opacity: 0.4;
  }
  30% {
    transform: translateY(-4px);
    opacity: 1;
  }
}
`;

export default chatStyles;
