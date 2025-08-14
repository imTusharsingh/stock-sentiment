const yahooFinance = require("yahoo-finance2").default;
const { getCache, setCache } = require("../config/redis");

class PriceService {
  constructor() {
    this.cacheTTL = 86400; // 24 hours
  }

  async getStockPrice(ticker, period = "1mo") {
    try {
      const cacheKey = `stock_price:${ticker}:${period}`;
      const cached = await getCache(cacheKey);

      if (cached) {
        console.log("Returning cached stock price data");
        return cached;
      }

      // Use yahoo-finance2 with proper ticker format for Indian stocks
      const tickerWithSuffix = ticker.includes(".NS") ? ticker : `${ticker}.NS`;
      const history = await yahooFinance.historical(tickerWithSuffix, {
        period1: this.getPeriodStartDate(period),
        period2: new Date(),
        interval: "1d",
      });

      if (!history || history.length === 0) {
        throw new Error(`No price data found for ${ticker}`);
      }

      const priceData = this.processPriceData(history, ticker);
      await setCache(cacheKey, priceData, this.cacheTTL);

      return priceData;
    } catch (error) {
      console.error("Error fetching stock price:", error.message);
      throw new Error(
        `Failed to fetch price data for ${ticker}: ${error.message}`
      );
    }
  }

  processPriceData(history, ticker) {
    const processedData = history.map((row, index) => {
      const previousClose = index > 0 ? history[index - 1].close : row.close;
      const dailyReturn = ((row.close - previousClose) / previousClose) * 100;

      return {
        date: row.date.toISOString().split("T")[0],
        open: parseFloat(row.open.toFixed(2)),
        high: parseFloat(row.high.toFixed(2)),
        low: parseFloat(row.low.toFixed(2)),
        close: parseFloat(row.close.toFixed(2)),
        volume: parseInt(row.volume),
        dailyReturn: parseFloat(dailyReturn.toFixed(2)),
      };
    });

    const summary = this.calculatePriceSummary(processedData);

    return {
      ticker,
      period: "1mo",
      data: processedData,
      summary,
      lastUpdated: new Date().toISOString(),
    };
  }

  calculatePriceSummary(priceData) {
    if (priceData.length === 0) return null;

    const prices = priceData.map((d) => d.close);
    const returns = priceData
      .map((d) => d.dailyReturn)
      .filter((r) => !isNaN(r));

    const currentPrice = prices[prices.length - 1];
    const startPrice = prices[0];
    const totalReturn = ((currentPrice - startPrice) / startPrice) * 100;

    return {
      currentPrice: parseFloat(currentPrice.toFixed(2)),
      startPrice: parseFloat(startPrice.toFixed(2)),
      totalReturn: parseFloat(totalReturn.toFixed(2)),
      highestPrice: parseFloat(Math.max(...prices).toFixed(2)),
      lowestPrice: parseFloat(Math.min(...prices).toFixed(2)),
      daysAnalyzed: priceData.length,
    };
  }

  async getPriceTrend(ticker, dateRange) {
    try {
      const period = this.calculatePeriod(dateRange);
      const priceData = await this.getStockPrice(ticker, period);

      if (dateRange?.from || dateRange?.to) {
        priceData.data = priceData.data.filter((day) => {
          const dayDate = new Date(day.date);
          const fromDate = dateRange.from ? new Date(dateRange.from) : null;
          const toDate = dateRange.to ? new Date(dateRange.to) : null;

          if (fromDate && dayDate < fromDate) return false;
          if (toDate && dayDate > toDate) return false;

          return true;
        });
      }

      return priceData;
    } catch (error) {
      console.error("Error getting price trend:", error.message);
      throw error;
    }
  }

  getPeriodStartDate(period) {
    const now = new Date();
    switch (period) {
      case "5d":
        return new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);
      case "1mo":
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      case "3mo":
        return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      case "6mo":
        return new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
      case "1y":
        return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      case "2y":
        return new Date(now.getTime() - 2 * 365 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
  }

  calculatePeriod(dateRange) {
    if (!dateRange?.from || !dateRange?.to) return "1mo";

    const fromDate = new Date(dateRange.from);
    const toDate = new Date(dateRange.to);
    const daysDiff = (toDate - fromDate) / (1000 * 60 * 60 * 24);

    if (daysDiff <= 7) return "5d";
    if (daysDiff <= 30) return "1mo";
    if (daysDiff <= 90) return "3mo";
    if (daysDiff <= 365) return "1y";

    return "2y";
  }
}

module.exports = PriceService;
