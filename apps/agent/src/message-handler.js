#!/usr/bin/env node

/**
 * SmartClaw Message Handler
 * 
 * Processes incoming messages:
 * - Parse message content
 * - Detect @mentions
 * - Route to appropriate handler
 * - Format responses
 */

const fetch = require('node-fetch');
const logger = require('./logger');

class MessageHandler {
  constructor(config, matrixClient) {
    this.config = config;
    this.matrixClient = matrixClient;
    this.agentId = config.agent.id;
  }

  /**
   * Process incoming message
   */
  async handleMessage(message) {
    const { event, room, sender, content } = message;
    
    logger.debug(`Processing message from ${sender} in ${room.roomId}`);
    
    try {
      // Extract message text
      const text = content.body;
      if (!text) {
        logger.debug('Empty message, ignoring');
        return;
      }

      // Check if message is for us (direct message or @mention)
      const isForUs = await this.isMessageForAgent(text, room.roomId);
      
      if (!isForUs) {
        logger.debug('Message not for agent, ignoring');
        return;
      }

      // Clean message text (remove @mention)
      const cleanText = this.cleanMessage(text);
      
      logger.info(`Processing message: ${cleanText.substring(0, 100)}...`);

      // Send typing indicator
      await this.sendTyping(room.roomId);

      // Process through LLM
      const response = await this.processWithLLM(cleanText, sender);

      // Send response
      if (response) {
        await this.matrixClient.sendReply(room.roomId, response, event);
        logger.info('Response sent successfully');
      }
    } catch (error) {
      logger.error(`Error processing message: ${error.message}`);
      await this.handleError(error, room.roomId, event);
    }
  }

  /**
   * Check if message is for the agent
   */
  async isMessageForAgent(text, roomId) {
    // Check for @mention
    const mentionPattern = new RegExp(`@${this.agentId}`, 'i');
    if (mentionPattern.test(text)) {
      return true;
    }

    // Check if it's a direct message (only 2 people in room)
    try {
      const room = this.matrixClient.client.getRoom(roomId);
      if (room) {
        const members = room.getJoinedMembers();
        if (members.length === 2) {
          return true; // Direct message
        }
      }
    } catch (error) {
      logger.warn(`Could not check room members: ${error.message}`);
    }

    return false;
  }

  /**
   * Clean message text (remove @mention and extra whitespace)
   */
  cleanMessage(text) {
    // Remove @mention
    const mentionPattern = new RegExp(`@${this.agentId}\\s*`, 'gi');
    return text.replace(mentionPattern, '').trim();
  }

  /**
   * Process message through LLM gateway
   */
  async processWithLLM(message, userId) {
    logger.debug(`Sending to LLM: ${message.substring(0, 50)}...`);
    
    try {
      const response = await fetch(`${this.config.gateway.url}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.gateway.apiKey && {
            'Authorization': `Bearer ${this.config.gateway.apiKey}`
          })
        },
        body: JSON.stringify({
          model: this.config.gateway.model,
          messages: [
            {
              role: 'system',
              content: 'You are SmartClaw, a helpful AI assistant integrated with Matrix. Be concise and helpful.'
            },
            {
              role: 'user',
              content: message
            }
          ],
          temperature: 0.7,
          max_tokens: 1000
        })
      });

      if (!response.ok) {
        throw new Error(`LLM API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const reply = data.choices?.[0]?.message?.content;

      if (!reply) {
        throw new Error('Empty response from LLM');
      }

      logger.debug(`LLM response: ${reply.substring(0, 100)}...`);
      return reply;
    } catch (error) {
      logger.error(`LLM processing failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Send typing indicator
   */
  async sendTyping(roomId) {
    try {
      await this.matrixClient.client.sendPresence({ presence: 'online' });
      // Note: Matrix typing indicator requires specific API call
      logger.debug('Typing indicator sent');
    } catch (error) {
      logger.warn(`Failed to send typing indicator: ${error.message}`);
    }
  }

  /**
   * Handle errors
   */
  async handleError(error, roomId, event) {
    const errorMessage = `Sorry, I encountered an error: ${error.message}`;
    logger.error(errorMessage);
    
    try {
      await this.matrixClient.sendReply(roomId, errorMessage, event);
    } catch (sendError) {
      logger.error(`Failed to send error message: ${sendError.message}`);
    }
  }
}

module.exports = MessageHandler;
