const axios = require("axios");
const cheerio = require("cheerio");

class MoneyControlNewsService {
  constructor() {
    this.baseUrl = "https://www.moneycontrol.com";
    this.requestDelay = 2000; // 2 seconds between requests
    this.lastRequestTime = 0;
    this.userAgent =
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36";
  }

  /**
   * Add delay between API requests to be respectful
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
   * Fetch news from MoneyControl for Indian stocks
   */
  async fetchNews(ticker, dateRange = null, limit = 20) {
    try {
      await this.addRequestDelay();

      console.log(`🔍 Fetching MoneyControl news for ${ticker}...`);

      // Search for stock news on MoneyControl
      const searchUrl = `${this.baseUrl}/search?query=${encodeURIComponent(
        ticker
      )}`;

      const response = await axios.get(searchUrl, {
        headers: {
          "User-Agent": this.userAgent,
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.5",
          "Accept-Encoding": "gzip, deflate",
          Connection: "keep-alive",
          "Upgrade-Insecure-Requests": "1",
        },
        timeout: 30000,
      });

      if (response.status !== 200) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const $ = cheerio.load(response.data);
      const articles = [];

      // Extract news articles from search results
      $(".search-result").each((index, element) => {
        if (articles.length >= limit) return false;

        const $element = $(element);
        const title = $element.find(".search-result-title a").text().trim();
        const url = $element.find(".search-result-title a").attr("href");
        const description = $element.find(".search-result-desc").text().trim();
        const publishedAt = $element.find(".search-result-date").text().trim();
        const source = "MoneyControl";

        if (title && url) {
          articles.push({
            title,
            description,
            url: url.startsWith("http") ? url : `${this.baseUrl}${url}`,
            publishedAt: this.parseDate(publishedAt),
            source,
            content: `${title} ${description}`.trim(),
            sentiment: this.calculateSentiment(title, description),
          });
        }
      });

      // If no search results, try company-specific news page
      if (articles.length === 0) {
        const companyNewsUrl = `${
          this.baseUrl
        }/india/stockpricequote/${ticker.toLowerCase()}`;
        const companyResponse = await axios.get(companyNewsUrl, {
          headers: {
            "User-Agent": this.userAgent,
            Accept:
              "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.5",
            "Accept-Encoding": "gzip, deflate",
            Connection: "keep-alive",
            "Upgrade-Insecure-Requests": "1",
          },
          timeout: 30000,
        });

        if (companyResponse.status === 200) {
          const $company = cheerio.load(companyResponse.data);

          $company(".news_list li").each((index, element) => {
            if (articles.length >= limit) return false;

            const $element = $company(element);
            const title = $element.find("a").text().trim();
            const url = $element.find("a").attr("href");
            const date = $element.find(".date").text().trim();

            if (title && url) {
              articles.push({
                title,
                description: "",
                url: url.startsWith("http") ? url : `${this.baseUrl}${url}`,
                publishedAt: this.parseDate(date),
                source: "MoneyControl",
                content: title,
                sentiment: this.calculateSentiment(title, ""),
              });
            }
          });
        }
      }

      console.log(
        `   📰 Found ${articles.length} articles for ${ticker} via MoneyControl`
      );
      return articles;
    } catch (error) {
      console.error(
        `Error fetching MoneyControl news for ${ticker}:`,
        error.message
      );
      return [];
    }
  }

  /**
   * Parse date strings from MoneyControl
   */
  parseDate(dateStr) {
    if (!dateStr) return new Date().toISOString();

    try {
      // Handle various date formats from MoneyControl
      if (dateStr.includes("ago")) {
        // "2 hours ago", "1 day ago", etc.
        const now = new Date();
        const match = dateStr.match(/(\d+)\s+(hour|day|minute|week)s?\s+ago/);
        if (match) {
          const value = parseInt(match[1]);
          const unit = match[2];

          switch (unit) {
            case "minute":
              return new Date(now.getTime() - value * 60 * 1000).toISOString();
            case "hour":
              return new Date(
                now.getTime() - value * 60 * 60 * 1000
              ).toISOString();
            case "day":
              return new Date(
                now.getTime() - value * 24 * 60 * 60 * 1000
              ).toISOString();
            case "week":
              return new Date(
                now.getTime() - value * 7 * 24 * 60 * 60 * 1000
              ).toISOString();
          }
        }
      }

      // Try to parse as regular date
      const parsed = new Date(dateStr);
      if (!isNaN(parsed.getTime())) {
        return parsed.toISOString();
      }

      return new Date().toISOString();
    } catch (error) {
      return new Date().toISOString();
    }
  }

  /**
   * Calculate basic sentiment from title and description
   */
  calculateSentiment(title, description) {
    const text = `${title} ${description}`.toLowerCase();

    const positiveWords = [
      "profit",
      "growth",
      "rise",
      "gain",
      "positive",
      "strong",
      "up",
      "higher",
      "increase",
      "improve",
      "success",
      "win",
      "beat",
      "exceed",
      "outperform",
    ];

    const negativeWords = [
      "loss",
      "fall",
      "decline",
      "drop",
      "negative",
      "weak",
      "down",
      "lower",
      "decrease",
      "worse",
      "fail",
      "lose",
      "miss",
      "underperform",
      "crash",
    ];

    let positiveCount = 0;
    let negativeCount = 0;

    positiveWords.forEach((word) => {
      const regex = new RegExp(`\\b${word}\\b`, "gi");
      const matches = text.match(regex);
      if (matches) positiveCount += matches.length;
    });

    negativeWords.forEach((word) => {
      const regex = new RegExp(`\\b${word}\\b`, "gi");
      const matches = text.match(regex);
      if (matches) negativeCount += matches.length;
    });

    const total = positiveCount + negativeCount;
    if (total === 0) {
      return { label: "neutral", score: 0.5, confidence: 0.3 };
    }

    const sentimentScore = positiveCount / total;

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
    try {
      const response = await axios.get(this.baseUrl, {
        headers: { "User-Agent": this.userAgent },
        timeout: 10000,
      });
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      name: "MoneyControl Indian Stock News",
      available: true,
      rateLimit: "2 seconds between requests",
      coverage: "100% Indian stocks (NSE/BSE)",
      features: [
        "Company News",
        "Market Updates",
        "Financial Results",
        "Corporate Actions",
      ],
      lastRequest: this.lastRequestTime
        ? new Date(this.lastRequestTime).toISOString()
        : null,
    };
  }
}

module.exports = MoneyControlNewsService;
