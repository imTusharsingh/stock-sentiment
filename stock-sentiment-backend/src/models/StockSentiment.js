const mongoose = require('mongoose');

/**
 * StockSentiment Schema
 * Stores aggregated sentiment data for stocks (no TTL - persistent)
 */
const stockSentimentSchema = new mongoose.Schema(
  {
    // Stock Information
    stock: {
      symbol: {
        type: String,
        required: true,
        uppercase: true,
        trim: true,
        unique: true,
        index: true,
      },
      name: {
        type: String,
        trim: true,
      },
      sector: {
        type: String,
        trim: true,
        index: true,
      },
      industry: {
        type: String,
        trim: true,
        index: true,
      },
    },

    // Overall Sentiment Metrics
    overall: {
      score: {
        type: Number,
        min: -1,
        max: 1,
        default: 0,
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
        default: 'neutral',
        index: true,
      },
      confidence: {
        type: Number,
        min: 0,
        max: 1,
        default: 0,
      },
      count: {
        type: Number,
        min: 0,
        default: 0,
      },
    },

    // Time-based Sentiment Breakdowns
    timeframes: {
      // 1 Day
      '1d': {
        score: { type: Number, min: -1, max: 1, default: 0 },
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
          default: 'neutral',
        },
        confidence: { type: Number, min: 0, max: 1, default: 0 },
        count: { type: Number, min: 0, default: 0 },
        change: { type: Number, default: 0 }, // Change from previous period
        trend: {
          type: String,
          enum: ['improving', 'stable', 'declining'],
          default: 'stable',
        },
      },
      // 7 Days
      '7d': {
        score: { type: Number, min: -1, max: 1, default: 0 },
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
          default: 'neutral',
        },
        confidence: { type: Number, min: 0, max: 1, default: 0 },
        count: { type: Number, min: 0, default: 0 },
        change: { type: Number, default: 0 },
        trend: {
          type: String,
          enum: ['improving', 'stable', 'declining'],
          default: 'stable',
        },
      },
      // 30 Days
      '30d': {
        score: { type: Number, min: -1, max: 1, default: 0 },
        label: { type: String, min: -1, max: 1, default: 0 },
        confidence: { type: Number, min: 0, max: 1, default: 0 },
        count: { type: Number, min: 0, default: 0 },
        change: { type: Number, default: 0 },
        trend: {
          type: String,
          enum: ['improving', 'stable', 'declining'],
          default: 'stable',
        },
      },
      // 90 Days
      '90d': {
        score: { type: Number, min: -1, max: 1, default: 0 },
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
          default: 'neutral',
        },
        confidence: { type: Number, min: 0, max: 1, default: 0 },
        count: { type: Number, min: 0, default: 0 },
        change: { type: Number, default: 0 },
        trend: {
          type: String,
          enum: ['improving', 'stable', 'declining'],
          default: 'stable',
        },
      },
    },

    // Sentiment Distribution
    distribution: {
      very_positive: { type: Number, min: 0, default: 0 },
      positive: { type: Number, min: 0, default: 0 },
      slightly_positive: { type: Number, min: 0, default: 0 },
      neutral: { type: Number, min: 0, default: 0 },
      slightly_negative: { type: Number, min: 0, default: 0 },
      negative: { type: Number, min: 0, default: 0 },
      very_negative: { type: Number, min: 0, default: 0 },
    },

    // Source-based Sentiment
    sources: {
      moneycontrol: {
        score: { type: Number, min: -1, max: 1, default: 0 },
        count: { type: Number, min: 0, default: 0 },
        lastUpdate: { type: Date },
      },
      economictimes: {
        score: { type: Number, min: -1, max: 1, default: 0 },
        count: { type: Number, min: 0, default: 0 },
        lastUpdate: { type: Date },
      },
      businessstandard: {
        score: { type: Number, min: -1, max: 1, default: 0 },
        count: { type: Number, min: 0, default: 0 },
        lastUpdate: { type: Date },
      },
      nse: {
        score: { type: Number, min: -1, max: 1, default: 0 },
        count: { type: Number, min: 0, default: 0 },
        lastUpdate: { type: Date },
      },
      bse: {
        score: { type: Number, min: -1, max: 1, default: 0 },
        count: { type: Number, min: 0, default: 0 },
        lastUpdate: { type: Date },
      },
      reddit: {
        score: { type: Number, min: -1, max: 1, default: 0 },
        count: { type: Number, min: 0, default: 0 },
        lastUpdate: { type: Date },
      },
    },

    // Trending and Popularity
    trending: {
      score: {
        type: Number,
        min: 0,
        max: 1,
        default: 0,
        index: true,
      },
      rank: {
        type: Number,
        min: 1,
        index: true,
      },
      change: {
        type: Number,
        default: 0,
      },
      momentum: {
        type: String,
        enum: ['rising', 'stable', 'falling'],
        default: 'stable',
      },
    },

    // Market Correlation
    marketCorrelation: {
      nifty50: {
        correlation: { type: Number, min: -1, max: 1, default: 0 },
        lastUpdate: { type: Date },
      },
      sensex: {
        correlation: { type: Number, min: -1, max: 1, default: 0 },
        lastUpdate: { type: Date },
      },
      sectorIndex: {
        correlation: { type: Number, min: -1, max: 1, default: 0 },
        lastUpdate: { type: Date },
      },
    },

    // Sentiment History (for charts)
    history: {
      daily: [
        {
          date: { type: Date, required: true },
          score: { type: Number, min: -1, max: 1, required: true },
          count: { type: Number, min: 0, required: true },
          confidence: { type: Number, min: 0, max: 1, required: true },
        },
      ],
      weekly: [
        {
          week: { type: String, required: true }, // YYYY-WW format
          score: { type: Number, min: -1, max: 1, required: true },
          count: { type: Number, min: 0, required: true },
          confidence: { type: Number, min: 0, max: 1, required: true },
        },
      ],
      monthly: [
        {
          month: { type: String, required: true }, // YYYY-MM format
          score: { type: Number, min: -1, max: 1, required: true },
          count: { type: Number, min: 0, required: true },
          confidence: { type: Number, min: 0, max: 1, required: true },
        },
      ],
    },

    // Key Events and News Impact
    events: [
      {
        date: { type: Date, required: true },
        type: {
          type: String,
          enum: ['earnings', 'announcement', 'news', 'market_event'],
          required: true,
        },
        description: { type: String, trim: true },
        sentiment: { type: Number, min: -1, max: 1 },
        impact: {
          type: String,
          enum: ['high', 'medium', 'low'],
          default: 'medium',
        },
      },
    ],

    // Sentiment Quality Metrics
    quality: {
      averageConfidence: {
        type: Number,
        min: 0,
        max: 1,
        default: 0,
      },
      reliabilityScore: {
        type: Number,
        min: 0,
        max: 1,
        default: 0,
      },
      consistencyScore: {
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

    // Timestamps
    lastSentimentUpdate: {
      type: Date,
      default: Date.now,
      index: true,
    },
    lastCalculationUpdate: {
      type: Date,
      default: Date.now,
    },
    lastTrendingUpdate: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    collection: 'stock_sentiments',
  }
);

