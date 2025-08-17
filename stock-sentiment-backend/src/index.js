/* eslint-disable no-console */
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

// Import configurations
const databaseConfig = require('./config/database');

// Import services
const redisService = require('./services/redisService');

// Import middleware
const errorHandler = require('./middleware/errorHandler');
const requestValidator = require('./middleware/requestValidator');
const logger = require('./utils/logger');

// Import routes
const healthRoutes = require('./routes/health');
const stockRoutes = require('./routes/stocks');
const sentimentRoutes = require('./routes/sentiments');
const newsRoutes = require('./routes/news');

class StockSentimentServer {
  constructor() {
    this.app = express();
    this.port = process.env.PORT || 3001;
    this.host = process.env.HOST || 'localhost';
    this.server = null;
    this.isShuttingDown = false;
  }

  /**
   * Initialize the server
   */
  async initialize() {
    try {
      console.log('🚀 Initializing Stock Sentiment Backend Server...');

      // Initialize database connection
      await this.initializeDatabase();

      // Initialize Redis connection
      await this.initializeRedis();

      // Setup routes
      this.setupRoutes();

      // Setup middleware
      this.setupMiddleware();

      // Setup error handling
      this.setupErrorHandling();

      // Setup graceful shutdown
      this.setupGracefulShutdown();

      console.log('✅ Server initialization completed');
    } catch (error) {
      console.error('❌ Server initialization failed:', error.message);
      throw error;
    }
  }

  /**
   * Initialize database connection
   */
  async initializeDatabase() {
    try {
      console.log('🗄️ Initializing database connection...');
      await databaseConfig.connect();
      console.log('✅ Database connection established');
    } catch (error) {
      console.error('❌ Database connection failed:', error.message);
      throw error;
    }
  }

  /**
   * Initialize Redis connection
   */
  async initializeRedis() {
    try {
      console.log('🔴 Initializing Redis connection...');
      await redisService.initialize();
      console.log('✅ Redis connection established');
    } catch (error) {
      console.error('❌ Redis connection failed:', error.message);
      throw error;
    }
  }

  /**
   * Setup Express middleware
   */
  setupMiddleware() {
    console.log('⚙️ Setting up middleware...');

    // Security middleware
    this.app.use(
      helmet({
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", 'data:', 'https:'],
          },
        },
        crossOriginEmbedderPolicy: false,
      })
    );

    // CORS configuration
    this.app.use(
      cors({
        origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
      })
    );

    // Compression middleware
    this.app.use(compression());

    // Body parsing middleware
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Request logging
    this.app.use(
      morgan('combined', {
        stream: {
          write: message => logger.info(message.trim()),
        },
      })
    );

    // Rate limiting
    const limiter = rateLimit({
      windowMs:
        parseInt(process.env.API_RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
      max: parseInt(process.env.API_RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
      message: {
        error: 'Too many requests from this IP, please try again later.',
        retryAfter: Math.ceil(
          parseInt(process.env.API_RATE_LIMIT_WINDOW_MS) / 1000 / 60
        ),
      },
      standardHeaders: true,
      legacyHeaders: false,
    });
    this.app.use('/api/', limiter);

    // Request validation middleware
    this.app.use(requestValidator);

    // Health check endpoint (before rate limiting)
    this.app.get('/health', (req, res) => {
      res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV,
      });
    });

    console.log('✅ Middleware setup completed');
  }

  /**
   * Setup API routes
   */
  setupRoutes() {
    console.log('🛣️ Setting up API routes...');

    // API version prefix
    const apiPrefix = `/api/${process.env.API_VERSION || 'v1'}`;

    // Health routes
    this.app.use(`${apiPrefix}/health`, healthRoutes);

    // Stock routes
    this.app.use(`${apiPrefix}/stocks`, stockRoutes);

    // Sentiment routes
    this.app.use(`${apiPrefix}/sentiments`, sentimentRoutes);

    // News routes
    this.app.use(`${apiPrefix}/news`, newsRoutes);

    // 404 handler for undefined routes
    this.app.use((req, res) => {
      res.status(404).json({
        error: 'Route not found',
        message: `The requested route ${req.originalUrl} does not exist`,
        timestamp: new Date().toISOString(),
      });
    });

    console.log('✅ API routes setup completed');
  }

  /**
   * Setup error handling middleware
   */
  setupErrorHandling() {
    console.log('🚨 Setting up error handling...');

    // Global error handler (must be last)
    this.app.use(errorHandler);

    console.log('✅ Error handling setup completed');
  }

  /**
   * Setup graceful shutdown
   */
  setupGracefulShutdown() {
    const gracefulShutdown = async signal => {
      if (this.isShuttingDown) return;

      this.isShuttingDown = true;
      console.log(`\n🔄 Received ${signal}. Starting graceful shutdown...`);

      try {
        // Close HTTP server
        if (this.server) {
          await new Promise(resolve => {
            this.server.close(resolve);
          });
          console.log('✅ HTTP server closed');
        }

        // Close Redis connection
        await redisService.close();
        console.log('✅ Redis connection closed');

        // Close database connection
        await databaseConfig.disconnect();
        console.log('✅ Database connection closed');

        console.log('✅ Graceful shutdown completed');
        // eslint-disable-next-line no-process-exit
        process.exit(0);
      } catch (error) {
        console.error('❌ Error during graceful shutdown:', error.message);
        // eslint-disable-next-line no-process-exit
        process.exit(1);
      }
    };

    // Handle different shutdown signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGUSR2', () => gracefulShutdown('SIGUSR2')); // For nodemon

    // Handle uncaught exceptions
    process.on('uncaughtException', error => {
      console.error('💥 Uncaught Exception:', error);
      gracefulShutdown('uncaughtException');
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
      gracefulShutdown('unhandledRejection');
    });

    console.log('✅ Graceful shutdown setup completed');
  }

  /**
   * Start the server
   */
  async start() {
    try {
      await this.initialize();

      this.server = this.app.listen(this.port, this.host, () => {
        console.log('🎉 Server started successfully!');
        console.log(`🌐 Server running at: http://${this.host}:${this.port}`);
        console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log(`📊 API Version: ${process.env.API_VERSION || 'v1'}`);
        console.log(
          `🗄️ Database: ${process.env.MONGODB_URI ? 'Connected' : 'Not configured'}`
        );
        console.log(
          `🔴 Redis: ${process.env.REDIS_HOST ? 'Connected' : 'Not configured'}`
        );
        console.log('🚀 Ready to handle requests!');
      });

      this.server.on('error', error => {
        if (error.code === 'EADDRINUSE') {
          console.error(`❌ Port ${this.port} is already in use`);
        } else {
          console.error('❌ Server error:', error.message);
        }
        // eslint-disable-next-line no-process-exit
        process.exit(1);
      });
    } catch (error) {
      console.error('❌ Failed to start server:', error.message);
      // eslint-disable-next-line no-process-exit
      process.exit(1);
    }
  }

  /**
   * Stop the server
   */
  async stop() {
    if (this.server) {
      await new Promise(resolve => {
        this.server.close(resolve);
      });
      console.log('✅ Server stopped');
    }
  }
}

// Create and start server instance
const server = new StockSentimentServer();

// Start the server
server.start().catch(error => {
  console.error('💥 Fatal error starting server:', error.message);
  // eslint-disable-next-line no-process-exit
  process.exit(1);
});

module.exports = server;
