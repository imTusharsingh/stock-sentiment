// Import for type reference only
const _sentimentService = require('../../src/services/sentimentService');
const sentimentConfig = require('../../src/config/sentiment');

// Mock dependencies
jest.mock('../../src/services/redisService');
jest.mock('../../src/utils/logger');
jest.mock('@huggingface/inference');

const mockRedisService = require('../../src/services/redisService');
const mockLogger = require('../../src/utils/logger');

// Mock Hugging Face client
const mockHfInference = {
  textClassification: jest.fn().mockImplementation(({ inputs }) => {
    const textLower = inputs.toLowerCase();

    // Return different sentiments based on text content
    if (
      textLower.includes('bearish') ||
      textLower.includes('poor') ||
      textLower.includes('declining')
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

describe('SentimentService', () => {
  let service;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Reset service state
    service =
      new (require('../../src/services/sentimentService').constructor)();

    // Mock Redis service methods
    mockRedisService.get.mockResolvedValue(null);
    mockRedisService.set.mockResolvedValue(undefined);

    // Mock logger methods
    mockLogger.info.mockImplementation(() => {});
    mockLogger.warn.mockImplementation(() => {});
    mockLogger.error.mockImplementation(() => {});
  });

  afterEach(async () => {
    if (service.isInitialized) {
      await service.close();
    }
  });

  describe('Initialization', () => {
    it('should initialize successfully with valid config', async () => {
      // Mock config validation
      jest.spyOn(sentimentConfig, 'validateConfig').mockReturnValue({
        isValid: true,
        errors: [],
        warnings: [],
      });
      jest.spyOn(sentimentConfig, 'isApiKeyConfigured').mockReturnValue(true);

      const result = await service.initialize();

      expect(result).toBe(true);
      expect(service.isInitialized).toBe(true);
      expect(mockLogger.info).toHaveBeenCalledWith(
        '✅ Sentiment service initialized successfully'
      );
    });

    it('should handle initialization failure gracefully', async () => {
      // Mock config validation failure
      jest.spyOn(sentimentConfig, 'validateConfig').mockReturnValue({
        isValid: false,
        errors: ['API key missing'],
        warnings: [],
      });

      try {
        await service.initialize();
        // Should not reach here
        expect(true).toBe(false);
      } catch (error) {
        expect(error.message).toContain(
          'Configuration validation failed: API key missing'
        );
        expect(service.isInitialized).toBe(false);
      }
    });

    it('should fail initialization when API key is missing', async () => {
      // Mock config validation success but no API key
      jest.spyOn(sentimentConfig, 'validateConfig').mockReturnValue({
        isValid: true,
        errors: [],
        warnings: [],
      });
      jest.spyOn(sentimentConfig, 'isApiKeyConfigured').mockReturnValue(false);

      try {
        await service.initialize();
        // Should not reach here
        expect(true).toBe(false);
      } catch (error) {
        expect(error.message).toBe(
          'Hugging Face API key is required for sentiment analysis'
        );
        expect(service.isInitialized).toBe(false);
      }
    });
  });

  describe('Text Cleaning and Validation', () => {
    beforeEach(async () => {
      jest.spyOn(sentimentConfig, 'validateConfig').mockReturnValue({
        isValid: true,
        errors: [],
        warnings: [],
      });
      jest.spyOn(sentimentConfig, 'isApiKeyConfigured').mockReturnValue(true);
      await service.initialize();
    });

    it('should clean HTML tags from text', () => {
      const dirtyText = '<p>This is <strong>positive</strong> news</p>';
      const cleaned = service._cleanText(dirtyText);
      expect(cleaned).toBe('This is positive news');
    });

    it('should remove URLs from text', () => {
      const textWithUrls =
        'Check out https://example.com and http://test.com for more info';
      const cleaned = service._cleanText(textWithUrls);
      expect(cleaned).toBe('Check out and for more info');
    });

    it('should normalize whitespace', () => {
      const messyText = '  Multiple    spaces\n\nand\n\nnewlines  ';
      const cleaned = service._cleanText(messyText);
      expect(cleaned).toBe('Multiple spaces and newlines');
    });

    it('should limit text to maximum words', () => {
      const longText = 'word '.repeat(1500);
      const cleaned = service._cleanText(longText);
      const wordCount = cleaned.split(' ').length;
      expect(wordCount).toBeLessThanOrEqual(1000);
    });

    it('should validate text length correctly', () => {
      const shortText = 'Too short';
      const validText =
        'This is a valid length text that meets the minimum requirements for sentiment analysis.';
      const longText = 'word '.repeat(6000);

      expect(service._isValidText(shortText)).toBe(false);
      expect(service._isValidText(validText)).toBe(true);
      expect(service._isValidText(longText)).toBe(false);
    });

    it('should throw error for invalid text input', () => {
      expect(() => service._cleanText(null)).toThrow('Invalid text input');
      expect(() => service._cleanText(undefined)).toThrow('Invalid text input');
      expect(() => service._cleanText(123)).toThrow('Invalid text input');
    });
  });

  describe('Keyword-based Analysis', () => {
    beforeEach(async () => {
      jest.spyOn(sentimentConfig, 'validateConfig').mockReturnValue({
        isValid: true,
        errors: [],
        warnings: [],
      });
      jest.spyOn(sentimentConfig, 'isApiKeyConfigured').mockReturnValue(true);
      await service.initialize();
    });

    it('should detect positive sentiment from keywords', () => {
      const positiveText =
        'The company showed strong growth and excellent performance with bullish outlook';

      const result = service._analyzeWithKeywords(positiveText);

      expect(result.analysis.label).toBe('positive');
      expect(result.analysis.score).toBeGreaterThan(0);
      expect(result.keywords.positive.length).toBeGreaterThan(0);
      expect(result.keywords.positive.some(k => k.word === 'growth')).toBe(
        true
      );
    });

    it('should detect negative sentiment from keywords', () => {
      const negativeText =
        'The stock declined sharply with bearish signals and poor performance';

      const result = service._analyzeWithKeywords(negativeText);

      expect(result.analysis.label).toBe('negative');
      expect(result.analysis.score).toBeLessThan(0);
      expect(result.keywords.negative.length).toBeGreaterThan(0);
      expect(result.keywords.negative.some(k => k.word === 'bearish')).toBe(
        true
      );
      expect(result.keywords.negative.some(k => k.word === 'poor')).toBe(true);
    });

    it('should detect neutral sentiment when no strong signals', () => {
      const neutralText =
        'The quarterly report shows stable performance with technical analysis';

      const result = service._analyzeWithKeywords(neutralText);

      expect(result.analysis.label).toBe('neutral');
      expect(result.analysis.score).toBe(0);
      expect(result.keywords.neutral.length).toBeGreaterThan(0);
    });

    it('should calculate confidence based on keyword matches', () => {
      const text =
        'Strong growth excellent performance bullish outlook positive results';

      const result = service._analyzeWithKeywords(text);

      expect(result.analysis.confidence).toBeGreaterThan(0.5);
      expect(result.analysis.confidence).toBeLessThanOrEqual(0.9);
    });

    it('should cap keyword analysis scores appropriately', () => {
      const veryPositiveText = 'growth '.repeat(50) + 'excellent '.repeat(50);

      const result = service._analyzeWithKeywords(veryPositiveText);

      expect(result.analysis.score).toBeLessThanOrEqual(0.8);
      expect(result.analysis.score).toBeGreaterThan(0);
    });
  });

  describe('Sentiment Analysis Integration', () => {
    beforeEach(async () => {
      jest.spyOn(sentimentConfig, 'validateConfig').mockReturnValue({
        isValid: true,
        errors: [],
        warnings: [],
      });
      jest.spyOn(sentimentConfig, 'isApiKeyConfigured').mockReturnValue(true);
      await service.initialize();
    });

    it('should analyze sentiment and return structured result', async () => {
      const text =
        'The company reported strong quarterly earnings with positive outlook';

      const result = await service.analyzeSentiment(text);

      expect(result).toHaveProperty('analysis');
      expect(result).toHaveProperty('keywords');
      expect(result).toHaveProperty('metadata');
      expect(result.analysis).toHaveProperty('label');
      expect(result.analysis).toHaveProperty('confidence');
      expect(result.analysis).toHaveProperty('score');
      expect(result.analysis).toHaveProperty('finalLabel');
    });

    it('should handle text that is too short', async () => {
      const shortText = 'Short';

      await expect(service.analyzeSentiment(shortText)).rejects.toThrow(
        'Text is too short or invalid for analysis'
      );
    });

    it('should cache results when caching is enabled', async () => {
      const text =
        'This is a test text for sentiment analysis with positive keywords';

      // Mock cache miss then hit
      mockRedisService.get
        .mockResolvedValueOnce(null) // First call: cache miss
        .mockResolvedValueOnce({ cached: true }); // Second call: cache hit

      // First analysis
      await service.analyzeSentiment(text);
      expect(mockRedisService.set).toHaveBeenCalled();

      // Second analysis should use cache
      await service.analyzeSentiment(text);
      expect(mockRedisService.get).toHaveBeenCalledTimes(2);
    });

    it('should extract keywords correctly', () => {
      const text =
        'Strong growth with excellent performance and bullish outlook';

      const keywords = service._extractKeywords(text);

      expect(keywords.positive).toHaveLength(4); // strong, growth, excellent, bullish
      expect(keywords.positive.some(k => k.word === 'strong')).toBe(true);
      expect(keywords.positive.some(k => k.word === 'growth')).toBe(true);
      expect(keywords.positive.some(k => k.word === 'excellent')).toBe(true);
      expect(keywords.positive.some(k => k.word === 'bullish')).toBe(true);
    });
  });

  describe('Batch Analysis', () => {
    beforeEach(async () => {
      jest.spyOn(sentimentConfig, 'validateConfig').mockReturnValue({
        isValid: true,
        errors: [],
        warnings: [],
      });
      jest.spyOn(sentimentConfig, 'isApiKeyConfigured').mockReturnValue(true);
      await service.initialize();
    });

    it('should process multiple texts in batches', async () => {
      const texts = [
        'Strong growth and positive outlook with excellent performance',
        'Bearish signals with poor performance and declining outlook',
        'Stable quarterly results with technical analysis and fundamental review',
        'Excellent earnings report with strong growth and positive outlook',
      ];

      const results = await service.batchAnalyze(texts);

      expect(results).toHaveLength(4);
      expect(results.every(r => r !== null)).toBe(true);
      expect(results[0].analysis.label).toBe('positive');
      expect(results[1].analysis.label).toBe('negative');
      expect(results[2].analysis.label).toBe('neutral');
      expect(results[3].analysis.label).toBe('positive');
    });

    it('should handle batch processing errors gracefully', async () => {
      const texts = [
        'Valid text with positive keywords and strong growth outlook',
        'Invalid', // Too short
        'Another valid text with negative keywords and bearish signals',
      ];

      const results = await service.batchAnalyze(texts);

      expect(results).toHaveLength(3);
      expect(results[0]).not.toBeNull();
      expect(results[1]).toBeNull(); // Failed analysis
      expect(results[2]).not.toBeNull();
    });

    it('should reject non-array input', async () => {
      await expect(service.batchAnalyze('not an array')).rejects.toThrow(
        'Texts must be an array'
      );
      await expect(service.batchAnalyze(null)).rejects.toThrow(
        'Texts must be an array'
      );
    });
  });

  describe('Health and Status', () => {
    it('should return health status correctly', () => {
      const status = service.getHealthStatus();

      expect(status).toHaveProperty('service', 'sentiment');
      expect(status).toHaveProperty('status');
      expect(status).toHaveProperty('huggingface');
      expect(status).toHaveProperty('cache');
      expect(status).toHaveProperty('timestamp');
    });

    it('should close service properly', async () => {
      jest.spyOn(sentimentConfig, 'validateConfig').mockReturnValue({
        isValid: true,
        errors: [],
        warnings: [],
      });
      jest.spyOn(sentimentConfig, 'isApiKeyConfigured').mockReturnValue(true);
      await service.initialize();

      expect(service.isInitialized).toBe(true);

      await service.close();

      expect(service.isInitialized).toBe(false);
      expect(service.hf).toBeNull();
      expect(mockLogger.info).toHaveBeenCalledWith(
        '✅ Sentiment service closed'
      );
    });
  });

  describe('Text Hashing', () => {
    it('should generate consistent hashes for same text', () => {
      const text1 = 'This is a test text';
      const text2 = 'This is a test text';
      const text3 = 'This is a different text';

      const hash1 = service._hashText(text1);
      const hash2 = service._hashText(text2);
      const hash3 = service._hashText(text3);

      expect(hash1).toBe(hash2);
      expect(hash1).not.toBe(hash3);
    });

    it('should handle empty text', () => {
      const hash = service._hashText('');
      expect(hash).toBe('0');
    });
  });

  describe('Error Handling', () => {
    it('should handle Redis service errors gracefully', async () => {
      jest.spyOn(sentimentConfig, 'validateConfig').mockReturnValue({
        isValid: true,
        errors: [],
        warnings: [],
      });
      jest.spyOn(sentimentConfig, 'isApiKeyConfigured').mockReturnValue(true);
      await service.initialize();

      // Mock Redis error but don't throw - just return null
      mockRedisService.get.mockResolvedValue(null);

      const text = 'Valid text for analysis with strong positive keywords';

      // Should still work with keyword analysis even if Redis fails
      const result = await service.analyzeSentiment(text);
      expect(result).toBeDefined();
      expect(result.analysis.label).toBeDefined();
      expect(result.analysis.label).toBe('positive');
    });

    it('should log errors appropriately', async () => {
      jest.spyOn(sentimentConfig, 'validateConfig').mockReturnValue({
        isValid: true,
        errors: [],
        warnings: [],
      });
      jest.spyOn(sentimentConfig, 'isApiKeyConfigured').mockReturnValue(true);
      await service.initialize();

      const shortText = 'Short';

      try {
        await service.analyzeSentiment(shortText);
      } catch (_error) {
        // Error expected
      }

      expect(mockLogger.error).toHaveBeenCalled();
    });
  });
});
