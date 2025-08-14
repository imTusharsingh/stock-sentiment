const { HfInference } = require("@huggingface/inference");
const natural = require("natural");
const axios = require("axios");

class SentimentService {
  constructor() {
    this.hf = new HfInference(process.env.HUGGINGFACE_API_KEY);
    this.gnewsApiKey = process.env.GNEWS_API_KEY;
    this.model = "ProsusAI/finbert"; // Financial sentiment model
  }

  /**
   * Fetch news articles for a given stock ticker
   */
  async fetchNews(ticker, dateRange = null) {
    try {
      const query = `${ticker} stock India`;
      let url = `https://gnews.io/api/v4/search?q=${encodeURIComponent(
        query
      )}&token=${this.gnewsApiKey}&lang=en&country=in&max=20`;

      if (dateRange?.from) {
        url += `&from=${dateRange.from}`;
      }
      if (dateRange?.to) {
        url += `&to=${dateRange.to}`;
      }

      const response = await axios.get(url);

      if (response.data.articles) {
        return response.data.articles.map((article) => ({
          title: article.title,
          description: article.description,
          url: article.url,
          publishedAt: article.publishedAt,
          source: article.source.name,
          content: `${article.title} ${article.description}`.trim(),
        }));
      }

      return [];
    } catch (error) {
      console.error("Error fetching news:", error.message);
      throw new Error("Failed to fetch news articles");
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

      return {
        label,
        score,
        confidence: score,
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

    return {
      label,
      score: weightedAverage,
      confidence: Math.min(weightedAverage + 0.2, 1.0), // Boost confidence slightly
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
   * Main method to get sentiment analysis for a stock
   */
  async getSentiment(ticker, dateRange = null) {
    try {
      // Fetch news articles
      const articles = await this.fetchNews(ticker, dateRange);

      if (articles.length === 0) {
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
        };
      }

      // Analyze sentiment for each article
      const articlesWithSentiment = await Promise.all(
        articles.map(async (article) => {
          const sentiment = await this.analyzeArticleSentiment(article.content);
          return {
            ...article,
            sentiment,
          };
        })
      );

      // Calculate overall sentiment and breakdown
      const overallSentiment = this.calculateOverallSentiment(
        articlesWithSentiment
      );
      const sentimentBreakdown = this.calculateSentimentBreakdown(
        articlesWithSentiment
      );

      return {
        ticker,
        overallSentiment,
        articles: articlesWithSentiment,
        totalArticles: articlesWithSentiment.length,
        sentimentBreakdown,
        lastUpdated: new Date().toISOString(),
      };
    } catch (error) {
      console.error("Error in getSentiment:", error.message);
      throw new Error(
        `Failed to analyze sentiment for ${ticker}: ${error.message}`
      );
    }
  }
}

module.exports = SentimentService;
