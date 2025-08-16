const mongoose = require("mongoose");

const stockSchema = new mongoose.Schema(
  {
    ticker: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true, // Single index definition
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    exchange: {
      type: String,
      required: true,
      enum: ["NSE", "BSE", "NSE-BSE"],
      default: "NSE",
    },
    sector: {
      type: String,
      trim: true,
    },
    industry: {
      type: String,
      trim: true,
    },
    marketCap: {
      type: Number,
      min: 0,
    },
    isin: {
      type: String,
      trim: true,
    },
    faceValue: {
      type: Number,
      default: 10,
    },
    paidUpValue: {
      type: Number,
      default: 10,
    },
    marketLot: {
      type: Number,
      default: 1,
    },
    listingDate: {
      type: Date,
    },
    series: {
      type: String,
      trim: true,
    },
    source: {
      type: String,
      default: "MANUAL",
      enum: ["MANUAL", "NSE_CSV", "BSE_CSV", "API"],
    },
    dataHistory: [
      {
        date: { type: Date, default: Date.now },
        price: Number,
        volume: Number,
        change: Number,
        changePercent: Number,
      },
    ],
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    searchTokens: [String], // For enhanced search
    priority: {
      type: Number,
      default: 0,
      min: 0,
      max: 10,
    },
  },
  {
    timestamps: true,
    // Optimize for bulk operations
    strict: true,
    validateBeforeSave: false, // Skip validation during bulk operations
    suppressReservedKeysWarning: true, // Suppress the reserved keys warning
  }
);

// Optimized indexes for better search performance and bulk operations
stockSchema.index({ name: "text", sector: "text", industry: "text" });
// ticker index already defined above with unique: true
stockSchema.index({ marketCap: -1 });
stockSchema.index({ exchange: 1, isActive: 1 });
stockSchema.index({ source: 1, lastUpdated: -1 });
stockSchema.index({ priority: -1, marketCap: -1 });

// Virtual for display name
stockSchema.virtual("displayName").get(function () {
  return `${this.ticker} - ${this.name}`;
});

// Virtual for full exchange name
stockSchema.virtual("exchangeName").get(function () {
  const exchangeNames = {
    NSE: "National Stock Exchange",
    BSE: "Bombay Stock Exchange",
    "NSE-BSE": "NSE & BSE",
  };
  return exchangeNames[this.exchange] || this.exchange;
});

// Pre-save middleware to generate search tokens
stockSchema.pre("save", function (next) {
  if (
    this.isModified("name") ||
    this.isModified("sector") ||
    this.isModified("industry")
  ) {
    this.searchTokens = this.generateSearchTokens();
  }
  next();
});

// Method to generate search tokens
stockSchema.methods.generateSearchTokens = function () {
  const tokens = new Set();

  // Add ticker
  if (this.ticker) {
    tokens.add(this.ticker.toLowerCase());
    // Add partial ticker matches
    for (let i = 1; i <= this.ticker.length; i++) {
      tokens.add(this.ticker.substring(0, i).toLowerCase());
    }
  }

  // Add company name tokens
  if (this.name) {
    const nameWords = this.name.toLowerCase().split(/\s+/);
    nameWords.forEach((word) => {
      if (word.length >= 2) {
        tokens.add(word);
        // Add partial word matches
        for (let i = 2; i <= word.length; i++) {
          tokens.add(word.substring(0, i));
        }
      }
    });
  }

  // Add sector and industry
  if (this.sector) tokens.add(this.sector.toLowerCase());
  if (this.industry) tokens.add(this.industry.toLowerCase());

  return Array.from(tokens);
};

// Static method for enhanced search
stockSchema.statics.enhancedSearch = function (query, options = {}) {
  const {
    limit = 20,
    exchange = null,
    sector = null,
    sortBy = "priority",
    sortOrder = -1,
  } = options;

  const searchQuery = {
    isActive: true,
    $or: [
      { ticker: { $regex: query, $options: "i" } },
      { name: { $regex: query, $options: "i" } },
      { sector: { $regex: query, $options: "i" } },
      { industry: { $regex: query, $options: "i" } },
      { searchTokens: { $in: [query.toLowerCase()] } },
    ],
  };

  // Add filters
  if (exchange) searchQuery.exchange = exchange;
  if (sector) searchQuery.sector = sector;

  const sortOptions = {};
  sortOptions[sortBy] = sortOrder;
  if (sortBy !== "ticker") sortOptions.ticker = 1; // Secondary sort by ticker

  return this.find(searchQuery).sort(sortOptions).limit(limit).lean();
};

// Ensure virtual fields are serialized
stockSchema.set("toJSON", { virtuals: true });
stockSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("Stock", stockSchema);
