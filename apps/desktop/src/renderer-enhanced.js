#!/usr/bin/env node

/**
 * SmartClaw Desktop App - Enhanced Renderer
 * Phase 7: UI Refinement
 * 
 * Features:
 * - Theme toggle (dark/light)
 * - Markdown rendering
 * - Typing indicators
 * - Message formatting
 * - Room management
 */

const { ipcRenderer } = require('electron');

// DOM Elements
const elements = {
  messagesContainer: document.getElementById('messagesContainer'),
  messagesList: document.getElementById('messagesList'),
  messageInput: document.getElementById('messageInput'),
  sendBtn: document.getElementById('sendBtn'),
  settingsBtn: document.getElementById('settingsBtn'),
  settingsPanel: document.getElementById('settingsPanel'),
  closeSettingsBtn: document.getElementById('closeSettingsBtn'),
  saveSettingsBtn: document.getElementById('saveSettingsBtn'),
  connectionStatus: document.getElementById('connectionStatus'),
  conversationList: document.getElementById('conversationList'),
  themeSelect: document.getElementById('theme'),
  userName: document.getElementById('userName')
};

// State
const state = {
  currentTheme: localStorage.getItem('theme') || 'dark',
  isSettingsOpen: false,
  isTyping: false,
  messages: [],
  rooms: []
};

// ========================================
// Initialization
// ========================================

function init() {
  console.log('SmartClaw Desktop App - Enhanced UI');
  
  // Apply saved theme
  applyTheme(state.currentTheme);
  
  // Setup event listeners
  setupEventListeners();
  
  // Load saved settings
  loadSettings();
  
  // Initialize Matrix client
  initializeMatrixClient();
  
  console.log('UI initialized');
}

// ========================================
// Theme Management
// ========================================

function applyTheme(theme) {
  state.currentTheme = theme;
  localStorage.setItem('theme', theme);
  
  if (theme === 'light') {
    document.body.classList.add('light-theme');
  } else {
    document.body.classList.remove('light-theme');
  }
  
  if (elements.themeSelect) {
    elements.themeSelect.value = theme;
  }
  
  console.log(`Theme applied: ${theme}`);
}

function toggleTheme() {
  const newTheme = state.currentTheme === 'dark' ? 'light' : 'dark';
  applyTheme(newTheme);
}

// ========================================
// Settings Panel
// ========================================

function openSettings() {
  if (elements.settingsPanel) {
    elements.settingsPanel.classList.remove('hidden');
    state.isSettingsOpen = true;
  }
}

function closeSettings() {
  if (elements.settingsPanel) {
    elements.settingsPanel.classList.add('hidden');
    state.isSettingsOpen = false;
  }
}

function saveSettings() {
  const settings = {
    theme: elements.themeSelect?.value || 'dark',
    matrixServer: document.getElementById('matrixServer')?.value,
    accessToken: document.getElementById('accessToken')?.value
  };
  
  localStorage.setItem('smartclaw-settings', JSON.stringify(settings));
  applyTheme(settings.theme);
  
  // Show save confirmation
  showNotification('Settings saved successfully!', 'success');
  
  closeSettings();
}

