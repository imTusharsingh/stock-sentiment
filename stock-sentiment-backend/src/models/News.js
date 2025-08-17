const mongoose = require('mongoose');

/**
 * News Schema
 * Stores news articles with 90-day TTL for automatic cleanup
 */
const newsSchema = new mongoose.Schema(
  {
    // Article Identification
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
      index: true,
    },
    summary: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 10000,
    },

    // Source Information
    source: {
      name: {
        type: String,
        required: true,
        trim: true,
        index: true,
      },
      url: {
        type: String,
        required: true,
        trim: true,
      },
      domain: {
        type: String,
        trim: true,
        index: true,
      },
      reliability: {
        type: Number,
        min: 0,
        max: 1,
        default: 0.5,
      },
    },

    // Publication Details
    publishedAt: {
      type: Date,
      required: true,
    },
    crawledAt: {
      type: Date,
      default: Date.now,
    },

    // Stock Association
    stocks: [
      {
        symbol: {
          type: String,
          required: true,
          uppercase: true,
          trim: true,
          index: true,
        },
        relevance: {
          type: Number,
          min: 0,
          max: 1,
          default: 1,
        },
        mentionedCount: {
          type: Number,
          min: 1,
          default: 1,
        },
      },
    ],

    // Content Analysis
    language: {
      type: String,
      default: 'en',
      enum: ['en', 'hi', 'ta', 'te', 'ml', 'kn', 'gu', 'bn', 'or', 'pa', 'as'],
      index: true,
    },
    wordCount: {
      type: Number,
      min: 0,
    },
    readingTime: {
      type: Number, // in minutes
      min: 0,
    },

    // Sentiment Analysis
    sentiment: {
      score: {
        type: Number,
        min: -1,
        max: 1,
        required: true,
      },
      label: {
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
        required: true,
      },
      confidence: {
        type: Number,
        min: 0,
        max: 1,
        required: true,
      },
      keywords: [
        {
          word: String,
          sentiment: String,
          weight: Number,
        },
      ],
    },

    // Content Categories
    categories: [
      {
        type: String,
        trim: true,
        index: true,
      },
    ],
    tags: [
      {
        type: String,
        trim: true,
        index: true,
      },
    ],

    // Engagement Metrics
    engagement: {
      views: {
        type: Number,
        min: 0,
        default: 0,
      },
      shares: {
        type: Number,
        min: 0,
        default: 0,
      },
      comments: {
        type: Number,
        min: 0,
        default: 0,
      },
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
      method: {
        type: String,
        enum: ['api', 'scraping', 'rss', 'manual'],
        default: 'scraping',
      },
    },

    // Content Quality
    quality: {
      score: {
        type: Number,
        min: 0,
        max: 1,
        default: 0.5,
      },
      isDuplicate: {
        type: Boolean,
        default: false,
      },
      isSpam: {
        type: Boolean,
        default: false,
      },
      hasValidContent: {
        type: Boolean,
        default: true,
      },
    },

    // Processing Status
    processingStatus: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending',
      index: true,
    },
    processingErrors: [
      {
        type: String,
        trim: true,
      },
    ],

    // Metadata
    author: {
      type: String,
      trim: true,
    },
    imageUrl: {
      type: String,
      trim: true,
    },
    videoUrl: {
      type: String,
      trim: true,
    },

    // Timestamps
    lastProcessedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    collection: 'news',
  }
);

// TTL Index - News expires after 90 days
newsSchema.index({ publishedAt: 1 }, { expireAfterSeconds: 7776000 }); // 90 days

// Indexes for efficient querying
newsSchema.index({ 'stocks.symbol': 1, publishedAt: -1 });
newsSchema.index({ source: 1, publishedAt: -1 });
newsSchema.index({ 'sentiment.label': 1, publishedAt: -1 });
newsSchema.index({ categories: 1, publishedAt: -1 });
newsSchema.index({ language: 1, publishedAt: -1 });
newsSchema.index({ crawlSession: 1, publishedAt: -1 });

// Text search index
newsSchema.index({
  title: 'text',
  summary: 'text',
  content: 'text',
  tags: 'text',
});

// Compound indexes for common queries
newsSchema.index({ 'stocks.symbol': 1, 'sentiment.label': 1, publishedAt: -1 });
newsSchema.index({ source: 1, 'sentiment.label': 1, publishedAt: -1 });
newsSchema.index({ publishedAt: -1, 'sentiment.confidence': -1 });

