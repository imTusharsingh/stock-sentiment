const Stock = require("../models/Stock");
const { getCache, setCache } = require("../config/redis");
const SentimentService = require("../services/sentimentService");
const PriceService = require("../services/priceService");
const authService = require("../services/authService");
const stockDataInterface = require("../services/stockDataInterface");

const sentimentService = new SentimentService();
const priceService = new PriceService();

const resolvers = {
  Date: {
    __serialize(value) {
      return value instanceof Date ? value.toISOString() : value;
    },
    __parseValue(value) {
      return new Date(value);
    },
    __parseLiteral(ast) {
      if (ast.kind === "StringValue") {
        return new Date(ast.value);
      }
      return null;
    },
  },

  Query: {
    // Health check
    health: () => "OK",

    // Enhanced stock suggestions with stock agent
    getStockSuggestions: async (
      _,
      {
        query,
        limit = 20,
        exchange,
        sector,
        sortBy = "priority",
        sortOrder = -1,
      }
    ) => {
      try {
        // Check cache first
        const cacheKey = `enhanced_stock_suggestions:${query}:${limit}:${
          exchange || "all"
        }:${sector || "all"}`;
        const cached = await getCache(cacheKey);

        if (cached) {
          console.log("Returning cached enhanced stock suggestions");
          return cached;
        }

        // Use stock data interface for enhanced search
        const result = await stockDataInterface.searchStocks(query, limit);

        if (!result.success) {
          throw new Error(result.error || "Search failed");
        }

        // Cache the result for 30 minutes
        await setCache(cacheKey, result, 1800);

        return result;
      } catch (error) {
        console.error("Error in enhanced getStockSuggestions:", error);

        // Fallback to basic search
        try {
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
            suggestions,
            totalCount: suggestions.length,
            query,
            searchTime: new Date().toISOString(),
          };
        } catch (fallbackError) {
          console.error("Fallback search also failed:", fallbackError);
          throw new Error("Failed to fetch stock suggestions");
        }
      }
    },

    // Get stock details with stock data interface
    getStockDetails: async (_, { ticker }) => {
      try {
        const result = await stockDataInterface.getStockDetails(ticker);

        if (!result.success) {
          throw new Error(result.error || "Stock not found");
        }

        return result.stock;
      } catch (error) {
        console.error("Error in getStockDetails:", error);
        throw error;
      }
    },

    // Stock data interface status
    getStockDataStatus: async () => {
      try {
        return stockDataInterface.getStatus();
      } catch (error) {
        console.error("Error getting stock data status:", error);
        throw new Error("Failed to get stock data status");
      }
    },

    // Sync stock data
    syncStockData: async (_, { forceSync = false }) => {
      try {
        const result = await stockDataInterface.syncStockData(forceSync);
        return result;
      } catch (error) {
        console.error("Error syncing stock data:", error);
        return {
          success: false,
          error: error.message,
        };
      }
    },

    // Get specific stock by ticker (existing)
    getStockByTicker: async (_, { ticker }) => {
      try {
        const stock = await Stock.findOne({
          ticker: ticker.toUpperCase(),
        });

        if (!stock) {
          throw new Error(`Stock with ticker ${ticker} not found`);
        }

        return stock;
      } catch (error) {
        console.error("Error in getStockByTicker:", error);
        throw error;
      }
    },

    // Get all stocks with pagination
    getAllStocks: async (_, { limit = 50, offset = 0 }) => {
      try {
        const stocks = await Stock.find()
          .select("ticker name exchange sector marketCap")
          .limit(limit)
          .skip(offset)
          .sort({ marketCap: -1, name: 1 });

        return stocks;
      } catch (error) {
        console.error("Error in getAllStocks:", error);
        throw new Error("Failed to fetch stocks");
      }
    },

    // Get sentiment analysis for a stock
    getSentiment: async (_, { ticker, dateRange }) => {
      try {
        // Check cache first
        const cacheKey = `sentiment:${ticker}:${JSON.stringify(dateRange)}`;
        const cached = await getCache(cacheKey);

        if (cached) {
          console.log("Returning cached sentiment analysis");
          return cached;
        }

        // Validate ticker exists
        const stock = await Stock.findOne({ ticker: ticker.toUpperCase() });
        if (!stock) {
          throw new Error(`Stock with ticker ${ticker} not found`);
        }

        // Get sentiment analysis
        const sentimentResult = await sentimentService.getSentiment(
          ticker,
          dateRange
        );

        // Only cache successful results
        if (!sentimentResult.error) {
          await setCache(cacheKey, sentimentResult, 3600);
        }

        return sentimentResult;
      } catch (error) {
        console.error("Error in getSentiment:", error);
        throw new Error(
          `Failed to get sentiment for ${ticker}: ${error.message}`
        );
      }
    },

    // Get sentiment history for a stock
    getSentimentHistory: async (_, { ticker, days = 7 }) => {
      try {
        // Check cache first
        const cacheKey = `sentiment_history:${ticker}:${days}`;
        const cached = await getCache(cacheKey);

        if (cached) {
          console.log("Returning cached sentiment history");
          return cached;
        }

        // Validate ticker exists
        const stock = await Stock.findOne({ ticker: ticker.toUpperCase() });
        if (!stock) {
          throw new Error(`Stock with ticker ${ticker} not found`);
        }

        // Calculate date range
        const to = new Date();
        const from = new Date();
        from.setDate(from.getDate() - days);

        const dateRange = {
          from: from.toISOString().split("T")[0],
          to: to.toISOString().split("T")[0],
        };

        // Get sentiment analysis for the date range
        const sentimentResult = await sentimentService.getSentiment(
          ticker,
          dateRange
        );

        // For now, return single result (in future, we can implement daily tracking)
        const history = [sentimentResult];

        // Only cache successful results
        if (history.length > 0 && !history[0].error) {
          await setCache(cacheKey, history, 3600);
        }

        return history;
      } catch (error) {
        console.error("Error in getSentimentHistory:", error);
        throw new Error(
          `Failed to get sentiment history for ${ticker}: ${error.message}`
        );
      }
    },

    // Get price trend for a stock
    getPriceTrend: async (_, { ticker, dateRange }) => {
      try {
        // Check cache first
        const cacheKey = `price_trend:${ticker}:${JSON.stringify(dateRange)}`;
        const cached = await getCache(cacheKey);

        if (cached) {
          console.log("Returning cached price trend");
          return cached;
        }

        // Validate ticker exists
        const stock = await Stock.findOne({ ticker: ticker.toUpperCase() });
        if (!stock) {
          throw new Error(`Stock with ticker ${ticker} not found`);
        }

        // Get price trend
        const priceResult = await priceService.getPriceTrend(ticker, dateRange);

        // Cache the result for 24 hours (price data changes less frequently)
        await setCache(cacheKey, priceResult, 86400);

        return priceResult;
      } catch (error) {
        console.error("Error in getPriceTrend:", error);
        throw new Error(
          `Failed to get price trend for ${ticker}: ${error.message}`
        );
      }
    },

    // Get stock price for a specific period
    getStockPrice: async (_, { ticker, period = "1mo" }) => {
      try {
        // Check cache first
        const cacheKey = `stock_price:${ticker}:${period}`;
        const cached = await getCache(cacheKey);

        if (cached) {
          console.log("Returning cached stock price");
          return cached;
        }

        // Validate ticker exists
        const stock = await Stock.findOne({ ticker: ticker.toUpperCase() });
        if (!stock) {
          throw new Error(`Stock with ticker ${ticker} not found`);
        }

        // Get stock price
        const priceResult = await priceService.getStockPrice(ticker, period);

        // Cache the result for 24 hours
        await setCache(cacheKey, priceResult, 86400);

        return priceResult;
      } catch (error) {
        console.error("Error in getStockPrice:", error);
        throw new Error(
          `Failed to get stock price for ${ticker}: ${error.message}`
        );
      }
    },

    // Get current user
    me: async (_, __, { user }) => {
      if (!user) {
        throw new Error("Authentication required");
      }
      return user;
    },

    // Get user favorites
    getFavorites: async (_, __, { user }) => {
      if (!user) {
        throw new Error("Authentication required");
      }
      return user.favorites;
    },
  },

  Mutation: {
    // Stock Data Management
    forceStockDataRefresh: async () => {
      try {
        const result = await stockDataInterface.syncStockData(true); // Force sync
        return result;
      } catch (error) {
        console.error("Error forcing stock data refresh:", error);
        return {
          success: false,
          error: error.message,
        };
      }
    },

    // User registration
    register: async (_, { input }) => {
      try {
        const { email, password, name } = input;

        // Validate input
        if (!email || !password || !name) {
          throw new Error("All fields are required");
        }

        if (password.length < 6) {
          throw new Error("Password must be at least 6 characters long");
        }

        const result = await authService.register(input);
        return result;
      } catch (error) {
        console.error("Error in register:", error);
        throw new Error(error.message);
      }
    },

    // User login
    login: async (_, { input }) => {
      try {
        const { email, password } = input;

        if (!email || !password) {
          throw new Error("Email and password are required");
        }

        const result = await authService.login(email, password);
        return result;
      } catch (error) {
        console.error("Error in login:", error);
        throw new Error(error.message);
      }
    },

    // Add favorite stock
    addFavorite: async (_, { ticker, name }, { user }) => {
      if (!user) {
        throw new Error("Authentication required");
      }

      try {
        const result = await authService.addFavorite(user.id, ticker, name);
        return result;
      } catch (error) {
        console.error("Error in addFavorite:", error);
        throw new Error(error.message);
      }
    },

    // Remove favorite stock
    removeFavorite: async (_, { ticker }, { user }) => {
      if (!user) {
        throw new Error("Authentication required");
      }

      try {
        const result = await authService.removeFavorite(user.id, ticker);
        return result;
      } catch (error) {
        console.error("Error in removeFavorite:", error);
        throw new Error(error.message);
      }
    },
  },
};

module.exports = resolvers;
