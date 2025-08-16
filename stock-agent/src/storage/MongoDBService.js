const mongoose = require("mongoose");
const EventEmitter = require("events");

/**
 * MongoDB Service for Stock Data Storage
 * Handles persistent storage of stock data with efficient querying
 */
class MongoDBService extends EventEmitter {
  constructor(config = {}) {
    super();

    this.config = {
      uri:
        config.uri ||
        process.env.MONGODB_URI ||
        "mongodb://localhost:27017/stock-agent",
      options: {
        // Connection pool settings
        maxPoolSize: config.maxPoolSize || 50, // Increased for bulk operations
        minPoolSize: config.minPoolSize || 5, // Minimum connections
        maxIdleTimeMS: config.maxIdleTimeMS || 30000, // Close idle connections
        serverSelectionTimeoutMS: config.serverSelectionTimeoutMS || 10000,
        socketTimeoutMS: config.socketTimeoutMS || 45000, // Socket timeout
        connectTimeoutMS: config.connectTimeoutMS || 10000, // Connection timeout

        // Buffer settings (MongoDB 6+ compatible)
        bufferCommands: false, // Disable buffering

        // Write concern for bulk operations
        writeConcern: {
          w: 1, // Wait for primary
          j: false, // Don't wait for journal
          wtimeout: 10000, // Write timeout
        },

        // Read preferences
        readPreference: "primary",

        // Retry settings
        retryWrites: true,
        retryReads: true,

        // Heartbeat settings
        heartbeatFrequencyMS: 10000,

        // Compaction settings
        compressors: ["zlib"],
        zlibCompressionLevel: 6,

        ...config.options,
      },
    };

    this.isConnected = false;
    this.models = {};
    this.retryCount = 0;
    this.maxRetries = 3;

    // Add logger
    this.logger = {
      info: (msg) => console.log(`[MongoDB] INFO: ${msg}`),
      warn: (msg) => console.warn(`[MongoDB] WARN: ${msg}`),
      error: (msg) => console.error(`[MongoDB] ERROR: ${msg}`),
      debug: (msg) => console.log(`[MongoDB] DEBUG: ${msg}`),
    };

    this.initializeSchemas();
  }

