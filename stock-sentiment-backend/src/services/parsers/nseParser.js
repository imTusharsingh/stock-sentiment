/**
 * NSE Official News Parser
 * Specialized parser for NSE (National Stock Exchange) official website
 */

const logger = require('../../utils/logger');

class NSEParser {
  constructor() {
    this.sourceName = 'nse';
    this.baseUrl = 'https://www.nseindia.com';
    this.searchUrl = 'https://www.nseindia.com/search';

    // NSE specific selectors
    this.selectors = {
      // Search results page
      searchResults:
        '.search-result, .news-item, .announcement-item, .circular-item',
      searchResultTitle: 'h1, h2, h3, .title, .headline, .announcement-title',
      searchResultLink: 'a',
      searchResultSummary:
        '.summary, .description, .excerpt, .announcement-summary, p',

      // Announcement/Circular page
      announcementTitle:
        'h1.announcement_title, .announcement_title h1, .circular-title, .main-title',
      announcementContent:
        '.announcement_content, .announcement-body, .circular-content, .content-body',
      announcementMeta:
        '.announcement_meta, .announcement-meta, .circular-meta, .meta-info',
      announcementDate:
        '.announcement_date, .date, .published-date, .release-date',
      announcementType:
        '.announcement_type, .type, .category, .announcement-category',
      announcementNumber:
        '.announcement_number, .number, .circular-number, .ref-number',

      // Stock specific elements
      stockSymbol:
        '.stock-symbol, .symbol, .ticker, .scrip-code, .security-code',
      stockPrice: '.stock-price, .price, .current-price, .last-traded-price',
      stockChange: '.stock-change, .change, .price-change, .change-value',
      stockVolume: '.stock-volume, .volume, .traded-volume, .quantity',
    };
  }

  /**
   * Parse search results page
   */
  async parseSearchResults(page) {
    try {
      logger.info('Parsing NSE search results');

      const results = await page.evaluate(selectors => {
        const searchResults = [];
        // eslint-disable-next-line no-undef
        const items = document.querySelectorAll(selectors.searchResults);

        items.forEach((item, index) => {
          if (index < 10) {
            // Limit to first 10 results
            const link = item.querySelector(selectors.searchResultLink);
            const title = item.querySelector(selectors.searchResultTitle);
            const summary = item.querySelector(selectors.searchResultSummary);

            if (link && title) {
              searchResults.push({
                url: link.href,
                title: title.textContent?.trim() || '',
                summary: summary?.textContent?.trim() || '',
                source: 'nse',
                extractedAt: new Date().toISOString(),
              });
            }
          }
        });

        return searchResults;
      }, this.selectors);

      logger.info('NSE search results parsed', {
        resultCount: results.length,
      });

      return results;
    } catch (error) {
      logger.error('Failed to parse NSE search results', {
        error: error.message,
      });
      return [];
    }
  }

  /**
   * Parse individual announcement/circular page
   */
  async parseAnnouncement(page, url) {
    try {
      logger.info('Parsing NSE announcement', { url });

      const announcementData = await page.evaluate(selectors => {
        // Extract title
        // eslint-disable-next-line no-undef
        const titleElement = document.querySelector(
          selectors.announcementTitle
        );
        const title = titleElement ? titleElement.textContent.trim() : '';

        // Extract content
        // eslint-disable-next-line no-undef
        const contentElement = document.querySelector(
          selectors.announcementContent
        );
        const content = contentElement ? contentElement.textContent.trim() : '';
        const html = contentElement ? contentElement.innerHTML : '';

        // Extract meta information
        // eslint-disable-next-line no-undef
        const metaElement = document.querySelector(selectors.announcementMeta);
        const meta = metaElement ? metaElement.textContent.trim() : '';

        // Extract date
        // eslint-disable-next-line no-undef
        const dateElement = document.querySelector(selectors.announcementDate);
        const publishedDate = dateElement ? dateElement.textContent.trim() : '';

        // Extract announcement type
        // eslint-disable-next-line no-undef
        const typeElement = document.querySelector(selectors.announcementType);
        const announcementType = typeElement
          ? typeElement.textContent.trim()
          : '';

        // Extract announcement number
        // eslint-disable-next-line no-undef
        const numberElement = document.querySelector(
          selectors.announcementNumber
        );
        const announcementNumber = numberElement
          ? numberElement.textContent.trim()
          : '';

        // Extract stock information if available
        const stockSymbol =
          // eslint-disable-next-line no-undef
          document.querySelector(selectors.stockSymbol)?.textContent.trim() ||
          '';
        const stockPrice =
          // eslint-disable-next-line no-undef
          document.querySelector(selectors.stockPrice)?.textContent.trim() ||
          '';
        const stockChange =
          // eslint-disable-next-line no-undef
          document.querySelector(selectors.stockChange)?.textContent.trim() ||
          '';
        const stockVolume =
          // eslint-disable-next-line no-undef
          document.querySelector(selectors.stockVolume)?.textContent.trim() ||
          '';

        return {
          title,
          content,
          html,
          meta,
          publishedDate,
          announcementType,
          announcementNumber,
          stockSymbol,
          stockPrice,
          stockChange,
          stockVolume,
          // eslint-disable-next-line no-undef
          url: window.location.href,
          source: 'nse',
          extractedAt: new Date().toISOString(),
        };
      }, this.selectors);

      // Clean and validate the extracted data
      const cleanedData = this.cleanAnnouncementData(announcementData);

      logger.info('NSE announcement parsed successfully', {
        url,
        titleLength: cleanedData.title.length,
        contentLength: cleanedData.content.length,
      });

      return cleanedData;
    } catch (error) {
      logger.error('Failed to parse NSE announcement', {
        url,
        error: error.message,
      });
      return null;
    }
  }

