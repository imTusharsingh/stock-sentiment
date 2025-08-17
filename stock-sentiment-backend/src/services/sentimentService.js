const { HfInference } = require('@huggingface/inference');
const sentimentConfig = require('../config/sentiment');
const redisService = require('./redisService');
const logger = require('../utils/logger');

/**
 * Sentiment Analysis Service
 * Handles AI-powered sentiment analysis using Hugging Face models
 * and custom financial keyword detection
 */
class SentimentService {
  constructor() {
    this.hf = null;
    this.isInitialized = false;
    this.config = sentimentConfig;
  }

  /**
   * Initialize the sentiment service
   * @returns {Promise<boolean>}
   */
  initialize() {
    try {
      // Validate configuration
      const validation = this.config.validateConfig();
      if (!validation.isValid) {
        throw new Error(
          `Configuration validation failed: ${validation.errors.join(', ')}`
        );
      }

      // Initialize Hugging Face client
      if (this.config.isApiKeyConfigured()) {
        this.hf = new HfInference(this.config.getHuggingFaceConfig().apiKey);
        logger.info('Hugging Face client initialized successfully');
      } else {
        throw new Error(
          'Hugging Face API key is required for sentiment analysis'
        );
      }

      this.isInitialized = true;
      logger.info('✅ Sentiment service initialized successfully');
      return true;
    } catch (error) {
      logger.error('❌ Failed to initialize sentiment service:', {
        error: error.message,
        context: 'initialize',
      });
      throw error;
    }
  }

