const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Create logs directory if it doesn't exist
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Define log levels
const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define log colors
const logColors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

// Add colors to winston
winston.addColors(logColors);

// Create custom format
const customFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.colorize({ all: true }),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    let log = `${timestamp} [${level}]: ${message}`;

    if (Object.keys(meta).length > 0) {
      log += ` ${JSON.stringify(meta)}`;
    }

    if (stack) {
      log += `\n${stack}`;
    }

    return log;
  })
);

// Create console transport
const consoleTransport = new winston.transports.Console({
  level: process.env.LOG_LEVEL || 'info',
  format: customFormat,
});

// Create file transports
const errorFileTransport = new winston.transports.File({
  filename: path.join(logsDir, 'error.log'),
  level: 'error',
  maxsize: parseInt(process.env.LOG_MAX_SIZE) || 20 * 1024 * 1024, // 20MB
  maxFiles: parseInt(process.env.LOG_MAX_FILES) || 14,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
});

const combinedFileTransport = new winston.transports.File({
  filename: path.join(logsDir, 'combined.log'),
  maxsize: parseInt(process.env.LOG_MAX_SIZE) || 20 * 1024 * 1024, // 20MB
  maxFiles: parseInt(process.env.LOG_MAX_FILES) || 14,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
});

// Create logger instance
const logger = winston.createLogger({
  levels: logLevels,
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [errorFileTransport, combinedFileTransport],
  // Don't exit on error
  exitOnError: false,
});

// Add console transport in development
if (process.env.NODE_ENV === 'development') {
  logger.add(consoleTransport);
}

// Create a stream object for Morgan HTTP logging
logger.stream = {
  write: message => {
    logger.http(message.trim());
  },
};

// Add custom methods for different log contexts
logger.stock = (message, meta = {}) => {
  logger.info(message, { context: 'stock', ...meta });
};

logger.sentiment = (message, meta = {}) => {
  logger.info(message, { context: 'sentiment', ...meta });
};

logger.news = (message, meta = {}) => {
  logger.info(message, { context: 'news', ...meta });
};

logger.crawler = (message, meta = {}) => {
  logger.info(message, { context: 'crawler', ...meta });
};

logger.cache = (message, meta = {}) => {
  logger.info(message, { context: 'cache', ...meta });
};

logger.api = (message, meta = {}) => {
  logger.info(message, { context: 'api', ...meta });
};

logger.database = (message, meta = {}) => {
  logger.info(message, { context: 'database', ...meta });
};

logger.redis = (message, meta = {}) => {
  logger.info(message, { context: 'redis', ...meta });
};

// Export logger
module.exports = logger;
