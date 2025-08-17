const mongoose = require('mongoose');

/**
 * NewsSource Schema
 * Stores configuration and metadata for news sources (no TTL - persistent)
 */
const newsSourceSchema = new mongoose.Schema(
  {
    // Source Identification
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    displayName: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },

    // Source Type and Category
    type: {
      type: String,
      required: true,
      enum: [
        'news_website',
        'financial_portal',
        'social_media',
        'api',
        'rss_feed',
        'scraping_target',
      ],
      index: true,
    },
    category: {
      type: String,
      required: true,
      enum: ['primary', 'secondary', 'backup', 'experimental'],
      default: 'secondary',
      index: true,
    },

    // URL and Access Information
    urls: {
      base: {
        type: String,
        required: true,
        trim: true,
      },
      search: {
        type: String,
        trim: true,
      },
      company: {
        type: String,
        trim: true,
      },
      market: {
        type: String,
        trim: true,
      },
      rss: {
        type: String,
        trim: true,
      },
      api: {
        type: String,
        trim: true,
      },
    },

    // Authentication and API Keys
    authentication: {
      required: {
        type: Boolean,
        default: false,
      },
      type: {
        type: String,
        enum: ['api_key', 'oauth', 'basic', 'cookie', 'none'],
        default: 'none',
      },
      apiKey: {
        type: String,
        trim: true,
        select: false, // Don't include in queries by default
      },
      apiKeyHeader: {
        type: String,
        trim: true,
        default: 'X-API-Key',
      },
      username: {
        type: String,
        trim: true,
        select: false,
      },
      password: {
        type: String,
        trim: true,
        select: false,
      },
      oauth: {
        clientId: { type: String, trim: true, select: false },
        clientSecret: { type: String, trim: true, select: false },
        redirectUri: { type: String, trim: true },
        scope: { type: String, trim: true },
      },
    },

    // Crawling Configuration
    crawling: {
      enabled: {
        type: Boolean,
        default: true,
        index: true,
      },
      method: {
        type: String,
        enum: ['api', 'scraping', 'rss', 'manual'],
        default: 'scraping',
      },
      priority: {
        type: Number,
        min: 1,
        max: 10,
        default: 5,
        index: true,
      },

      // Rate Limiting
      rateLimit: {
        requestsPerMinute: {
          type: Number,
          min: 1,
          default: 60,
        },
        requestsPerHour: {
          type: Number,
          min: 1,
          default: 1000,
        },
        delayBetweenRequests: {
          type: Number, // in milliseconds
          min: 0,
          default: 1000,
        },
      },

      // Retry Configuration
      retry: {
        maxAttempts: {
          type: Number,
          min: 1,
          default: 3,
        },
        backoffStrategy: {
          type: String,
          enum: ['linear', 'exponential', 'fibonacci'],
          default: 'exponential',
        },
        initialDelay: {
          type: Number, // in milliseconds
          min: 0,
          default: 1000,
        },
      },

      // Content Extraction
      extraction: {
        titleSelector: {
          type: String,
          trim: true,
        },
        contentSelector: {
          type: String,
          trim: true,
        },
        summarySelector: {
          type: String,
          trim: true,
        },
        authorSelector: {
          type: String,
          trim: true,
        },
        dateSelector: {
          type: String,
          trim: true,
        },
        dateFormat: {
          type: String,
          trim: true,
          default: 'ISO',
        },
        imageSelector: {
          type: String,
          trim: true,
        },
        tagsSelector: {
          type: String,
          trim: true,
        },
      },

      // Validation Rules
      validation: {
        minTitleLength: {
          type: Number,
          min: 0,
          default: 10,
        },
        maxTitleLength: {
          type: Number,
          min: 0,
          default: 200,
        },
        minContentLength: {
          type: Number,
          min: 0,
          default: 50,
        },
        maxContentLength: {
          type: Number,
          min: 0,
          default: 10000,
        },
        requiredFields: [
          {
            type: String,
            enum: ['title', 'content', 'summary', 'author', 'date', 'url'],
          },
        ],
      },
    },

    // Content Processing
    processing: {
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
          'auto',
        ],
      },
      autoTranslate: {
        type: Boolean,
        default: false,
      },
      targetLanguage: {
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

      // Content Cleaning
      cleaning: {
        removeAds: {
          type: Boolean,
          default: true,
        },
        removeNavigation: {
          type: Boolean,
          default: true,
        },
        removeFooters: {
          type: Boolean,
          default: true,
        },
        removeSocialMedia: {
          type: Boolean,
          default: true,
        },
        cleanHtml: {
          type: Boolean,
          default: true,
        },
        extractTextOnly: {
          type: Boolean,
          default: false,
        },
      },

      // Duplicate Detection
      duplicateDetection: {
        enabled: {
          type: Boolean,
          default: true,
        },
        method: {
          type: String,
          enum: ['title_similarity', 'content_hash', 'url_pattern', 'hybrid'],
          default: 'hybrid',
        },
        similarityThreshold: {
          type: Number,
          min: 0,
          max: 1,
          default: 0.8,
        },
      },
    },

    // Quality and Reliability
    quality: {
      reliability: {
        type: Number,
        min: 0,
        max: 1,
        default: 0.5,
        index: true,
      },
      accuracy: {
        type: Number,
        min: 0,
        max: 1,
        default: 0.5,
      },
      timeliness: {
        type: Number,
        min: 0,
        max: 1,
        default: 0.5,
      },
      completeness: {
        type: Number,
        min: 0,
        max: 1,
        default: 0.5,
      },

      // Quality Metrics
      metrics: {
        successRate: {
          type: Number,
          min: 0,
          max: 1,
          default: 0,
        },
        avgResponseTime: {
          type: Number, // in milliseconds
          min: 0,
          default: 0,
        },
        errorRate: {
          type: Number,
          min: 0,
          max: 1,
          default: 0,
        },
        lastQualityCheck: {
          type: Date,
          default: Date.now,
        },
      },
    },

    // Geographic and Language Coverage
    coverage: {
      regions: [
        {
          type: String,
          enum: ['india', 'global', 'asia', 'europe', 'americas', 'africa'],
          default: 'india',
        },
      ],
      languages: [
        {
          type: String,
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
          default: 'en',
        },
      ],
      markets: [
        {
          type: String,
          enum: ['nse', 'bse', 'nyse', 'nasdaq', 'lse', 'tse'],
          default: 'nse',
        },
      ],
      sectors: [
        {
          type: String,
          trim: true,
        },
      ],
    },

    // Performance and Statistics
    statistics: {
      totalArticles: {
        type: Number,
        min: 0,
        default: 0,
      },
      articlesToday: {
        type: Number,
        min: 0,
        default: 0,
      },
      articlesThisWeek: {
        type: Number,
        min: 0,
        default: 0,
      },
      articlesThisMonth: {
        type: Number,
        min: 0,
        default: 0,
      },
      lastArticleAt: {
        type: Date,
      },
      lastCrawlAt: {
        type: Date,
      },
      lastSuccessAt: {
        type: Date,
      },
      lastFailureAt: {
        type: Date,
      },
    },

    // Error Tracking
    errors: [
      {
        timestamp: {
          type: Date,
          default: Date.now,
        },
        type: {
          type: String,
          enum: [
            'connection',
            'authentication',
            'rate_limit',
            'parsing',
            'validation',
            'other',
          ],
        },
        message: {
          type: String,
          required: true,
          trim: true,
        },
        details: {
          type: mongoose.Schema.Types.Mixed,
        },
        count: {
          type: Number,
          min: 1,
          default: 1,
        },
      },
    ],

    // Configuration and Settings
    config: {
      timeout: {
        type: Number, // in milliseconds
        min: 1000,
        default: 30000,
      },
      maxRedirects: {
        type: Number,
        min: 0,
        default: 5,
      },
      userAgent: {
        type: String,
        trim: true,
        default: 'StockSentimentBot/1.0',
      },
      headers: {
        type: mongoose.Schema.Types.Mixed, // Custom headers
      },
      cookies: {
        type: mongoose.Schema.Types.Mixed, // Custom cookies
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
    notes: {
      type: String,
      trim: true,
    },

    // Status and Maintenance
    status: {
      active: {
        type: Boolean,
        default: true,
        index: true,
      },
      maintenance: {
        type: Boolean,
        default: false,
      },
      lastMaintenance: {
        type: Date,
      },
      nextMaintenance: {
        type: Date,
      },
    },

    // Timestamps
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    collection: 'news_sources',
  }
);

