// Mock the configuration before importing the service
jest.mock('../../src/config/sentiment', () => ({
  validateConfig: jest.fn().mockReturnValue({
    isValid: true,
    errors: [],
    warnings: [],
  }),
  isApiKeyConfigured: jest.fn().mockReturnValue(true),
  getHuggingFaceConfig: jest.fn().mockReturnValue({
    apiKey: 'test-api-key',
    model: 'ProsusAI/finbert',
    baseUrl: 'https://api-inference.huggingface.co',
    timeout: 30000,
    maxRetries: 3,
    retryDelay: 1000,
  }),
  getAnalysisSettings: jest.fn().mockReturnValue({
    confidenceThreshold: 0.6,
    maxTextLength: 512,
    batchSize: 10,
    cacheResults: true,
    cacheTTL: 900,
  }),
  getProcessingConfig: jest.fn().mockReturnValue({
    removeHtml: true,
    removeUrls: true,
    removeSpecialChars: false,
    normalizeWhitespace: true,
    maxWords: 1000,
    supportedLanguages: ['en', 'hi'],
    defaultLanguage: 'en',
    minContentLength: 50,
    maxContentLength: 5000,
    filterSpam: true,
    filterDuplicates: true,
  }),
  getKeywords: jest.fn().mockImplementation(sentiment => {
    const keywords = {
      positive: ['strong', 'growth', 'excellent', 'bullish', 'positive'],
      negative: ['bearish', 'poor', 'weak', 'declining'],
      neutral: ['stable', 'technical', 'fundamental', 'quarterly'],
    };
    return keywords[sentiment] || [];
  }),
  getAllKeywords: jest.fn().mockReturnValue({
    positive: ['strong', 'growth', 'excellent', 'bullish', 'positive'],
    negative: ['bearish', 'poor', 'weak', 'declining'],
    neutral: ['stable', 'technical', 'fundamental', 'quarterly'],
  }),
  getSentimentLabel: jest.fn().mockImplementation(score => {
    if (score >= 0.6) return 'positive';
    if (score <= -0.4) return 'negative';
    return 'neutral';
  }),
  calculateWeightedScore: jest
    .fn()
    .mockImplementation(({ modelScore, keywordScore, _confidence }) => {
      return modelScore * 0.7 + keywordScore * 0.3;
    }),
}));

// Mock Hugging Face client for integration tests
jest.mock('@huggingface/inference');

const mockHfInference = {
  textClassification: jest.fn().mockImplementation(({ inputs }) => {
    const textLower = inputs.toLowerCase();

    // Return different sentiments based on text content
    if (
      textLower.includes('bearish') ||
      textLower.includes('poor') ||
      textLower.includes('weak')
    ) {
      return Promise.resolve([{ label: 'negative', score: 0.85 }]);
    } else if (
      textLower.includes('stable') ||
      textLower.includes('technical') ||
      textLower.includes('fundamental')
    ) {
      return Promise.resolve([{ label: 'neutral', score: 0.75 }]);
    } else {
      return Promise.resolve([{ label: 'positive', score: 0.85 }]);
    }
  }),
};

// Mock the HfInference constructor
jest.mock('@huggingface/inference', () => ({
  HfInference: jest.fn().mockImplementation(() => mockHfInference),
}));

// Import the service after mocks are set up
const sentimentService = require('../../src/services/sentimentService');

