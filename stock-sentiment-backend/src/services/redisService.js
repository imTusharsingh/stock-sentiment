/* eslint-disable no-console */
const redisConfig = require('../config/redis');

/**
 * Redis Service
 * Handles all Redis caching operations for the application
 */
class RedisService {
  constructor() {
    this.client = null;
    this.isConnected = false;
  }

  /**
   * Initialize Redis service
   * @returns {Promise<void>}
   */
  async initialize() {
    try {
      this.client = await redisConfig.connect();
      this.isConnected = true;
      console.log('✅ Redis service initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Redis service:', error.message);
      throw error;
    }
  }

  /**
   * Get Redis client
   * @returns {redis.RedisClient}
   */
  getClient() {
    if (!this.client || !this.isConnected) {
      throw new Error('Redis service not initialized');
    }
    return this.client;
  }

  /**
   * Set key-value pair with TTL
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {string} type - Data type for TTL
   * @returns {Promise<void>}
   */
  async set(key, value, type = 'tempData') {
    try {
      const client = this.getClient();
      const ttl = redisConfig.getTTL(type);
      const serializedValue = JSON.stringify(value);

      await client.setEx(key, ttl, serializedValue);
      if (process.env.NODE_ENV !== 'test') {
        console.log(`✅ Cached ${key} with TTL ${ttl}s`);
      }
    } catch (error) {
      if (process.env.NODE_ENV !== 'test') {
        console.error(`❌ Failed to cache ${key}:`, error.message);
      }
      throw error;
    }
  }

  /**
   * Get value by key
   * @param {string} key - Cache key
   * @returns {Promise<any>}
   */
  async get(key) {
    try {
      const client = this.getClient();
      const value = await client.get(key);

      if (value === null) {
        return null;
      }

      return JSON.parse(value);
    } catch (error) {
      if (process.env.NODE_ENV !== 'test') {
        console.error(`❌ Failed to get ${key}:`, error.message);
      }
      return null;
    }
  }

  /**
   * Delete key
   * @param {string} key - Cache key
   * @returns {Promise<boolean>}
   */
  async delete(key) {
    try {
      const client = this.getClient();
      const result = await client.del(key);
      console.log(`✅ Deleted ${key}`);
      return result > 0;
    } catch (error) {
      console.error(`❌ Failed to delete ${key}:`, error.message);
      return false;
    }
  }

  /**
   * Check if key exists
   * @param {string} key - Cache key
   * @returns {Promise<boolean>}
   */
  async exists(key) {
    try {
      const client = this.getClient();
      const result = await client.exists(key);
      return result > 0;
    } catch (error) {
      console.error(`❌ Failed to check existence of ${key}:`, error.message);
      return false;
    }
  }

  /**
   * Set TTL for existing key
   * @param {string} key - Cache key
   * @param {number} ttl - TTL in seconds
   * @returns {Promise<boolean>}
   */
  async expire(key, ttl) {
    try {
      const client = this.getClient();
      const result = await client.expire(key, ttl);
      return result;
    } catch (error) {
      console.error(`❌ Failed to set TTL for ${key}:`, error.message);
      return false;
    }
  }

  /**
   * Get TTL for key
   * @param {string} key - Cache key
   * @returns {Promise<number>}
   */
  async getTTL(key) {
    try {
      const client = this.getClient();
      const ttl = await client.ttl(key);
      return ttl;
    } catch (error) {
      console.error(`❌ Failed to get TTL for ${key}:`, error.message);
      return -1;
    }
  }

  /**
   * Cache stock data
   * @param {string} symbol - Stock symbol
   * @param {Object} data - Stock data
   * @returns {Promise<void>}
   */
  async cacheStockData(symbol, data) {
    const key = `stock:${symbol.toUpperCase()}`;
    await this.set(key, data, 'stockData');
  }

  /**
   * Get cached stock data
   * @param {string} symbol - Stock symbol
   * @returns {Promise<Object|null>}
   */
  async getCachedStockData(symbol) {
    const key = `stock:${symbol.toUpperCase()}`;
    return await this.get(key);
  }

