const EconomicTimesNewsService = require("./economicTimesNewsService");
const RedditNewsService = require("./redditNewsService");

class MultiSourceNewsService {
  constructor() {
    this.sources = [];
    this.initializeSources();
  }

  /**
   * Initialize available news sources
   */
  initializeSources() {
    // Add Economic Times as primary source for Indian stocks
    const economicTimes = new EconomicTimesNewsService();
    if (economicTimes.isAvailable()) {
      this.sources.push({
        name: "economic-times",
        service: economicTimes,
        priority: 1,
        weight: 0.7,
      });
    }

    // Add Reddit as secondary source for community sentiment
    const reddit = new RedditNewsService();
    if (reddit.isAvailable()) {
      this.sources.push({
        name: "reddit",
        service: reddit,
        priority: 2,
        weight: 0.3,
      });
    }

    // TODO: Add more Indian sources as they become available
    // - Business Standard API
    // - NSE Official News
    // - MoneyControl (if anti-scraping measures are resolved)
  }

  /**
   * Fetch news from multiple sources with fallback
   */
  async fetchNews(ticker, dateRange = null, limit = 20) {
    console.log(`🚀 Fetching multi-source news for ${ticker}...`);

    const allArticles = [];
    const sourceResults = {};

    // Try each source in priority order
    for (const source of this.sources) {
      try {
        console.log(`   🔍 Trying ${source.name}...`);

        const articles = await source.service.fetchNews(ticker, dateRange);

        if (articles && articles.length > 0) {
          // Add source metadata to articles
          const articlesWithSource = articles.map((article) => ({
            ...article,
            source: source.name,
            sourcePriority: source.priority,
            sourceWeight: source.weight,
          }));

          allArticles.push(...articlesWithSource);
          sourceResults[source.name] = {
            success: true,
            count: articles.length,
            articles: articlesWithSource,
          };

          console.log(`   ✅ ${source.name}: ${articles.length} articles`);
        } else {
          sourceResults[source.name] = {
            success: true,
            count: 0,
            articles: [],
          };
          console.log(`   ⚠️ ${source.name}: No articles found`);
        }
      } catch (error) {
        console.log(`   ❌ ${source.name} failed:`, error.message);
        sourceResults[source.name] = {
          success: false,
          error: error.message,
          count: 0,
          articles: [],
        };
      }
    }

    if (allArticles.length === 0) {
      console.log(`⚠️ No news found from any source for ${ticker}`);
      return {
        articles: [],
        totalCount: 0,
        sources: sourceResults,
        message: "No news articles found from any source",
      };
    }

    // Sort articles by relevance and source priority
    allArticles.sort((a, b) => {
      // First by source priority (higher priority first)
      if (a.sourcePriority !== b.sourcePriority) {
        return a.sourcePriority - b.sourcePriority;
      }

      // Then by relevance score if available
      if (a.relevanceScore !== undefined && b.relevanceScore !== undefined) {
        return b.relevanceScore - a.relevanceScore;
      }

      // Then by publication date (newest first)
      return new Date(b.publishedAt) - new Date(a.publishedAt);
    });

    // Limit results
    const limitedArticles = allArticles.slice(0, limit);

    console.log(
      `🎯 Multi-source news completed for ${ticker}: ${limitedArticles.length} articles`
    );

    return {
      articles: limitedArticles,
      totalCount: limitedArticles.length,
      sources: sourceResults,
      message: `Found ${limitedArticles.length} articles from ${
        Object.keys(sourceResults).length
      } sources`,
    };
  }

