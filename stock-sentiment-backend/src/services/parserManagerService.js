/**
 * Parser Manager Service
 * Coordinates all news source parsers and provides unified interface
 */

const logger = require('../utils/logger');
const MoneyControlParser = require('./parsers/moneyControlParser');
const EconomicTimesParser = require('./parsers/economicTimesParser');
const BusinessStandardParser = require('./parsers/businessStandardParser');
const NSEParser = require('./parsers/nseParser');
const BSEParser = require('./parsers/bseParser');

class ParserManagerService {
  constructor() {
    this.parsers = new Map();
    this.initializeParsers();
  }

  /**
   * Initialize all available parsers
   */
  initializeParsers() {
    try {
      // Initialize individual parsers
      this.parsers.set('moneyControl', new MoneyControlParser());
      this.parsers.set('economicTimes', new EconomicTimesParser());
      this.parsers.set('businessStandard', new BusinessStandardParser());
      this.parsers.set('nse', new NSEParser());
      this.parsers.set('bse', new BSEParser());

      logger.info('Parser Manager initialized', {
        availableParsers: Array.from(this.parsers.keys()),
      });
    } catch (error) {
      logger.error('Failed to initialize parsers', { error: error.message });
      throw error;
    }
  }

  /**
   * Get parser for specific source
   */
  getParser(sourceName) {
    const parser = this.parsers.get(sourceName);
    if (!parser) {
      throw new Error(`Parser not found for source: ${sourceName}`);
    }
    return parser;
  }

  /**
   * Get all available parser sources
   */
  getAvailableSources() {
    return Array.from(this.parsers.keys());
  }

  /**
   * Parse search results from specific source
   */
  async parseSearchResults(sourceName, page) {
    try {
      const parser = this.getParser(sourceName);
      logger.info('Parsing search results', { sourceName });

      const results = await parser.parseSearchResults(page);

      logger.info('Search results parsed successfully', {
        sourceName,
        resultCount: results.length,
      });

      return results;
    } catch (error) {
      logger.error('Failed to parse search results', {
        sourceName,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Parse article from specific source
   */
  async parseArticle(sourceName, page, url) {
    try {
      const parser = this.getParser(sourceName);
      logger.info('Parsing article', { sourceName, url });

      let articleData;

      // Use appropriate parsing method based on source type
      if (sourceName === 'nse' || sourceName === 'bse') {
        articleData = await parser.parseAnnouncement(page, url);
      } else {
        articleData = await parser.parseArticle(page, url);
      }

      if (!articleData) {
        throw new Error('Failed to extract article data');
      }

      // Validate the parsed data
      const validation = parser.validateData(articleData);

      logger.info('Article parsed successfully', {
        sourceName,
        url,
        titleLength: articleData.title.length,
        contentLength: articleData.content.length,
        isValid: validation.isValid,
        warnings: validation.warnings.length,
      });

      return {
        ...articleData,
        validation,
      };
    } catch (error) {
      logger.error('Failed to parse article', {
        sourceName,
        url,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Parse multiple sources for a stock
   */
  async parseMultipleSources(stockSymbol, pages) {
    try {
      logger.info('Parsing multiple sources for stock', { stockSymbol });

      const results = {};
      const errors = [];

      // Parse each source
      for (const [sourceName, page] of Object.entries(pages)) {
        try {
          if (this.parsers.has(sourceName)) {
            const searchResults = await this.parseSearchResults(
              sourceName,
              page
            );
            results[sourceName] = {
              searchResults,
              success: true,
              resultCount: searchResults.length,
            };
          } else {
            logger.warn('Parser not available for source', { sourceName });
            results[sourceName] = {
              success: false,
              error: 'Parser not available',
            };
          }
        } catch (error) {
          logger.error('Failed to parse source', {
            sourceName,
            error: error.message,
          });
          results[sourceName] = {
            success: false,
            error: error.message,
          };
          errors.push({ sourceName, error: error.message });
        }
      }

      const summary = {
        stockSymbol,
        totalSources: Object.keys(pages).length,
        successfulSources: Object.values(results).filter(r => r.success).length,
        totalResults: Object.values(results)
          .filter(r => r.success)
          .reduce((sum, r) => sum + (r.resultCount || 0), 0),
        errors,
        results,
      };

      logger.info('Multiple sources parsing completed', summary);

      return summary;
    } catch (error) {
      logger.error('Failed to parse multiple sources', {
        stockSymbol,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Extract stock symbols from content across all parsers
   */
  extractStockSymbols(sourceName, content) {
    try {
      const parser = this.getParser(sourceName);

      if (parser.extractStockSymbols) {
        return parser.extractStockSymbols(content);
      }

      // Fallback to generic stock symbol extraction
      return this.genericStockSymbolExtraction(content);
    } catch (error) {
      logger.error('Failed to extract stock symbols', {
        sourceName,
        error: error.message,
      });
      return [];
    }
  }

  /**
   * Generic stock symbol extraction (fallback)
   */
  genericStockSymbolExtraction(content) {
    if (!content) return [];

    // Common Indian stock patterns (NSE/BSE format)
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
   * Check content relevance across all parsers
   */
  checkContentRelevance(sourceName, content) {
    try {
      const parser = this.getParser(sourceName);

      if (parser.isStockRelevant) {
        return parser.isStockRelevant(content);
      }

      // Fallback to generic relevance check
      return this.genericStockRelevanceCheck(content);
    } catch (error) {
      logger.error('Failed to check content relevance', {
        sourceName,
        error: error.message,
      });
      return false;
    }
  }

  /**
   * Generic stock relevance check (fallback)
   */
  genericStockRelevanceCheck(content) {
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
    ];

    const lowerContent = content.toLowerCase();
    const relevantKeywords = stockKeywords.filter(keyword =>
      lowerContent.includes(keyword.toLowerCase())
    );

    return relevantKeywords.length >= 2; // At least 2 stock-related keywords
  }

  /**
   * Get parser configuration for specific source
   */
  getParserConfig(sourceName) {
    try {
      const parser = this.getParser(sourceName);
      return parser.getConfig();
    } catch (error) {
      logger.error('Failed to get parser config', {
        sourceName,
        error: error.message,
      });
      return null;
    }
  }

  /**
   * Get all parser configurations
   */
  getAllParserConfigs() {
    const configs = {};

    for (const [sourceName, parser] of this.parsers) {
      try {
        configs[sourceName] = parser.getConfig();
      } catch (error) {
        logger.warn('Failed to get config for parser', {
          sourceName,
          error: error.message,
        });
        configs[sourceName] = null;
      }
    }

    return configs;
  }

  /**
   * Get parser statistics
   */
  getParserStats() {
    return {
      totalParsers: this.parsers.size,
      availableSources: this.getAvailableSources(),
      parserNames: Array.from(this.parsers.keys()),
    };
  }

  /**
   * Validate parser health
   */
  validateParserHealth() {
    const health = {};

    for (const [sourceName, parser] of this.parsers) {
      try {
        // Basic validation - check if parser has required methods
        const hasRequiredMethods =
          parser.parseSearchResults &&
          (parser.parseArticle || parser.parseAnnouncement) &&
          parser.validateData;

        health[sourceName] = {
          status: hasRequiredMethods ? 'healthy' : 'missing_methods',
          hasRequiredMethods,
          timestamp: new Date().toISOString(),
        };
      } catch (error) {
        health[sourceName] = {
          status: 'error',
          error: error.message,
          timestamp: new Date().toISOString(),
        };
      }
    }

    return health;
  }
}

module.exports = ParserManagerService;
