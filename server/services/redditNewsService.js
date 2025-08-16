const axios = require("axios");

class RedditNewsService {
  constructor() {
    this.clientId = process.env.REDDIT_CLIENT_ID;
    this.clientSecret = process.env.REDDIT_CLIENT_SECRET;
    this.userAgent = "StockSentimentBot/1.0";
    this.accessToken = null;
    this.tokenExpiry = 0;
    this.requestDelay = 1000; // 1 second between requests
    this.lastRequestTime = 0;

    // Indian stock subreddits to monitor
    this.subreddits = [
      "IndianStreetBets",
      "IndiaInvestments",
      "investing",
      "stocks",
      "StockMarket",
      "investing_discussion",
    ];
  }

  /**
   * Add delay between API requests
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
   * Get Reddit access token
   */
  async getAccessToken() {
    try {
      if (this.accessToken && Date.now() < this.tokenExpiry) {
        return this.accessToken;
      }

      const response = await axios.post(
        "https://www.reddit.com/api/v1/access_token",
        "grant_type=client_credentials",
        {
          headers: {
            Authorization: `Basic ${Buffer.from(
              `${this.clientId}:${this.clientSecret}`
            ).toString("base64")}`,
            "Content-Type": "application/x-www-form-urlencoded",
            "User-Agent": this.userAgent,
          },
        }
      );

      this.accessToken = response.data.access_token;
      this.tokenExpiry = Date.now() + response.data.expires_in * 1000;

      return this.accessToken;
    } catch (error) {
      console.error("Error getting Reddit access token:", error.message);
      throw new Error("Failed to authenticate with Reddit API");
    }
  }

  /**
   * Search Reddit for stock-related discussions
   */
  async searchDiscussions(ticker, limit = 25) {
    try {
      await this.addRequestDelay();

      const token = await this.getAccessToken();

      console.log(`🔍 Searching Reddit for ${ticker} discussions...`);

      const discussions = [];

      // Search across multiple financial subreddits
      for (const subreddit of this.subreddits) {
        try {
          const response = await axios.get(
            `https://oauth.reddit.com/r/${subreddit}/search`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
                "User-Agent": this.userAgent,
              },
              params: {
                q: ticker,
                limit: Math.ceil(limit / this.subreddits.length),
                sort: "new",
                t: "month", // Time filter: month
              },
            }
          );

          if (response.data.data && response.data.data.children) {
            const posts = response.data.data.children.map((post) => ({
              title: post.data.title,
              content: post.data.selftext || "",
              url: `https://reddit.com${post.data.permalink}`,
              author: post.data.author,
              subreddit: post.data.subreddit,
              score: post.data.score,
              upvoteRatio: post.data.upvote_ratio,
              numComments: post.data.num_comments,
              created: post.data.created_utc * 1000, // Convert to milliseconds
              source: "reddit",
              // Calculate sentiment based on upvote ratio and score
              sentiment: this.calculateRedditSentiment(
                post.data.score,
                post.data.upvote_ratio
              ),
            }));

            discussions.push(...posts);
          }
        } catch (error) {
          console.log(`⚠️ Failed to search r/${subreddit}:`, error.message);
          continue;
        }
      }

      // Sort by relevance (score + upvote ratio + comment count)
      discussions.sort((a, b) => {
        const aRelevance = a.score + a.upvoteRatio * 100 + a.numComments;
        const bRelevance = b.score + b.upvoteRatio * 100 + b.numComments;
        return bRelevance - aRelevance;
      });

      console.log(
        `   💬 Found ${discussions.length} Reddit discussions for ${ticker}`
      );
      return discussions.slice(0, limit);
    } catch (error) {
      console.error(`Error searching Reddit for ${ticker}:`, error.message);
      return [];
    }
  }

  /**
   * Fetch news from Reddit (alias for searchDiscussions to match interface)
   */
  async fetchNews(ticker, dateRange = null, limit = 25) {
    return this.searchDiscussions(ticker, limit);
  }

  /**
   * Calculate sentiment based on Reddit metrics
   */
  calculateRedditSentiment(score, upvoteRatio) {
    // Normalize score to 0-1 range (assuming typical Reddit scores)
    const normalizedScore = Math.min(Math.max(score / 1000, 0), 1);

    // Combine score and upvote ratio for sentiment
    const sentimentScore = (normalizedScore + upvoteRatio) / 2;

    let label = "neutral";
    if (sentimentScore > 0.6) label = "positive";
    else if (sentimentScore < 0.4) label = "negative";

    return {
      label,
      score: sentimentScore,
      confidence: Math.abs(sentimentScore - 0.5) * 2,
    };
  }

  /**
   * Check if the service is available
   */
  async isAvailable() {
    return !!(this.clientId && this.clientSecret);
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      name: "Reddit Financial Discussions API",
      available: !!(this.clientId && this.clientSecret),
      rateLimit: "1 second between requests",
      coverage: "Community financial discussions",
      features: ["Discussion Search", "Community Sentiment"],
      subreddits: this.subreddits,
      lastRequest: this.lastRequestTime
        ? new Date(this.lastRequestTime).toISOString()
        : null,
    };
  }
}

module.exports = RedditNewsService;
