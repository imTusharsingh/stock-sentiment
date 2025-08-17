/* eslint-disable no-console */
const { createClient } = require('redis');

/**
 * Redis Configuration
 * Handles Redis connection and caching operations
 */
class RedisConfig {
  constructor() {
    this.client = null;
    this.host = process.env.REDIS_HOST || 'localhost';
    this.port = process.env.REDIS_PORT || 6379;
    this.password = process.env.REDIS_PASSWORD || '';
    this.db = process.env.REDIS_DB || 0;
    this.url = process.env.REDIS_URL || `redis://${this.host}:${this.port}`;

    // TTL policies for different data types
    this.ttl = {
      sentiment: parseInt(process.env.CACHE_TTL_SENTIMENT) || 900, // 15 minutes
      news: parseInt(process.env.CACHE_TTL_NEWS) || 3600, // 1 hour
      trends1D: parseInt(process.env.CACHE_TTL_TRENDS_1D) || 1800, // 30 minutes
      trends30D: parseInt(process.env.CACHE_TTL_TRENDS_30D) || 7200, // 2 hours
      trends90D: parseInt(process.env.CACHE_TTL_TRENDS_90D) || 21600, // 6 hours
      stockData: 3600, // 1 hour
      searchResults: 900, // 15 minutes
      userSessions: 86400, // 24 hours
      rateLimits: 60, // 1 minute
      crawlQueue: 300, // 5 minutes
      tempData: 300, // 5 minutes
    };
  }

  /**
   * Connect to Redis
   * @returns {Promise<redis.RedisClient>}
   */
  async connect() {
    try {
      if (this.client && this.client.isOpen) {
        console.log('✅ Redis already connected');
        return this.client;
      }

      console.log('🔄 Connecting to Redis...');

      this.client = createClient({
        url: this.url,
        socket: {
          host: this.host,
          port: this.port,
          password: this.password,
          db: this.db,
          connectTimeout: 10000,
          lazyConnect: true,
        },
        retry_strategy: options => {
          if (options.error && options.error.code === 'ECONNREFUSED') {
            console.error('❌ Redis server refused connection');
            return new Error('Redis server refused connection');
          }
          if (options.total_retry_time > 1000 * 60 * 60) {
            console.error('❌ Redis retry time exhausted');
            return new Error('Redis retry time exhausted');
          }
          if (options.attempt > 10) {
            console.error('❌ Redis max retry attempts reached');
            return new Error('Redis max retry attempts reached');
          }
          return Math.min(options.attempt * 100, 3000);
        },
      });

      // Setup event handlers
      this.setupEventHandlers();

      await this.client.connect();

      console.log('✅ Redis connected successfully');
      console.log(`🌐 Host: ${this.host}`);
      console.log(`🔌 Port: ${this.port}`);
      console.log(`📊 Database: ${this.db}`);

      return this.client;
    } catch (error) {
      console.error('❌ Redis connection failed:', error.message);
      throw error;
    }
  }

  /**
   * Setup Redis event handlers
   */
  setupEventHandlers() {
    this.client.on('connect', () => {
      console.log('🟢 Redis connection established');
    });

    this.client.on('ready', () => {
      console.log('🟢 Redis client ready');
    });

    this.client.on('error', err => {
      console.error('🔴 Redis error:', err);
    });

    this.client.on('end', () => {
      console.log('🟡 Redis connection ended');
    });

    this.client.on('reconnecting', () => {
      console.log('🔄 Redis reconnecting...');
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      try {
        await this.disconnect();
        console.log('🔄 Redis connection closed through app termination');
        // Note: process.exit is necessary for graceful shutdown
        // eslint-disable-next-line no-process-exit
        process.exit(0);
      } catch (err) {
        console.error('❌ Error during Redis shutdown:', err);
        // eslint-disable-next-line no-process-exit
        process.exit(1);
      }
    });
  }

  /**
   * Disconnect from Redis
   * @returns {Promise<void>}
   */
  async disconnect() {
    try {
      if (this.client && this.client.isOpen) {
        await this.client.quit();
        console.log('✅ Redis disconnected successfully');
      }
    } catch (error) {
      console.error('❌ Error disconnecting from Redis:', error.message);
      throw error;
    }
  }

  /**
   * Get connection status
   * @returns {Object}
   */
  getStatus() {
    if (!this.client) {
      return {
        isConnected: false,
        status: 'not_initialized',
      };
    }

    return {
      isConnected: this.client.isOpen,
      status: this.client.isOpen ? 'connected' : 'disconnected',
      host: this.host,
      port: this.port,
      db: this.db,
    };
  }

  /**
   * Test Redis connection
   * @returns {Promise<boolean>}
   */
  async testConnection() {
    try {
      const client = await this.connect();
      const result = await client.ping();

      if (result === 'PONG') {
        console.log('✅ Redis connection test successful');
        return true;
      } else {
        console.log('❌ Redis connection test failed');
        return false;
      }
    } catch (error) {
      console.error('❌ Redis connection test error:', error.message);
      return false;
    }
  }

  /**
   * Get cache TTL for specific data type
   * @param {string} type - Data type (sentiment, news, trends1D, etc.)
   * @returns {number} TTL in seconds
   */
  getTTL(type) {
    return this.ttl[type] || this.ttl.news;
  }

  /**
   * Set cache TTL for specific data type
   * @param {string} type - Data type
   * @param {number} ttl - TTL in seconds
   */
  setTTL(type, ttl) {
    if (Object.prototype.hasOwnProperty.call(this.ttl, type)) {
      this.ttl[type] = parseInt(ttl);
    }
  }

  /**
   * Get all TTL configurations
   * @returns {Object}
   */
  getAllTTL() {
    return { ...this.ttl };
  }
}

// Create singleton instance
const redisConfig = new RedisConfig();

module.exports = redisConfig;
