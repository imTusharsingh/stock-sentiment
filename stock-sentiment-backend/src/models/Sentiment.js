const mongoose = require('mongoose');

/**
 * Sentiment Schema
 * Stores detailed sentiment analysis results with 1-year TTL
 */
const sentimentSchema = new mongoose.Schema(
  {
    // Stock Association
    stock: {
      symbol: {
        type: String,
        required: true,
        uppercase: true,
        trim: true,
        index: true,
      },
      name: {
        type: String,
        trim: true,
      },
    },

    // News Article Reference
    news: {
      id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'News',
        required: true,
        index: true,
      },
      title: {
        type: String,
        trim: true,
      },
      url: {
        type: String,
        trim: true,
      },
    },

    // Sentiment Analysis Results
    analysis: {
      // FinBERT Model Results
      model: {
        type: String,
        default: 'ProsusAI/finbert',
        trim: true,
      },
      label: {
        type: String,
        required: true,
        enum: ['positive', 'negative', 'neutral'],
        index: true,
      },
      confidence: {
        type: Number,
        required: true,
        min: 0,
        max: 1,
        index: true,
      },
      score: {
        type: Number,
        required: true,
        min: -1,
        max: 1,
        index: true,
      },

      // Custom Scoring
      weightedScore: {
        type: Number,
        min: -1,
        max: 1,
      },
      finalLabel: {
        type: String,
        enum: [
          'very_negative',
          'negative',
          'slightly_negative',
          'neutral',
          'slightly_positive',
          'positive',
          'very_positive',
        ],
        index: true,
      },
    },

    // Keyword Analysis
    keywords: {
      positive: [
        {
          word: String,
          weight: Number,
          context: String,
        },
      ],
      negative: [
        {
          word: String,
          weight: Number,
          context: String,
        },
      ],
      neutral: [
        {
          word: String,
          weight: Number,
          context: String,
        },
      ],
      financial: [
        {
          word: String,
          category: String,
          impact: String,
        },
      ],
    },

    // Content Analysis
    content: {
      text: {
        type: String,
        required: true,
        trim: true,
        maxlength: 5000,
      },
      language: {
        type: String,
        default: 'en',
        enum: [
          'en',
          'hi',
          'ta',
          'te',
          'ml',
          'kn',
          'gu',
          'bn',
          'or',
          'pa',
          'as',
        ],
      },
      wordCount: {
        type: Number,
        min: 0,
      },
      processedLength: {
        type: Number,
        min: 0,
      },
    },

    // Source Information
    source: {
      name: {
        type: String,
        required: true,
        trim: true,
        index: true,
      },
      reliability: {
        type: Number,
        min: 0,
        max: 1,
        default: 0.5,
      },
      domain: {
        type: String,
        trim: true,
      },
    },

    // Processing Details
    processing: {
      method: {
        type: String,
        enum: ['api', 'local_model', 'hybrid', 'fallback'],
        default: 'api',
      },
      duration: {
        type: Number, // in milliseconds
        min: 0,
      },
      retries: {
        type: Number,
        min: 0,
        default: 0,
      },
      errors: [
        {
          type: String,
          trim: true,
        },
      ],
    },

    // Context and Metadata
    context: {
      market: {
        type: String,
        enum: ['bull', 'bear', 'sideways', 'volatile', 'unknown'],
        default: 'unknown',
      },
      sector: {
        type: String,
        trim: true,
      },
      event: {
        type: String,
        trim: true,
      },
      timeOfDay: {
        type: String,
        enum: ['pre_market', 'market_hours', 'post_market', 'weekend'],
      },
    },

    // Quality and Validation
    quality: {
      confidence: {
        type: Number,
        min: 0,
        max: 1,
        default: 0.5,
      },
      isReliable: {
        type: Boolean,
        default: true,
      },
      validationScore: {
        type: Number,
        min: 0,
        max: 1,
        default: 0.5,
      },
      flags: [
        {
          type: String,
          enum: [
            'low_confidence',
            'mixed_sentiment',
            'outlier',
            'duplicate',
            'spam',
          ],
        },
      ],
    },

    // Timestamps
    publishedAt: {
      type: Date,
      required: true,
      index: true,
    },
    analyzedAt: {
      type: Date,
      default: Date.now,
    },

    // Crawling Information
    crawlSession: {
      id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CrawlSession',
        index: true,
      },
      source: {
        type: String,
        required: true,
        enum: [
          'moneycontrol',
          'economictimes',
          'businessstandard',
          'nse',
          'bse',
          'reddit',
          'manual',
        ],
      },
    },

    // Metadata
    tags: [
      {
        type: String,
        trim: true,
        index: true,
      },
    ],
    categories: [
      {
        type: String,
        trim: true,
        index: true,
      },
    ],

    // Performance Metrics
    performance: {
      responseTime: {
        type: Number, // in milliseconds
        min: 0,
      },
      modelVersion: {
        type: String,
        trim: true,
      },
      apiLatency: {
        type: Number, // in milliseconds
        min: 0,
      },
    },
  },
  {
    timestamps: true,
    collection: 'sentiments',
  }
);