  /**
   * Clean and normalize announcement data
   */
  cleanAnnouncementData(data) {
    return {
      title: this.normalizeText(data.title),
      content: this.normalizeText(data.content),
      html: data.html,
      meta: this.normalizeText(data.meta),
      publishedDate: this.normalizeDate(data.publishedDate),
      announcementType: this.normalizeText(data.announcementType),
      announcementNumber: this.normalizeText(data.announcementNumber),
      stockSymbol: this.normalizeText(data.stockSymbol),
      stockPrice: this.normalizeText(data.stockPrice),
      stockChange: this.normalizeText(data.stockChange),
      stockVolume: this.normalizeText(data.stockVolume),
      url: data.url,
      source: data.source,
      extractedAt: data.extractedAt,
    };
  }

  /**
   * Normalize text content
   */
  normalizeText(text) {
    if (!text) return '';

    return text
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .replace(/\n+/g, ' ') // Replace newlines with spaces
      .replace(/\t+/g, ' ') // Replace tabs with spaces
      .replace(/\r+/g, '') // Remove carriage returns
      .trim(); // Trim whitespace
  }

  /**
   * Normalize date string
   */
  normalizeDate(dateString) {
    if (!dateString) return null;

    try {
      // Handle common NSE date formats
      const cleanedDate = dateString.replace(/\s+/g, ' ').trim();

      // Try to parse the date
      const date = new Date(cleanedDate);
      if (!isNaN(date.getTime())) {
        return date.toISOString();
      }

      // If direct parsing fails, try to extract date from common formats
      const dateMatch = cleanedDate.match(/(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
      if (dateMatch) {
        const [, day, month, year] = dateMatch;
        const parsedDate = new Date(year, month - 1, day);
        if (!isNaN(parsedDate.getTime())) {
          return parsedDate.toISOString();
        }
      }

      // Try NSE specific format: "Date: 15/01/2024"
      const nseDateMatch = cleanedDate.match(
        /(?:Date:?\s*)?(\d{1,2}[/-]\d{1,2}[/-]\d{4})/
      );
      if (nseDateMatch) {
        const dateParts = nseDateMatch[1].split(/[/-]/);
        if (dateParts.length === 3) {
          const [day, month, year] = dateParts;
          const parsedDate = new Date(year, month - 1, day);
          if (!isNaN(parsedDate.getTime())) {
            return parsedDate.toISOString();
          }
        }
      }

      return null;
    } catch (error) {
      logger.warn('Failed to normalize date', {
        dateString,
        error: error.message,
      });
      return null;
    }
  }

  /**
   * Extract stock symbols from content
   */
  extractStockSymbols(content) {
    if (!content) return [];

    // NSE stock patterns (typically 3-10 characters, all caps)
    const stockPattern = /\b[A-Z]{3,10}\b/g;
    const matches = content.match(stockPattern) || [];

    // Filter out common words that aren't stock symbols
    const commonWords = [
      'THE',
      'AND',
      'FOR',
      'ARE',
      'BUT',
      'NOT',
      'YOU',
      'ALL',
      'CAN',
      'HER',
      'WAS',
      'ONE',
      'OUR',
      'OUT',
      'DAY',
      'GET',
      'HAS',
      'HIM',
      'HIS',
      'HOW',
      'ITS',
      'MAY',
      'NEW',
      'NOW',
      'OLD',
      'SEE',
      'TWO',
      'WAY',
      'WHO',
      'BOY',
      'DID',
      'PUT',
      'SAY',
      'SHE',
      'TOO',
      'USE',
    ];

    return matches
      .filter(symbol => !commonWords.includes(symbol))
      .filter(symbol => symbol.length >= 3 && symbol.length <= 10)
      .slice(0, 5); // Limit to 5 symbols
  }

  /**
   * Check if content is relevant to stocks
   */
  isStockRelevant(content) {
    if (!content) return false;

    const stockKeywords = [
      'stock',
      'share',
      'market',
      'trading',
      'investor',
      'investment',
      'price',
      'profit',
      'loss',
      'revenue',
      'earnings',
      'quarterly',
      'dividend',
      'bonus',
      'split',
      'merger',
      'acquisition',
      'IPO',
      'SEBI',
      'NSE',
      'BSE',
      'sensex',
      'nifty',
      'bull',
      'bear',
      'announcement',
      'circular',
      'notice',
      'regulation',
      'compliance',
      'listing',
      'delisting',
      'suspension',
      'resumption',
      'trading',
    ];

    const lowerContent = content.toLowerCase();
    const relevantKeywords = stockKeywords.filter(keyword =>
      lowerContent.includes(keyword.toLowerCase())
    );

    return relevantKeywords.length >= 2; // At least 2 stock-related keywords
  }

  /**
   * Get parser configuration
   */
  getConfig() {
    return {
      sourceName: this.sourceName,
      baseUrl: this.baseUrl,
      searchUrl: this.searchUrl,
      selectors: this.selectors,
    };
  }

  /**
   * Validate parsed data
   */
  validateData(data) {
    const errors = [];
    const warnings = [];

    if (!data.title || data.title.length < 10) {
      errors.push('Title is too short or missing');
    }

    if (!data.content || data.content.length < 50) {
      errors.push('Content is too short or missing');
    }

    if (!data.url) {
      errors.push('URL is missing');
    }

    if (!data.publishedDate) {
      warnings.push('Published date not found');
    }

    if (!this.isStockRelevant(data.content)) {
      warnings.push('Content may not be stock-related');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }
}

module.exports = NSEParser;
