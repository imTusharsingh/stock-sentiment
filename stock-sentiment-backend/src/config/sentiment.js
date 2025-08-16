/**
 * Sentiment Analysis Configuration
 * Handles Hugging Face API and sentiment processing configuration
 */
class SentimentConfig {
  constructor() {
    // Hugging Face Configuration
    this.huggingface = {
      apiKey: process.env.HUGGINGFACE_API_KEY,
      model: process.env.HUGGINGFACE_MODEL || 'ProsusAI/finbert',
      baseUrl: 'https://api-inference.huggingface.co',
      timeout: 30000,
      maxRetries: 3,
      retryDelay: 1000,
    };

    // Sentiment Analysis Settings
    this.analysis = {
      confidenceThreshold:
        parseFloat(process.env.SENTIMENT_CONFIDENCE_THRESHOLD) || 0.6,
      maxTextLength: 512, // FinBERT model limit
      batchSize: 10,
      cacheResults: true,
      cacheTTL: parseInt(process.env.CACHE_TTL_SENTIMENT) || 900, // 15 minutes
    };

    // Financial Keywords Configuration
    this.keywords = {
      positive: [
        'bullish',
        'surge',
        'rally',
        'gain',
        'profit',
        'growth',
        'increase',
        'positive',
        'strong',
        'upbeat',
        'optimistic',
        'favorable',
        'excellent',
        'outperform',
        'beat',
        'exceed',
        'rise',
        'climb',
        'jump',
        'soar',
        'breakthrough',
        'milestone',
        'record',
        'high',
        'peak',
        'success',
        'expansion',
        'acquisition',
        'partnership',
        'innovation',
        'efficiency',
      ],
      negative: [
        'bearish',
        'decline',
        'fall',
        'drop',
        'loss',
        'decrease',
        'negative',
        'weak',
        'downbeat',
        'pessimistic',
        'unfavorable',
        'poor',
        'underperform',
        'miss',
        'below',
        'sink',
        'plunge',
        'crash',
        'downturn',
        'recession',
        'bankruptcy',
        'default',
        'delinquency',
        'restructuring',
        'layoff',
        'closure',
        'shutdown',
        'recall',
        'violation',
        'penalty',
        'fine',
      ],
      neutral: [
        'stable',
        'steady',
        'maintain',
        'hold',
        'unchanged',
        'flat',
        'sideways',
        'consolidate',
        'range',
        'support',
        'resistance',
        'technical',
        'fundamental',
        'analysis',
        'report',
        'quarterly',
        'annual',
        'earnings',
        'revenue',
        'guidance',
        'outlook',
        'forecast',
        'projection',
        'estimate',
        'target',
      ],
    };

    // Sentiment Scoring
    this.scoring = {
      // FinBERT model labels and their scores
      labels: {
        positive: 1,
        negative: -1,
        neutral: 0,
      },
      // Custom scoring weights
      weights: {
        keywordMatch: 0.3,
        modelConfidence: 0.7,
        sourceReliability: 0.1,
        contentLength: 0.05,
        recency: 0.05,
      },
      // Thresholds for different sentiment levels
      thresholds: {
        veryPositive: 0.8,
        positive: 0.6,
        slightlyPositive: 0.4,
        neutral: 0.2,
        slightlyNegative: -0.2,
        negative: -0.4,
        veryNegative: -0.6,
      },
    };

    // Content Processing
    this.processing = {
      // Text cleaning
      removeHtml: true,
      removeUrls: true,
      removeSpecialChars: false,
      normalizeWhitespace: true,
      maxWords: 1000,

      // Language detection
      supportedLanguages: ['en', 'hi'], // English and Hindi
      defaultLanguage: 'en',

      // Content filtering
      minContentLength: 50,
      maxContentLength: 5000,
      filterSpam: true,
      filterDuplicates: true,
    };

    // Error Handling
    this.errorHandling = {
      maxRetries: 3,
      retryDelay: 1000,
      fallbackToKeywords: true,
      logErrors: true,
      continueOnError: true,
    };

    // Performance Optimization
    this.performance = {
      enableCaching: true,
      cacheSize: 1000,
      enableBatchProcessing: true,
      maxConcurrentRequests: 5,
      requestTimeout: 30000,
      enableCompression: true,
    };
  }

  /**
   * Get Hugging Face configuration
   * @returns {Object}
   */
  getHuggingFaceConfig() {
    return { ...this.huggingface };
  }

  /**
   * Get analysis settings
   * @returns {Object}
   */
  getAnalysisSettings() {
    return { ...this.analysis };
  }