// TTL Index - Sentiments expire after 1 year
sentimentSchema.index({ analyzedAt: 1 }, { expireAfterSeconds: 31536000 }); // 1 year

// Indexes for efficient querying
sentimentSchema.index({ 'stock.symbol': 1, analyzedAt: -1 });
sentimentSchema.index({ 'analysis.finalLabel': 1, analyzedAt: -1 });
sentimentSchema.index({ 'analysis.confidence': -1, analyzedAt: -1 });
sentimentSchema.index({ source: 1, analyzedAt: -1 });
sentimentSchema.index({ 'crawlSession.source': 1, analyzedAt: -1 });
sentimentSchema.index({ 'context.sector': 1, analyzedAt: -1 });

// Compound indexes for common queries
sentimentSchema.index({
  'stock.symbol': 1,
  'analysis.finalLabel': 1,
  analyzedAt: -1,
});
sentimentSchema.index({
  'stock.symbol': 1,
  'analysis.confidence': -1,
  analyzedAt: -1,
});
sentimentSchema.index({
  'analysis.finalLabel': 1,
  'quality.confidence': -1,
  analyzedAt: -1,
});

// Text search index
sentimentSchema.index({
  'content.text': 'text',
  'keywords.positive.word': 'text',
  'keywords.negative.word': 'text',
  tags: 'text',
});

// Virtual for sentiment age
sentimentSchema.virtual('ageInHours').get(function () {
  return Math.floor(
    (Date.now() - this.analyzedAt.getTime()) / (1000 * 60 * 60)
  );
});

sentimentSchema.virtual('ageInDays').get(function () {
  return Math.floor(
    (Date.now() - this.analyzedAt.getTime()) / (1000 * 60 * 60 * 24)
  );
});

// Virtual for sentiment strength
sentimentSchema.virtual('sentimentStrength').get(function () {
  return Math.abs(this.analysis.score);
});

// Virtual for reliability indicator
sentimentSchema.virtual('isReliable').get(function () {
  return this.analysis.confidence >= 0.7 && this.quality.isReliable;
});

// Instance methods
sentimentSchema.methods.updateQuality = function (
  confidence,
  isReliable,
  flags = []
) {
  this.quality.confidence = confidence;
  this.quality.isReliable = isReliable;
  this.quality.flags = flags;
  this.quality.validationScore = this.calculateValidationScore();
  return this.save();
};

sentimentSchema.methods.addKeyword = function (
  sentiment,
  word,
  weight,
  context = ''
) {
  if (this.keywords[sentiment]) {
    this.keywords[sentiment].push({ word, weight, context });
  }
  return this.save();
};

sentimentSchema.methods.markAsProcessed = function (duration, method = 'api') {
  this.processing.method = method;
  this.processing.duration = duration;
  this.analyzedAt = new Date();
  return this.save();
};

// Static methods
sentimentSchema.statics.findByStock = function (
  symbol,
  limit = 100,
  days = 30
) {
  const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  return this.find({
    'stock.symbol': symbol.toUpperCase(),
    analyzedAt: { $gte: cutoffDate },
    'quality.isReliable': true,
  })
    .sort({ analyzedAt: -1, 'analysis.confidence': -1 })
    .limit(limit);
};

