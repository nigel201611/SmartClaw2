#!/usr/bin/env node

/**
 * SmartClaw Agent Logger
 * 
 * Provides console and file logging with different levels.
 */

const winston = require('winston');
const path = require('path');

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.printf(({ level, message, timestamp, stack }) => {
    return `${timestamp} [${level.toUpperCase()}]: ${stack || message}`;
  })
);

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  transports: [
    // Console transport
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        logFormat
      )
    }),
    // File transport (optional)
    ...(process.env.LOG_FILE ? [
      new winston.transports.File({
        filename: path.join(process.env.LOG_FILE, 'agent.log'),
        maxsize: 10485760, // 10MB
        maxFiles: 5
      })
    ] : [])
  ]
});

// Helper methods
logger.debug = (msg) => logger.log('debug', msg);
logger.info = (msg) => logger.log('info', msg);
logger.warn = (msg) => logger.log('warn', msg);
logger.error = (msg) => logger.log('error', msg);

module.exports = logger;