  /**
   * Analyze sentiment of text using Hugging Face model
   * @param {string} text - Text to analyze
   * @param {Object} options - Analysis options
   * @returns {Promise<Object>}
   */
  async analyzeSentiment(text, options = {}) {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      // Check cache first (if available)
      let cached = null;
      try {
        if (this.config.getAnalysisSettings().cacheResults) {
          const cacheKey = `sentiment:${this._hashText(text)}`;
          cached = await redisService.get(cacheKey);
          if (cached) {
            logger.info('Sentiment result retrieved from cache');
            return cached;
          }
        }
      } catch (error) {
        // Silently handle Redis failures - this is expected in test environments
        if (process.env.NODE_ENV !== 'test') {
          logger.warn(
            'Cache access failed, proceeding without caching:',
            error.message
          );
        }
      }

      // Clean and prepare text
      const cleanedText = this._cleanText(text);
      if (!this._isValidText(cleanedText)) {
        throw new Error('Text is too short or invalid for analysis');
      }

      let result;

      if (this.hf && this.config.isApiKeyConfigured()) {
        // Use Hugging Face model
        result = await this._analyzeWithHuggingFace(cleanedText, options);
      } else {
        // Fallback to keyword-based analysis
        result = await this._analyzeWithKeywords(cleanedText, options);
      }

      // Cache the result (if available)
      if (this.config.getAnalysisSettings().cacheResults) {
        try {
          const cacheKey = `sentiment:${this._hashText(text)}`;
          await redisService.set(cacheKey, result, 'sentiment');
        } catch (error) {
          // Silently handle Redis failures - this is expected in test environments
          if (process.env.NODE_ENV !== 'test') {
            logger.warn('Failed to cache result:', error.message);
          }
        }
      }

      return result;
    } catch (error) {
      logger.error('Sentiment analysis failed:', {
        error: error.message,
        textLength: text?.length || 0,
        context: 'analyzeSentiment',
      });

      // Fallback to keyword analysis if Hugging Face fails
      if (this.hf && error.message.includes('Hugging Face')) {
        logger.info('Falling back to keyword-based analysis');
        return await this._analyzeWithKeywords(text, options);
      }

      throw error;
    }
  }

  /**
   * Analyze sentiment using Hugging Face model
   * @param {string} text - Cleaned text
   * @param {Object} options - Analysis options
   * @returns {Promise<Object>}
   */
  async _analyzeWithHuggingFace(text, options) {
    try {
      const config = this.config.getHuggingFaceConfig();
      const model = options.model || config.model;

      logger.info('Analyzing sentiment with Hugging Face model', {
        model,
        textLength: text.length,
      });

      const response = await this.hf.textClassification({
        model,
        inputs: text,
      });

      // Process the response
      const result = this._processHuggingFaceResponse(response, text);

      logger.info('Hugging Face analysis completed', {
        label: result.analysis.label,
        confidence: result.analysis.confidence,
        score: result.analysis.score,
      });

      return result;
    } catch (error) {
      logger.error('Hugging Face analysis failed:', {
        error: error.message,
        context: '_analyzeWithHuggingFace',
      });
      throw new Error(`Hugging Face analysis failed: ${error.message}`);
    }
  }

  /**
   * Analyze sentiment using financial keywords
   * @param {string} text - Text to analyze
   * @param {Object} _options - Analysis options (unused in keyword analysis)
   * @returns {Object}
   */
  _analyzeWithKeywords(text, _options) {
    try {
      logger.info('Analyzing sentiment with financial keywords', {
        textLength: text.length,
      });

      const keywords = this.config.getAllKeywords();
      const textLower = text.toLowerCase();

      // Count keyword matches
      const positiveMatches = keywords.positive.filter(word =>
        textLower.includes(word.toLowerCase())
      );
      const negativeMatches = keywords.negative.filter(word =>
        textLower.includes(word.toLowerCase())
      );
      const neutralMatches = keywords.neutral.filter(word =>
        textLower.includes(word.toLowerCase())
      );

      // Calculate scores - use absolute counts instead of ratios for more reliable detection
      const positiveCount = positiveMatches.length;
      const negativeCount = negativeMatches.length;
      const neutralCount = neutralMatches.length;

      // Determine sentiment based on counts
      let label = 'neutral';
      let score = 0;
      let confidence = 0.5; // Base confidence for keyword analysis

      if (positiveCount > negativeCount && positiveCount > neutralCount) {
        label = 'positive';
        score = Math.min(positiveCount * 0.1, 0.8); // Scale by count, cap at 0.8
        confidence = 0.5 + positiveCount * 0.05;
      } else if (
        negativeCount > positiveCount &&
        negativeCount > neutralCount
      ) {
        label = 'negative';
        score = -Math.min(negativeCount * 0.1, 0.8); // Scale by count, cap at -0.8
        confidence = 0.5 + negativeCount * 0.05;
      } else {
        label = 'neutral';
        score = 0;
        confidence = 0.6;
      }

      const result = {
        analysis: {
          model: 'keyword-based',
          label,
          confidence: Math.min(confidence, 0.9),
          score: Math.max(-1, Math.min(1, score)),
          weightedScore: score,
          finalLabel: this.config.getSentimentLabel(score),
        },
        keywords: {
          positive: positiveMatches.map(word => ({
            word,
            weight: 1,
            context: 'positive',
          })),
          negative: negativeMatches.map(word => ({
            word,
            weight: 1,
            context: 'negative',
          })),
          neutral: neutralMatches.map(word => ({
            word,
            weight: 1,
            context: 'neutral',
          })),
        },
        metadata: {
          method: 'keyword',
          textLength: text.length,
          processingTime: Date.now(),
          confidence: 'medium',
        },
      };

      logger.info('Keyword analysis completed', {
        label: result.analysis.label,
        confidence: result.analysis.confidence,
        score: result.analysis.score,
        positiveMatches: positiveMatches.length,
        negativeMatches: negativeMatches.length,
      });

      return result;
    } catch (error) {
      logger.error('Keyword analysis failed:', {
        error: error.message,
        context: '_analyzeWithKeywords',
      });
      throw error;
    }
  }

  /**
   * Process Hugging Face API response
   * @param {Object} response - API response
   * @param {string} text - Original text
   * @returns {Object}
   */
  _processHuggingFaceResponse(response, text) {
    try {
      if (!response || !Array.isArray(response)) {
        throw new Error('Invalid response format from Hugging Face');
      }

      // Find the highest confidence prediction
      const prediction = response.reduce((best, current) =>
        current.score > best.score ? current : best
      );

      // Map FinBERT labels to our system
      let label = 'neutral';
      let score = 0;

      if (prediction.label.includes('positive')) {
        label = 'positive';
        score = prediction.score;
      } else if (prediction.label.includes('negative')) {
        label = 'negative';
        score = -prediction.score;
      } else {
        label = 'neutral';
        score = 0;
      }

      // Calculate weighted score
      const weightedScore = this.config.calculateWeightedScore({
        modelConfidence: prediction.score,
        contentLength: Math.min(text.length / 1000, 1), // Normalize to 0-1
        recency: 1, // Current analysis
      });

      const result = {
        analysis: {
          model: this.config.getHuggingFaceConfig().model,
          label,
          confidence: prediction.score,
          score: Math.max(-1, Math.min(1, score)),
          weightedScore: Math.max(-1, Math.min(1, weightedScore)),
          finalLabel: this.config.getSentimentLabel(weightedScore),
        },
        keywords: this._extractKeywords(text),
        metadata: {
          method: 'huggingface',
          model: this.config.getHuggingFaceConfig().model,
          textLength: text.length,
          processingTime: Date.now(),
          confidence:
            prediction.score > 0.8
              ? 'high'
              : prediction.score > 0.6
                ? 'medium'
                : 'low',
          rawResponse: response,
        },
      };

      return result;
    } catch (error) {
      logger.error('Failed to process Hugging Face response:', {
        error: error.message,
        response,
        context: '_processHuggingFaceResponse',
      });
      throw error;
    }
  }

  /**
   * Extract relevant keywords from text
   * @param {string} text - Text to analyze
   * @returns {Object}
   */
  _extractKeywords(text) {
    const keywords = this.config.getAllKeywords();
    const textLower = text.toLowerCase();

    const positive = keywords.positive
      .filter(word => textLower.includes(word.toLowerCase()))
      .map(word => ({ word, weight: 1, context: 'positive' }));

    const negative = keywords.negative
      .filter(word => textLower.includes(word.toLowerCase()))
      .map(word => ({ word, weight: 1, context: 'negative' }));

    const neutral = keywords.neutral
      .filter(word => textLower.includes(word.toLowerCase()))
      .map(word => ({ word, weight: 1, context: 'neutral' }));

    return { positive, negative, neutral };
  }

  /**
   * Clean and prepare text for analysis
   * @param {string} text - Raw text
   * @returns {string}
   */
  _cleanText(text) {
    if (!text || typeof text !== 'string') {
      throw new Error('Invalid text input');
    }

    let cleaned = text;

    const processing = this.config.getProcessingConfig();

    if (processing.removeHtml) {
      cleaned = cleaned.replace(/<[^>]*>/g, ' ');
    }

    if (processing.removeUrls) {
      cleaned = cleaned.replace(/https?:\/\/[^\s]+/g, ' ');
    }

    if (processing.normalizeWhitespace) {
      cleaned = cleaned.replace(/\s+/g, ' ').trim();
    }

    if (processing.maxWords) {
      const words = cleaned.split(' ');
      if (words.length > processing.maxWords) {
        cleaned = words.slice(0, processing.maxWords).join(' ');
      }
    }

    return cleaned;
  }

  /**
   * Validate text for analysis
   * @param {string} text - Cleaned text
   * @returns {boolean}
   */
  _isValidText(text) {
    const processing = this.config.getProcessingConfig();
    return (
      text.length >= processing.minContentLength &&
      text.length <= processing.maxContentLength
    );
  }

  /**
   * Create hash for text (simple implementation)
   * @param {string} text - Text to hash
   * @returns {string}
   */
  _hashText(text) {
    let hash = 0;
    if (text.length === 0) return hash.toString();

    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    return Math.abs(hash).toString();
  }

  /**
   * Batch analyze multiple texts
   * @param {Array<string>} texts - Array of texts
   * @param {Object} options - Analysis options
   * @returns {Promise<Array>}
   */
  async batchAnalyze(texts, options = {}) {
    try {
      if (!Array.isArray(texts)) {
        throw new Error('Texts must be an array');
      }

      const batchSize = this.config.getAnalysisSettings().batchSize;
      const results = [];

      for (let i = 0; i < texts.length; i += batchSize) {
        const batch = texts.slice(i, i + batchSize);
        const batchPromises = batch.map(text =>
          this.analyzeSentiment(text, options)
        );

        const batchResults = await Promise.allSettled(batchPromises);

        batchResults.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            results.push(result.value);
          } else {
            logger.error('Batch analysis failed for text', {
              index: i + index,
              error: result.reason.message,
            });
            results.push(null);
          }
        });

        // Add delay between batches to respect rate limits
        if (i + batchSize < texts.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      return results;
    } catch (error) {
      logger.error('Batch analysis failed:', {
        error: error.message,
        textCount: texts?.length || 0,
        context: 'batchAnalyze',
      });
      throw error;
    }
  }

  /**
   * Get service health status
   * @returns {Object}
   */
  getHealthStatus() {
    return {
      service: 'sentiment',
      status: this.isInitialized ? 'healthy' : 'uninitialized',
      huggingface: this.config.isApiKeyConfigured()
        ? 'configured'
        : 'not_configured',
      cache: this.config.getAnalysisSettings().cacheResults
        ? 'enabled'
        : 'disabled',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Close the service
   */
  close() {
    try {
      this.isInitialized = false;
      this.hf = null;
      logger.info('✅ Sentiment service closed');
    } catch (error) {
      logger.error('❌ Error closing sentiment service:', {
        error: error.message,
        context: 'close',
      });
    }
  }
}

// Create singleton instance
const sentimentService = new SentimentService();

module.exports = sentimentService;