  /**
   * Get financial keywords
   * @param {string} sentiment - 'positive', 'negative', or 'neutral'
   * @returns {Array}
   */
  getKeywords(sentiment) {
    return this.keywords[sentiment] || [];
  }

  /**
   * Get all keywords
   * @returns {Object}
   */
  getAllKeywords() {
    return { ...this.keywords };
  }

  /**
   * Get scoring configuration
   * @returns {Object}
   */
  getScoringConfig() {
    return { ...this.scoring };
  }

  /**
   * Get processing configuration
   * @returns {Object}
   */
  getProcessingConfig() {
    return { ...this.processing };
  }

  /**
   * Get error handling configuration
   * @returns {Object}
   */
  getErrorHandlingConfig() {
    return { ...this.errorHandling };
  }

  /**
   * Get performance configuration
   * @returns {Object}
   */
  getPerformanceConfig() {
    return { ...this.performance };
  }

  /**
   * Check if API key is configured
   * @returns {boolean}
   */
  isApiKeyConfigured() {
    return !!this.huggingface.apiKey;
  }

  /**
   * Get sentiment label from score
   * @param {number} score - Sentiment score between -1 and 1
   * @returns {string}
   */
  getSentimentLabel(score) {
    if (score >= this.scoring.thresholds.veryPositive) {
      return 'very_positive';
    }
    if (score >= this.scoring.thresholds.positive) {
      return 'positive';
    }
    if (score >= this.scoring.thresholds.slightlyPositive) {
      return 'slightly_positive';
    }
    if (score >= this.scoring.thresholds.neutral) {
      return 'neutral';
    }
    if (score >= this.scoring.thresholds.slightlyNegative) {
      return 'slightly_negative';
    }
    if (score >= this.scoring.thresholds.negative) {
      return 'negative';
    }
    return 'very_negative';
  }

  /**
   * Calculate weighted sentiment score
   * @param {Object} factors - Sentiment factors
   * @returns {number}
   */
  calculateWeightedScore(factors) {
    let score = 0;
    const weights = this.scoring.weights;

    if (factors.modelConfidence !== undefined) {
      score += factors.modelConfidence * weights.modelConfidence;
    }
    if (factors.keywordMatch !== undefined) {
      score += factors.keywordMatch * weights.keywordMatch;
    }
    if (factors.sourceReliability !== undefined) {
      score += factors.sourceReliability * weights.sourceReliability;
    }
    if (factors.contentLength !== undefined) {
      score += factors.contentLength * weights.contentLength;
    }
    if (factors.recency !== undefined) {
      score += factors.recency * weights.recency;
    }

    return Math.max(-1, Math.min(1, score)); // Clamp between -1 and 1
  }

  /**
   * Validate configuration
   * @returns {Object}
   */
  validateConfig() {
    const errors = [];
    const warnings = [];

    // Check required configuration
    if (!this.huggingface.apiKey) {
      errors.push('HUGGINGFACE_API_KEY is required for sentiment analysis');
    }

    // Check configuration values
    if (
      this.analysis.confidenceThreshold < 0.1 ||
      this.analysis.confidenceThreshold > 1.0
    ) {
      errors.push('SENTIMENT_CONFIDENCE_THRESHOLD must be between 0.1 and 1.0');
    }

    if (this.huggingface.timeout < 5000) {
      warnings.push('Hugging Face timeout is very low, may cause issues');
    }

    if (this.analysis.batchSize > 50) {
      warnings.push('Batch size is very high, may overwhelm the API');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Update configuration
   * @param {Object} updates
   */
  updateConfig(updates) {
    if (updates.huggingface) {
      Object.assign(this.huggingface, updates.huggingface);
    }
    if (updates.analysis) {
      Object.assign(this.analysis, updates.analysis);
    }
    if (updates.scoring) {
      Object.assign(this.scoring, updates.scoring);
    }
    if (updates.processing) {
      Object.assign(this.processing, updates.processing);
    }
    if (updates.errorHandling) {
      Object.assign(this.errorHandling, updates.errorHandling);
    }
    if (updates.performance) {
      Object.assign(this.performance, updates.performance);
    }
  }

  /**
   * Get full configuration
   * @returns {Object}
   */
  getFullConfig() {
    return {
      huggingface: { ...this.huggingface },
      analysis: { ...this.analysis },
      keywords: { ...this.keywords },
      scoring: { ...this.scoring },
      processing: { ...this.processing },
      errorHandling: { ...this.errorHandling },
      performance: { ...this.performance },
    };
  }
}

// Create singleton instance
const sentimentConfig = new SentimentConfig();

module.exports = sentimentConfig;