// Virtual for article age
newsSchema.virtual('ageInHours').get(function () {
  return Math.floor(
    (Date.now() - this.publishedAt.getTime()) / (1000 * 60 * 60)
  );
});

newsSchema.virtual('ageInDays').get(function () {
  return Math.floor(
    (Date.now() - this.publishedAt.getTime()) / (1000 * 60 * 60 * 24)
  );
});

// Virtual for primary stock
newsSchema.virtual('primaryStock').get(function () {
  if (!this.stocks || this.stocks.length === 0) return null;
  return this.stocks.reduce((primary, stock) =>
    stock.relevance > primary.relevance ? stock : primary
  );
});

// Instance methods
newsSchema.methods.addStock = function (symbol, relevance = 1) {
  const existingStock = this.stocks.find(
    stock => stock.symbol === symbol.toUpperCase()
  );

  if (existingStock) {
    existingStock.relevance = Math.max(existingStock.relevance, relevance);
    existingStock.mentionedCount += 1;
  } else {
    this.stocks.push({
      symbol: symbol.toUpperCase(),
      relevance,
      mentionedCount: 1,
    });
  }

  return this.save();
};

newsSchema.methods.updateSentiment = function (
  score,
  label,
  confidence,
  keywords = []
) {
  this.sentiment = {
    score,
    label,
    confidence,
    keywords,
  };
  this.processingStatus = 'completed';
  this.lastProcessedAt = new Date();
  return this.save();
};

newsSchema.methods.markAsDuplicate = function () {
  this.quality.isDuplicate = true;
  this.quality.score = Math.max(0, this.quality.score - 0.3);
  return this.save();
};

// Static methods
newsSchema.statics.findByStock = function (symbol, limit = 50, days = 30) {
  const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  return this.find({
    'stocks.symbol': symbol.toUpperCase(),
    publishedAt: { $gte: cutoffDate },
    processingStatus: 'completed',
  })
    .sort({ publishedAt: -1, 'sentiment.confidence': -1 })
    .limit(limit);
};

newsSchema.statics.findBySentiment = function (
  sentimentLabel,
  limit = 50,
  days = 30
) {
  const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  return this.find({
    'sentiment.label': sentimentLabel,
    publishedAt: { $gte: cutoffDate },
    processingStatus: 'completed',
  })
    .sort({ publishedAt: -1, 'sentiment.confidence': -1 })
    .limit(limit);
};

newsSchema.statics.findTrending = function (limit = 50, hours = 24) {
  const cutoffDate = new Date(Date.now() - hours * 60 * 60 * 1000);

  return this.find({
    publishedAt: { $gte: cutoffDate },
    processingStatus: 'completed',
    'quality.score': { $gte: 0.7 },
  })
    .sort({ 'engagement.views': -1, 'sentiment.confidence': -1 })
    .limit(limit);
};

newsSchema.statics.searchNews = function (query, limit = 20) {
  return this.find({
    $text: { $search: query },
    processingStatus: 'completed',
  })
    .sort({ score: { $meta: 'textScore' }, publishedAt: -1 })
    .limit(limit);
};

// Pre-save middleware
newsSchema.pre('save', function (next) {
  // Calculate word count if not set
  if (!this.wordCount && this.content) {
    this.wordCount = this.content.split(/\s+/).length;
  }

  // Calculate reading time (average 200 words per minute)
  if (this.wordCount && !this.readingTime) {
    this.readingTime = Math.ceil(this.wordCount / 200);
  }

  // Update quality score based on various factors
  if (this.isModified('quality') || this.isModified('sentiment')) {
    this.quality.score = this.calculateQualityScore();
  }

  next();
});

// Method to calculate quality score
newsSchema.methods.calculateQualityScore = function () {
  let score = 0.5; // Base score

  // Content quality factors
  if (this.wordCount >= 100) score += 0.1;
  if (this.wordCount >= 300) score += 0.1;
  if (this.summary && this.summary.length > 50) score += 0.1;

  // Sentiment confidence
  if (this.sentiment && this.sentiment.confidence) {
    score += this.sentiment.confidence * 0.2;
  }

  // Source reliability
  if (this.source && this.source.reliability) {
    score += this.source.reliability * 0.1;
  }

  // Penalties
  if (this.quality.isDuplicate) score -= 0.3;
  if (this.quality.isSpam) score -= 0.5;
  if (!this.quality.hasValidContent) score -= 0.4;

  return Math.max(0, Math.min(1, score));
};

// Export the model
module.exports = mongoose.model('News', newsSchema);
