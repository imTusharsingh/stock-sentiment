const { HfInference } = require("@huggingface/inference");
const natural = require("natural");
const axios = require("axios");

class SentimentService {
  constructor() {
    this.hf = new HfInference(process.env.HUGGINGFACE_API_KEY);
    this.gnewsApiKey = process.env.GNEWS_API_KEY;
    this.model = "ProsusAI/finbert"; // Financial sentiment model

    // Rate limiting and retry settings
    this.requestDelay = 1000; // 1 second between requests
    this.maxRetries = 3;
    this.lastRequestTime = 0;

    // Rate limiting and retry settings
    this.requestDelay = 1000; // 1 second between requests
    this.maxRetries = 3;
    this.lastRequestTime = 0;
  }

  /**
   * Add delay between API requests to avoid rate limiting
   */
  async addRequestDelay() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < this.requestDelay) {
      const delay = this.requestDelay - timeSinceLastRequest;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    this.lastRequestTime = Date.now();
  }

  /**
   * Fetch news articles for a given stock ticker with better error handling
   */
  async fetchNews(ticker, dateRange = null) {
    try {
      // Add delay to avoid rate limiting
      await this.addRequestDelay();

      const query = `${ticker} stock India`;
      let url = `https://gnews.io/api/v4/search?q=${encodeURIComponent(
        query
      )}&token=${this.gnewsApiKey}&lang=en&country=in&max=20`;

      // Add date range if provided
      if (dateRange?.from) {
        url += `&from=${dateRange.from}`;
      }
      if (dateRange?.to) {
        url += `&to=${dateRange.to}`;
      }

      console.log(`🔍 Fetching news for ${ticker}...`);
      const response = await axios.get(url);

      if (response.data.articles) {
        const articles = response.data.articles.map((article) => ({
          title: article.title,
          description: article.description,
          url: article.url,
          publishedAt: article.publishedAt,
          source: article.source.name,
          content: `${article.title} ${article.description}`.trim(),
        }));

        console.log(`   📰 Found ${articles.length} articles for ${ticker}`);
        return articles;
      }

      return [];
    } catch (error) {
      if (error.response?.status === 429) {
        console.error(`⚠️ Rate limited for ${ticker}, waiting 5 seconds...`);
        await new Promise((resolve) => setTimeout(resolve, 5000));
        throw new Error(`Rate limited for ${ticker}, please try again later`);
      } else if (error.response?.status === 401) {
        throw new Error("Invalid GNews API key");
      } else if (error.response?.status === 403) {
        throw new Error("GNews API quota exceeded");
      } else {
        console.error(`Error fetching news for ${ticker}:`, error.message);
        throw new Error(`Failed to fetch news for ${ticker}: ${error.message}`);
      }
    }
  }

  /**
   * Analyze sentiment of a single article using Hugging Face
   */
  async analyzeArticleSentiment(content) {
    try {
      // Preprocess content
      const processedContent = this.preprocessText(content);

      // Use Hugging Face Inference API
      const result = await this.hf.textClassification({
        model: this.model,
        inputs: processedContent,
      });

      // Map FinBERT labels to our sentiment labels
      const label = this.mapFinBERTLabel(result[0].label);
      const score = result[0].score;

      // Calculate confidence based on score distance from decision boundaries
      // Higher confidence when score is further from neutral (0.5)
      let confidence;
      if (label === "neutral") {
        // For neutral, confidence is based on how close to 0.5
        confidence = 1 - Math.abs(score - 0.5) * 2;
      } else {
        // For positive/negative, confidence is based on distance from 0.5
        confidence = Math.abs(score - 0.5) * 2;
      }

      // Ensure confidence is between 0.1 and 1.0
      confidence = Math.max(0.1, Math.min(1.0, confidence));

      return {
        label,
        score,
        confidence,
      };
    } catch (error) {
      console.error("Error analyzing sentiment:", error.message);
      // Return neutral sentiment as fallback
      return {
        label: "neutral",
        score: 0.5,
        confidence: 0.5,
      };
    }
  }

  /**
   * Preprocess text for better sentiment analysis
   */
  preprocessText(text) {
    if (!text) return "";

    // Convert to lowercase
    let processed = text.toLowerCase();

    // Remove special characters but keep spaces
    processed = processed.replace(/[^\w\s]/g, " ");

    // Remove extra whitespace
    processed = processed.replace(/\s+/g, " ").trim();

    // Limit length to avoid API limits
    if (processed.length > 500) {
      processed = processed.substring(0, 500);
    }

    return processed;
  }

  /**
   * Map FinBERT labels to our sentiment labels
   */
  mapFinBERTLabel(finbertLabel) {
    const labelMap = {
      positive: "positive",
      negative: "negative",
      neutral: "neutral",
    };

    return labelMap[finbertLabel] || "neutral";
  }

  /**
   * Calculate overall sentiment from multiple articles
   */
  calculateOverallSentiment(articles) {
    if (!articles || articles.length === 0) {
      return {
        label: "neutral",
        score: 0.5,
        confidence: 0.5,
      };
    }

    // Weight articles by recency (newer articles get higher weight)
    const now = new Date();
    const weightedScores = articles.map((article, index) => {
      const publishedDate = new Date(article.publishedAt);
      const daysDiff = (now - publishedDate) / (1000 * 60 * 60 * 24);
      const weight = Math.exp(-daysDiff / 7); // Exponential decay over 7 days
      return article.sentiment.score * weight;
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
        return sum + Math.pow(article.sentiment.score - weightedAverage, 2);
      }, 0) / articles.length;

    // Lower variance = higher confidence
    const scoreConsistency = Math.max(0.1, 1 - Math.sqrt(scoreVariance));

    // Combine consistency with overall score strength
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
      breakdown[article.sentiment.label]++;
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
   * Main method to get sentiment analysis for a stock with better error handling
   */
  async getSentiment(ticker, dateRange = null) {
    try {
      console.log(`🚀 Starting sentiment analysis for ${ticker}...`);

      // Fetch news articles
      const articles = await this.fetchNews(ticker, dateRange);

      if (articles.length === 0) {
        console.log(`⚠️ No news articles found for ${ticker}`);
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
          message: "No recent news articles found for this stock",
        };
      }

      console.log(`📊 Analyzing sentiment for ${articles.length} articles...`);

      // Analyze sentiment for each article with delay to avoid rate limiting
      const articlesWithSentiment = [];
      for (let i = 0; i < articles.length; i++) {
        const article = articles[i];
        try {
          // Add delay between sentiment analysis requests
          if (i > 0) {
            await this.addRequestDelay();
          }

          const sentiment = await this.analyzeArticleSentiment(article.content);
          articlesWithSentiment.push({
            ...article,
            sentiment,
          });

          console.log(
            `   ✅ Article ${i + 1}/${articles.length}: ${sentiment.label}`
          );
        } catch (error) {
          console.error(
            `   ❌ Failed to analyze article ${i + 1}:`,
            error.message
          );
          // Continue with other articles
        }
      }

      if (articlesWithSentiment.length === 0) {
        throw new Error("Failed to analyze any articles");
      }

      // Calculate overall sentiment and breakdown
      const overallSentiment = this.calculateOverallSentiment(
        articlesWithSentiment
      );
      const sentimentBreakdown = this.calculateSentimentBreakdown(
        articlesWithSentiment
      );

      console.log(
        `🎯 Sentiment analysis completed for ${ticker}: ${overallSentiment.label}`
      );

      return {
        ticker,
        overallSentiment,
        articles: articlesWithSentiment,
        totalArticles: articlesWithSentiment.length,
        sentimentBreakdown,
        lastUpdated: new Date().toISOString(),
        message: `Successfully analyzed ${articlesWithSentiment.length} articles`,
      };
    } catch (error) {
      console.error(`❌ Error in getSentiment for ${ticker}:`, error.message);

      // Return a more informative error response
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
      };
    }
  }
}

module.exports = SentimentService;
