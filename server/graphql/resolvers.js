const Stock = require("../models/Stock");
const { getCache, setCache } = require("../config/redis");
const SentimentService = require("../services/sentimentService");

const sentimentService = new SentimentService();

const resolvers = {
  Query: {
    // Health check
    health: () => "OK",

    // Get stock suggestions for autocomplete
    getStockSuggestions: async (_, { query, limit = 10 }) => {
      try {
        // Check cache first
        const cacheKey = `stock_suggestions:${query}:${limit}`;
        const cached = await getCache(cacheKey);

        if (cached) {
          console.log("Returning cached stock suggestions");
          return cached;
        }

        // Search in database
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

        const result = {
          suggestions,
          totalCount: suggestions.length,
        };

        // Cache the result for 1 hour
        await setCache(cacheKey, result, 3600);

        return result;
      } catch (error) {
        console.error("Error in getStockSuggestions:", error);
        throw new Error("Failed to fetch stock suggestions");
      }
    },

    // Get specific stock by ticker
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

        // Cache the result for 1 hour
        await setCache(cacheKey, sentimentResult, 3600);

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

        // Cache the result for 1 hour
        await setCache(cacheKey, history, 3600);

        return history;
      } catch (error) {
        console.error("Error in getSentimentHistory:", error);
        throw new Error(
          `Failed to get sentiment history for ${ticker}: ${error.message}`
        );
      }
    },
  },
};

module.exports = resolvers;