// Indexes for efficient querying
stockSentimentSchema.index({ 'overall.label': 1, 'overall.score': -1 });
stockSentimentSchema.index({ 'trending.score': -1, 'trending.rank': 1 });
stockSentimentSchema.index({ 'stock.sector': 1, 'overall.score': -1 });
stockSentimentSchema.index({ lastSentimentUpdate: -1 });
stockSentimentSchema.index({ 'overall.confidence': -1, 'overall.count': -1 });

// Compound indexes for common queries
stockSentimentSchema.index({
  'stock.sector': 1,
  'overall.label': 1,
  'trending.score': -1,
});
stockSentimentSchema.index({
  'overall.label': 1,
  'trending.momentum': 1,
  lastSentimentUpdate: -1,
});

// Virtual for sentiment strength
stockSentimentSchema.virtual('sentimentStrength').get(function () {
  return Math.abs(this.overall.score);
});

// Virtual for sentiment trend
stockSentimentSchema.virtual('sentimentTrend').get(function () {
  if (this.timeframes['7d'].change > 0.1) {
    return 'improving';
  }
  if (this.timeframes['7d'].change < -0.1) {
    return 'declining';
  }
  return 'stable';
});

// Virtual for overall confidence level
stockSentimentSchema.virtual('confidenceLevel').get(function () {
  if (this.overall.confidence >= 0.8) {
    return 'high';
  }
  if (this.overall.confidence >= 0.6) {
    return 'medium';
  }
  return 'low';
});

