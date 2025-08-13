const Stock = require("../models/Stock");
const { getCache, setCache } = require("../config/redis");

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
  },
};

module.exports = resolvers;
