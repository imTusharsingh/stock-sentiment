/**
 * Crawler Configuration
 * Handles Puppeteer and web scraping configuration
 */
class CrawlerConfig {
  constructor() {
    // Puppeteer Settings
    this.puppeteer = {
      headless: process.env.PUPPETEER_HEADLESS === 'true',
      timeout: parseInt(process.env.PUPPETEER_TIMEOUT) || 30000,
      userAgent:
        process.env.PUPPETEER_USER_AGENT ||
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      browserPoolSize: parseInt(process.env.BROWSER_POOL_SIZE) || 3,
      delayBetweenRequests:
        parseInt(process.env.CRAWLER_DELAY_BETWEEN_REQUESTS) || 1000,
    };

    // Crawling Schedule
    this.schedule = {
      preCrawlInterval: parseInt(process.env.PRE_CRAWL_INTERVAL) || 75, // minutes
      maxStocksPerCrawl: parseInt(process.env.MAX_STOCKS_PER_CRAWL) || 300,
      maxConcurrentCrawls: parseInt(process.env.MAX_CONCURRENT_CRAWLS) || 5,
    };

    // Rate Limiting
    this.rateLimit = {
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000, // 15 minutes
      maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 1000,
    };

    // News Sources Configuration
    this.newsSources = {
      moneyControl: {
        baseUrl:
          process.env.MONEYCONTROL_BASE_URL || 'https://www.moneycontrol.com',
        searchUrl:
          process.env.MONEYCONTROL_SEARCH_URL ||
          'https://www.moneycontrol.com/search',
        enabled: true,
        priority: 1,
        maxRequestsPerHour: 100,
      },
      economicTimes: {
        baseUrl:
          process.env.ECONOMIC_TIMES_BASE_URL ||
          'https://economictimes.indiatimes.com',
        searchUrl:
          process.env.ECONOMIC_TIMES_SEARCH_URL ||
          'https://economictimes.indiatimes.com/search',
        enabled: true,
        priority: 2,
        maxRequestsPerHour: 100,
      },
      businessStandard: {
        baseUrl:
          process.env.BUSINESS_STANDARD_BASE_URL ||
          'https://www.business-standard.com',
        searchUrl:
          process.env.BUSINESS_STANDARD_SEARCH_URL ||
          'https://www.business-standard.com/search',
        enabled: true,
        priority: 3,
        maxRequestsPerHour: 100,
      },
      nse: {
        baseUrl: process.env.NSE_BASE_URL || 'https://www.nseindia.com',
        newsUrl: process.env.NSE_NEWS_URL || 'https://www.nseindia.com/news',
        enabled: true,
        priority: 4,
        maxRequestsPerHour: 50,
      },
      bse: {
        baseUrl: process.env.BSE_BASE_URL || 'https://www.bseindia.com',
        newsUrl: process.env.BSE_NEWS_URL || 'https://www.bseindia.com/news',
        enabled: true,
        priority: 5,
        maxRequestsPerHour: 50,
      },
    };

    // Browser Configuration
    this.browser = {
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--disable-features=TranslateUI',
        '--disable-ipc-flooding-protection',
        '--disable-default-apps',
        '--disable-extensions',
        '--disable-plugins',
        '--disable-sync',
        '--disable-translate',
        '--hide-scrollbars',
        '--mute-audio',
        '--no-default-browser-check',
        '--safebrowsing-disable-auto-update',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
      ],
      defaultViewport: {
        width: 1920,
        height: 1080,
      },
      ignoreHTTPSErrors: true,
      timeout: this.puppeteer.timeout,
    };

    // Retry Configuration
    this.retry = {
      maxAttempts: 3,
      delayMs: 1000,
      backoffMultiplier: 2,
    };

    // Content Extraction
    this.extraction = {
      maxContentLength: 10000,
      minContentLength: 100,
      maxTitleLength: 200,
      maxSummaryLength: 500,
    };