  /**
   * Initialize database schemas
   */
  initializeSchemas() {
    // Stock Schema
    const stockSchema = new mongoose.Schema({
      symbol: { type: String, required: true, unique: true, index: true },
      name: { type: String, required: true, index: true },
      series: { type: String, index: true },
      listingDate: { type: Date, index: true },
      isin: { type: String, index: true },
      faceValue: { type: Number },
      marketLot: { type: Number },
      paidUpValue: { type: Number },
      source: { type: String, required: true, index: true },
      category: { type: String, index: true }, // equity, sme, etf, reits, invits
      isActive: { type: Boolean, default: true, index: true },

      // Metadata
      discoveredBy: { type: String }, // AI, manual, api
      qualityScore: { type: Number, min: 0, max: 10 },
      lastVerified: { type: Date, default: Date.now },
      dataHistory: [
        {
          updatedAt: { type: Date, default: Date.now },
          changes: { type: mongoose.Schema.Types.Mixed },
          source: String,
        },
      ],

      // Search optimization
      searchTokens: [{ type: String, index: true }],

      // Timestamps
      createdAt: { type: Date, default: Date.now, index: true },
      updatedAt: { type: Date, default: Date.now, index: true },
    });

    // Add text search index
    stockSchema.index(
      {
        symbol: "text",
        name: "text",
        searchTokens: "text",
      },
      {
        weights: { symbol: 10, name: 5, searchTokens: 1 },
      }
    );

    // Discovery History Schema
    const discoverySchema = new mongoose.Schema({
      discoveryId: { type: String, required: true, unique: true },
      timestamp: { type: Date, default: Date.now, index: true },
      totalCSVsFound: { type: Number, required: true },
      totalStocksFound: { type: Number, required: true },
      aiRecommendations: { type: mongoose.Schema.Types.Mixed },
      urlsUsed: [{ type: String }],
      sourceBreakdown: { type: mongoose.Schema.Types.Mixed },
      duration: { type: Number }, // milliseconds
      success: { type: Boolean, default: true },
      errors: [{ type: String }],

      // Performance metrics
      metrics: {
        avgQualityScore: Number,
        newStocksAdded: Number,
        stocksUpdated: Number,
        stocksDeactivated: Number,
      },
    });

    // CSV Analysis Schema
    const csvAnalysisSchema = new mongoose.Schema({
      url: { type: String, required: true, index: true },
      category: { type: String, required: true, index: true },
      priority: { type: Number, required: true },
      qualityScore: { type: Number, required: true },
      shouldUse: { type: Boolean, required: true },

      // Analysis details
      headers: [{ type: String }],
      estimatedRows: { type: Number },
      fileSize: { type: Number },
      lastModified: { type: Date },

      // Learning data
      successfulParsings: { type: Number, default: 0 },
      failedParsings: { type: Number, default: 0 },
      avgStocksExtracted: { type: Number, default: 0 },

      // Timestamps
      firstAnalyzed: { type: Date, default: Date.now },
      lastAnalyzed: { type: Date, default: Date.now },
      lastUsed: { type: Date },
    });

    // System Metrics Schema
    const systemMetricsSchema = new mongoose.Schema({
      timestamp: { type: Date, default: Date.now, index: true },
      type: { type: String, required: true, index: true }, // hourly, daily, weekly

      // Stock metrics
      totalStocks: { type: Number },
      activeStocks: { type: Number },
      stocksByCategory: { type: mongoose.Schema.Types.Mixed },
      stocksBySource: { type: mongoose.Schema.Types.Mixed },

      // Discovery metrics
      totalDiscoveries: { type: Number },
      avgDiscoveryTime: { type: Number },
      avgCSVsPerDiscovery: { type: Number },
      avgStocksPerDiscovery: { type: Number },

      // AI metrics
      aiClassifications: { type: Number },
      aiAccuracy: { type: Number },
      avgQualityScore: { type: Number },

      // System performance
      avgResponseTime: { type: Number },
      successRate: { type: Number },
      cacheHitRate: { type: Number },

      // Data quality
      dataCompletenessScore: { type: Number },
      duplicateRate: { type: Number },
      errorRate: { type: Number },
    });

    // Create models with unique names to avoid conflicts
    this.models.Stock = mongoose.model("NSEStock", stockSchema);
    this.models.Discovery = mongoose.model("NSEDiscovery", discoverySchema);
    this.models.CSVAnalysis = mongoose.model(
      "NSECSVAnalysis",
      csvAnalysisSchema
    );
    this.models.SystemMetrics = mongoose.model(
      "NSESystemMetrics",
      systemMetricsSchema
    );

    console.log("📊 Database schemas initialized");
  }

  /**
   * Connect to MongoDB
   */
  async connect() {
    try {
      if (this.isConnected && mongoose.connection.readyState === 1) {
        return true;
      }

      console.log("🔌 Connecting to MongoDB...");

      await mongoose.connect(this.config.uri, this.config.options);

      // Verify actual connection
      if (mongoose.connection.readyState !== 1) {
        throw new Error("Connection not ready after connect");
      }

      this.isConnected = true;
      this.retryCount = 0;

      // Set up event listeners
      mongoose.connection.on("error", (error) => {
        console.error("❌ MongoDB connection error:", error.message);
        this.isConnected = false;
        this.emit("error", error);
      });

      mongoose.connection.on("disconnected", () => {
        console.warn("⚠️ MongoDB disconnected");
        this.isConnected = false;
        this.emit("disconnected");
      });

      mongoose.connection.on("reconnected", () => {
        console.log("🔄 MongoDB reconnected");
        this.isConnected = true;
        this.emit("reconnected");
      });

      console.log("✅ MongoDB connected successfully");
      this.logger.info(
        `Connected to database: ${mongoose.connection.db.databaseName}`
      );
      this.logger.info(
        `Connection ready state: ${mongoose.connection.readyState}`
      );
      this.emit("connected");

      return true;
    } catch (error) {
      console.error("❌ MongoDB connection failed:", error.message);
      this.isConnected = false;

      if (this.retryCount < this.maxRetries) {
        this.retryCount++;
        console.log(
          `🔄 Retrying connection (${this.retryCount}/${this.maxRetries}) in 5s...`
        );
        await this.sleep(5000);
        return this.connect();
      }

      throw error;
    }
  }

