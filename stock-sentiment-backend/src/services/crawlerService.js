/**
 * Crawler Service
 * Main orchestrator service that coordinates browser management, navigation, and content extraction
 */

const logger = require('../utils/logger');
const BrowserManagerService = require('./browserManagerService');
const PageNavigationService = require('./pageNavigationService');
const ContentExtractionService = require('./contentExtractionService');
const RateLimitService = require('./rateLimitService');
const crawlerConfig = require('../config/crawler');

class CrawlerService {
  constructor() {
    this.browserManager = new BrowserManagerService();
    this.navigationService = new PageNavigationService();
    this.contentService = new ContentExtractionService();
    this.rateLimitService = new RateLimitService();

    this.isRunning = false;
    this.activeCrawls = new Map();
  }

  /**
   * Initialize the crawler service
   */
  async initialize() {
    try {
      logger.info('Initializing crawler service');

      // Initialize browser manager
      await this.browserManager.initialize();

      // Initialize rate limiting
      this.rateLimitService.initializeCounters();

      this.isRunning = true;
      logger.info('Crawler service initialized successfully');

      return true;
    } catch (error) {
      logger.error('Failed to initialize crawler service', {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Start crawling for a specific stock
   */
  async startStockCrawl(stockSymbol, stockName, sourceName = 'moneyControl') {
    try {
      // Check rate limits
      if (!this.rateLimitService.canMakeRequest(sourceName)) {
        logger.warn('Rate limit exceeded, skipping crawl', {
          stockSymbol,
          sourceName,
        });
        return null;
      }

      logger.info('Starting stock crawl', {
        stockSymbol,
        stockName,
        sourceName,
      });

      const browser = this.browserManager.getAvailableBrowser();
      if (!browser) {
        throw new Error('No browsers available for crawling');
      }

      let page = null;
      try {
        // Create page
        page = await this.browserManager.createPage(browser);

        // Search for stock news
        const searchResults = await this.searchStockNews(
          page,
          stockSymbol,
          stockName,
          sourceName
        );

        if (searchResults.length === 0) {
          logger.info('No search results found', { stockSymbol, sourceName });
          return [];
        }

        // Extract news content
        const newsData = await this.extractNewsContent(
          page,
          searchResults,
          sourceName
        );

        // Increment rate limit
        this.rateLimitService.incrementRequest(sourceName);

        logger.info('Stock crawl completed successfully', {
          stockSymbol,
          sourceName,
          newsCount: newsData.length,
        });

        return newsData;
      } finally {
        if (page) {
          await page.close();
        }
        this.browserManager.returnBrowserToPool(browser);
      }
    } catch (error) {
      logger.error('Stock crawl failed', {
        stockSymbol,
        sourceName,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Search for stock news
   */
  async searchStockNews(page, stockSymbol, stockName, sourceName) {
    try {
      const sourceConfig = crawlerConfig.getSourceConfig(sourceName);
      if (!sourceConfig) {
        throw new Error(`Unknown source: ${sourceName}`);
      }

      const searchUrl = this.buildSearchUrl(sourceConfig, stockName);

      // Navigate to search page
      await this.navigationService.navigateToUrl(page, searchUrl);

      // Wait for search results
      const selectors = this.getSearchResultSelectors(sourceName);
      const elementFound = await this.navigationService.waitForElements(
        page,
        selectors
      );

      if (!Object.values(elementFound).some(found => found)) {
        logger.warn('No search result selectors found', {
          sourceName,
          selectors,
        });
        return [];
      }

      // Extract search results
      const searchResults = await this.extractSearchResults(page, sourceName);

      logger.info('Search results found', {
        stockSymbol,
        sourceName,
        resultCount: searchResults.length,
      });

      return searchResults;
    } catch (error) {
      logger.error('Failed to search stock news', {
        stockSymbol,
        sourceName,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Build search URL for a source
   */
  buildSearchUrl(sourceConfig, stockName) {
    if (sourceConfig.searchUrl) {
      return `${sourceConfig.searchUrl}?q=${encodeURIComponent(stockName)}`;
    }

    // Fallback to base URL with search
    return `${sourceConfig.baseUrl}/search?q=${encodeURIComponent(stockName)}`;
  }

  /**
   * Get search result selectors for a source
   */
  getSearchResultSelectors(sourceName) {
    const selectors = {
      moneyControl: ['.search-result', '.news-item', '.story-item'],
      economicTimes: ['.search-result', '.news-item', '.story-item'],
      businessStandard: ['.search-result', '.news-item', '.story-item'],
      nse: ['.news-item', '.announcement-item'],
      bse: ['.news-item', '.announcement-item'],
    };

    return selectors[sourceName] || ['.search-result', '.news-item'];
  }

  /**
   * Extract search results from page
   */
  async extractSearchResults(page, sourceName) {
    try {
      const selectors = this.getSearchResultSelectors(sourceName);
       
      const results = await page.evaluate(sel => {
        const searchResults = [];

        for (const selector of sel) {
          // eslint-disable-next-line no-undef
          const items = document.querySelectorAll(selector);

          items.forEach((item, index) => {
            if (index < 10) {
              // Limit to first 10 results
              const link = item.querySelector('a');
              const title = item.querySelector('h1, h2, h3, .title');
              const summary = item.querySelector('.summary, .description, p');

              if (link && title) {
                searchResults.push({
                  url: link.href,
                  title: title.textContent?.trim() || '',
                  summary: summary?.textContent?.trim() || '',
                });
              }
            }
          });
        }

        return searchResults;
      }, selectors);

      return results;
    } catch (error) {
      logger.error('Failed to extract search results', {
        sourceName,
        error: error.message,
      });
      return [];
    }
  }

  /**
   * Extract news content from search results
   */
  async extractNewsContent(page, searchResults, sourceName) {
    const newsData = [];

    for (const result of searchResults) {
      try {
        // Add delay between requests
        const delay = this.rateLimitService.getRecommendedDelay(sourceName);
        await this.navigationService.delay(delay);

        // Navigate to news article
        await this.navigationService.navigateToUrl(page, result.url);

        // Extract content
        const content = await this.contentService.extractPageContent(page);

        // Combine search result with extracted content
        const newsItem = {
          ...result,
          ...content,
          source: sourceName,
          extractedAt: new Date(),
        };

        newsData.push(newsItem);

        logger.info('News content extracted', {
          url: result.url,
          title: content.title,
          source: sourceName,
        });
      } catch (error) {
        logger.warn('Failed to extract news content', {
          url: result.url,
          source: sourceName,
          error: error.message,
        });
        // Continue with next result
      }
    }

    return newsData;
  }

  /**
   * Get crawler status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      browserStatus: this.browserManager.getPoolStatus(),
      rateLimitStatus: this.rateLimitService.getStatistics(),
      activeCrawls: this.activeCrawls.size,
    };
  }

  /**
   * Get available news sources
   */
  getAvailableSources() {
    return this.rateLimitService.getAvailableSourcesByPriority();
  }

  /**
   * Stop the crawler service
   */
  async stop() {
    try {
      logger.info('Stopping crawler service');

      this.isRunning = false;

      // Cleanup browser manager
      await this.browserManager.cleanup();

      logger.info('Crawler service stopped successfully');
    } catch (error) {
      logger.error('Error stopping crawler service', { error: error.message });
      throw error;
    }
  }
}

module.exports = CrawlerService;