    // Data Validation
    this.validation = {
      requireTitle: true,
      requireContent: true,
      requireDate: true,
      requireSource: true,
      minSentimentConfidence:
        parseFloat(process.env.SENTIMENT_CONFIDENCE_THRESHOLD) || 0.6,
    };
  }

  /**
   * Get Puppeteer launch options
   * @returns {Object}
   */
  getPuppeteerOptions() {
    return {
      headless: this.puppeteer.headless,
      args: this.browser.args,
      defaultViewport: this.browser.defaultViewport,
      ignoreHTTPSErrors: this.browser.ignoreHTTPSErrors,
      timeout: this.browser.timeout,
    };
  }

  /**
   * Get enabled news sources
   * @returns {Array}
   */
  getEnabledSources() {
    return Object.entries(this.newsSources)
      .filter(([_, config]) => config.enabled)
      .sort((a, b) => a[1].priority - b[1].priority)
      .map(([name, config]) => ({ name, ...config }));
  }

  /**
   * Get source configuration by name
   * @param {string} sourceName
   * @returns {Object|null}
   */
  getSourceConfig(sourceName) {
    return this.newsSources[sourceName] || null;
  }

  /**
   * Check if source is enabled
   * @param {string} sourceName
   * @returns {boolean}
   */
  isSourceEnabled(sourceName) {
    const source = this.newsSources[sourceName];
    return source ? source.enabled : false;
  }

  /**
   * Get retry configuration
   * @returns {Object}
   */
  getRetryConfig() {
    return { ...this.retry };
  }

  /**
   * Get validation rules
   * @returns {Object}
   */
  getValidationRules() {
    return { ...this.validation };
  }

  /**
   * Get extraction limits
   * @returns {Object}
   */
  getExtractionLimits() {
    return { ...this.extraction };
  }

  /**
   * Update configuration
   * @param {Object} updates
   */
  updateConfig(updates) {
    if (updates.puppeteer) {
      Object.assign(this.puppeteer, updates.puppeteer);
    }
    if (updates.schedule) {
      Object.assign(this.schedule, updates.schedule);
    }
    if (updates.rateLimit) {
      Object.assign(this.rateLimit, updates.rateLimit);
    }
    if (updates.retry) {
      Object.assign(this.retry, updates.retry);
    }
    if (updates.validation) {
      Object.assign(this.validation, updates.validation);
    }
  }

  /**
   * Get full configuration
   * @returns {Object}
   */
  getFullConfig() {
    return {
      puppeteer: { ...this.puppeteer },
      schedule: { ...this.schedule },
      rateLimit: { ...this.rateLimit },
      newsSources: { ...this.newsSources },
      browser: { ...this.browser },
      retry: { ...this.retry },
      extraction: { ...this.extraction },
      validation: { ...this.validation },
    };
  }

  /**
   * Validate configuration
   * @returns {Object}
   */
  validateConfig() {
    const errors = [];
    const warnings = [];

    // Check required environment variables
    if (!process.env.MONGODB_URI) {
      errors.push('MONGODB_URI is required');
    }
    if (!process.env.REDIS_URL) {
      errors.push('REDIS_URL is required');
    }
    if (!process.env.HUGGINGFACE_API_KEY) {
      warnings.push(
        'HUGGINGFACE_API_KEY is recommended for sentiment analysis'
      );
    }

    // Check configuration values
    if (this.puppeteer.timeout < 5000) {
      warnings.push('Puppeteer timeout is very low, may cause issues');
    }
    if (this.schedule.maxStocksPerCrawl > 1000) {
      warnings.push(
        'Max stocks per crawl is very high, may impact performance'
      );
    }
    if (this.rateLimit.maxRequests > 10000) {
      warnings.push('Rate limit is very high, may overwhelm sources');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }
}

// Create singleton instance
const crawlerConfig = new CrawlerConfig();

module.exports = crawlerConfig;