describe('Sentiment Service Integration', () => {
  beforeAll(async () => {
    // Set a mock API key for testing
    process.env.HUGGINGFACE_API_KEY = 'test-api-key-for-testing';

    // Initialize the service
    await sentimentService.initialize();
  });

  afterAll(async () => {
    if (sentimentService && sentimentService.isInitialized) {
      await sentimentService.close();
    }
  });

  describe('Real Sentiment Analysis', () => {
    it('should analyze positive financial news', async () => {
      const text =
        'The company reported excellent quarterly earnings with strong growth and positive results';

      const result = await sentimentService.analyzeSentiment(text);

      expect(result).toBeDefined();
      expect(result.analysis).toBeDefined();
      expect(result.analysis.label).toBe('positive');
      expect(result.analysis.score).toBeGreaterThan(0);
      expect(result.analysis.confidence).toBeGreaterThan(0.5);
      expect(result.keywords.positive.length).toBeGreaterThan(0);
      expect(result.keywords.positive.some(k => k.word === 'excellent')).toBe(
        true
      );
      expect(result.keywords.positive.some(k => k.word === 'strong')).toBe(
        true
      );
      expect(result.keywords.positive.some(k => k.word === 'positive')).toBe(
        true
      );
    });

    it('should analyze negative financial news', async () => {
      const text =
        'The stock showed poor performance with bearish signals and weak outlook';

      const result = await sentimentService.analyzeSentiment(text);

      expect(result).toBeDefined();
      expect(result.analysis).toBeDefined();
      expect(result.analysis.label).toBe('negative');
      expect(result.analysis.score).toBeLessThan(0);
      expect(result.analysis.confidence).toBeGreaterThan(0.5);
      expect(result.keywords.negative.length).toBeGreaterThan(0);
      expect(result.keywords.negative.some(k => k.word === 'poor')).toBe(true);
      expect(result.keywords.negative.some(k => k.word === 'bearish')).toBe(
        true
      );
    });

    it('should handle mixed sentiment text', async () => {
      const text =
        'While the company showed strong growth in some areas, there were also concerning weak performance in other segments. The overall outlook remains uncertain.';

      const result = await sentimentService.analyzeSentiment(text);

      expect(result).toBeDefined();
      expect(result.analysis).toBeDefined();
      expect(result.keywords.positive.length).toBeGreaterThan(0);
      expect(result.keywords.positive.some(k => k.word === 'strong')).toBe(
        true
      );
      expect(result.keywords.negative.some(k => k.word === 'weak')).toBe(true);
    });

    it('should handle neutral financial text', async () => {
      const text =
        'The quarterly report shows stable performance with technical analysis and fundamental review of the company metrics.';

      const result = await sentimentService.analyzeSentiment(text);

      expect(result).toBeDefined();
      expect(result.analysis).toBeDefined();
      expect(result.keywords.neutral.length).toBeGreaterThan(0);
      expect(result.keywords.neutral.some(k => k.word === 'stable')).toBe(true);
      expect(result.keywords.neutral.some(k => k.word === 'technical')).toBe(
        true
      );
    });
  });

  describe('Text Processing', () => {
    it('should clean HTML and normalize text', async () => {
      const dirtyText =
        '<p>This is <strong>positive</strong> news with <a href="http://example.com">link</a> and excellent performance indicators showing strong growth potential for the company.</p>';

      const result = await sentimentService.analyzeSentiment(dirtyText);

      expect(result).toBeDefined();
      expect(result.analysis).toBeDefined();
      // Should still detect positive sentiment despite HTML
      expect(result.keywords.positive.some(k => k.word === 'positive')).toBe(
        true
      );
      expect(result.keywords.positive.some(k => k.word === 'excellent')).toBe(
        true
      );
      expect(result.keywords.positive.some(k => k.word === 'strong')).toBe(
        true
      );
    });

    it('should handle long text appropriately', async () => {
      const longText = 'This is a very long text. '.repeat(1000);

      const result = await sentimentService.analyzeSentiment(longText);

      expect(result).toBeDefined();
      expect(result.analysis).toBeDefined();
      // Should process without errors - check that it's not too long
      expect(result.metadata.textLength).toBeLessThanOrEqual(5000); // Within max limit
    });

    it('should handle text with URLs', async () => {
      const textWithUrls =
        'Check out https://example.com and http://test.com for more information about the company performance.';

      const result = await sentimentService.analyzeSentiment(textWithUrls);

      expect(result).toBeDefined();
      expect(result.analysis).toBeDefined();
      // URLs should be cleaned out during processing
      expect(result.metadata.textLength).toBeGreaterThan(0);
      expect(result.metadata.method).toBeDefined();
    });
  });

  describe('Batch Processing', () => {
    it('should process multiple texts in batches', async () => {
      const texts = [
        'Strong growth and positive outlook with excellent performance',
        'Bearish signals with poor performance and weak outlook',
        'Stable quarterly results with technical analysis and fundamental review',
        'Excellent earnings report with strong growth and positive outlook',
      ];

      const results = await sentimentService.batchAnalyze(texts);

      expect(results).toHaveLength(4);
      expect(results.every(r => r !== null)).toBe(true);
      expect(results[0].analysis.label).toBe('positive');
      expect(results[1].analysis.label).toBe('negative');
      expect(results[2].analysis.label).toBe('neutral');
      expect(results[3].analysis.label).toBe('positive');
    });

    it('should handle batch processing with invalid texts', async () => {
      const texts = [
        'Valid text with positive keywords and strong growth outlook',
        'Invalid', // Too short
        'Another valid text with negative keywords and bearish signals',
      ];

      const results = await sentimentService.batchAnalyze(texts);

      expect(results).toHaveLength(3);
      expect(results[0]).not.toBeNull();
      expect(results[1]).toBeNull(); // Failed analysis
      expect(results[2]).not.toBeNull();
    });
  });

  describe('Service Health', () => {
    it('should return health status', () => {
      const health = sentimentService.getHealthStatus();

      expect(health).toHaveProperty('service', 'sentiment');
      expect(health).toHaveProperty('status');
      expect(health).toHaveProperty('huggingface');
      expect(health).toHaveProperty('cache');
      expect(health).toHaveProperty('timestamp');
      expect(health.huggingface).toBe('configured');
    });
  });
});