// Instance methods
stockSentimentSchema.methods.updateOverallSentiment = function () {
  // Calculate overall sentiment from timeframes
  const timeframes = ['1d', '7d', '30d', '90d'];
  let totalScore = 0;
  let totalConfidence = 0;
  let totalCount = 0;

  timeframes.forEach(tf => {
    if (this.timeframes[tf].count > 0) {
      totalScore += this.timeframes[tf].score * this.timeframes[tf].count;
      totalConfidence +=
        this.timeframes[tf].confidence * this.timeframes[tf].count;
      totalCount += this.timeframes[tf].count;
    }
  });

  if (totalCount > 0) {
    this.overall.score = totalScore / totalCount;
    this.overall.confidence = totalConfidence / totalCount;
    this.overall.count = totalCount;
    this.overall.label = this.getSentimentLabel(this.overall.score);
  }

  this.lastCalculationUpdate = new Date();
  return this.save();
};

stockSentimentSchema.methods.addSentimentData = function (
  timeframe,
  score,
  confidence,
  count
) {
  if (this.timeframes[timeframe]) {
    const previousScore = this.timeframes[timeframe].score;

    this.timeframes[timeframe].score = score;
    this.timeframes[timeframe].confidence = confidence;
    this.timeframes[timeframe].count = count;
    this.timeframes[timeframe].change = score - previousScore;
    this.timeframes[timeframe].trend = this.getTrendDirection(
      this.timeframes[timeframe].change
    );
  }

  this.lastSentimentUpdate = new Date();
  return this.save();
};

stockSentimentSchema.methods.updateDistribution = function (
  sentimentLabel,
  count
) {
  if (this.distribution[sentimentLabel] !== undefined) {
    this.distribution[sentimentLabel] = count;
  }
  return this.save();
};

stockSentimentSchema.methods.updateTrendingScore = function (score, rank) {
  this.trending.score = score;
  this.trending.rank = rank;
  this.trending.change = score - (this.trending.score || 0);
  this.trending.momentum = this.getTrendDirection(this.trending.change);
  this.lastTrendingUpdate = new Date();
  return this.save();
};

// Static methods
stockSentimentSchema.statics.findTopSentiments = function (
  limit = 50,
  timeframe = '7d'
) {
  return this.find({})
    .sort({
      [`timeframes.${timeframe}.score`]: -1,
      [`timeframes.${timeframe}.confidence`]: -1,
    })
    .limit(limit);
};

stockSentimentSchema.statics.findTrending = function (limit = 50) {
  return this.find({})
    .sort({ 'trending.score': -1, 'trending.rank': 1 })
    .limit(limit);
};

stockSentimentSchema.statics.findBySector = function (sector, limit = 100) {
  return this.find({ 'stock.sector': sector })
    .sort({ 'overall.score': -1, 'overall.confidence': -1 })
    .limit(limit);
};

stockSentimentSchema.statics.findImproving = function (
  limit = 50,
  timeframe = '7d'
) {
  return this.find({ [`timeframes.${timeframe}.trend`]: 'improving' })
    .sort({ [`timeframes.${timeframe}.change`]: -1 })
    .limit(limit);
};

// Helper methods
stockSentimentSchema.methods.getSentimentLabel = function (score) {
  if (score >= 0.8) return 'very_positive';
  if (score >= 0.6) return 'positive';
  if (score >= 0.4) return 'slightly_positive';
  if (score >= 0.2) return 'neutral';
  if (score >= -0.2) return 'neutral';
  if (score >= -0.4) return 'slightly_negative';
  if (score >= -0.6) return 'negative';
  return 'very_negative';
};

stockSentimentSchema.methods.getTrendDirection = function (change) {
  if (change > 0.05) return 'improving';
  if (change < -0.05) return 'declining';
  return 'stable';
};

// Pre-save middleware
stockSentimentSchema.pre('save', function (next) {
  // Update overall sentiment if timeframes changed
  if (this.isModified('timeframes')) {
    this.updateOverallSentiment();
  }

  // Update distribution if needed
  if (this.isModified('distribution')) {
    const total = Object.values(this.distribution).reduce(
      (sum, count) => sum + count,
      0
    );
    if (total !== this.overall.count) {
      this.overall.count = total;
    }
  }

  next();
});

// Export the model
module.exports = mongoose.model('StockSentiment', stockSentimentSchema);