  /**
   * Disconnect from MongoDB
   */
  async disconnect() {
    try {
      if (this.isConnected) {
        await mongoose.disconnect();
        this.isConnected = false;
        console.log("📴 MongoDB disconnected");
      }
    } catch (error) {
      console.error("❌ Error disconnecting from MongoDB:", error.message);
      throw error;
    }
  }

  /**
   * Store stock data with bulk operations for efficiency
   */
  async storeStocks(stocks, discoveryInfo = {}) {
    if (!this.isConnected || mongoose.connection.readyState !== 1) {
      this.logger.warn("Not connected to MongoDB. Cannot store stocks.");
      return { success: false, error: "Not connected to MongoDB" };
    }

    try {
      this.logger.info(`Starting to store ${stocks.length} stocks...`);

      // Check if our models exist
      if (!this.models.Stock) {
        this.logger.error("Stock model not found!");
        return { success: false, error: "Stock model not initialized" };
      }

      this.logger.info("Stock model found, proceeding with bulk operations...");

      const bulkOps = stocks.map((stock) => ({
        updateOne: {
          filter: { symbol: stock.symbol },
          update: {
            $set: {
              name: stock.name,
              isin: stock.isin,
              series: stock.series,
              dateOfListing: stock.dateOfListing,
              paidUpValue: stock.paidUpValue,
              marketLot: stock.marketLot,
              faceValue: stock.faceValue,
              industry: stock.industry,
              sector: stock.sector,
              lastUpdated: new Date(),
              source: stock.source,
              discoveryId: discoveryInfo.discoveryId,
            },
            $setOnInsert: {
              createdAt: new Date(),
            },
          },
          upsert: true,
        },
      }));

      this.logger.info(
        `Executing bulk operation with ${bulkOps.length} operations...`
      );

      const result = await this.models.Stock.bulkWrite(bulkOps);

      this.logger.info(
        `MongoDB: Upserted ${result.upsertedCount} new, modified ${result.modifiedCount} existing stocks.`
      );

      // Log the discovery event with required fields
      const discoveryLog = {
        discoveryId: discoveryInfo.discoveryId || `discovery-${Date.now()}`,
        timestamp: new Date(),
        method: discoveryInfo.method || "unknown",
        urlsUsed: discoveryInfo.urlsUsed || [],
        totalCSVsFound: discoveryInfo.totalCSVsFound || 0,
        totalStocksFound: stocks.length, // Required field
        aiRecommendations: discoveryInfo.aiRecommendations || {},
        sourceBreakdown: discoveryInfo.sourceBreakdown || {},
        success: true,
      };

      this.logger.info("Creating discovery log...");
      await this.models.Discovery.create([discoveryLog]);
      this.logger.info("Discovery log created successfully");

      return {
        success: true,
        message: "Stocks stored successfully",
        insertedCount: result.upsertedCount,
        modifiedCount: result.modifiedCount,
        matchedCount: result.matchedCount,
      };
    } catch (error) {
      this.logger.error(`Failed to store stocks in MongoDB: ${error.message}`);
      this.logger.error(`Error stack: ${error.stack}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Search stocks with advanced filtering
   */
  async searchStocks(query, options = {}) {
    if (!this.isConnected) {
      await this.connect();
    }

    try {
      const {
        limit = 20,
        offset = 0,
        category,
        source,
        series,
        isActive = true,
        sortBy = "symbol",
        sortOrder = 1,
        includeInactive = false,
      } = options;

      // Build search filter
      const filter = {};

      if (isActive && !includeInactive) {
        filter.isActive = true;
      }

      if (category) {
        filter.category = category;
      }

      if (source) {
        filter.source = source;
      }

      if (series) {
        filter.series = series;
      }

      let searchQuery;

      if (query && query.trim()) {
        // Use text search for complex queries
        searchQuery = this.models.Stock.find({
          ...filter,
          $text: { $search: query },
        }).select("-dataHistory"); // Exclude history for performance
      } else {
        // Simple filter query
        searchQuery = this.models.Stock.find(filter).select("-dataHistory");
      }

      // Apply sorting
      const sortOptions = {};
      sortOptions[sortBy] = sortOrder;
      searchQuery = searchQuery.sort(sortOptions);

      // Apply pagination
      searchQuery = searchQuery.skip(offset).limit(limit);

      const results = await searchQuery.exec();
      const total = await this.models.Stock.countDocuments(filter);

      return {
        success: true,
        stocks: results,
        count: results.length,
        total,
        offset,
        limit,
        hasMore: offset + results.length < total,
      };
    } catch (error) {
      console.error("❌ Stock search failed:", error.message);
      return {
        success: false,
        error: error.message,
        stocks: [],
        count: 0,
      };
    }
  }

  /**
   * Get stock by symbol
   */
  async getStock(symbol) {
    if (!this.isConnected) {
      await this.connect();
    }

    try {
      const stock = await this.models.Stock.findOne({
        symbol: symbol.toUpperCase(),
        isActive: true,
      }).select("-dataHistory");

      if (stock) {
        return {
          success: true,
          stock: stock.toObject(),
        };
      } else {
        return {
          success: false,
          error: `Stock ${symbol} not found`,
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
   * Store CSV analysis data
   */
  async storeCSVAnalysis(analysisData) {
    if (!this.isConnected) {
      await this.connect();
    }

    try {
      const bulkOps = analysisData.map((analysis) => ({
        updateOne: {
          filter: { url: analysis.url },
          update: {
            $set: {
              ...analysis,
              lastAnalyzed: new Date(),
            },
            $setOnInsert: {
              firstAnalyzed: new Date(),
            },
          },
          upsert: true,
        },
      }));

      await this.models.CSVAnalysis.bulkWrite(bulkOps);
      console.log(`📊 Stored analysis for ${analysisData.length} CSVs`);
    } catch (error) {
      console.error("❌ Failed to store CSV analysis:", error.message);
      throw error;
    }
  }

  /**
   * Store discovery record
   */
  async storeDiscoveryRecord(discoveryData) {
    if (!this.isConnected) {
      await this.connect();
    }

    try {
      const discovery = new this.models.Discovery(discoveryData);
      await discovery.save();
      console.log(`📝 Stored discovery record: ${discoveryData.discoveryId}`);
    } catch (error) {
      console.error("❌ Failed to store discovery record:", error.message);
      throw error;
    }
  }

  /**
   * Get database statistics
   */
  async getStats() {
    if (!this.isConnected) {
      await this.connect();
    }

    try {
      const [
        totalStocks,
        activeStocks,
        categoryStats,
        sourceStats,
        recentDiscoveries,
      ] = await Promise.all([
        this.models.Stock.countDocuments(),
        this.models.Stock.countDocuments({ isActive: true }),
        this.models.Stock.aggregate([
          { $group: { _id: "$category", count: { $sum: 1 } } },
        ]),
        this.models.Stock.aggregate([
          { $group: { _id: "$source", count: { $sum: 1 } } },
        ]),
        this.models.Discovery.find().sort({ timestamp: -1 }).limit(5),
      ]);

      return {
        totalStocks,
        activeStocks,
        inactiveStocks: totalStocks - activeStocks,
        categoryBreakdown: categoryStats.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        sourceBreakdown: sourceStats.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        recentDiscoveries: recentDiscoveries.length,
        connectionStatus: this.isConnected ? "connected" : "disconnected",
      };
    } catch (error) {
      console.error("❌ Failed to get database stats:", error.message);
      return {
        error: error.message,
        connectionStatus: "error",
      };
    }
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      if (!this.isConnected) {
        return { status: "disconnected", error: "Not connected to database" };
      }

      // Simple ping to check connection
      await mongoose.connection.db.admin().ping();

      const stats = await this.getStats();

      return {
        status: "healthy",
        connection: "active",
        totalStocks: stats.totalStocks,
        activeStocks: stats.activeStocks,
      };
    } catch (error) {
      return {
        status: "unhealthy",
        error: error.message,
      };
    }
  }

  /**
   * Utility methods
   */

  generateSearchTokens(stock) {
    const tokens = new Set();

    if (stock.symbol) {
      tokens.add(stock.symbol.toLowerCase());
      // Add partial matches
      for (let i = 2; i <= stock.symbol.length; i++) {
        tokens.add(stock.symbol.substring(0, i).toLowerCase());
      }
    }

    if (stock.name) {
      const words = stock.name.toLowerCase().split(/\s+/);
      words.forEach((word) => {
        if (word.length >= 3) {
          tokens.add(word);
        }
      });
    }

    return Array.from(tokens);
  }

  getChanges(newData) {
    // Simple change tracking - in production, compare with existing data
    return {
      updatedFields: Object.keys(newData),
      timestamp: new Date(),
    };
  }

  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

module.exports = MongoDBService;