  /**
   * Cache news data
   * @param {string} newsId - News ID
   * @param {Object} data - News data
   * @returns {Promise<void>}
   */
  async cacheNewsData(newsId, data) {
    const key = `news:${newsId}`;
    await this.set(key, data, 'news');
  }

  /**
   * Get cached news data
   * @param {string} newsId - News ID
   * @returns {Promise<Object|null>}
   */
  async getCachedNewsData(newsId) {
    const key = `news:${newsId}`;
    return await this.get(key);
  }

  /**
   * Cache sentiment data
   * @param {string} stockSymbol - Stock symbol
   * @param {Object} data - Sentiment data
   * @returns {Promise<void>}
   */
  async cacheSentimentData(stockSymbol, data) {
    const key = `sentiment:${stockSymbol.toUpperCase()}`;
    await this.set(key, data, 'sentiment');
  }

  /**
   * Get cached sentiment data
   * @param {string} stockSymbol - Stock symbol
   * @returns {Promise<Object|null>}
   */
  async getCachedSentimentData(stockSymbol) {
    const key = `sentiment:${stockSymbol.toUpperCase()}`;
    return await this.get(key);
  }

  /**
   * Cache search results
   * @param {string} query - Search query
   * @param {Array} results - Search results
   * @returns {Promise<void>}
   */
  async cacheSearchResults(query, results) {
    const key = `search:${query.toLowerCase()}`;
    await this.set(key, results, 'searchResults');
  }

  /**
   * Get cached search results
   * @param {string} query - Search query
   * @returns {Promise<Array|null>}
   */
  async getCachedSearchResults(query) {
    const key = `search:${query.toLowerCase()}`;
    return await this.get(key);
  }

  /**
   * Cache trending data
   * @param {string} timeframe - Timeframe (1d, 30d, 90d)
   * @param {Array} data - Trending data
   * @returns {Promise<void>}
   */
  async cacheTrendingData(timeframe, data) {
    const key = `trends:${timeframe}`;
    const ttlType = `trends${timeframe}`;
    await this.set(key, data, ttlType);
  }

  /**
   * Get cached trending data
   * @param {string} timeframe - Timeframe (1d, 30d, 90d)
   * @returns {Promise<Array|null>}
   */
  async getCachedTrendingData(timeframe) {
    const key = `trends:${timeframe}`;
    return await this.get(key);
  }

  /**
   * Clear all cache
   * @returns {Promise<void>}
   */
  async clearAll() {
    try {
      const client = this.getClient();
      await client.flushDb();
      console.log('✅ All cache cleared');
    } catch (error) {
      console.error('❌ Failed to clear cache:', error.message);
      throw error;
    }
  }

  /**
   * Get cache statistics
   * @returns {Promise<Object>}
   */
  async getStats() {
    try {
      const client = this.getClient();
      const info = await client.info('memory');
      const keyspace = await client.info('keyspace');

      return {
        info: info,
        keyspace: keyspace,
        ttl: redisConfig.getAllTTL(),
      };
    } catch (error) {
      console.error('❌ Failed to get cache stats:', error.message);
      return {};
    }
  }

  /**
   * Health check
   * @returns {Promise<boolean>}
   */
  async healthCheck() {
    try {
      const client = this.getClient();
      const result = await client.ping();
      return result === 'PONG';
    } catch (error) {
      console.error('❌ Redis health check failed:', error.message);
      return false;
    }
  }

  /**
   * Close Redis connection
   * @returns {Promise<void>}
   */
  async close() {
    try {
      if (this.client) {
        await redisConfig.disconnect();
        this.isConnected = false;
        console.log('✅ Redis service closed');
      }
    } catch (error) {
      console.error('❌ Error closing Redis service:', error.message);
      throw error;
    }
  }
}

// Create singleton instance
const redisService = new RedisService();

module.exports = redisService;