// Indexes for efficient querying
newsSourceSchema.index({ type: 1, category: 1 });
newsSourceSchema.index({ 'coverage.regions': 1, 'coverage.languages': 1 });
newsSourceSchema.index({ 'quality.reliability': -1, 'crawling.priority': -1 });
newsSourceSchema.index({ 'statistics.lastArticleAt': -1 });
newsSourceSchema.index({ status: 1, crawling: 1 });

// Compound indexes for common queries
newsSourceSchema.index({ type: 1, status: 1, 'quality.reliability': -1 });
newsSourceSchema.index({ category: 1, 'coverage.regions': 1, crawling: 1 });
newsSourceSchema.index({
  'crawling.enabled': 1,
  'quality.reliability': -1,
  'crawling.priority': -1,
});

// Text search index
newsSourceSchema.index({
  name: 'text',
  displayName: 'text',
  description: 'text',
  tags: 'text',
});

// Virtual for overall quality score
newsSourceSchema.virtual('overallQuality').get(function () {
  const { reliability, accuracy, timeliness, completeness } = this.quality;
  return (reliability + accuracy + timeliness + completeness) / 4;
});

// Virtual for health status
newsSourceSchema.virtual('healthStatus').get(function () {
  if (!this.status.active) return 'inactive';
  if (this.status.maintenance) return 'maintenance';
  if (this.quality.metrics.errorRate > 0.5) return 'unhealthy';
  if (this.quality.metrics.successRate < 0.5) return 'degraded';
  return 'healthy';
});

