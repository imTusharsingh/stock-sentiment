/**
 * Page Navigation Service
 * Handles page navigation, retry logic, and basic page interactions
 */

const logger = require('../utils/logger');
const crawlerConfig = require('../config/crawler');

class PageNavigationService {
  constructor() {
    this.retryConfig = crawlerConfig.getRetryConfig();
  }

  /**
   * Navigate to URL with retry logic
   */
  async navigateToUrl(page, url, retryCount = 0) {
    try {
      const maxAttempts = this.retryConfig.maxAttempts;
      
      if (retryCount >= maxAttempts) {
        throw new Error(`Max retry attempts (${maxAttempts}) exceeded for URL: ${url}`);
      }

      logger.info('Navigating to URL', { 
        url, 
        attempt: retryCount + 1 
      });

      const response = await page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: crawlerConfig.puppeteer.timeout
      });

      if (!response.ok()) {
        throw new Error(`HTTP ${response.status()}: ${response.statusText()}`);
      }

      // Wait for content to load
      await page.waitForTimeout(2000);

      logger.info('Successfully navigated to URL', { 
        url, 
        status: response.status() 
      });

      return response;
    } catch (error) {
      logger.warn('Navigation failed, retrying', {
        url,
        error: error.message,
        attempt: retryCount + 1
      });

      if (retryCount < this.retryConfig.maxAttempts) {
        const delay = this.retryConfig.delayMs * Math.pow(this.retryConfig.backoffMultiplier, retryCount);
        await this.delay(delay);
        return this.navigateToUrl(page, url, retryCount + 1);
      }

      throw error;
    }
  }

  /**
   * Wait for specific element to appear
   */
  async waitForElement(page, selector, timeout = 10000) {
    try {
      await page.waitForSelector(selector, { timeout });
      return true;
    } catch (error) {
      logger.warn('Element not found', { selector, timeout, error: error.message });
      return false;
    }
  }

  /**
   * Wait for multiple elements to appear
   */
  async waitForElements(page, selectors, timeout = 10000) {
    const results = {};
    
    for (const selector of selectors) {
      results[selector] = await this.waitForElement(page, selector, timeout);
    }
    
    return results;
  }

  /**
   * Scroll page to load more content
   */
  async scrollPage(page, scrollSteps = 3) {
    try {
      for (let i = 0; i < scrollSteps; i++) {
        await page.evaluate(() => {
          window.scrollBy(0, window.innerHeight);
        });
        await this.delay(1000);
      }
      
      logger.info('Page scrolling completed', { scrollSteps });
    } catch (error) {
      logger.warn('Page scrolling failed', { error: error.message });
    }
  }

  /**
   * Click element safely
   */
  async clickElement(page, selector) {
    try {
      await page.waitForSelector(selector, { timeout: 5000 });
      await page.click(selector);
      return true;
    } catch (error) {
      logger.warn('Failed to click element', { selector, error: error.message });
      return false;
    }
  }

  /**
   * Fill form input safely
   */
  async fillInput(page, selector, value) {
    try {
      await page.waitForSelector(selector, { timeout: 5000 });
      await page.fill(selector, value);
      return true;
    } catch (error) {
      logger.warn('Failed to fill input', { selector, value, error: error.message });
      return false;
    }
  }

  /**
   * Get page title
   */
  async getPageTitle(page) {
    try {
      return await page.title();
    } catch (error) {
      logger.warn('Failed to get page title', { error: error.message });
      return '';
    }
  }

  /**
   * Get current URL
   */
  async getCurrentUrl(page) {
    try {
      return page.url();
    } catch (error) {
      logger.warn('Failed to get current URL', { error: error.message });
      return '';
    }
  }

  /**
   * Check if page has specific text
   */
  async hasText(page, text) {
    try {
      const content = await page.content();
      return content.includes(text);
    } catch (error) {
      logger.warn('Failed to check page text', { text, error: error.message });
      return false;
    }
  }

  /**
   * Take screenshot
   */
  async takeScreenshot(page, path) {
    try {
      await page.screenshot({ path, fullPage: true });
      logger.info('Screenshot taken', { path });
      return true;
    } catch (error) {
      logger.warn('Failed to take screenshot', { path, error: error.message });
      return false;
    }
  }

  /**
   * Delay execution
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get navigation statistics
   */
  getNavigationStats() {
    return {
      retryConfig: this.retryConfig
    };
  }
}

module.exports = PageNavigationService;
