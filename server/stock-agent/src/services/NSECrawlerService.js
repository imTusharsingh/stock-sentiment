const axios = require("axios");
const cheerio = require("cheerio");

/**
 * NSE Crawler Service
 * Handles CSV URL crawling from NSE trading page
 * Modular service for testing individual crawling functions
 *
 * FUTURE IMPROVEMENTS:
 * - Add new listings crawling once NSE bot protection is better understood
 * - Implement browser session management for enhanced crawling
 * - Add support for other NSE data sources
 */
class NSECrawlerService {
  constructor() {
    this.userAgent =
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36";

    // NSE URLs
    this.urls = {
      tradingPage:
        "https://www.nseindia.com/market-data/securities-available-for-trading",
    };
  }

  /**
   * Crawl CSV URLs from trading page
   */
  async crawlCSVUrls() {
    try {
      console.log("🔍 Crawling CSV URLs from NSE trading page...");

      const response = await axios.get(this.urls.tradingPage, {
        timeout: 15000,
        headers: {
          "User-Agent": this.userAgent,
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.5",
          "Accept-Encoding": "gzip, deflate, br",
          DNT: "1",
          Connection: "keep-alive",
          "Upgrade-Insecure-Requests": "1",
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
      });

      const $ = cheerio.load(response.data);
      const csvLinks = new Set();

      // Find all CSV links
      $('a[href*=".csv"]').each((i, el) => {
        const href = $(el).attr("href");
        if (href) {
          const fullUrl = href.startsWith("http")
            ? href
            : `https://nsearchives.nseindia.com${href}`;
          csvLinks.add(fullUrl);
        }
      });

      // Pattern matching from page content
      const pageContent = response.data;
      const csvUrlPattern = /https?:\/\/[^"\s]+\.csv/gi;
      const matches = pageContent.match(csvUrlPattern);

      if (matches) {
        matches.forEach((url) => csvLinks.add(url));
      }

      console.log(`🔍 Found ${csvLinks.size} CSV links on trading page`);

      return {
        success: true,
        csvUrls: Array.from(csvLinks),
        method: "cheerio-scraping",
        totalFound: csvLinks.size,
      };
    } catch (error) {
      if (error.response && error.response.status === 403) {
        console.warn(
          "⚠️ Access forbidden (403) - NSE may be blocking requests"
        );
        return {
          success: false,
          csvUrls: [],
          method: "blocked",
          error: "Access forbidden - NSE blocking requests",
        };
      } else {
        console.warn(`⚠️ CSV URL crawling failed: ${error.message}`);
        return {
          success: false,
          csvUrls: [],
          method: "failed",
          error: error.message,
        };
      }
    }
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      csvCrawlingAvailable: true,
      urls: this.urls,
      userAgent: this.userAgent,
    };
  }
}

module.exports = NSECrawlerService;
