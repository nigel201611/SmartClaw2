/**
 * SmartClaw Desktop Renderer
 * 
 * Frontend logic for the chat interface
 */

import matrixClient from './matrix-client.js';

// DOM Elements
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const messagesList = document.getElementById('messagesList');
const messagesContainer = document.getElementById('messagesContainer');
const connectionStatus = document.getElementById('connectionStatus');
const settingsBtn = document.getElementById('settingsBtn');
const settingsPanel = document.getElementById('settingsPanel');
const closeSettingsBtn = document.getElementById('closeSettingsBtn');
const saveSettingsBtn = document.getElementById('saveSettingsBtn');
const minimizeBtn = document.getElementById('minimizeBtn');
const maximizeBtn = document.getElementById('maximizeBtn');
const closeBtn = document.getElementById('closeBtn');

// Settings inputs
const matrixServerInput = document.getElementById('matrixServer');
const accessTokenInput = document.getElementById('accessToken');
const themeSelect = document.getElementById('theme');
const languageSelect = document.getElementById('language');

// State
let currentRoomId = null;

// Initialize app
async function init() {
  // Load saved settings
  loadSettings();
  
  // Set up event listeners
  setupEventListeners();
  
  // Initialize Matrix client
  await initializeMatrix();
  
  // Update UI with app info
  updateAppInfo();
  
  console.log('SmartClaw Desktop initialized');
}

/**
 * Set up event listeners
 */
function setupEventListeners() {
  // Send message
  sendBtn.addEventListener('click', sendMessage);
  messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      sendMessage();
    }
  });
  
  // Settings panel
  settingsBtn.addEventListener('click', () => {
    settingsPanel.classList.remove('hidden');
  });
  
  closeSettingsBtn.addEventListener('click', () => {
    settingsPanel.classList.add('hidden');
  });
  
  saveSettingsBtn.addEventListener('click', saveSettings);
  
  // Window controls
  if (window.electronAPI) {
    minimizeBtn.addEventListener('click', () => window.electronAPI.minimizeWindow());
    maximizeBtn.addEventListener('click', () => window.electronAPI.maximizeWindow());
    closeBtn.addEventListener('click', () => window.electronAPI.closeWindow());
  }
  
  // Matrix events
  matrixClient.on('connected', handleMatrixConnected);
  matrixClient.on('message', handleMatrixMessage);
  matrixClient.on('disconnected', handleMatrixDisconnected);
}

/**
 * Initialize Matrix client
 */
async function initializeMatrix() {
  const settings = loadSettings();
  
  if (!settings.homeserverUrl || !settings.accessToken) {
    console.log('Matrix not configured, showing settings');
    settingsPanel.classList.remove('hidden');
    return;
  }
  
  try {
    await matrixClient.initialize({
      homeserverUrl: settings.homeserverUrl,
      accessToken: settings.accessToken,
      userId: settings.userId,
    });
    
    await matrixClient.startSync();
    updateConnectionStatus('connected');
  } catch (error) {
    console.error('Failed to initialize Matrix:', error);
    updateConnectionStatus('error');
  }
}

/**
 * Send a message
 */
function sendMessage() {
  const content = messageInput.value.trim();
  if (!content) return;
  
  // Add message to UI
  addMessage(content, 'user');
  messageInput.value = '';
  
  // Send via Matrix if connected
  if (matrixClient.isConnected && currentRoomId) {
    matrixClient.sendMessage(currentRoomId, content)
      .catch(error => {
        console.error('Failed to send message:', error);
        // Show error in UI
        addMessage('Failed to send message. Please check your connection.', 'assistant');
      });
  } else {
    // Placeholder response for demo
    setTimeout(() => {
      addMessage('This is a demo response. Configure Matrix to enable real messaging!', 'assistant');
    }, 500);
  }
}

/**
 * Add a message to the chat
 */
function addMessage(content, type) {
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${type}`;
  
  const avatar = type === 'user' ? '👤' : '🤖';
  const sender = type === 'user' ? 'You' : 'SmartClaw Assistant';
  const time = new Date().toLocaleTimeString();
  
  messageDiv.innerHTML = `
    <div class="message-avatar">${avatar}</div>
    <div class="message-content">
      <div class="message-header">
        <span class="message-sender">${sender}</span>
        <span class="message-time">${time}</span>
      </div>
      <div class="message-text">${escapeHtml(content)}</div>
    </div>
  `;
  
  messagesList.appendChild(messageDiv);
  scrollToBottom();
}

/**
 * Handle Matrix connected event
 */
function handleMatrixConnected(data) {
  console.log('Matrix connected:', data);
  updateConnectionStatus('connected');
  
  // Get rooms and select first one
  const rooms = matrixClient.getRooms();
  if (rooms.length > 0) {
    currentRoomId = rooms[0].roomId;
    console.log('Selected room:', currentRoomId);
  }
}

/**
 * Handle Matrix message event
 */
function handleMatrixMessage(data) {
  console.log('Matrix message:', data);
  
  // Don't show own messages twice
  if (data.sender === matrixClient.client?.getUserId()) {
    return;
  }
  
  addMessage(data.body, 'assistant');
}

/**
 * Handle Matrix disconnected event
 */
function handleMatrixDisconnected(data) {
  console.log('Matrix disconnected:', data);
  updateConnectionStatus('disconnected');
}

/**
 * Update connection status UI
 */
function updateConnectionStatus(status) {
  const indicator = document.querySelector('.status-indicator');
  
  switch (status) {
    case 'connected':
      indicator.className = 'status-indicator online';
      connectionStatus.textContent = 'Connected';
      break;
    case 'disconnected':
      indicator.className = 'status-indicator offline';
      connectionStatus.textContent = 'Disconnected';
      break;
    case 'error':
      indicator.className = 'status-indicator offline';
      connectionStatus.textContent = 'Connection Error';
      break;
  }
}

/**
 * Scroll messages to bottom
 */
function scrollToBottom() {
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Save settings to localStorage
 */
function saveSettings() {
  const settings = {
    homeserverUrl: matrixServerInput.value.trim(),
    accessToken: accessTokenInput.value.trim(),
    theme: themeSelect.value,
    language: languageSelect.value,
  };
  
  localStorage.setItem('smartclaw-settings', JSON.stringify(settings));
  
  settingsPanel.classList.add('hidden');
  
  // Reinitialize Matrix with new settings
  initializeMatrix();
  
  console.log('Settings saved');
}

/**
 * Load settings from localStorage
 */
function loadSettings() {
  const saved = localStorage.getItem('smartclaw-settings');
  
  if (saved) {
    try {
      const settings = JSON.parse(saved);
      
      if (settings.homeserverUrl) {
        matrixServerInput.value = settings.homeserverUrl;
      }
      if (settings.accessToken) {
        accessTokenInput.value = settings.accessToken;
      }
      if (settings.theme) {
        themeSelect.value = settings.theme;
      }
      if (settings.language) {
        languageSelect.value = settings.language;
      }
      
      return settings;
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  }
  
  return {};
}

/**
 * Update app info from Electron
 */
async function updateAppInfo() {
  if (window.electronAPI) {
    try {
      const version = await window.electronAPI.getVersion();
      const platform = await window.electronAPI.getPlatform();
      document.title = `SmartClaw v${version} - ${platform}`;
      console.log(`SmartClaw v${version} on ${platform}`);
    } catch (error) {
      console.error('Failed to get app info:', error);
    }
  }
}

// Initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
