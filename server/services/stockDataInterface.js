const mongoose = require("mongoose");
const Stock = require("../models/Stock");

/**
 * Stock Data Interface Service
 * Provides a unified interface for stock data access
 * Abstracts the data source (can be local stocks collection or external)
 */
class StockDataInterface {
  constructor() {
    this.isInitialized = false;
    this.dataSource = process.env.STOCK_DATA_SOURCE || "local"; // 'local' or 'external'
    this.lastSync = null;
    this.syncInterval = 24 * 60 * 60 * 1000; // 24 hours
  }

  /**
   * Initialize the interface
   */
  async initialize() {
    try {
      if (this.isInitialized) {
        return { success: true, message: "Already initialized" };
      }

      console.log("🚀 Initializing Stock Data Interface...");
      console.log(`   📊 Data source: ${this.dataSource}`);

      // Ensure MongoDB connection
      if (mongoose.connection.readyState !== 1) {
        console.log("   🔌 Connecting to MongoDB...");
        await mongoose.connect(process.env.MONGODB_URI, {
          maxPoolSize: parseInt(process.env.MONGODB_MAX_POOL || "50", 10),
          serverSelectionTimeoutMS: parseInt(
            process.env.MONGODB_SERVER_SELECTION_TIMEOUT || "10000",
            10
          ),
          socketTimeoutMS: parseInt(
            process.env.MONGODB_SOCKET_TIMEOUT || "45000",
            10
          ),
          connectTimeoutMS: parseInt(
            process.env.MONGODB_CONNECT_TIMEOUT || "10000",
            10
          ),
          bufferCommands: process.env.MONGODB_BUFFER_COMMANDS === "true",
        });
        console.log("   ✅ MongoDB connected");
      }

      // Check data source availability
      if (this.dataSource === "external") {
        const nsestocksCollection =
          mongoose.connection.db.collection("nsestocks");
        const count = await nsestocksCollection.countDocuments();
        if (count === 0) {
          console.log(
            "   ⚠️ External data source empty, falling back to local"
          );
          this.dataSource = "local";
        } else {
          console.log(`   ✅ External data source available: ${count} stocks`);
        }
      }

      this.isInitialized = true;
      return {
        success: true,
        message: "Stock Data Interface initialized successfully",
      };
    } catch (error) {
      console.error("❌ Failed to initialize Stock Data Interface:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Search stocks with unified interface
   */
  async searchStocks(query, limit = 20) {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      // Try external source first if available
      if (this.dataSource === "external") {
        try {
          const nsestocksCollection =
            mongoose.connection.db.collection("nsestocks");
          const searchRegex = new RegExp(query, "i");

          const stocks = await nsestocksCollection
            .find({
              $or: [
                { SYMBOL: searchRegex },
                { "NAME OF COMPANY": searchRegex },
                { sector: searchRegex },
              ],
            })
            .limit(limit)
            .toArray();

          if (stocks.length > 0) {
            const transformed = stocks.map((stock) => ({
              ticker: stock.SYMBOL,
              name: stock["NAME OF COMPANY"],
              exchange: stock.exchange || "NSE",
              sector: stock.sector || "Unknown",
              isin: stock["ISIN NUMBER"],
              faceValue: stock["PAID UP VALUE"],
            }));

            return {
              success: true,
              suggestions: transformed,
              totalCount: transformed.length,
              query,
              searchTime: new Date().toISOString(),
              source: "external",
            };
          }
        } catch (externalError) {
          console.log(
            "External search failed, falling back to local:",
            externalError.message
          );
        }
      }

      // Fallback to local search
      const searchRegex = new RegExp(query, "i");
      const suggestions = await Stock.find({
        $or: [
          { ticker: searchRegex },
          { name: searchRegex },
          { sector: searchRegex },
        ],
      })
        .select("ticker name exchange sector")
        .limit(limit)
        .sort({ marketCap: -1, name: 1 });

      return {
        success: true,
        suggestions,
        totalCount: suggestions.length,
        query,
        searchTime: new Date().toISOString(),
        source: "local",
      };
    } catch (error) {
      console.error("Error in searchStocks:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get stock details with unified interface
   */
  async getStockDetails(ticker) {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      // Try external source first if available
      if (this.dataSource === "external") {
        try {
          const nsestocksCollection =
            mongoose.connection.db.collection("nsestocks");
          const stock = await nsestocksCollection.findOne({
            SYMBOL: ticker.toUpperCase(),
          });

          if (stock) {
            return {
              success: true,
              stock: {
                ticker: stock.SYMBOL,
                name: stock["NAME OF COMPANY"],
                exchange: stock.exchange || "NSE",
                sector: stock.sector || "Unknown",
                isin: stock["ISIN NUMBER"],
                faceValue: stock["PAID UP VALUE"],
                source: "external",
              },
            };
          }
        } catch (externalError) {
          console.log(
            "External details failed, falling back to local:",
            externalError.message
          );
        }
      }

      // Fallback to local search
      const stock = await Stock.findOne({ ticker: ticker.toUpperCase() });
      if (!stock) {
        return { success: false, error: "Stock not found" };
      }

      return {
        success: true,
        stock: {
          ...stock.toObject(),
          source: "local",
        },
      };
    } catch (error) {
      console.error("Error in getStockDetails:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      dataSource: this.dataSource,
      lastSync: this.lastSync,
      nextSync: this.lastSync
        ? new Date(this.lastSync + this.syncInterval)
        : null,
    };
  }

  /**
   * Sync data from external source to local (if needed)
   */
  async syncStockData(forceSync = false) {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      if (this.dataSource !== "external") {
        return { success: true, message: "No external sync needed" };
      }

      // Check if sync is needed
      if (
        !forceSync &&
        this.lastSync &&
        Date.now() - this.lastSync < this.syncInterval
      ) {
        return {
          success: true,
          message: "Sync not needed",
          lastSync: this.lastSync,
          nextSync: new Date(this.lastSync + this.syncInterval),
        };
      }

      console.log("🔄 Syncing stock data from external source...");

      const nsestocksCollection =
        mongoose.connection.db.collection("nsestocks");
      const externalStocks = await nsestocksCollection.find({}).toArray();

      let upserted = 0;
      let modified = 0;

      for (const externalStock of externalStocks) {
        const result = await Stock.findOneAndUpdate(
          { ticker: externalStock.SYMBOL },
          {
            ticker: externalStock.SYMBOL,
            name: externalStock["NAME OF COMPANY"],
            exchange: externalStock.exchange || "NSE",
            sector: externalStock.sector || "Unknown",
            isin: externalStock["ISIN NUMBER"],
            faceValue: externalStock["PAID UP VALUE"],
            lastUpdated: new Date(),
          },
          { upsert: true, new: true }
        );

        if (result.isNew) {
          upserted++;
        } else {
          modified++;
        }
      }

      this.lastSync = Date.now();

      return {
        success: true,
        message: `Sync completed: ${upserted} new, ${modified} modified`,
        upserted,
        modified,
        lastSync: this.lastSync,
      };
    } catch (error) {
      console.error("Error in syncStockData:", error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new StockDataInterface();
