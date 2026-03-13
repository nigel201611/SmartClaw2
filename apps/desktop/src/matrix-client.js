/**
 * Matrix Client for SmartClaw
 * 
 * Handles Matrix SDK integration for real-time messaging
 */

class MatrixClient {
  constructor() {
    this.sdk = null;
    this.client = null;
    this.isConnected = false;
    this.listeners = new Map();
  }

  /**
   * Initialize Matrix client
   */
  async initialize(config) {
    try {
      // Dynamic import for matrix-js-sdk
      const { createClient } = await import('matrix-js-sdk');
      
      this.client = createClient({
        baseUrl: config.homeserverUrl,
        accessToken: config.accessToken,
        userId: config.userId,
      });

      // Set up event listeners
      this.client.on('sync', (state, prevState, data) => {
        this.handleSyncState(state, prevState, data);
      });

      this.client.on('Room.timeline', (event, room, toStartOfTimeline) => {
        if (toStartOfTimeline) return;
        this.handleTimelineEvent(event, room);
      });

      console.log('Matrix client initialized');
      return true;
    } catch (error) {
      console.error('Failed to initialize Matrix client:', error);
      return false;
    }
  }

  /**
   * Handle sync state changes
   */
  handleSyncState(state, prevState, data) {
    console.log('Matrix sync state:', state);
    
    if (state === 'PREPARED' && prevState === 'PREPARED') {
      this.isConnected = true;
      this.emit('connected', { state });
    } else if (state === 'ERROR') {
      this.isConnected = false;
      this.emit('disconnected', { state, error: data?.error });
    }
  }

  /**
   * Handle timeline events (new messages)
   */
  handleTimelineEvent(event, room) {
    if (event.getType() !== 'm.room.message') return;
    
    const content = event.getContent();
    const message = {
      eventId: event.getId(),
      roomId: room.roomId,
      sender: event.getSender(),
      body: content.body,
      msgtype: content.msgtype,
      timestamp: event.getTs(),
    };

    this.emit('message', message);
  }

  /**
   * Start Matrix client sync
   */
  async startSync() {
    if (!this.client) {
      throw new Error('Matrix client not initialized');
    }

    try {
      await this.client.startClient({
        initialSyncLimit: 50,
      });
      console.log('Matrix sync started');
    } catch (error) {
      console.error('Failed to start Matrix sync:', error);
      throw error;
    }
  }

  /**
   * Send a message to a room
   */
  async sendMessage(roomId, message) {
    if (!this.client || !this.isConnected) {
      throw new Error('Matrix client not connected');
    }

    try {
      const response = await this.client.sendTextMessage(roomId, message);
      console.log('Message sent:', response);
      return response;
    } catch (error) {
      console.error('Failed to send message:', error);
      throw error;
    }
  }

  /**
   * Get user's rooms
   */
  getRooms() {
    if (!this.client) return [];
    return this.client.getRooms();
  }

  /**
   * Join a room by ID or alias
   */
  async joinRoom(roomIdOrAlias) {
    if (!this.client) {
      throw new Error('Matrix client not initialized');
    }

    try {
      const room = await this.client.joinRoom(roomIdOrAlias);
      console.log('Joined room:', room.roomId);
      return room;
    } catch (error) {
      console.error('Failed to join room:', error);
      throw error;
    }
  }

  /**
   * Event emitter helpers
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  off(event, callback) {
    if (!this.listeners.has(event)) return;
    const callbacks = this.listeners.get(event);
    const index = callbacks.indexOf(callback);
    if (index > -1) {
      callbacks.splice(index, 1);
    }
  }

  emit(event, data) {
    if (!this.listeners.has(event)) return;
    this.listeners.get(event).forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error('Error in Matrix event listener:', error);
      }
    });
  }

  /**
   * Stop Matrix client
   */
  stop() {
    if (this.client) {
      this.client.stopClient();
      this.isConnected = false;
      console.log('Matrix client stopped');
    }
  }
}

// Export singleton instance
const matrixClient = new MatrixClient();

// Bridge to Electron IPC
if (window.electronAPI) {
  matrixClient.on('connected', (data) => {
    // Could send to main process via IPC if needed
    console.log('Matrix connected:', data);
  });

  matrixClient.on('message', (data) => {
    // Could send to main process via IPC if needed
    console.log('Matrix message:', data);
  });
}

export default matrixClient;
export { MatrixClient };