  /**
   * Get sentiment analysis from multiple sources
   */
  async getSentiment(ticker, dateRange = null) {
    try {
      const newsResult = await this.fetchNews(ticker, dateRange);

      if (newsResult.articles.length === 0) {
        return {
          ticker,
          overallSentiment: { label: "neutral", score: 0.5, confidence: 0.5 },
          articles: [],
          totalArticles: 0,
          sentimentBreakdown: {
            positive: 0,
            negative: 0,
            neutral: 0,
            positivePercentage: 0,
            negativePercentage: 0,
            neutralPercentage: 0,
          },
          lastUpdated: new Date().toISOString(),
          message: "No news articles found for sentiment analysis",
          sources: newsResult.sources,
        };
      }

      // Calculate overall sentiment
      const overallSentiment = this.calculateOverallSentiment(
        newsResult.articles
      );
      const sentimentBreakdown = this.calculateSentimentBreakdown(
        newsResult.articles
      );

      return {
        ticker,
        overallSentiment,
        articles: newsResult.articles,
        totalArticles: newsResult.articles.length,
        sentimentBreakdown,
        lastUpdated: new Date().toISOString(),
        message: `Successfully analyzed ${newsResult.articles.length} articles from multiple sources`,
        sources: newsResult.sources,
      };
    } catch (error) {
      console.error(
        `❌ Error in multi-source sentiment for ${ticker}:`,
        error.message
      );

      return {
        ticker,
        overallSentiment: { label: "neutral", score: 0.5, confidence: 0.5 },
        articles: [],
        totalArticles: 0,
        sentimentBreakdown: {
          positive: 0,
          negative: 0,
          neutral: 0,
          positivePercentage: 0,
          negativePercentage: 0,
          neutralPercentage: 0,
        },
        lastUpdated: new Date().toISOString(),
        error: error.message,
        message: `Failed to analyze sentiment: ${error.message}`,
        sources: {},
      };
    }
  }

  /**
   * Calculate overall sentiment from multiple sources
   */
  calculateOverallSentiment(articles) {
    if (!articles || articles.length === 0) {
      return {
        label: "neutral",
        score: 0.5,
        confidence: 0.5,
      };
    }

    // Weight articles by source priority and recency
    const now = new Date();
    const weightedScores = articles.map((article) => {
      const publishedDate = new Date(article.publishedAt);
      const daysDiff = (now - publishedDate) / (1000 * 60 * 60 * 24);
      const timeWeight = Math.exp(-daysDiff / 7); // Exponential decay over 7 days
      const sourceWeight = article.sourceWeight || 0.5;

      // Use article sentiment if available, otherwise calculate from content
      const sentimentScore = article.sentiment?.score || 0.5;

      return sentimentScore * timeWeight * sourceWeight;
    });

    const totalWeight = weightedScores.reduce((sum, score) => sum + score, 0);
    const weightedAverage = totalWeight / weightedScores.length;

    // Determine label based on weighted average
    let label = "neutral";
    if (weightedAverage > 0.6) label = "positive";
    else if (weightedAverage < 0.4) label = "negative";

    // Calculate confidence based on agreement between articles and score consistency
    const scoreVariance =
      articles.reduce((sum, article) => {
        const score = article.sentiment?.score || 0.5;
        return sum + Math.pow(score - weightedAverage, 2);
      }, 0) / articles.length;

    const scoreConsistency = Math.max(0.1, 1 - Math.sqrt(scoreVariance));
    const confidence =
      (scoreConsistency + Math.abs(weightedAverage - 0.5) * 2) / 2;

    return {
      label,
      score: weightedAverage,
      confidence: Math.max(0.1, Math.min(1.0, confidence)),
    };
  }

  /**
   * Calculate sentiment breakdown statistics
   */
  calculateSentimentBreakdown(articles) {
    const breakdown = {
      positive: 0,
      negative: 0,
      neutral: 0,
    };

    articles.forEach((article) => {
      const label = article.sentiment?.label || "neutral";
      breakdown[label]++;
    });

    const total = articles.length;

    return {
      positive: breakdown.positive,
      negative: breakdown.negative,
      neutral: breakdown.neutral,
      positivePercentage: total > 0 ? (breakdown.positive / total) * 100 : 0,
      negativePercentage: total > 0 ? (breakdown.negative / total) * 100 : 0,
      neutralPercentage: total > 0 ? (breakdown.neutral / total) * 100 : 0,
    };
  }

  /**
   * Get service status for all sources
   */
  async getStatus() {
    const status = {
      name: "Multi-Source News Service",
      totalSources: this.sources.length,
      sources: {},
      overallStatus: "operational",
    };

    for (const source of this.sources) {
      try {
        status.sources[source.name] = await source.service.getStatus();
      } catch (error) {
        status.sources[source.name] = {
          name: source.name,
          available: false,
          error: error.message,
        };
      }
    }

    // Check overall status
    const availableSources = Object.values(status.sources).filter(
      (s) => s.available
    ).length;
    if (availableSources === 0) {
      status.overallStatus = "down";
    } else if (availableSources < this.sources.length) {
      status.overallStatus = "degraded";
    }

    return status;
  }

  /**
   * Check if any source is available
   */
  async isAvailable() {
    return this.sources.length > 0;
  }
}

module.exports = MultiSourceNewsService;
