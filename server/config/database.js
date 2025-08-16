const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const mongoURI =
      process.env.MONGODB_URI || "mongodb://localhost:27017/stock-sentiment";

    // Optimized connection options for bulk operations
    const connectionOptions = {
      // Connection pool settings
      maxPoolSize: 50, // Increased pool size for bulk operations
      minPoolSize: 5, // Minimum connections to maintain
      maxIdleTimeMS: 30000, // Close idle connections after 30s
      serverSelectionTimeoutMS: 10000, // Server selection timeout
      socketTimeoutMS: 45000, // Socket timeout
      connectTimeoutMS: 10000, // Connection timeout

      // Buffer settings (MongoDB 6+ compatible)
      bufferCommands: false, // Disable buffering to prevent timeouts

      // Write concern for bulk operations
      writeConcern: {
        w: 1, // Wait for primary acknowledgment
        j: false, // Don't wait for journal
        wtimeout: 10000, // Write timeout
      },

      // Read preferences
      readPreference: "primary",

      // Retry settings
      retryWrites: true,
      retryReads: true,

      // Heartbeat settings
      heartbeatFrequencyMS: 10000,

      // Compaction settings
      compressors: ["zlib"],
      zlibCompressionLevel: 6,
    };

    await mongoose.connect(mongoURI, connectionOptions);

    // Set global Mongoose options
    mongoose.set("bufferCommands", false);

    // Optimize for bulk operations
    mongoose.set("autoIndex", false); // Disable auto-indexing during bulk operations

    console.log("✅ MongoDB connected successfully with optimized settings");
    console.log(`   Pool Size: ${connectionOptions.maxPoolSize}`);
    console.log(`   Buffer Commands: ${connectionOptions.bufferCommands}`);
    console.log(
      `   Write Concern: w:${connectionOptions.writeConcern.w}, j:${connectionOptions.writeConcern.j}`
    );
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
    throw error;
  }
};

module.exports = { connectDB };
