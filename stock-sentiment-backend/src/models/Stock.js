const mongoose = require('mongoose');

/**
 * Stock Schema
 * Stores comprehensive information about Indian stocks (NSE/BSE)
 */
const stockSchema = new mongoose.Schema(
  {
    // Basic Stock Information
    symbol: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    companyName: {
      type: String,
      required: true,
      trim: true,
    },

    // Exchange Information
    exchange: {
      type: String,
      required: true,
      enum: ['NSE', 'BSE', 'BOTH'],
      default: 'NSE',
      index: true,
    },
    nseSymbol: {
      type: String,
      uppercase: true,
      trim: true,
      sparse: true,
    },
    bseSymbol: {
      type: String,
      uppercase: true,
      trim: true,
      sparse: true,
    },
    isin: {
      type: String,
      uppercase: true,
      trim: true,
      sparse: true,
    },

    // Sector and Industry Classification
    sector: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    industry: {
      type: String,
      trim: true,
      index: true,
    },
    subIndustry: {
      type: String,
      trim: true,
    },

    // Market Data (will be updated regularly)
    currentPrice: {
      type: Number,
      min: 0,
    },
    previousClose: {
      type: Number,
      min: 0,
    },
    change: {
      type: Number,
    },
    changePercent: {
      type: Number,
    },
    marketCap: {
      type: Number,
      min: 0,
    },
    volume: {
      type: Number,
      min: 0,
    },

    // Fundamental Data
    peRatio: {
      type: Number,
    },
    pbRatio: {
      type: Number,
    },
    dividendYield: {
      type: Number,
      min: 0,
    },
    bookValue: {
      type: Number,
    },
    eps: {
      type: Number,
    },

    // Trading Information
    lotSize: {
      type: Number,
      min: 1,
    },
    faceValue: {
      type: Number,
      min: 0,
    },
    upperCircuit: {
      type: Number,
    },
    lowerCircuit: {
      type: Number,
    },

    // Status and Flags
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    isIndex: {
      type: Boolean,
      default: false,
      index: true,
    },
    isFno: {
      type: Boolean,
      default: false,
      index: true,
    },

    // Sentiment Tracking
    lastSentimentUpdate: {
      type: Date,
      default: Date.now,
    },
    averageSentiment: {
      type: Number,
      min: -1,
      max: 1,
      default: 0,
    },
    sentimentCount: {
      type: Number,
      min: 0,
      default: 0,
    },

    // Trending and Popularity
    searchCount: {
      type: Number,
      min: 0,
      default: 0,
    },
    trendingScore: {
      type: Number,
      min: 0,
      default: 0,
    },
    lastTrendingUpdate: {
      type: Date,
      default: Date.now,
    },

    // Metadata
    description: {
      type: String,
      trim: true,
    },
    website: {
      type: String,
      trim: true,
    },
    logoUrl: {
      type: String,
      trim: true,
    },

    // Timestamps
    lastPriceUpdate: {
      type: Date,
      default: Date.now,
    },
    lastFundamentalUpdate: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt
    collection: 'stocks',
  }
);

// Indexes for efficient querying
stockSchema.index({ symbol: 1, exchange: 1 });
stockSchema.index({ sector: 1, industry: 1 });
stockSchema.index({ isActive: 1, isIndex: 1 });
stockSchema.index({ trendingScore: -1, lastTrendingUpdate: -1 });
stockSchema.index({ searchCount: -1, lastTrendingUpdate: -1 });
stockSchema.index({ averageSentiment: -1, sentimentCount: -1 });

// Text search index
stockSchema.index({
  symbol: 'text',
  name: 'text',
  companyName: 'text',
  sector: 'text',
  industry: 'text',
});

// Compound indexes for common queries
stockSchema.index({ exchange: 1, isActive: 1, sector: 1 });
stockSchema.index({ isFno: 1, isActive: 1, marketCap: -1 });

// Virtual for full display name
stockSchema.virtual('displayName').get(function () {
  return `${this.symbol} - ${this.name}`;
});

// Virtual for price change status
stockSchema.virtual('priceStatus').get(function () {
  if (!this.change) {
    return 'unchanged';
  }
  return this.change > 0 ? 'up' : this.change < 0 ? 'down' : 'unchanged';
});

// Instance methods
stockSchema.methods.updatePrice = function (price, volume) {
  this.previousClose = this.currentPrice || price;
  this.currentPrice = price;
  this.volume = volume;
  this.change = price - this.previousClose;
  this.changePercent = this.previousClose
    ? (this.change / this.previousClose) * 100
    : 0;
  this.lastPriceUpdate = new Date();
  return this.save();
};

stockSchema.methods.updateSentiment = function (sentimentScore) {
  if (this.sentimentCount === 0) {
    this.averageSentiment = sentimentScore;
  } else {
    this.averageSentiment =
      (this.averageSentiment * this.sentimentCount + sentimentScore) /
      (this.sentimentCount + 1);
  }
  this.sentimentCount += 1;
  this.lastSentimentUpdate = new Date();
  return this.save();
};

stockSchema.methods.incrementSearchCount = function () {
  this.searchCount += 1;
  this.lastTrendingUpdate = new Date();
  return this.save();
};

// Static methods
stockSchema.statics.findBySymbol = function (symbol, exchange = 'NSE') {
  return this.findOne({
    $or: [
      { symbol: symbol.toUpperCase() },
      { nseSymbol: symbol.toUpperCase() },
      { bseSymbol: symbol.toUpperCase() },
    ],
    exchange: { $in: [exchange, 'BOTH'] },
  });
};

stockSchema.statics.findTrending = function (limit = 50) {
  return this.find({ isActive: true })
    .sort({ trendingScore: -1, lastTrendingUpdate: -1 })
    .limit(limit);
};

stockSchema.statics.findBySector = function (sector, limit = 100) {
  return this.find({ sector, isActive: true })
    .sort({ marketCap: -1 })
    .limit(limit);
};

stockSchema.statics.searchStocks = function (query, limit = 20) {
  return this.find({
    $text: { $search: query },
    isActive: true,
  })
    .sort({ score: { $meta: 'textScore' } })
    .limit(limit);
};

// Pre-save middleware
stockSchema.pre('save', function (next) {
  // Ensure symbol is uppercase
  if (this.symbol) {
    this.symbol = this.symbol.toUpperCase();
  }

  // Update trending score based on search count and sentiment
  if (this.isModified('searchCount') || this.isModified('averageSentiment')) {
    this.trendingScore = this.calculateTrendingScore();
  }

  next();
});

// Method to calculate trending score
stockSchema.methods.calculateTrendingScore = function () {
  const searchWeight = 0.4;
  const sentimentWeight = 0.3;
  const recencyWeight = 0.3;

  const searchScore = Math.min(this.searchCount / 100, 1) * searchWeight;
  const sentimentScore = ((this.averageSentiment + 1) / 2) * sentimentWeight;

  const hoursSinceUpdate =
    (Date.now() - this.lastTrendingUpdate.getTime()) / (1000 * 60 * 60);
  const recencyScore = Math.max(0, 1 - hoursSinceUpdate / 24) * recencyWeight;

  return searchScore + sentimentScore + recencyScore;
};

// Export the model
module.exports = mongoose.model('Stock', stockSchema);
