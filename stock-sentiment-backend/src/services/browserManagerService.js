/**
 * Browser Manager Service
 * Handles Puppeteer browser instances and pool management
 */

const puppeteer = require('puppeteer');
const logger = require('../utils/logger');
const crawlerConfig = require('../config/crawler');

class BrowserManagerService {
  constructor() {
    this.mainBrowser = null;
    this.browserPool = [];
    this.isInitialized = false;
  }

  /**
   * Initialize browser manager
   */
  async initialize() {
    try {
      logger.info('Initializing browser manager');

      await this.launchMainBrowser();
      await this.initializeBrowserPool();

      this.isInitialized = true;
      logger.info('Browser manager initialized successfully');

      return true;
    } catch (error) {
      logger.error('Failed to initialize browser manager', {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Launch main browser instance
   */
  async launchMainBrowser() {
    try {
      const options = crawlerConfig.getPuppeteerOptions();
      this.mainBrowser = await puppeteer.launch(options);

      logger.info('Main browser launched successfully', {
        headless: options.headless,
        timeout: options.timeout,
      });
    } catch (error) {
      logger.error('Failed to launch main browser', { error: error.message });
      throw error;
    }
  }

  /**
   * Initialize browser pool for concurrent operations
   */
  async initializeBrowserPool() {
    try {
      const poolSize = crawlerConfig.puppeteer.browserPoolSize;
      logger.info('Initializing browser pool', { poolSize });

      for (let i = 0; i < poolSize; i++) {
        const browser = await puppeteer.launch(
          crawlerConfig.getPuppeteerOptions()
        );
        this.browserPool.push(browser);
      }

      logger.info('Browser pool initialized', {
        poolSize: this.browserPool.length,
      });
    } catch (error) {
      logger.error('Failed to initialize browser pool', {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get available browser from pool
   */
  getAvailableBrowser() {
    if (this.browserPool.length === 0) {
      throw new Error('No browsers available in pool');
    }
    return this.browserPool.shift();
  }

  /**
   * Return browser to pool
   */
  returnBrowserToPool(browser) {
    if (browser && !browser.disconnected) {
      this.browserPool.push(browser);
    }
  }

  /**
   * Get main browser instance
   */
  getMainBrowser() {
    return this.mainBrowser;
  }

  /**
   * Create new page with configuration
   */
  async createPage(browser) {
    try {
      const page = await browser.newPage();

      // Set random user agent
      const userAgents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      ];
      const randomUserAgent =
        userAgents[Math.floor(Math.random() * userAgents.length)];

      await page.setUserAgent(randomUserAgent);
      await page.setViewport(crawlerConfig.browser.defaultViewport);
      page.setDefaultTimeout(crawlerConfig.puppeteer.timeout);

      return page;
    } catch (error) {
      logger.error('Failed to create page', { error: error.message });
      throw error;
    }
  }

  /**
   * Get browser pool status
   */
  getPoolStatus() {
    return {
      poolSize: this.browserPool.length,
      isInitialized: this.isInitialized,
      mainBrowserActive: this.mainBrowser && !this.mainBrowser.disconnected,
    };
  }

  /**
   * Cleanup and close all browsers
   */
  async cleanup() {
    try {
      logger.info('Cleaning up browser manager');

      // Close pool browsers
      for (const browser of this.browserPool) {
        if (!browser.disconnected) {
          await browser.close();
        }
      }
      this.browserPool = [];

      // Close main browser
      if (this.mainBrowser && !this.mainBrowser.disconnected) {
        await this.mainBrowser.close();
        this.mainBrowser = null;
      }

      this.isInitialized = false;
      logger.info('Browser manager cleanup completed');
    } catch (error) {
      logger.error('Error during browser manager cleanup', {
        error: error.message,
      });
      throw error;
    }
  }
}

module.exports = BrowserManagerService;
