#!/usr/bin/env node

/**
 * SmartClaw Agent Core
 * 
 * Main agent logic:
 * - Initialize components
 * - Manage lifecycle
 * - Handle coordination
 */

const MatrixClient = require('./matrix-client');
const MessageHandler = require('./message-handler');
const logger = require('./logger');

class Agent {
  constructor(config) {
    this.config = config;
    this.matrixClient = null;
    this.messageHandler = null;
    this.running = false;
  }

  /**
   * Initialize and start the agent
   */
  async start() {
    logger.info('Starting SmartClaw Agent...');
    
    try {
      // Initialize Matrix client
      this.matrixClient = new MatrixClient(this.config);
      await this.matrixClient.connect();

      // Initialize message handler
      this.messageHandler = new MessageHandler(this.config, this.matrixClient);

      // Setup message listener
      this.matrixClient.on('message', async (message) => {
        await this.messageHandler.handleMessage(message);
      });

      // Join configured rooms
      if (this.config.matrix.rooms && this.config.matrix.rooms.length > 0) {
        for (const room of this.config.matrix.rooms) {
          await this.matrixClient.joinRoom(room);
        }
      }

      // Setup error handling
      this.matrixClient.on('error', async (error) => {
        logger.error(`Agent error: ${error.message}`);
        await this.handleReconnect();
      });

      this.running = true;
      logger.info('SmartClaw Agent started successfully');
      logger.info(`Listening for messages as ${this.config.matrix.userId}`);
      
      return this;
    } catch (error) {
      logger.error(`Failed to start agent: ${error.message}`);
      throw error;
    }
  }

  /**
   * Stop the agent
   */
  async stop() {
    logger.info('Stopping SmartClaw Agent...');
    
    try {
      this.running = false;
      
      if (this.matrixClient) {
        await this.matrixClient.disconnect();
      }
      
      logger.info('SmartClaw Agent stopped');
    } catch (error) {
      logger.error(`Error stopping agent: ${error.message}`);
      throw error;
    }
  }

  /**
   * Handle reconnection on errors
   */
  async handleReconnect() {
    if (!this.running) return;
    
    logger.info('Attempting to reconnect...');
    
    const maxRetries = 5;
    const retryDelay = 5000; // 5 seconds
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        logger.info(`Reconnection attempt ${i + 1}/${maxRetries}`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        
        if (this.matrixClient) {
          await this.matrixClient.disconnect();
        }
        
        this.matrixClient = new MatrixClient(this.config);
        await this.matrixClient.connect();
        
        logger.info('Reconnection successful');
        return;
      } catch (error) {
        logger.warn(`Reconnection failed: ${error.message}`);
      }
    }
    
    logger.error('Max reconnection attempts reached');
  }

  /**
   * Check agent health
   */
  isHealthy() {
    return this.running && this.matrixClient?.connected;
  }

  /**
   * Get agent status
   */
  getStatus() {
    return {
      running: this.running,
      connected: this.matrixClient?.connected || false,
      userId: this.config.matrix.userId,
      server: this.config.matrix.server,
      gateway: this.config.gateway.url
    };
  }
}

module.exports = Agent;
