/**
 * Economic Times News Parser
 * Specialized parser for Economic Times news website
 */

const logger = require('../../utils/logger');

class EconomicTimesParser {
  constructor() {
    this.sourceName = 'economicTimes';
    this.baseUrl = 'https://economictimes.indiatimes.com';
    this.searchUrl = 'https://economictimes.indiatimes.com/search';

    // Economic Times specific selectors
    this.selectors = {
      // Search results page
      searchResults: '.search-result, .news-item, .story-item, .eachStory',
      searchResultTitle: 'h1, h2, h3, .title, .headline, .storyTitle',
      searchResultLink: 'a',
      searchResultSummary: '.summary, .description, .excerpt, .storySum, p',

      // Article page
      articleTitle:
        'h1.article_title, .article_title h1, .artTitle, .pageTitle',
      articleContent:
        '.article_content, .article-body, .story-content, .Normal',
      articleMeta: '.article_meta, .article-meta, .story-meta, .metaData',
      articleDate: '.article_date, .date, .published-date, .publishOn',
      articleAuthor: '.author, .byline, .writer, .byLine',
      articleTags: '.tags, .keywords, .categories, .tagList',

      // Stock specific elements
      stockSymbol: '.stock-symbol, .symbol, .ticker, .scripCode',
      stockPrice: '.stock-price, .price, .current-price, .ltp',
      stockChange: '.stock-change, .change, .price-change, .changeValue',
    };
  }

  /**
   * Parse search results page
   */
  async parseSearchResults(page) {
    try {
      logger.info('Parsing Economic Times search results');

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
                source: 'economicTimes',
                extractedAt: new Date().toISOString(),
              });
            }
          }
        });

        return searchResults;
      }, this.selectors);

      logger.info('Economic Times search results parsed', {
        resultCount: results.length,
      });

      return results;
    } catch (error) {
      logger.error('Failed to parse Economic Times search results', {
        error: error.message,
      });
      return [];
    }
  }

  /**
   * Parse individual article page
   */
  async parseArticle(page, url) {
    try {
      logger.info('Parsing Economic Times article', { url });

      const articleData = await page.evaluate(selectors => {
        // Extract title
        // eslint-disable-next-line no-undef
        const titleElement = document.querySelector(selectors.articleTitle);
        const title = titleElement ? titleElement.textContent.trim() : '';

        // Extract content
        // eslint-disable-next-line no-undef
        const contentElement = document.querySelector(selectors.articleContent);
        const content = contentElement ? contentElement.textContent.trim() : '';
        const html = contentElement ? contentElement.innerHTML : '';

        // Extract meta information
        // eslint-disable-next-line no-undef
        const metaElement = document.querySelector(selectors.articleMeta);
        const meta = metaElement ? metaElement.textContent.trim() : '';

        // Extract date
        // eslint-disable-next-line no-undef
        const dateElement = document.querySelector(selectors.articleDate);
        const publishedDate = dateElement ? dateElement.textContent.trim() : '';

        // Extract author
        // eslint-disable-next-line no-undef
        const authorElement = document.querySelector(selectors.articleAuthor);
        const author = authorElement ? authorElement.textContent.trim() : '';

        // Extract tags
        // eslint-disable-next-line no-undef
        const tagsElement = document.querySelector(selectors.articleTags);
        const tags = tagsElement ? tagsElement.textContent.trim() : '';

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

        return {
          title,
          content,
          html,
          meta,
          publishedDate,
          author,
          tags,
          stockSymbol,
          stockPrice,
          stockChange,
          // eslint-disable-next-line no-undef
          url: window.location.href,
          source: 'economicTimes',
          extractedAt: new Date().toISOString(),
        };
      }, this.selectors);

      // Clean and validate the extracted data
      const cleanedData = this.cleanArticleData(articleData);

      logger.info('Economic Times article parsed successfully', {
        url,
        titleLength: cleanedData.title.length,
        contentLength: cleanedData.content.length,
      });

      return cleanedData;
    } catch (error) {
      logger.error('Failed to parse Economic Times article', {
        url,
        error: error.message,
      });
      return null;
    }
  }

  /**
   * Clean and normalize article data
   */
  cleanArticleData(data) {
    return {
      title: this.normalizeText(data.title),
      content: this.normalizeText(data.content),
      html: data.html,
      meta: this.normalizeText(data.meta),
      publishedDate: this.normalizeDate(data.publishedDate),
      author: this.normalizeText(data.author),
      tags: this.normalizeText(data.tags),
      stockSymbol: this.normalizeText(data.stockSymbol),
      stockPrice: this.normalizeText(data.stockPrice),
      stockChange: this.normalizeText(data.stockChange),
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
      // Handle common Economic Times date formats
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

      // Try ET specific format: "Updated: Jan 15, 2024, 10:30 AM IST"
      const etDateMatch = cleanedDate.match(
        /(?:Updated:?\s*)?([A-Za-z]{3}\s+\d{1,2},?\s+\d{4})/
      );
      if (etDateMatch) {
        const parsedDate = new Date(etDateMatch[1]);
        if (!isNaN(parsedDate.getTime())) {
          return parsedDate.toISOString();
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

    // Common Indian stock patterns (NSE format)
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
      'economy',
      'financial',
      'business',
      'corporate',
      'company',
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

    if (!data.content || data.content.length < 100) {
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

module.exports = EconomicTimesParser;
