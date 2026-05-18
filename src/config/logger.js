// src/config/logger.js
const pino = require('pino');
const path = require('path');

const logDir = path.join(__dirname, '../../logs');

const logger = pino(
  {
    level: process.env.LOG_LEVEL || 'info',
    formatters: {
      level: (label) => {
        return { level: label.toUpperCase() };
      }
    },
    timestamp: pino.stdTimeFunctions.isoTime
  },
  pino.transport({
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'HH:MM:ss Z',
      ignore: 'pid,hostname',
      singleLine: false,
      mkdir: true,
      destination: path.join(logDir, 'app.log')
    }
  })
);

module.exports = logger;
