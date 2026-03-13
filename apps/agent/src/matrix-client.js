#!/usr/bin/env node

/**
 * SmartClaw Matrix Client
 * 
 * Handles Matrix SDK integration:
 * - Connect to homeserver
 * - Authenticate
 * - Join rooms
 * - Listen for messages
 * - Send responses
 */

const sdk = require('matrix-js-sdk').default;
const logger = require('./logger');

class MatrixClient {
  constructor(config) {
    this.config = config;
    this.client = null;
    this.connected = false;
    this.eventHandlers = new Map();
  }

  /**
   * Initialize and connect to Matrix
   */
  async connect() {
    logger.info(`Connecting to Matrix server: ${this.config.matrix.server}`);
    
    try {
      // Create Matrix client
      this.client = sdk.createClient({
        baseUrl: this.config.matrix.server,
        accessToken: this.config.matrix.accessToken,
        userId: this.config.matrix.userId
      });

      // Start the client
      await this.client.startClient({
        initialSyncLimit: 100
      });

      // Wait for sync
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Connection timeout'));
        }, 30000);

        this.client.once('sync', (state) => {
          clearTimeout(timeout);
          if (state === 'PREPARED' || state === 'SYNCING') {
            logger.info('Matrix sync started');
            resolve();
          } else {
            reject(new Error(`Sync state: ${state}`));
          }
        });
      });

      this.connected = true;
      logger.info('Connected to Matrix successfully');
      
      // Setup event listeners
      this.setupEventListeners();
      
      return this.client;
    } catch (error) {
      logger.error(`Failed to connect to Matrix: ${error.message}`);
      throw error;
    }
  }

  /**
   * Setup Matrix event listeners
   */
  setupEventListeners() {
    // Room timeline events (messages)
    this.client.on('Room.timeline', (event, room, toStartOfTimeline) => {
      if (toStartOfTimeline) return; // Ignore old messages
      if (event.getType() !== 'm.room.message') return;
      if (event.getSender() === this.config.matrix.userId) return; // Ignore own messages
      
      this.emit('message', {
        event,
        room,
        sender: event.getSender(),
        content: event.getContent(),
        timestamp: event.getTs()
      });
    });

    // Sync state changes
    this.client.on('sync', (state, prevState) => {
      logger.debug(`Matrix sync state: ${state}`);
      this.emit('sync', { state, prevState });
    });

    // Error handling
    this.client.on('error', (error) => {
      logger.error(`Matrix client error: ${error.message}`);
      this.emit('error', error);
    });

    logger.debug('Matrix event listeners setup complete');
  }

  /**
   * Join a room by ID or alias
   */
  async joinRoom(roomIdOrAlias) {
    try {
      logger.info(`Joining room: ${roomIdOrAlias}`);
      const room = await this.client.joinRoom(roomIdOrAlias);
      logger.info(`Joined room: ${room.roomId}`);
      return room;
    } catch (error) {
      logger.error(`Failed to join room ${roomIdOrAlias}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Send a message to a room
   */
  async sendMessage(roomId, text, options = {}) {
    try {
      logger.debug(`Sending message to ${roomId}: ${text.substring(0, 50)}...`);
      
      const content = {
        msgtype: options.msgtype || 'm.text',
        body: text,
        format: options.format || 'org.matrix.custom.html',
        formatted_body: options.formattedBody || text
      };

      const response = await this.client.sendEvent(roomId, 'm.room.message', content);
      logger.debug(`Message sent: ${response.event_id}`);
      return response;
    } catch (error) {
      logger.error(`Failed to send message: ${error.message}`);
      throw error;
    }
  }

  /**
   * Send a typed response (reply to a message)
   */
  async sendReply(roomId, text, replyToEvent) {
    const content = {
      msgtype: 'm.text',
      body: `> <${replyToEvent.getSender()}> ${replyToEvent.getContent().body}\n\n${text}`,
      format: 'org.matrix.custom.html',
      formatted_body: `<mx-reply>
        <blockquote>
          <a href="https://matrix.to/#/${roomId}/${replyToEvent.getId()}">In reply to</a> 
          <a href="https://matrix.to/#/${replyToEvent.getSender()}">${replyToEvent.getSender()}</a>
          <br>
          ${replyToEvent.getContent().body}
        </blockquote>
      </mx-reply>${text}`
    };

    content['m.relates_to'] = {
      'm.in_reply_to': {
        event_id: replyToEvent.getId()
      }
    };

    return this.sendMessage(roomId, content.body, content);
  }

  /**
   * Register event handler
   */
  on(event, handler) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event).push(handler);
  }

  /**
   * Emit event to handlers
   */
  emit(event, data) {
    const handlers = this.eventHandlers.get(event) || [];
    handlers.forEach(handler => {
      try {
        handler(data);
      } catch (error) {
        logger.error(`Error in event handler for ${event}: ${error.message}`);
      }
    });
  }

  /**
   * Disconnect from Matrix
   */
  async disconnect() {
    if (this.client) {
      logger.info('Disconnecting from Matrix...');
      this.client.stopClient();
      this.connected = false;
      logger.info('Disconnected from Matrix');
    }
  }
}

module.exports = MatrixClient;
