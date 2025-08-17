const mongoose = require('mongoose');

/**
 * CrawlSession Schema
 * Stores crawling session logs with 30-day TTL for automatic cleanup
 */
const crawlSessionSchema = new mongoose.Schema(
  {
    // Session Identification
    sessionId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },

    // Session Configuration
    type: {
      type: String,
      required: true,
      enum: ['scheduled', 'on_demand', 'backfill', 'maintenance', 'test'],
      index: true,
    },
    priority: {
      type: String,
      enum: ['low', 'normal', 'high', 'critical'],
      default: 'normal',
      index: true,
    },

    // Source Configuration
    sources: [
      {
        name: {
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
          index: true,
        },
        enabled: {
          type: Boolean,
          default: true,
        },
        config: {
          type: mongoose.Schema.Types.Mixed, // Source-specific configuration
        },
      },
    ],

    // Target Configuration
    targets: {
      stocks: [
        {
          symbol: {
            type: String,
            required: true,
            uppercase: true,
            trim: true,
          },
          priority: {
            type: Number,
            min: 1,
            max: 10,
            default: 5,
          },
          lastCrawled: {
            type: Date,
          },
        },
      ],
      sectors: [
        {
          type: String,
          trim: true,
        },
      ],
      categories: [
        {
          type: String,
          trim: true,
        },
      ],
      maxStocks: {
        type: Number,
        min: 1,
        default: 300,
      },
    },

    // Session Status
    status: {
      current: {
        type: String,
        required: true,
        enum: [
          'pending',
          'initializing',
          'running',
          'paused',
          'completed',
          'failed',
          'cancelled',
        ],
        default: 'pending',
        index: true,
      },
      progress: {
        type: Number,
        min: 0,
        max: 100,
        default: 0,
      },
      currentStock: {
        type: String,
        uppercase: true,
        trim: true,
      },
      currentSource: {
        type: String,
        trim: true,
      },
    },

    // Timing Information
    schedule: {
      startTime: {
        type: Date,
        required: true,
        index: true,
      },
      estimatedEndTime: {
        type: Date,
      },
      actualStartTime: {
        type: Date,
      },
      actualEndTime: {
        type: Date,
      },
      duration: {
        type: Number, // in milliseconds
        min: 0,
      },
    },

    // Performance Metrics
    performance: {
      stocksProcessed: {
        type: Number,
        min: 0,
        default: 0,
      },
      stocksSkipped: {
        type: Number,
        min: 0,
        default: 0,
      },
      stocksFailed: {
        type: Number,
        min: 0,
        default: 0,
      },
      newsFound: {
        type: Number,
        min: 0,
        default: 0,
      },
      sentimentsAnalyzed: {
        type: Number,
        min: 0,
        default: 0,
      },
      avgProcessingTime: {
        type: Number, // in milliseconds
        min: 0,
      },
      totalProcessingTime: {
        type: Number, // in milliseconds
        min: 0,
      },
    },

    // Resource Usage
    resources: {
      memory: {
        peak: {
          type: Number, // in MB
          min: 0,
        },
        average: {
          type: Number, // in MB
          min: 0,
        },
      },
      cpu: {
        peak: {
          type: Number, // percentage
          min: 0,
          max: 100,
        },
        average: {
          type: Number, // percentage
          min: 0,
          max: 100,
        },
      },
      network: {
        requests: {
          type: Number,
          min: 0,
        },
        bytesTransferred: {
          type: Number,
          min: 0,
        },
        avgResponseTime: {
          type: Number, // in milliseconds
          min: 0,
        },
      },
    },

    // Error Handling
    errorLogs: [
      {
        timestamp: {
          type: Date,
          default: Date.now,
        },
        level: {
          type: String,
          enum: ['info', 'warning', 'error', 'critical'],
          default: 'error',
        },
        source: {
          type: String,
          trim: true,
        },
        stock: {
          type: String,
          uppercase: true,
          trim: true,
        },
        message: {
          type: String,
          required: true,
          trim: true,
        },
        details: {
          type: mongoose.Schema.Types.Mixed,
        },
        stackTrace: {
          type: String,
          trim: true,
        },
      },
    ],

    // Rate Limiting and Throttling
    rateLimiting: {
      requestsPerSecond: {
        type: Number,
        min: 0.1,
        default: 1,
      },
      delayBetweenRequests: {
        type: Number, // in milliseconds
        min: 0,
        default: 1000,
      },
      maxConcurrentRequests: {
        type: Number,
        min: 1,
        default: 3,
      },
      retryAttempts: {
        type: Number,
        min: 0,
        default: 3,
      },
      backoffStrategy: {
        type: String,
        enum: ['linear', 'exponential', 'fibonacci'],
        default: 'exponential',
      },
    },

    // Quality Control
    quality: {
      duplicateDetection: {
        type: Boolean,
        default: true,
      },
      contentValidation: {
        type: Boolean,
        default: true,
      },
      spamFiltering: {
        type: Boolean,
        default: true,
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
    },

    // Monitoring and Alerts
    monitoring: {
      heartbeat: {
        type: Date,
        default: Date.now,
      },
      lastActivity: {
        type: Date,
        default: Date.now,
      },
      alerts: [
        {
          timestamp: {
            type: Date,
            default: Date.now,
          },
          type: {
            type: String,
            enum: ['performance', 'error', 'resource', 'quality'],
          },
          message: {
            type: String,
            trim: true,
          },
          severity: {
            type: String,
            enum: ['low', 'medium', 'high', 'critical'],
          },
        },
      ],
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
    collection: 'crawl_sessions',
  }
);

// TTL Index - CrawlSessions expire after 30 days
crawlSessionSchema.index({ startTime: 1 }, { expireAfterSeconds: 2592000 }); // 30 days

// Indexes for efficient querying
crawlSessionSchema.index({ status: 1, type: 1 });
crawlSessionSchema.index({ 'sources.name': 1, startTime: -1 });
crawlSessionSchema.index({ priority: 1, startTime: -1 });
crawlSessionSchema.index({ 'targets.stocks.symbol': 1, startTime: -1 });

// Compound indexes for common queries
crawlSessionSchema.index({ status: 1, priority: 1, startTime: -1 });
crawlSessionSchema.index({ type: 1, status: 1, startTime: -1 });
crawlSessionSchema.index({ 'performance.stocksProcessed': -1, startTime: -1 });

// Virtual for session age
crawlSessionSchema.virtual('ageInMinutes').get(function () {
  if (!this.schedule.actualStartTime) return 0;
  return Math.floor(
    (Date.now() - this.schedule.actualStartTime.getTime()) / (1000 * 60)
  );
});

crawlSessionSchema.virtual('ageInHours').get(function () {
  if (!this.schedule.actualStartTime) return 0;
  return Math.floor(
    (Date.now() - this.schedule.actualStartTime.getTime()) / (1000 * 60 * 60)
  );
});

// Virtual for success rate
crawlSessionSchema.virtual('successRate').get(function () {
  const total =
    this.performance.stocksProcessed +
    this.performance.stocksSkipped +
    this.performance.stocksFailed;
  return total > 0 ? (this.performance.stocksProcessed / total) * 100 : 0;
});

// Virtual for efficiency
crawlSessionSchema.virtual('efficiency').get(function () {
  if (this.performance.totalProcessingTime === 0) return 0;
  return (
    this.performance.stocksProcessed /
    (this.performance.totalProcessingTime / 1000)
  ); // stocks per second
});

// Instance methods
crawlSessionSchema.methods.start = function () {
  this.status.current = 'running';
  this.status.progress = 0;
  this.schedule.actualStartTime = new Date();
  this.monitoring.lastActivity = new Date();
  return this.save();
};

crawlSessionSchema.methods.pause = function () {
  this.status.current = 'paused';
  this.monitoring.lastActivity = new Date();
  return this.save();
};

crawlSessionSchema.methods.resume = function () {
  this.status.current = 'running';
  this.monitoring.lastActivity = new Date();
  return this.save();
};

crawlSessionSchema.methods.complete = function () {
  this.status.current = 'completed';
  this.status.progress = 100;
  this.schedule.actualEndTime = new Date();
  this.schedule.duration =
    this.schedule.actualEndTime.getTime() -
    this.schedule.actualStartTime.getTime();
  this.monitoring.lastActivity = new Date();
  return this.save();
};

crawlSessionSchema.methods.fail = function (error) {
  this.status.current = 'failed';
  this.errorLogs.push({
    level: 'critical',
    message: error.message || 'Session failed',
    details: error,
    stackTrace: error.stack,
  });
  this.schedule.actualEndTime = new Date();
  this.schedule.duration =
    this.schedule.actualEndTime.getTime() -
    this.schedule.actualStartTime.getTime();
  this.monitoring.lastActivity = new Date();
  return this.save();
};

crawlSessionSchema.methods.updateProgress = function (stock, source, progress) {
  this.status.currentStock = stock;
  this.status.currentSource = source;
  this.status.progress = progress;
  this.monitoring.lastActivity = new Date();
  this.monitoring.heartbeat = new Date();
  return this.save();
};

crawlSessionSchema.methods.addError = function (
  level,
  source,
  stock,
  message,
  details = null,
  stackTrace = null
) {
  this.errorLogs.push({
    level,
    source,
    stock,
    message,
    details,
    stackTrace,
  });
  this.monitoring.lastActivity = new Date();
  return this.save();
};

crawlSessionSchema.methods.updatePerformance = function (metrics) {
  Object.assign(this.performance, metrics);

  // Calculate averages
  if (this.performance.stocksProcessed > 0) {
    this.performance.avgProcessingTime =
      this.performance.totalProcessingTime / this.performance.stocksProcessed;
  }

  return this.save();
};

// Static methods
crawlSessionSchema.statics.findActive = function () {
  return this.find({
    status: { $in: ['running', 'paused'] },
  }).sort({ priority: -1, startTime: 1 });
};

crawlSessionSchema.statics.findByStatus = function (status, limit = 50) {
  return this.find({ 'status.current': status })
    .sort({ startTime: -1 })
    .limit(limit);
};

crawlSessionSchema.statics.findBySource = function (source, limit = 50) {
  return this.find({
    'sources.name': source,
    'sources.enabled': true,
  })
    .sort({ startTime: -1 })
    .limit(limit);
};

crawlSessionSchema.statics.findByStock = function (symbol, limit = 50) {
  return this.find({
    'targets.stocks.symbol': symbol.toUpperCase(),
  })
    .sort({ startTime: -1 })
    .limit(limit);
};

crawlSessionSchema.statics.getPerformanceStats = function (days = 7) {
  const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  return this.aggregate([
    {
      $match: {
        startTime: { $gte: cutoffDate },
        'status.current': 'completed',
      },
    },
    {
      $group: {
        _id: null,
        totalSessions: { $sum: 1 },
        avgDuration: { $avg: '$schedule.duration' },
        totalStocksProcessed: { $sum: '$performance.stocksProcessed' },
        totalNewsFound: { $sum: '$performance.newsFound' },
        totalSentimentsAnalyzed: { $sum: '$performance.sentimentsAnalyzed' },
        avgSuccessRate: { $avg: { $multiply: ['$successRate', 1] } },
      },
    },
  ]);
};

// Pre-save middleware
crawlSessionSchema.pre('save', function (next) {
  // Update heartbeat and last activity
  this.monitoring.heartbeat = new Date();
  this.monitoring.lastActivity = new Date();

  // Calculate duration if session ended
  if (this.schedule.actualEndTime && this.schedule.actualStartTime) {
    this.schedule.duration =
      this.schedule.actualEndTime.getTime() -
      this.schedule.actualStartTime.getTime();
  }

  next();
});

// Export the model
module.exports = mongoose.model('CrawlSession', crawlSessionSchema);
