/**
 * Test file for modular crawler services
 */

const CrawlerService = require('../../src/services/crawlerService');
const BrowserManagerService = require('../../src/services/browserManagerService');
const PageNavigationService = require('../../src/services/pageNavigationService');
const ContentExtractionService = require('../../src/services/contentExtractionService');
const RateLimitService = require('../../src/services/rateLimitService');

describe('Crawler Services', () => {
  describe('BrowserManagerService', () => {
    let browserManager;

    beforeEach(() => {
      browserManager = new BrowserManagerService();
    });

    afterEach(async () => {
      await browserManager.cleanup();
    });

    it('should initialize browser manager', async () => {
      const result = await browserManager.initialize();
      expect(result).toBe(true);
      expect(browserManager.isInitialized).toBe(true);
    });

    it('should get pool status', async () => {
      await browserManager.initialize();
      const status = browserManager.getPoolStatus();
      
      expect(status).toHaveProperty('poolSize');
      expect(status).toHaveProperty('isInitialized');
      expect(status).toHaveProperty('mainBrowserActive');
    });
  });

  describe('PageNavigationService', () => {
    let navigationService;

    beforeEach(() => {
      navigationService = new PageNavigationService();
    });

    it('should have retry configuration', () => {
      const stats = navigationService.getNavigationStats();
      expect(stats).toHaveProperty('retryConfig');
      expect(stats.retryConfig).toHaveProperty('maxAttempts');
    });

    it('should delay execution', async () => {
      const start = Date.now();
      await navigationService.delay(100);
      const end = Date.now();
      
      expect(end - start).toBeGreaterThanOrEqual(100);
    });
  });

  describe('ContentExtractionService', () => {
    let contentService;

    beforeEach(() => {
      contentService = new ContentExtractionService();
    });

    it('should have extraction limits', () => {
      const stats = contentService.getExtractionStats();
      expect(stats).toHaveProperty('extractionLimits');
      expect(stats).toHaveProperty('validationRules');
    });

    it('should normalize text', () => {
      const text = '  Hello   World\n\n\n';
      const normalized = contentService.normalizeText(text);
      expect(normalized).toBe('Hello World');
    });

    it('should validate content', () => {
      const content = {
        title: 'Test Title',
        url: 'https://example.com',
        content: 'This is test content with enough characters to pass validation'
      };

      const validation = contentService.validateContent(content);
      expect(validation).toHaveProperty('isValid');
      expect(validation).toHaveProperty('errors');
      expect(validation).toHaveProperty('warnings');
    });
  });

  describe('RateLimitService', () => {
    let rateLimitService;

    beforeEach(() => {
      rateLimitService = new RateLimitService();
    });

    it('should initialize rate limit counters', () => {
      const stats = rateLimitService.getStatistics();
      expect(stats).toHaveProperty('totalSources');
      expect(stats).toHaveProperty('sourceStatuses');
    });

    it('should check if source can make request', () => {
      const canRequest = rateLimitService.canMakeRequest('moneyControl');
      expect(typeof canRequest).toBe('boolean');
    });

    it('should get available sources', () => {
      const sources = rateLimitService.getAvailableSources();
      expect(Array.isArray(sources)).toBe(true);
    });

    it('should get recommended delay', () => {
      const delay = rateLimitService.getRecommendedDelay('moneyControl');
      expect(typeof delay).toBe('number');
      expect(delay).toBeGreaterThanOrEqual(0);
    });
  });

  describe('CrawlerService Integration', () => {
    let crawlerService;

    beforeEach(() => {
      crawlerService = new CrawlerService();
    });

    afterEach(async () => {
      await crawlerService.stop();
    });

    it('should initialize crawler service', async () => {
      const result = await crawlerService.initialize();
      expect(result).toBe(true);
      expect(crawlerService.isRunning).toBe(true);
    });

    it('should get crawler status', async () => {
      await crawlerService.initialize();
      const status = crawlerService.getStatus();
      
      expect(status).toHaveProperty('isRunning');
      expect(status).toHaveProperty('browserStatus');
      expect(status).toHaveProperty('rateLimitStatus');
      expect(status).toHaveProperty('activeCrawls');
    });

    it('should get available sources', async () => {
      await crawlerService.initialize();
      const sources = crawlerService.getAvailableSources();
      expect(Array.isArray(sources)).toBe(true);
    });

    it('should build search URL', () => {
      const url = crawlerService.buildSearchUrl(
        { baseUrl: 'https://example.com', searchUrl: 'https://example.com/search' },
        'RELIANCE'
      );
      expect(url).toBe('https://example.com/search?q=RELIANCE');
    });

    it('should get search result selectors', () => {
      const selectors = crawlerService.getSearchResultSelectors('moneyControl');
      expect(Array.isArray(selectors)).toBe(true);
      expect(selectors.length).toBeGreaterThan(0);
    });
  });
});