function loadSettings() {
  const saved = localStorage.getItem('smartclaw-settings');
  if (saved) {
    try {
      const settings = JSON.parse(saved);
      if (settings.theme) applyTheme(settings.theme);
      if (settings.matrixServer) {
        const serverInput = document.getElementById('matrixServer');
        if (serverInput) serverInput.value = settings.matrixServer;
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  }
}

// ========================================
// Message Rendering
// ========================================

function addMessage(message) {
  const { sender, text, timestamp, type = 'text' } = message;
  
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${sender === 'user' ? 'user' : 'assistant'}`;
  
  const avatar = sender === 'user' ? '👤' : '🤖';
  const time = formatTime(timestamp || new Date());
  
  // Render markdown if text type
  const renderedText = type === 'markdown' ? renderMarkdown(text) : escapeHtml(text);
  
  messageDiv.innerHTML = `
    <div class="message-avatar">${avatar}</div>
    <div class="message-content">
      <div class="message-header">
        <span class="message-sender">${sender === 'user' ? 'You' : 'SmartClaw'}</span>
        <span class="message-time">${time}</span>
      </div>
      <div class="message-text">${renderedText}</div>
    </div>
  `;
  
  elements.messagesList.appendChild(messageDiv);
  scrollToBottom();
  
  // Animate new message
  messageDiv.style.opacity = '0';
  messageDiv.style.transform = 'translateY(20px)';
  setTimeout(() => {
    messageDiv.style.transition = 'all 0.3s ease';
    messageDiv.style.opacity = '1';
    messageDiv.style.transform = 'translateY(0)';
  }, 10);
}

function showTypingIndicator() {
  if (state.isTyping) return;
  
  state.isTyping = true;
  
  const typingDiv = document.createElement('div');
  typingDiv.className = 'typing-indicator';
  typingDiv.id = 'typingIndicator';
  typingDiv.innerHTML = `
    <div class="typing-dots">
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
    </div>
    <span>SmartClaw is typing...</span>
  `;
  
  elements.messagesList.appendChild(typingDiv);
  scrollToBottom();
}

function hideTypingIndicator() {
  state.isTyping = false;
  const typingIndicator = document.getElementById('typingIndicator');
  if (typingIndicator) {
    typingIndicator.remove();
  }
}

// ========================================
// Markdown Rendering (Simple)
// ========================================

function renderMarkdown(text) {
  if (!text) return '';
  
  let html = escapeHtml(text);
  
  // Code blocks
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (match, lang, code) => {
    return `<pre><code class="language-${lang}">${code}</code></pre>`;
  });
  
  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  
  // Bold
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  
  // Italic
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  
  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  
  // Line breaks
  html = html.replace(/\n/g, '<br>');
  
  return html;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ========================================
// Utility Functions
// ========================================

function formatTime(date) {
  const d = new Date(date);
  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

function scrollToBottom() {
  elements.messagesContainer.scrollTo({
    top: elements.messagesContainer.scrollHeight,
    behavior: 'smooth'
  });
}

function showNotification(message, type = 'info') {
  console.log(`[${type.toUpperCase()}] ${message}`);
  
  // Could implement toast notifications here
  const colors = {
    success: '#4ade80',
    error: '#ef4444',
    warning: '#fbbf24',
    info: '#e94560'
  };
  
  console.log(`%c ${message}`, `color: ${colors[type] || colors.info}; font-weight: bold;`);
}

// ========================================
// Event Listeners
// ========================================

function setupEventListeners() {
  // Send message
  elements.sendBtn?.addEventListener('click', sendMessage);
  
  elements.messageInput?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });
  
  // Settings panel
  elements.settingsBtn?.addEventListener('click', openSettings);
  elements.closeSettingsBtn?.addEventListener('click', closeSettings);
  elements.saveSettingsBtn?.addEventListener('click', saveSettings);
  
  // Close settings on outside click
  document.addEventListener('click', (e) => {
    if (state.isSettingsOpen && 
        elements.settingsPanel && 
        !elements.settingsPanel.contains(e.target) &&
        !elements.settingsBtn.contains(e.target)) {
      closeSettings();
    }
  });
  
  // IPC events from main process
  ipcRenderer.on('matrix-message', (event, message) => {
    hideTypingIndicator();
    addMessage({
      sender: 'assistant',
      text: message.text,
      timestamp: message.timestamp
    });
  });
  
  ipcRenderer.on('matrix-connected', () => {
    updateConnectionStatus('Connected', true);
    showNotification('Connected to Matrix server', 'success');
  });
  
  ipcRenderer.on('matrix-disconnected', () => {
    updateConnectionStatus('Disconnected', false);
    showNotification('Disconnected from Matrix server', 'error');
  });
  
  ipcRenderer.on('matrix-typing', () => {
    showTypingIndicator();
  });
  
  // Theme toggle button
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  themeToggleBtn?.addEventListener('click', toggleTheme);
}

function sendMessage() {
  const text = elements.messageInput?.value?.trim();
  if (!text) return;
  
  // Add user message to UI
  addMessage({
    sender: 'user',
    text: text,
    timestamp: new Date()
  });
  
  // Clear input
  if (elements.messageInput) {
    elements.messageInput.value = '';
  }
  
  // Send to main process
  ipcRenderer.send('send-message', { text });
  
  // Show typing indicator after delay
  setTimeout(() => {
    showTypingIndicator();
  }, 500);
}

function updateConnectionStatus(text, connected) {
  if (elements.connectionStatus) {
    elements.connectionStatus.textContent = text;
  }
  
  const indicator = document.querySelector('.status-indicator');
  if (indicator) {
    indicator.classList.toggle('offline', !connected);
  }
}

// ========================================
// Matrix Client Integration
// ========================================

function initializeMatrixClient() {
  // This would integrate with the existing matrix-client.js
  // For now, we'll just simulate connection
  console.log('Initializing Matrix client...');
  
  setTimeout(() => {
    updateConnectionStatus('Connected', true);
    ipcRenderer.emit('matrix-connected');
  }, 1000);
}

// ========================================
// Room Management
// ========================================

function loadRooms() {
  // Load rooms from Matrix or local storage
  const savedRooms = localStorage.getItem('smartclaw-rooms');
  if (savedRooms) {
    try {
      state.rooms = JSON.parse(savedRooms);
      renderRoomList();
    } catch (error) {
      console.error('Failed to load rooms:', error);
    }
  }
}

function renderRoomList() {
  if (!elements.conversationList) return;
  
  elements.conversationList.innerHTML = '';
  
  state.rooms.forEach(room => {
    const roomDiv = document.createElement('div');
    roomDiv.className = `room-item ${room.active ? 'active' : ''} ${room.unread ? 'unread' : ''}`;
    roomDiv.innerHTML = `
      <div class="room-avatar">${room.avatar || '💬'}</div>
      <div class="room-info">
        <div class="room-name">${room.name}</div>
        <div class="room-preview">${room.preview || 'No messages yet'}</div>
      </div>
      <div class="room-meta">
        <span class="room-time">${formatTime(room.lastMessageTime)}</span>
        ${room.unreadCount ? `<span class="unread-badge">${room.unreadCount}</span>` : ''}
      </div>
    `;
    
    roomDiv.addEventListener('click', () => selectRoom(room.id));
    elements.conversationList.appendChild(roomDiv);
  });
}

function selectRoom(roomId) {
  state.rooms.forEach(room => {
    room.active = room.id === roomId;
    if (room.active) {
      room.unread = false;
      room.unreadCount = 0;
    }
  });
  
  localStorage.setItem('smartclaw-rooms', JSON.stringify(state.rooms));
  renderRoomList();
  
  // Load messages for selected room
  loadRoomMessages(roomId);
}

function loadRoomMessages(roomId) {
  // Load messages from storage or Matrix
  console.log('Loading messages for room:', roomId);
}

// ========================================
// Start Application
// ========================================

// Wait for DOM to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    addMessage,
    showTypingIndicator,
    hideTypingIndicator,
    applyTheme,
    toggleTheme
  };
}
