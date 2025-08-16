const { createClient } = require("redis");

/**
 * Redis Service for Caching
 * Handles high-performance caching of stock data and search results
 */
class RedisService {
  constructor(config = {}) {
    this.config = {
      host: config.host || process.env.REDIS_HOST || "localhost",
      port: config.port || parseInt(process.env.REDIS_PORT || "6379", 10),
      password: config.password || process.env.REDIS_PASSWORD,
      db: config.db || parseInt(process.env.REDIS_DB || "0", 10),
      ttlStocks:
        config.ttlStocks ||
        parseInt(process.env.REDIS_TTL_STOCKS || "21600", 10), // 6 hours
      ttlSearch:
        config.ttlSearch ||
        parseInt(process.env.REDIS_TTL_SEARCH || "1800", 10), // 30 minutes
      ...config,
    };

    this.client = null;
    this.isConnected = false;
    this.retryCount = 0;
    this.maxRetries = 3;

    // Metrics
    this.metrics = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0,
      totalRequests: 0,
    };
  }

  /**
   * Connect to Redis
   */
  async connect() {
    try {
      if (this.isConnected && this.client) {
        return true;
      }

      console.log("🔌 Connecting to Redis...");

      // Create Redis client with proper URL format for cloud Redis
      const redisUrl = `redis://default:${this.config.password}@${this.config.host}:${this.config.port}/${this.config.db}`;

      this.client = createClient({
        url: redisUrl,
        socket: {
          connectTimeout: 10000,
          lazyConnect: true,
        },
      });

      // Set up event listeners
      this.client.on("connect", () => {
        console.log("🔄 Redis connecting...");
      });

      this.client.on("ready", () => {
        console.log("✅ Redis connected and ready");
        this.isConnected = true;
        this.retryCount = 0;
      });

      this.client.on("error", (error) => {
        console.error("❌ Redis error:", error.message);
        this.metrics.errors++;
      });

      this.client.on("end", () => {
        console.warn("📴 Redis connection ended");
        this.isConnected = false;
      });

      this.client.on("reconnecting", () => {
        console.log("🔄 Redis reconnecting...");
      });

      // Connect
      await this.client.connect();

      return true;
    } catch (error) {
      console.error("❌ Redis connection failed:", error.message);
      this.isConnected = false;

      if (this.retryCount < this.maxRetries) {
        this.retryCount++;
        console.log(
          `🔄 Retrying Redis connection (${this.retryCount}/${this.maxRetries}) in 5s...`
        );
        await this.sleep(5000);
        return this.connect();
      }

      throw error;
    }
  }

  /**
   * Disconnect from Redis
   */
  async disconnect() {
    try {
      if (this.client && this.isConnected) {
        await this.client.quit();
        this.isConnected = false;
        console.log("📴 Redis disconnected");
      }
    } catch (error) {
      console.error("❌ Error disconnecting from Redis:", error.message);
      throw error;
    }
  }

  /**
   * Cache all stocks data
   */
  async cacheStocks(stocks, source = "unknown") {
    if (!this.isConnected) {
      await this.connect();
    }

    try {
      console.log(`💾 Caching ${stocks.length} stocks to Redis...`);
      const startTime = Date.now();

      const pipeline = this.client.multi();

      // Cache individual stocks
      for (const stock of stocks) {
        const key = this.getKey("stock", stock.symbol);
        const data = {
          ...stock,
          cachedAt: new Date().toISOString(),
          cacheSource: source,
        };

        pipeline.setEx(key, this.config.ttlStocks, JSON.stringify(data));
      }

      // Cache stocks by category
      const categorizedStocks = this.categorizeStocks(stocks);
      for (const [category, categoryStocks] of Object.entries(
        categorizedStocks
      )) {
        const key = this.getKey("stocks-by-category", category);
        const data = {
          stocks: categoryStocks,
          count: categoryStocks.length,
          cachedAt: new Date().toISOString(),
          source,
        };

        pipeline.setEx(key, this.config.ttlStocks, JSON.stringify(data));
      }

      // Cache all stocks summary
      const allStocksKey = this.getKey("all-stocks");
      const summaryData = {
        stocks: stocks.map((s) => ({
          symbol: s.symbol,
          name: s.name,
          category: s.category || "equity",
        })),
        count: stocks.length,
        breakdown: this.getBreakdown(stocks),
        cachedAt: new Date().toISOString(),
        source,
      };

      pipeline.setEx(
        allStocksKey,
        this.config.ttlStocks,
        JSON.stringify(summaryData)
      );

      // Execute pipeline
      await pipeline.exec();

      const duration = Date.now() - startTime;
      this.metrics.sets +=
        stocks.length + Object.keys(categorizedStocks).length + 1;

      console.log(`✅ Cached ${stocks.length} stocks in ${duration}ms`);

      return true;
    } catch (error) {
      console.error("❌ Failed to cache stocks:", error.message);
      this.metrics.errors++;
      throw error;
    }
  }

  /**
   * Get stock from cache
   */
  async getStock(symbol) {
    if (!this.isConnected) {
      await this.connect();
    }

    try {
      this.metrics.totalRequests++;

      const key = this.getKey("stock", symbol.toUpperCase());
      const data = await this.client.get(key);

      if (data) {
        this.metrics.hits++;
        const stock = JSON.parse(data);

        return {
          success: true,
          stock,
          cached: true,
          cachedAt: stock.cachedAt,
        };
      } else {
        this.metrics.misses++;
        return {
          success: false,
          error: "Not found in cache",
          cached: false,
        };
      }
    } catch (error) {
      this.metrics.errors++;
      console.error("❌ Redis get error:", error.message);
      return {
        success: false,
        error: error.message,
        cached: false,
      };
    }
  }

  /**
   * Search stocks in cache
   */
  async searchStocks(query, options = {}) {
    if (!this.isConnected) {
      await this.connect();
    }

    try {
      this.metrics.totalRequests++;

      // Create cache key for search
      const searchKey = this.getSearchKey(query, options);
      let cachedResult = await this.client.get(searchKey);

      if (cachedResult) {
        this.metrics.hits++;
        const result = JSON.parse(cachedResult);
        return {
          ...result,
          cached: true,
          cachedAt: result.cachedAt,
        };
      }

      // If not in cache, try to search in all stocks cache
      const allStocksKey = this.getKey("all-stocks");
      const allStocksData = await this.client.get(allStocksKey);

      if (allStocksData) {
        const { stocks } = JSON.parse(allStocksData);
        const filteredStocks = this.filterStocks(stocks, query, options);

        // Cache the search result
        const searchResult = {
          success: true,
          stocks: filteredStocks,
          count: filteredStocks.length,
          query,
          options,
          cachedAt: new Date().toISOString(),
          cached: true,
        };

        await this.client.setEx(
          searchKey,
          this.config.ttlSearch,
          JSON.stringify(searchResult)
        );
        this.metrics.sets++;

        return searchResult;
      }

      this.metrics.misses++;
      return {
        success: false,
        error: "No data in cache",
        cached: false,
      };
    } catch (error) {
      this.metrics.errors++;
      console.error("❌ Redis search error:", error.message);
      return {
        success: false,
        error: error.message,
        cached: false,
      };
    }
  }

  /**
   * Cache discovery results
   */
  async cacheDiscoveryResult(discoveryData) {
    if (!this.isConnected) {
      await this.connect();
    }

    try {
      const key = this.getKey(
        "discovery",
        discoveryData.discoveryId || "latest"
      );
      const data = {
        ...discoveryData,
        cachedAt: new Date().toISOString(),
      };

      await this.client.setEx(
        key,
        this.config.ttlStocks, // Using ttlStocks for discovery results
        JSON.stringify(data)
      );
      this.metrics.sets++;

      // Also cache as "latest" discovery
      const latestKey = this.getKey("discovery", "latest");
      await this.client.setEx(
        latestKey,
        this.config.ttlStocks, // Using ttlStocks for latest discovery
        JSON.stringify(data)
      );

      console.log(
        `💾 Cached discovery result: ${discoveryData.discoveryId || "latest"}`
      );
    } catch (error) {
      this.metrics.errors++;
      console.error("❌ Failed to cache discovery result:", error.message);
      throw error;
    }
  }

  /**
   * Get cached discovery result
   */
  async getDiscoveryResult(discoveryId = "latest") {
    if (!this.isConnected) {
      await this.connect();
    }

    try {
      this.metrics.totalRequests++;

      const key = this.getKey("discovery", discoveryId);
      const data = await this.client.get(key);

      if (data) {
        this.metrics.hits++;
        return {
          success: true,
          data: JSON.parse(data),
          cached: true,
        };
      } else {
        this.metrics.misses++;
        return {
          success: false,
          error: "Discovery result not found in cache",
          cached: false,
        };
      }
    } catch (error) {
      this.metrics.errors++;
      return {
        success: false,
        error: error.message,
        cached: false,
      };
    }
  }

  /**
   * Cache system statistics
   */
  async cacheStats(stats) {
    if (!this.isConnected) {
      await this.connect();
    }

    try {
      const key = this.getKey("stats");
      const data = {
        ...stats,
        cachedAt: new Date().toISOString(),
      };

      await this.client.setEx(key, this.config.ttlStocks, JSON.stringify(data)); // Using ttlStocks for stats
      this.metrics.sets++;
    } catch (error) {
      this.metrics.errors++;
      console.error("❌ Failed to cache stats:", error.message);
      throw error;
    }
  }

  /**
   * Get cached statistics
   */
  async getStats() {
    if (!this.isConnected) {
      await this.connect();
    }

    try {
      this.metrics.totalRequests++;

      const key = this.getKey("stats");
      const data = await this.client.get(key);

      if (data) {
        this.metrics.hits++;
        return {
          success: true,
          stats: JSON.parse(data),
          cached: true,
        };
      } else {
        this.metrics.misses++;
        return {
          success: false,
          error: "Stats not found in cache",
          cached: false,
        };
      }
    } catch (error) {
      this.metrics.errors++;
      return {
        success: false,
        error: error.message,
        cached: false,
      };
    }
  }

  /**
   * Invalidate cache
   */
  async invalidateCache(pattern = "*") {
    if (!this.isConnected) {
      await this.connect();
    }

    try {
      const fullPattern = this.getKey("*") + pattern; // Assuming keyPrefix is not used for pattern matching
      const keys = await this.client.keys(fullPattern);

      if (keys.length > 0) {
        await this.client.del(keys);
        this.metrics.deletes += keys.length;
        console.log(`🗑️ Invalidated ${keys.length} cache entries`);

        return keys.length;
      }

      return 0;
    } catch (error) {
      this.metrics.errors++;
      console.error("❌ Failed to invalidate cache:", error.message);
      throw error;
    }
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      if (!this.isConnected) {
        return { status: "disconnected", error: "Not connected to Redis" };
      }

      // Test Redis connectivity
      const testKey = this.getKey("health-check");
      const testValue = Date.now().toString();

      await this.client.setEx(testKey, 10, testValue);
      const retrievedValue = await this.client.get(testKey);

      if (retrievedValue === testValue) {
        await this.client.del(testKey);

        return {
          status: "healthy",
          connection: "active",
          metrics: this.getMetrics(),
        };
      } else {
        return {
          status: "unhealthy",
          error: "Redis read/write test failed",
        };
      }
    } catch (error) {
      return {
        status: "unhealthy",
        error: error.message,
      };
    }
  }

  /**
   * Get cache metrics
   */
  getMetrics() {
    const totalRequests = this.metrics.hits + this.metrics.misses;
    const hitRate =
      totalRequests > 0 ? (this.metrics.hits / totalRequests) * 100 : 0;

    return {
      ...this.metrics,
      hitRate: Math.round(hitRate * 100) / 100,
      totalRequests,
      connectionStatus: this.isConnected ? "connected" : "disconnected",
    };
  }

  /**
   * Utility methods
   */

  getKey(...parts) {
    return parts.join(":");
  }

  getSearchKey(query, options) {
    const optionsHash = JSON.stringify(options);
    const queryNormalized = query.toLowerCase().trim();
    return this.getKey(
      "search",
      Buffer.from(queryNormalized + optionsHash).toString("base64")
    );
  }

  categorizeStocks(stocks) {
    const categories = {};

    for (const stock of stocks) {
      const category = stock.category || "equity";
      if (!categories[category]) {
        categories[category] = [];
      }
      categories[category].push(stock);
    }

    return categories;
  }

  getBreakdown(stocks) {
    const breakdown = {};

    for (const stock of stocks) {
      const category = stock.category || "equity";
      breakdown[category] = (breakdown[category] || 0) + 1;
    }

    return breakdown;
  }

  filterStocks(stocks, query, options) {
    const { limit = 20, category, source } = options;

    let filtered = stocks;

    // Filter by category
    if (category) {
      filtered = filtered.filter((stock) => stock.category === category);
    }

    // Filter by source
    if (source) {
      filtered = filtered.filter((stock) => stock.source === source);
    }

    // Filter by query
    if (query && query.trim()) {
      const searchTerm = query.toLowerCase();
      filtered = filtered.filter(
        (stock) =>
          stock.symbol.toLowerCase().includes(searchTerm) ||
          stock.name.toLowerCase().includes(searchTerm)
      );
    }

    // Sort by relevance (symbol match first, then name match)
    if (query && query.trim()) {
      const searchTerm = query.toLowerCase();
      filtered.sort((a, b) => {
        const aSymbolMatch = a.symbol.toLowerCase().startsWith(searchTerm);
        const bSymbolMatch = b.symbol.toLowerCase().startsWith(searchTerm);

        if (aSymbolMatch && !bSymbolMatch) return -1;
        if (!aSymbolMatch && bSymbolMatch) return 1;

        return a.symbol.localeCompare(b.symbol);
      });
    }

    return filtered.slice(0, limit);
  }

  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

module.exports = RedisService;
