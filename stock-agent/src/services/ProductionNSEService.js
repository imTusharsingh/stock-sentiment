const axios = require("axios");
const csv = require("csvtojson");
const fs = require("fs");
const path = require("path");
const EventEmitter = require("events");
const NSEUrlDiscoveryService = require("./NSEUrlDiscoveryService");
const MongoDBService = require("../storage/MongoDBService");
const RedisService = require("../storage/RedisService");

/**
 * Production-Ready NSE Stock Data Service
 * Fetches stock data from official NSE CSV sources with comprehensive error handling,
 * smart caching, monitoring, and reliability features.
 */
class ProductionNSEService extends EventEmitter {
  constructor(options = {}) {
    super();

    // Configuration with defaults
    this.config = {
      baseUrl: "https://nsearchives.nseindia.com",
      cacheDir: options.cacheDir || path.join(__dirname, "../../../cache"),
      maxRetries: options.maxRetries || 3,
      retryDelay: options.retryDelay || 2000,
      timeout: options.timeout || 30000,
      cacheMaxAge: options.cacheMaxAge || 6 * 60 * 60 * 1000, // 6 hours
      forceRefresh: options.forceRefresh || false,
      enableMetrics: options.enableMetrics !== false,
      maxConcurrentDownloads: options.maxConcurrentDownloads || 3,
      ...options,
    };

    // Initialize state
    this.isInitialized = false;
    this.lastSuccessfulFetch = null;
    this.totalFetches = 0;
    this.failedFetches = 0;
    this.cache = new Map();
    this.urlDiscovery = new NSEUrlDiscoveryService();

    // Initialize storage services
    this.mongodb = new MongoDBService(options.mongodb || {});
    this.redis = new RedisService(options.redis || {});

    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      cacheHits: 0,
      averageResponseTime: 0,
      lastError: null,
      uptime: Date.now(),
    };

    // Official NSE CSV endpoints with metadata
    this.endpoints = {
      equity: {
        url: `${this.config.baseUrl}/content/equities/EQUITY_L.csv`,
        description: "Main equity securities list",
        cacheName: "nse_equity.csv",
        priority: 1,
        required: true,
        retryCount: 0,
      },
      sme: {
        url: `${this.config.baseUrl}/emerge/corporates/content/SME_EQUITY_L.csv`,
        description: "SME securities",
        cacheName: "nse_sme.csv",
        priority: 2,
        required: false, // SME endpoint frequently has issues, treat as optional
        retryCount: 0,
      },
      etf: {
        url: `${this.config.baseUrl}/content/equities/eq_etfseclist.csv`,
        description: "Exchange Traded Funds",
        cacheName: "nse_etf.csv",
        priority: 3,
        required: false,
        retryCount: 0,
      },
      reits: {
        url: `${this.config.baseUrl}/content/equities/REITS_L.csv`,
        description: "Real Estate Investment Trusts",
        cacheName: "nse_reits.csv",
        priority: 4,
        required: false,
        retryCount: 0,
      },
      invits: {
        url: `${this.config.baseUrl}/content/equities/INVITS_L.csv`,
        description: "Infrastructure Investment Trusts",
        cacheName: "nse_invits.csv",
        priority: 5,
        required: false,
        retryCount: 0,
      },
    };

