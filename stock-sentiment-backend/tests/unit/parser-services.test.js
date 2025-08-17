/**
 * Unit tests for Parser Services
 */

const ParserManagerService = require('../../src/services/parserManagerService');

describe('Parser Services', () => {
  let parserManager;

  beforeEach(() => {
    parserManager = new ParserManagerService();
  });

  describe('ParserManagerService', () => {
    test('should initialize with all parsers', () => {
      const stats = parserManager.getParserStats();

      expect(stats.totalParsers).toBe(5);
      expect(stats.availableSources).toContain('moneyControl');
      expect(stats.availableSources).toContain('economicTimes');
      expect(stats.availableSources).toContain('businessStandard');
      expect(stats.availableSources).toContain('nse');
      expect(stats.availableSources).toContain('bse');
    });

    test('should get parser for valid source', () => {
      const moneyControlParser = parserManager.getParser('moneyControl');
      expect(moneyControlParser).toBeDefined();
      expect(moneyControlParser.sourceName).toBe('moneyControl');
    });

    test('should throw error for invalid source', () => {
      expect(() => {
        parserManager.getParser('invalidSource');
      }).toThrow('Parser not found for source: invalidSource');
    });

    test('should get all parser configs', () => {
      const configs = parserManager.getAllParserConfigs();

      expect(configs.moneyControl).toBeDefined();
      expect(configs.economicTimes).toBeDefined();
      expect(configs.businessStandard).toBeDefined();
      expect(configs.nse).toBeDefined();
      expect(configs.bse).toBeDefined();
    });

    test('should validate parser health', () => {
      const health = parserManager.validateParserHealth();

      expect(health.moneyControl.status).toBe('healthy');
      expect(health.economicTimes.status).toBe('healthy');
      expect(health.businessStandard.status).toBe('healthy');
      expect(health.nse.status).toBe('healthy');
      expect(health.bse.status).toBe('healthy');
    });

    test('should extract stock symbols from content', () => {
      const content =
        'RELIANCE stock price increased. TCS and INFY also performed well.';
      const symbols = parserManager.extractStockSymbols(
        'moneyControl',
        content
      );

      expect(symbols).toContain('RELIANCE');
      expect(symbols).toContain('TCS');
      expect(symbols).toContain('INFY');
    });

    test('should check content relevance', () => {
      const relevantContent =
        'Stock market trading volume increased. Investors are bullish on NSE.';
      const irrelevantContent = 'Weather forecast shows rain today.';

      expect(
        parserManager.checkContentRelevance('moneyControl', relevantContent)
      ).toBe(true);
      expect(
        parserManager.checkContentRelevance('moneyControl', irrelevantContent)
      ).toBe(false);
    });

    test('should get parser configuration', () => {
      const config = parserManager.getParserConfig('moneyControl');

      expect(config.sourceName).toBe('moneyControl');
      expect(config.baseUrl).toBe('https://www.moneycontrol.com');
      expect(config.selectors).toBeDefined();
    });
  });

  describe('Individual Parsers', () => {
    test('MoneyControl parser should have correct configuration', () => {
      const parser = parserManager.getParser('moneyControl');
      const config = parser.getConfig();

      expect(config.sourceName).toBe('moneyControl');
      expect(config.baseUrl).toBe('https://www.moneycontrol.com');
      expect(config.selectors.searchResults).toBeDefined();
      expect(config.selectors.articleTitle).toBeDefined();
    });

    test('Economic Times parser should have correct configuration', () => {
      const parser = parserManager.getParser('economicTimes');
      const config = parser.getConfig();

      expect(config.sourceName).toBe('economicTimes');
      expect(config.baseUrl).toBe('https://economictimes.indiatimes.com');
      expect(config.selectors.searchResults).toBeDefined();
      expect(config.selectors.articleTitle).toBeDefined();
    });

    test('Business Standard parser should have correct configuration', () => {
      const parser = parserManager.getParser('businessStandard');
      const config = parser.getConfig();

      expect(config.sourceName).toBe('businessStandard');
      expect(config.baseUrl).toBe('https://www.business-standard.com');
      expect(config.selectors.searchResults).toBeDefined();
      expect(config.selectors.articleTitle).toBeDefined();
    });

    test('NSE parser should have correct configuration', () => {
      const parser = parserManager.getParser('nse');
      const config = parser.getConfig();

      expect(config.sourceName).toBe('nse');
      expect(config.baseUrl).toBe('https://www.nseindia.com');
      expect(config.selectors.searchResults).toBeDefined();
      expect(config.selectors.announcementTitle).toBeDefined();
    });

    test('BSE parser should have correct configuration', () => {
      const parser = parserManager.getParser('bse');
      const config = parser.getConfig();

      expect(config.sourceName).toBe('bse');
      expect(config.baseUrl).toBe('https://www.bseindia.com');
      expect(config.selectors.searchResults).toBeDefined();
      expect(config.selectors.announcementTitle).toBeDefined();
    });
  });

  describe('Data Validation', () => {
    test('should validate article data correctly', () => {
      const parser = parserManager.getParser('moneyControl');

      const validData = {
        title: 'This is a valid stock market article title',
        content:
          'This is a valid article content about stock market trading and investment opportunities with sufficient length to pass validation requirements. The market shows bullish trends and investors are optimistic about the future.',
        url: 'https://example.com/article',
      };

      const invalidData = {
        title: 'Short',
        content: 'Too short',
        url: '',
      };

      const validValidation = parser.validateData(validData);
      const invalidValidation = parser.validateData(invalidData);

      expect(validValidation.isValid).toBe(true);
      expect(invalidValidation.isValid).toBe(false);
      expect(invalidValidation.errors.length).toBeGreaterThan(0);
    });
  });
});