// Virtual for last activity
newsSourceSchema.virtual('lastActivity').get(function () {
  return Math.max(
    this.statistics.lastArticleAt?.getTime() || 0,
    this.statistics.lastCrawlAt?.getTime() || 0,
    this.statistics.lastSuccessAt?.getTime() || 0
  );
});

// Instance methods
newsSourceSchema.methods.updateStatistics = function (articleCount = 0) {
  this.statistics.totalArticles += articleCount;
  this.statistics.articlesToday += articleCount;
  this.statistics.articlesThisWeek += articleCount;
  this.statistics.articlesThisMonth += articleCount;
  this.statistics.lastArticleAt = new Date();
  return this.save();
};

newsSourceSchema.methods.recordSuccess = function () {
  this.statistics.lastSuccessAt = new Date();
  this.statistics.lastCrawlAt = new Date();
  return this.save();
};

newsSourceSchema.methods.recordFailure = function (
  errorType,
  message,
  details = null
) {
  this.statistics.lastFailureAt = new Date();

  // Find existing error or create new one
  const existingError = this.errors.find(
    err => err.type === errorType && err.message === message
  );

  if (existingError) {
    existingError.count += 1;
    existingError.timestamp = new Date();
  } else {
    this.errors.push({
      type: errorType,
      message,
      details,
      count: 1,
    });
  }

  return this.save();
};

newsSourceSchema.methods.updateQualityMetrics = function (
  successRate,
  responseTime,
  errorRate
) {
  this.quality.metrics.successRate = successRate;
  this.quality.metrics.avgResponseTime = responseTime;
  this.quality.metrics.errorRate = errorRate;
  this.quality.metrics.lastQualityCheck = new Date();
  return this.save();
};

newsSourceSchema.methods.enable = function () {
  this.status.active = true;
  this.status.maintenance = false;
  this.updatedAt = new Date();
  return this.save();
};

newsSourceSchema.methods.disable = function () {
  this.status.active = false;
  this.updatedAt = new Date();
  return this.save();
};

// Static methods
newsSourceSchema.statics.findActive = function () {
  return this.find({
    'status.active': true,
    'crawling.enabled': true,
  }).sort({ 'quality.reliability': -1, 'crawling.priority': -1 });
};

newsSourceSchema.statics.findByType = function (type, limit = 50) {
  return this.find({ type, 'status.active': true })
    .sort({ 'quality.reliability': -1 })
    .limit(limit);
};

newsSourceSchema.statics.findByRegion = function (region, limit = 50) {
  return this.find({
    'coverage.regions': region,
    'status.active': true,
    'crawling.enabled': true,
  })
    .sort({ 'quality.reliability': -1, 'crawling.priority': -1 })
    .limit(limit);
};

newsSourceSchema.statics.findByLanguage = function (language, limit = 50) {
  return this.find({
    'coverage.languages': language,
    'status.active': true,
    'crawling.enabled': true,
  })
    .sort({ 'quality.reliability': -1, 'crawling.priority': -1 })
    .limit(limit);
};

newsSourceSchema.statics.findHighQuality = function (limit = 20) {
  return this.find({
    'status.active': true,
    'crawling.enabled': true,
    'quality.reliability': { $gte: 0.7 },
  })
    .sort({ 'quality.reliability': -1, 'crawling.priority': -1 })
    .limit(limit);
};

newsSourceSchema.statics.getHealthStatus = function () {
  return this.aggregate([
    {
      $group: {
        _id: '$healthStatus',
        count: { $sum: 1 },
        sources: {
          $push: { name: '$name', reliability: '$quality.reliability' },
        },
      },
    },
    {
      $sort: { count: -1 },
    },
  ]);
};

// Pre-save middleware
newsSourceSchema.pre('save', function (next) {
  // Update quality metrics if statistics changed
  if (this.isModified('statistics') || this.isModified('errors')) {
    this.updateQualityScore();
  }

  // Update last activity
  this.updatedAt = new Date();

  next();
});

// Method to update quality score
newsSourceSchema.methods.updateQualityScore = function () {
  // Calculate success rate
  const totalCrawls =
    this.statistics.lastSuccessAt && this.statistics.lastFailureAt ? 1 : 0;
  if (totalCrawls > 0) {
    this.quality.metrics.successRate = 1 - this.quality.metrics.errorRate;
  }

  // Update reliability based on recent performance
  if (this.quality.metrics.successRate > 0.8) {
    this.quality.reliability = Math.min(1, this.quality.reliability + 0.1);
  } else if (this.quality.metrics.successRate < 0.5) {
    this.quality.reliability = Math.max(0, this.quality.reliability - 0.1);
  }

  return this;
};

// Export the model
module.exports = mongoose.model('NewsSource', newsSourceSchema);