sentimentSchema.statics.findBySentiment = function (
  sentimentLabel,
  limit = 100,
  days = 30
) {
  const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  return this.find({
    'analysis.finalLabel': sentimentLabel,
    analyzedAt: { $gte: cutoffDate },
    'quality.isReliable': true,
  })
    .sort({ analyzedAt: -1, 'analysis.confidence': -1 })
    .limit(limit);
};

sentimentSchema.statics.findHighConfidence = function (limit = 50, days = 7) {
  const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  return this.find({
    analyzedAt: { $gte: cutoffDate },
    'analysis.confidence': { $gte: 0.8 },
    'quality.isReliable': true,
  })
    .sort({ 'analysis.confidence': -1, analyzedAt: -1 })
    .limit(limit);
};

sentimentSchema.statics.getSentimentTrends = function (symbol, days = 30) {
  const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  return this.aggregate([
    {
      $match: {
        'stock.symbol': symbol.toUpperCase(),
        analyzedAt: { $gte: cutoffDate },
        'quality.isReliable': true,
      },
    },
    {
      $group: {
        _id: {
          date: { $dateToString: { format: '%Y-%m-%d', date: '$analyzedAt' } },
          sentiment: '$analysis.finalLabel',
        },
        count: { $sum: 1 },
        avgConfidence: { $avg: '$analysis.confidence' },
        avgScore: { $avg: '$analysis.score' },
      },
    },
    {
      $sort: { '_id.date': 1 },
    },
  ]);
};

// Pre-save middleware
sentimentSchema.pre('save', function (next) {
  // Calculate weighted score if not set
  if (!this.analysis.weightedScore && this.analysis.score) {
    this.analysis.weightedScore = this.calculateWeightedScore();
  }

  // Determine final label based on weighted score
  if (this.analysis.weightedScore !== undefined) {
    this.analysis.finalLabel = this.getSentimentLabel(
      this.analysis.weightedScore
    );
  }

  // Update quality validation score
  if (this.isModified('quality') || this.isModified('analysis')) {
    this.quality.validationScore = this.calculateValidationScore();
  }

  next();
});

// Method to calculate weighted score
sentimentSchema.methods.calculateWeightedScore = function () {
  let score = this.analysis.score * 0.7; // Model score weight

  // Add keyword analysis weight
  if (this.keywords.positive.length > this.keywords.negative.length) {
    score += 0.2;
  } else if (this.keywords.negative.length > this.keywords.positive.length) {
    score -= 0.2;
  }

  // Add source reliability weight
  if (this.source.reliability) {
    score += (this.source.reliability - 0.5) * 0.1;
  }

  return Math.max(-1, Math.min(1, score));
};

// Method to get sentiment label from score
sentimentSchema.methods.getSentimentLabel = function (score) {
  if (score >= 0.8) return 'very_positive';
  if (score >= 0.6) return 'positive';
  if (score >= 0.4) return 'slightly_positive';
  if (score >= 0.2) return 'neutral';
  if (score >= -0.2) return 'neutral';
  if (score >= -0.4) return 'slightly_negative';
  if (score >= -0.6) return 'negative';
  return 'very_negative';
};

// Method to calculate validation score
sentimentSchema.methods.calculateValidationScore = function () {
  let score = 0.5; // Base score

  // Confidence factor
  if (this.analysis.confidence >= 0.8) score += 0.3;
  else if (this.analysis.confidence >= 0.6) score += 0.2;
  else if (this.analysis.confidence >= 0.4) score += 0.1;

  // Quality factors
  if (this.quality.isReliable) score += 0.1;
  if (this.content.wordCount >= 50) score += 0.1;

  // Penalties
  if (this.quality.flags.includes('low_confidence')) score -= 0.2;
  if (this.quality.flags.includes('mixed_sentiment')) score -= 0.1;
  if (this.quality.flags.includes('outlier')) score -= 0.1;

  return Math.max(0, Math.min(1, score));
};

// Export the model
module.exports = mongoose.model('Sentiment', sentimentSchema);
