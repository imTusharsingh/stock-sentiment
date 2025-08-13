const mongoose = require("mongoose");

const stockSchema = new mongoose.Schema(
  {
    ticker: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
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
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for better search performance (removed duplicate ticker index)
stockSchema.index({ name: "text", sector: "text" });
stockSchema.index({ marketCap: -1 });
stockSchema.index({ exchange: 1, isActive: 1 });

// Virtual for display name
stockSchema.virtual("displayName").get(function () {
  return `${this.ticker} - ${this.name}`;
});

// Ensure virtual fields are serialized
stockSchema.set("toJSON", { virtuals: true });
stockSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("Stock", stockSchema);