    // Initialize asynchronously to allow event listeners to be set up
    setImmediate(() => this.initialize());
  }

  /**
   * Initialize the service
   */
  async initialize() {
    try {
      this.ensureCacheDirectory();
      this.validateConfiguration();

      // Initialize storage services
      await this.initializeStorageServices();

      this.isInitialized = true;
      this.emit("initialized");
      this.log("info", "ProductionNSEService initialized successfully");
    } catch (error) {
      this.emit("error", error);
      throw new Error(
        `Failed to initialize ProductionNSEService: ${error.message}`
      );
    }
  }

  /**
   * Initialize storage services (MongoDB and Redis)
   */
  async initializeStorageServices() {
    try {
      // Initialize MongoDB (optional)
      if (this.config.enableMongoDB !== false) {
        try {
          await this.mongodb.connect();
          this.log("info", "MongoDB connected successfully");
        } catch (error) {
          this.log("warn", `MongoDB connection failed: ${error.message}`);
          // Continue without MongoDB if it fails
        }
      }

      // Initialize Redis (optional)
      if (this.config.enableRedis !== false) {
        try {
          await this.redis.connect();
          this.log("info", "Redis connected successfully");
        } catch (error) {
          this.log("warn", `Redis connection failed: ${error.message}`);
          // Continue without Redis if it fails
        }
      }
    } catch (error) {
      this.log(
        "warn",
        `Storage services initialization failed: ${error.message}`
      );
      // Don't throw - service can work without storage
    }
  }

  /**
   * Ensure cache directory exists with proper permissions
   */
  ensureCacheDirectory() {
    try {
      if (!fs.existsSync(this.config.cacheDir)) {
        fs.mkdirSync(this.config.cacheDir, { recursive: true, mode: 0o755 });
      }

      // Test write permissions
      const testFile = path.join(this.config.cacheDir, ".write-test");
      fs.writeFileSync(testFile, "test");
      fs.unlinkSync(testFile);
    } catch (error) {
      throw new Error(`Cache directory setup failed: ${error.message}`);
    }
  }

  /**
   * Validate service configuration
   */
  validateConfiguration() {
    const required = ["baseUrl", "cacheDir"];
    for (const key of required) {
      if (!this.config[key]) {
        throw new Error(`Missing required configuration: ${key}`);
      }
    }

    // Validate numeric fields with defaults
    if (typeof this.config.maxRetries !== "number") {
      this.config.maxRetries = 3;
    }

    if (typeof this.config.timeout !== "number") {
      this.config.timeout = 30000;
    }

    if (this.config.maxRetries < 1 || this.config.maxRetries > 10) {
      throw new Error("maxRetries must be between 1 and 10");
    }

    if (this.config.timeout < 5000 || this.config.timeout > 300000) {
      throw new Error("timeout must be between 5000ms and 300000ms");
    }
  }

  /**
   * Download CSV data with comprehensive error handling and retry logic
   */
  async downloadCSV(endpoint, retryCount = 0) {
    const startTime = Date.now();
    this.metrics.totalRequests++;

    try {
      this.log(
        "info",
        `Downloading ${endpoint.description} (attempt ${retryCount + 1}/${this.config.maxRetries})`
      );

      const response = await axios({
        method: "GET",
        url: endpoint.url,
        timeout: this.config.timeout,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "text/csv, application/csv, text/plain, */*",
          "Accept-Language": "en-IN,en;q=0.9",
          "Cache-Control": this.config.forceRefresh
            ? "no-cache"
            : "max-age=3600",
          Referer:
            "https://www.nseindia.com/market-data/securities-available-for-trading",
          "Accept-Encoding": "gzip, deflate, br",
          DNT: "1",
          Connection: "keep-alive",
        },
        maxRedirects: 5,
        validateStatus: (status) => status >= 200 && status < 300,
        responseType: "text",
      });

      if (!response.data || typeof response.data !== "string") {
        throw new Error("Invalid response data format");
      }

      const csvData = response.data.trim();
      const lines = csvData.split("\n").filter((line) => line.trim());

      if (lines.length < 2) {
        throw new Error("CSV data appears to be empty or invalid");
      }

      // Validate CSV format
      const headers = lines[0].split(",");
      if (headers.length < 3) {
        throw new Error("CSV headers are missing or invalid");
      }

      this.log(
        "info",
        `✅ Downloaded ${lines.length} lines for ${endpoint.description}`
      );

      // Cache the data with metadata
      await this.cacheData(endpoint, csvData);

      // Update metrics
      this.metrics.successfulRequests++;
      const responseTime = Date.now() - startTime;
      this.updateAverageResponseTime(responseTime);

      // Reset retry count on success
      endpoint.retryCount = 0;

      this.emit("downloadSuccess", {
        endpoint: endpoint.description,
        lines: lines.length,
        responseTime,
        size: csvData.length,
      });

      return csvData;
    } catch (error) {
      this.metrics.failedRequests++;
      this.metrics.lastError = {
        message: error.message,
        endpoint: endpoint.description,
        timestamp: new Date().toISOString(),
        attempt: retryCount + 1,
      };

      endpoint.retryCount = retryCount + 1;

      this.log(
        "error",
        `Download failed for ${endpoint.description}: ${error.message}`
      );

      // Emit error event
      this.emit("downloadError", {
        endpoint: endpoint.description,
        error: error.message,
        attempt: retryCount + 1,
        maxRetries: this.config.maxRetries,
      });

      // Retry logic
      if (retryCount < this.config.maxRetries - 1) {
        const delay = this.calculateRetryDelay(retryCount);
        this.log("info", `Retrying in ${delay}ms...`);
        await this.sleep(delay);
        return this.downloadCSV(endpoint, retryCount + 1);
      }

      // Try to use cached version if retries exhausted
      const cachedData = await this.getCachedData(endpoint);
      if (cachedData) {
        this.log("warn", `Using cached version for ${endpoint.description}`);
        this.emit("fallbackToCache", { endpoint: endpoint.description });
        return cachedData;
      }

      // Special handling for SME endpoint (treat as optional due to frequent 503s)
      if (key === "sme") {
        this.log(
          "warn",
          `SME endpoint failed (common issue), continuing without SME data: ${error.message}`
        );
        return null;
      }

      // If this is a required endpoint, throw error
      if (endpoint.required) {
        throw new Error(
          `Failed to download required endpoint ${endpoint.description} after ${this.config.maxRetries} attempts: ${error.message}`
        );
      }

      // For optional endpoints, return null
      this.log(
        "warn",
        `Skipping optional endpoint ${endpoint.description} after failures`
      );
      return null;
    }
  }

  /**
   * Cache data with metadata
   */
  async cacheData(endpoint, data) {
    try {
      const cachePath = path.join(this.config.cacheDir, endpoint.cacheName);
      const metadata = {
        timestamp: Date.now(),
        size: data.length,
        lines: data.split("\n").filter((line) => line.trim()).length,
        checksum: this.calculateChecksum(data),
      };

      // Write data file
      await fs.promises.writeFile(cachePath, data, "utf8");

      // Write metadata file
      const metadataPath = cachePath.replace(".csv", ".meta.json");
      await fs.promises.writeFile(
        metadataPath,
        JSON.stringify(metadata, null, 2),
        "utf8"
      );

      this.log("debug", `Cached ${endpoint.description} to ${cachePath}`);
    } catch (error) {
      this.log(
        "error",
        `Failed to cache data for ${endpoint.description}: ${error.message}`
      );
    }
  }

  /**
   * Get cached data if valid
   */
  async getCachedData(endpoint) {
    try {
      const cachePath = path.join(this.config.cacheDir, endpoint.cacheName);
      const metadataPath = cachePath.replace(".csv", ".meta.json");

      if (!fs.existsSync(cachePath) || !fs.existsSync(metadataPath)) {
        return null;
      }

      const metadata = JSON.parse(
        await fs.promises.readFile(metadataPath, "utf8")
      );
      const age = Date.now() - metadata.timestamp;

      if (!this.config.forceRefresh && age < this.config.cacheMaxAge) {
        const data = await fs.promises.readFile(cachePath, "utf8");
        this.metrics.cacheHits++;
        this.log(
          "debug",
          `Using cached data for ${endpoint.description} (age: ${Math.round(age / 1000 / 60)}min)`
        );
        return data;
      }

      return null;
    } catch (error) {
      this.log(
        "error",
        `Failed to read cached data for ${endpoint.description}: ${error.message}`
      );
      return null;
    }
  }

  /**
   * Parse CSV data to normalized JSON format
   */
  async parseCSVData(csvData, sourceType) {
    try {
      if (!csvData || typeof csvData !== "string") {
        throw new Error("Invalid CSV data provided");
      }

      const jsonArray = await csv({
        trim: true,
        ignoreEmpty: true,
        checkType: false,
      }).fromString(csvData);

      if (!Array.isArray(jsonArray) || jsonArray.length === 0) {
        throw new Error("CSV parsing resulted in empty data");
      }

      // Normalize data based on source type
      const normalizedData = jsonArray
        .map((row) => this.normalizeStockData(row, sourceType))
        .filter((stock) => this.validateStockData(stock));

      this.log(
        "debug",
        `Parsed ${normalizedData.length} valid stocks from ${sourceType}`
      );

      return normalizedData;
    } catch (error) {
      this.log(
        "error",
        `Failed to parse CSV data for ${sourceType}: ${error.message}`
      );
      throw error;
    }
  }

  /**
   * Normalize stock data based on source type
   */
  normalizeStockData(row, sourceType) {
    const baseData = {
      symbol: null,
      name: null,
      series: null,
      listingDate: null,
      isin: null,
      faceValue: null,
      marketLot: null,
      source: `NSE_${sourceType.toUpperCase()}_CSV`,
      lastUpdated: new Date().toISOString(),
    };

    try {
      switch (sourceType) {
        case "equity":
        case "sme":
          return {
            ...baseData,
            symbol: this.cleanString(row.SYMBOL || row.Symbol),
            name: this.cleanString(
              row["NAME OF COMPANY"] || row["NAME_OF_COMPANY"] || row.name
            ),
            series: this.cleanString(row.SERIES || row.Series),
            listingDate: this.parseDate(
              row["DATE OF LISTING"] ||
                row["DATE_OF_LISTING"] ||
                row.DateofListing
            ),
            paidUpValue: this.parseNumber(
              row["PAID UP VALUE"] || row["PAID_UP_VALUE"]
            ),
            marketLot: this.parseNumber(row["MARKET LOT"] || row.MarketLot),
            isin: this.cleanString(
              row["ISIN NUMBER"] || row["ISIN_NUMBER"] || row.ISINNumber
            ),
            faceValue: this.parseNumber(
              row["FACE VALUE"] || row["FACE_VALUE"] || row.FaceValue
            ),
            source: sourceType === "sme" ? "NSE_SME_CSV" : "NSE_EQUITY_CSV",
          };

        case "etf":
          return {
            ...baseData,
            symbol: this.cleanString(row.Symbol || row.SYMBOL),
            name: this.cleanString(row.SecurityName || row["NAME OF COMPANY"]),
            series: "ETF",
            underlying: this.cleanString(row.Underlying),
            listingDate: this.parseDate(
              row.DateofListing || row["DATE OF LISTING"]
            ),
            marketLot: this.parseNumber(row.MarketLot || row["MARKET LOT"]),
            isin: this.cleanString(row.ISINNumber || row["ISIN NUMBER"]),
            faceValue: this.parseNumber(row.FaceValue || row["FACE VALUE"]),
            source: "NSE_ETF_CSV",
          };

        case "reits":
        case "invits":
          return {
            ...baseData,
            symbol: this.cleanString(row.SYMBOL || row.Symbol),
            name: this.cleanString(row["NAME OF COMPANY"] || row.name),
            series: sourceType === "reits" ? "RR" : "IV",
            listingDate: this.parseDate(
              row["DATE OF LISTING"] || row.DateofListing
            ),
            paidUpValue: this.parseNumber(row["PAID UP VALUE"]),
            marketLot: this.parseNumber(row["MARKET LOT"] || row.MarketLot),
            isin: this.cleanString(row["ISIN NUMBER"] || row.ISINNumber),
            faceValue: this.parseNumber(row["FACE VALUE"] || row.FaceValue),
            source: sourceType === "reits" ? "NSE_REITS_CSV" : "NSE_INVITS_CSV",
          };

        default:
          throw new Error(`Unknown source type: ${sourceType}`);
      }
    } catch (error) {
      this.log("warn", `Failed to normalize stock data: ${error.message}`);
      return null;
    }
  }

  /**
   * Validate stock data
   */
  validateStockData(stock) {
    if (!stock) return false;

    // Required fields
    if (!stock.symbol || !stock.name) {
      return false;
    }

    // Symbol validation (alphanumeric and common symbols)
    if (!/^[A-Z0-9&\-\.]+$/i.test(stock.symbol)) {
      return false;
    }

    // Name validation (reasonable length)
    if (stock.name.length < 3 || stock.name.length > 200) {
      return false;
    }

    return true;
  }

  /**
   * Fetch all stocks from NSE sources
   */
  async fetchAllStocks(options = {}) {
    if (!this.isInitialized) {
      throw new Error("Service not initialized. Call initialize() first.");
    }

    const startTime = Date.now();
    this.totalFetches++;

    // Merge options with instance config
    const fetchOptions = {
      forceRefresh: options.forceRefresh || this.config.forceRefresh,
      includeOptional: options.includeOptional !== false,
      ...options,
    };

    this.log(
      "info",
      `🚀 Starting stock data fetch (force: ${fetchOptions.forceRefresh})`
    );
    this.emit("fetchStarted", { options: fetchOptions });

    try {
      // Discover latest URLs
      const urlResult = await this.urlDiscovery.getUrls(
        fetchOptions.forceRefresh
      );

      if (urlResult.source === "discovered") {
        this.log(
          "info",
          `🔍 Using discovered URLs from ${new Date(urlResult.discoveredAt).toLocaleString()}`
        );
      } else {
        this.log(
          "info",
          `🔄 Using fallback URLs (discovery: ${urlResult.error || "not needed"})`
        );
      }

      // Update endpoints with discovered URLs
      this.updateEndpointsWithUrls(urlResult.urls);

      const results = {
        equity: [],
        sme: [],
        etf: [],
        reits: [],
        invits: [],
      };

      const allStocks = [];
      const downloadPromises = [];

      // Sort endpoints by priority
      const sortedEndpoints = Object.entries(this.endpoints).sort(
        ([, a], [, b]) => a.priority - b.priority
      );

      // Download required endpoints first
      for (const [key, endpoint] of sortedEndpoints) {
        if (endpoint.required || fetchOptions.includeOptional) {
          downloadPromises.push(
            this.downloadAndParseEndpoint(key, endpoint, results)
          );

          // Respect concurrent download limit
          if (downloadPromises.length >= this.config.maxConcurrentDownloads) {
            await Promise.allSettled(downloadPromises);
            downloadPromises.length = 0;
          }
        }
      }

      // Wait for remaining downloads
      if (downloadPromises.length > 0) {
        await Promise.allSettled(downloadPromises);
      }

      // Combine all results
      Object.values(results).forEach((stocks) => {
        if (Array.isArray(stocks)) {
          allStocks.push(...stocks);
        }
      });

      // Remove duplicates based on symbol
      const uniqueStocks = this.removeDuplicates(allStocks);

      const duration = Date.now() - startTime;
      this.lastSuccessfulFetch = new Date().toISOString();
      const discoveryId = `discovery-${Date.now()}`;

      // Store in MongoDB and Redis
      await this.storeStocksData(uniqueStocks, {
        discoveryId,
        method: "ai-discovery",
        urlsUsed: Object.values(urlResult.urls),
        totalCSVsFound: urlResult.totalCSVsFound || 0,
        aiRecommendations: this.urlDiscovery.getAIRecommendations(),
        sourceBreakdown: this.getBreakdownCounts(results),
      });

      const response = {
        success: true,
        stocks: uniqueStocks,
        count: uniqueStocks.length,
        duration,
        breakdown: this.getBreakdownCounts(results),
        fetchedAt: this.lastSuccessfulFetch,
        source: "NSE_AI_DISCOVERY",
        discoveryId,
        aiAnalysis: this.urlDiscovery.getAIRecommendations(),
        metrics: this.getMetricsSummary(),
      };

      this.log(
        "info",
        `✅ Stock fetch completed: ${uniqueStocks.length} stocks in ${Math.round(duration / 1000)}s`
      );
      this.emit("fetchCompleted", response);

      return response;
    } catch (error) {
      this.failedFetches++;
      this.metrics.lastError = {
        message: error.message,
        timestamp: new Date().toISOString(),
        context: "fetchAllStocks",
      };

      const errorResponse = {
        success: false,
        error: error.message,
        stocks: [],
        count: 0,
        duration: Date.now() - startTime,
        fetchedAt: new Date().toISOString(),
      };

      this.log("error", `Stock fetch failed: ${error.message}`);
      this.emit("fetchFailed", errorResponse);

      return errorResponse;
    }
  }

  /**
   * Update endpoints with discovered URLs
   */
  updateEndpointsWithUrls(discoveredUrls) {
    for (const [key, url] of Object.entries(discoveredUrls)) {
      if (this.endpoints[key]) {
        const oldUrl = this.endpoints[key].url;

        // SPECIAL VALIDATION FOR EQUITY ENDPOINT
        if (key === "equity") {
          // Ensure we're using EQUITY_L.csv, not DEBT.csv
          if (url.includes("DEBT.csv")) {
            console.warn(
              `⚠️ WARNING: Equity endpoint got DEBT.csv! Attempting to fix...`
            );
            // Try to find EQUITY_L.csv in discovered URLs
            for (const [otherKey, otherUrl] of Object.entries(discoveredUrls)) {
              if (otherUrl.includes("EQUITY_L.csv")) {
                console.log(
                  `🔄 FIXED: Redirecting equity endpoint to ${otherUrl}`
                );
                this.endpoints[key].url = otherUrl;
                break;
              }
            }
          } else {
            this.endpoints[key].url = url;
          }
        } else {
          this.endpoints[key].url = url;
        }

        if (oldUrl !== this.endpoints[key].url) {
          this.log("info", `🔄 Updated ${key} URL: ${this.endpoints[key].url}`);
        }
      }
    }
  }

  /**
   * Download and parse a single endpoint
   */
  async downloadAndParseEndpoint(key, endpoint, results) {
    try {
      const csvData = await this.downloadCSV(endpoint);
      if (csvData) {
        results[key] = await this.parseCSVData(csvData, key);
        this.log(
          "info",
          `📊 ${endpoint.description}: ${results[key].length} stocks`
        );
      } else {
        results[key] = [];
        this.log("warn", `⚠️  ${endpoint.description}: No data available`);
      }
    } catch (error) {
      results[key] = [];
      this.log("error", `❌ ${endpoint.description}: ${error.message}`);

      if (endpoint.required) {
        throw error;
      }
    }
  }

  /**
   * Remove duplicate stocks based on symbol
   */
  removeDuplicates(stocks) {
    const uniqueMap = new Map();

    stocks.forEach((stock) => {
      if (stock && stock.symbol) {
        const key = stock.symbol.toUpperCase();
        if (
          !uniqueMap.has(key) ||
          this.isNewerStock(stock, uniqueMap.get(key))
        ) {
          uniqueMap.set(key, stock);
        }
      }
    });

    return Array.from(uniqueMap.values());
  }

  /**
   * Check if stock A is newer than stock B
   */
  isNewerStock(stockA, stockB) {
    // Prefer equity over other series
    if (stockA.series === "EQ" && stockB.series !== "EQ") return true;
    if (stockB.series === "EQ" && stockA.series !== "EQ") return false;

    // Prefer stocks with more complete data
    const scoreA = this.calculateDataCompleteness(stockA);
    const scoreB = this.calculateDataCompleteness(stockB);

    return scoreA > scoreB;
  }

  /**
   * Calculate data completeness score
   */
  calculateDataCompleteness(stock) {
    let score = 0;
    if (stock.isin) score += 2;
    if (stock.listingDate) score += 2;
    if (stock.faceValue) score += 1;
    if (stock.marketLot) score += 1;
    if (stock.series) score += 1;
    return score;
  }

  /**
   * Get breakdown counts
   */
  getBreakdownCounts(results) {
    return Object.entries(results).reduce((acc, [key, stocks]) => {
      acc[key] = Array.isArray(stocks) ? stocks.length : 0;
      return acc;
    }, {});
  }

  /**
   * Search stocks by symbol or name (with Redis caching and MongoDB fallback)
   */
  async searchStocks(query, options = {}) {
    if (!query || typeof query !== "string") {
      throw new Error("Search query is required and must be a string");
    }

    const limit = Math.min(options.limit || 20, 100); // Max 100 results
    const searchOptions = {
      caseSensitive: options.caseSensitive || false,
      exactMatch: options.exactMatch || false,
      includeOptional: options.includeOptional !== false,
      ...options,
    };

    try {
      // Try Redis cache first
      if (this.redis.isConnected) {
        const cachedResult = await this.redis.searchStocks(
          query,
          searchOptions
        );
        if (cachedResult.success && cachedResult.cached) {
          this.log("debug", `🎯 Search cache hit for "${query}"`);
          this.metrics.cacheHits++;
          return {
            ...cachedResult,
            source: "REDIS_CACHE",
          };
        }
      }

      // Try MongoDB if available
      if (this.mongodb.isConnected) {
        const dbResult = await this.mongodb.searchStocks(query, searchOptions);
        if (dbResult.success && dbResult.stocks.length > 0) {
          this.log("debug", `🗄️ Search database hit for "${query}"`);

          // Cache the result in Redis
          if (this.redis.isConnected) {
            const searchResult = {
              success: true,
              stocks: dbResult.stocks,
              count: dbResult.count,
              query,
              options: searchOptions,
              source: "MONGODB",
            };

            await this.redis.searchStocks(query, searchOptions).catch(() => {
              // Ignore cache errors
            });
          }

          return {
            ...dbResult,
            source: "MONGODB",
          };
        }
      }

      // Fallback to live fetch
      this.log("debug", `🔄 Live search fallback for "${query}"`);
      const result = await this.fetchAllStocks({
        includeOptional: searchOptions.includeOptional,
      });
      if (!result.success) {
        return { success: false, error: result.error, stocks: [] };
      }

      const searchTerm = searchOptions.caseSensitive
        ? query
        : query.toLowerCase();
      let matches = result.stocks.filter((stock) => {
        if (!stock.symbol || !stock.name) return false;

        const symbol = searchOptions.caseSensitive
          ? stock.symbol
          : stock.symbol.toLowerCase();
        const name = searchOptions.caseSensitive
          ? stock.name
          : stock.name.toLowerCase();

        if (searchOptions.exactMatch) {
          return symbol === searchTerm || name === searchTerm;
        } else {
          return symbol.includes(searchTerm) || name.includes(searchTerm);
        }
      });

      // Sort by relevance
      matches = this.sortByRelevance(matches, searchTerm, searchOptions);

      return {
        success: true,
        stocks: matches.slice(0, limit),
        count: matches.length,
        query: query,
        options: searchOptions,
        source: "LIVE_FETCH",
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        stocks: [],
      };
    }
  }

  /**
   * Sort search results by relevance
   */
  sortByRelevance(stocks, searchTerm, options) {
    return stocks.sort((a, b) => {
      const aSymbol = options.caseSensitive ? a.symbol : a.symbol.toLowerCase();
      const bSymbol = options.caseSensitive ? b.symbol : b.symbol.toLowerCase();

      // Exact symbol match first
      if (aSymbol === searchTerm && bSymbol !== searchTerm) return -1;
      if (bSymbol === searchTerm && aSymbol !== searchTerm) return 1;

      // Symbol starts with search term
      if (aSymbol.startsWith(searchTerm) && !bSymbol.startsWith(searchTerm))
        return -1;
      if (bSymbol.startsWith(searchTerm) && !aSymbol.startsWith(searchTerm))
        return 1;

      // Prefer equity series
      if (a.series === "EQ" && b.series !== "EQ") return -1;
      if (b.series === "EQ" && a.series !== "EQ") return 1;

      // Alphabetical by symbol
      return aSymbol.localeCompare(bSymbol);
    });
  }

  /**
   * Store stocks data in MongoDB and Redis
   */
  async storeStocksData(stocks, discoveryInfo = {}) {
    try {
      // Store in MongoDB
      if (this.mongodb.isConnected) {
        await this.mongodb.storeStocks(stocks, discoveryInfo);
        this.log("info", `💾 Stored ${stocks.length} stocks in MongoDB`);
      }

      // Cache in Redis
      if (this.redis.isConnected) {
        await this.redis.cacheStocks(stocks, discoveryInfo.method || "unknown");
        this.log("info", `⚡ Cached ${stocks.length} stocks in Redis`);
      }

      // Cache discovery result
      if (discoveryInfo.discoveryId && this.redis.isConnected) {
        await this.redis.cacheDiscoveryResult(discoveryInfo);
      }

      // Report parsing results to AI for learning
      if (discoveryInfo.urlsUsed && Array.isArray(discoveryInfo.urlsUsed)) {
        for (const url of discoveryInfo.urlsUsed) {
          this.urlDiscovery.reportParsingResult(url, true, stocks.length);
        }
      }
    } catch (error) {
      this.log("error", `Failed to store stocks data: ${error.message}`);
      // Don't throw - service should continue even if storage fails
    }
  }

  /**
   * Get stock by exact symbol (with Redis caching and MongoDB fallback)
   */
  async getStock(symbol, options = {}) {
    if (!symbol || typeof symbol !== "string") {
      throw new Error("Symbol is required and must be a string");
    }

    try {
      const upperSymbol = symbol.toUpperCase();

      // Try Redis cache first
      if (this.redis.isConnected) {
        const cachedResult = await this.redis.getStock(upperSymbol);
        if (cachedResult.success && cachedResult.cached) {
          this.log("debug", `🎯 Stock cache hit for "${upperSymbol}"`);
          this.metrics.cacheHits++;
          return {
            ...cachedResult,
            source: "REDIS_CACHE",
          };
        }
      }

      // Try MongoDB if available
      if (this.mongodb.isConnected) {
        const dbResult = await this.mongodb.getStock(upperSymbol);
        if (dbResult.success && dbResult.stock) {
          this.log("debug", `🗄️ Stock database hit for "${upperSymbol}"`);

          // Cache the result in Redis
          if (this.redis.isConnected) {
            await this.redis
              .cacheStocks([dbResult.stock], "mongodb-single")
              .catch(() => {
                // Ignore cache errors
              });
          }

          return {
            ...dbResult,
            source: "MONGODB",
          };
        }
      }

      // Fallback to live fetch
      this.log("debug", `🔄 Live fetch fallback for "${upperSymbol}"`);
      const result = await this.fetchAllStocks(options);
      if (!result.success) {
        return { success: false, error: result.error, stock: null };
      }

      const stock = result.stocks.find(
        (s) => s.symbol && s.symbol.toUpperCase() === upperSymbol
      );

      if (stock) {
        return {
          success: true,
          stock: stock,
          source: "LIVE_FETCH",
        };
      } else {
        return {
          success: false,
          error: `Stock with symbol "${symbol}" not found`,
          stock: null,
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
        stock: null,
      };
    }
  }

  /**
   * Force refresh all data
   */
  async forceRefresh(options = {}) {
    this.log("info", "🔄 Force refresh initiated");

    return this.fetchAllStocks({
      ...options,
      forceRefresh: true,
    });
  }

  /**
   * Get URL discovery status
   */
  getUrlDiscoveryStatus() {
    return this.urlDiscovery.getDiscoveryStatus();
  }

  /**
   * Force URL rediscovery
   */
  async forceUrlRediscovery() {
    this.log("info", "🔍 Forcing URL rediscovery...");
    return this.urlDiscovery.forceRediscovery();
  }

  /**
   * Get service health status
   */
  getHealthStatus() {
    const now = Date.now();
    const uptime = now - this.metrics.uptime;

    return {
      status: this.isInitialized ? "healthy" : "initializing",
      uptime: Math.round(uptime / 1000),
      lastSuccessfulFetch: this.lastSuccessfulFetch,
      totalFetches: this.totalFetches,
      failedFetches: this.failedFetches,
      successRate:
        this.totalFetches > 0
          ? Math.round(
              ((this.totalFetches - this.failedFetches) / this.totalFetches) *
                100
            )
          : 0,
      cacheStatus: this.getCacheStatus(),
      endpoints: this.getEndpointStatus(),
      metrics: this.getMetricsSummary(),
    };
  }

  /**
   * Get cache status
   */
  getCacheStatus() {
    const status = {};

    Object.entries(this.endpoints).forEach(([key, endpoint]) => {
      const cachePath = path.join(this.config.cacheDir, endpoint.cacheName);
      const metadataPath = cachePath.replace(".csv", ".meta.json");

      try {
        if (fs.existsSync(cachePath) && fs.existsSync(metadataPath)) {
          const metadata = JSON.parse(fs.readFileSync(metadataPath, "utf8"));
          const age = Date.now() - metadata.timestamp;

          status[key] = {
            exists: true,
            age: Math.round(age / 1000 / 60), // minutes
            size: metadata.size,
            lines: metadata.lines,
            valid: age < this.config.cacheMaxAge,
          };
        } else {
          status[key] = {
            exists: false,
            valid: false,
          };
        }
      } catch (error) {
        status[key] = {
          exists: false,
          valid: false,
          error: error.message,
        };
      }
    });

    return status;
  }

  /**
   * Get endpoint status
   */
  getEndpointStatus() {
    return Object.entries(this.endpoints).reduce((acc, [key, endpoint]) => {
      acc[key] = {
        url: endpoint.url,
        description: endpoint.description,
        priority: endpoint.priority,
        required: endpoint.required,
        retryCount: endpoint.retryCount,
        status: endpoint.retryCount === 0 ? "healthy" : "degraded",
      };
      return acc;
    }, {});
  }

  /**
   * Get metrics summary
   */
  getMetricsSummary() {
    return {
      ...this.metrics,
      successRate:
        this.metrics.totalRequests > 0
          ? Math.round(
              (this.metrics.successfulRequests / this.metrics.totalRequests) *
                100
            )
          : 0,
    };
  }

  /**
   * Clear all cached data
   */
  async clearCache() {
    try {
      const files = await fs.promises.readdir(this.config.cacheDir);
      const deletePromises = files
        .filter((file) => file.endsWith(".csv") || file.endsWith(".meta.json"))
        .map((file) =>
          fs.promises.unlink(path.join(this.config.cacheDir, file))
        );

      await Promise.all(deletePromises);
      this.metrics.cacheHits = 0;

      this.log("info", "🧹 Cache cleared successfully");
      this.emit("cacheCleared");

      return true;
    } catch (error) {
      this.log("error", `Failed to clear cache: ${error.message}`);
      return false;
    }
  }

  /**
   * Utility methods
   */

  cleanString(value) {
    if (!value) return null;
    return String(value)
      .trim()
      .replace(/^["']|["']$/g, "");
  }

  parseNumber(value) {
    if (!value) return null;
    const num = parseFloat(String(value).replace(/[^0-9.-]/g, ""));
    return isNaN(num) ? null : num;
  }

  parseDate(value) {
    if (!value) return null;
    const cleanValue = this.cleanString(value);
    if (!cleanValue) return null;

    // Try to parse common date formats
    const date = new Date(cleanValue);
    return isNaN(date.getTime())
      ? cleanValue
      : date.toISOString().split("T")[0];
  }

  calculateChecksum(data) {
    // Simple checksum for data integrity
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(16);
  }

  calculateRetryDelay(attempt) {
    // Exponential backoff with jitter
    const baseDelay = this.config.retryDelay;
    const exponentialDelay = baseDelay * Math.pow(2, attempt);
    const jitter = Math.random() * 1000;
    return Math.min(exponentialDelay + jitter, 30000); // Max 30 seconds
  }

  updateAverageResponseTime(responseTime) {
    if (this.metrics.successfulRequests === 1) {
      this.metrics.averageResponseTime = responseTime;
    } else {
      this.metrics.averageResponseTime =
        (this.metrics.averageResponseTime *
          (this.metrics.successfulRequests - 1) +
          responseTime) /
        this.metrics.successfulRequests;
    }
  }

  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  log(level, message) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level.toUpperCase()}] ProductionNSEService: ${message}`;

    if (this.config.enableMetrics) {
      // In production, replace with proper logging framework
      console.log(logMessage);
    }

    this.emit("log", { level, message, timestamp });
  }
}

module.exports = ProductionNSEService;
