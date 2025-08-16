/* eslint-disable no-console */
const mongoose = require('mongoose');

/**
 * Database Configuration
 * Handles MongoDB connection with environment variables
 */
class DatabaseConfig {
  constructor() {
    this.uri = process.env.MONGODB_URI;
    this.dbName = process.env.MONGODB_DB_NAME || 'stock_sentiment';
    this.options = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      bufferMaxEntries: 0,
      bufferCommands: false,
    };
  }

  /**
   * Connect to MongoDB
   * @returns {Promise<mongoose.Connection>}
   */
  async connect() {
    try {
      if (!this.uri) {
        throw new Error('MONGODB_URI environment variable is required');
      }

      console.log('🔄 Connecting to MongoDB...');

      const connection = await mongoose.connect(this.uri, this.options);

      console.log('✅ MongoDB connected successfully');
      console.log(`📊 Database: ${connection.connection.name}`);
      console.log(`🌐 Host: ${connection.connection.host}`);
      console.log(`🔌 Port: ${connection.connection.port}`);

      // Handle connection events
      this.setupEventHandlers(connection);

      return connection;
    } catch (error) {
      console.error('❌ MongoDB connection failed:', error.message);
      throw error;
    }
  }

  /**
   * Setup MongoDB connection event handlers
   * @param {mongoose.Connection} connection
   */
  setupEventHandlers(connection) {
    connection.on('connected', () => {
      console.log('🟢 MongoDB connection established');
    });

    connection.on('error', err => {
      console.error('🔴 MongoDB connection error:', err);
    });

    connection.on('disconnected', () => {
      console.log('🟡 MongoDB connection disconnected');
    });

    connection.on('reconnected', () => {
      console.log('🟢 MongoDB connection reestablished');
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      try {
        await connection.close();
        console.log('🔄 MongoDB connection closed through app termination');
        // Note: process.exit is necessary for graceful shutdown
        // eslint-disable-next-line no-process-exit
        process.exit(0);
      } catch (err) {
        console.error('❌ Error during MongoDB shutdown:', err);
        // eslint-disable-next-line no-process-exit
        process.exit(1);
      }
    });
  }

  /**
   * Disconnect from MongoDB
   * @returns {Promise<void>}
   */
  async disconnect() {
    try {
      await mongoose.disconnect();
      console.log('✅ MongoDB disconnected successfully');
    } catch (error) {
      console.error('❌ Error disconnecting from MongoDB:', error.message);
      throw error;
    }
  }

  /**
   * Get connection status
   * @returns {Object}
   */
  getStatus() {
    const connection = mongoose.connection;
    return {
      readyState: connection.readyState,
      name: connection.name,
      host: connection.host,
      port: connection.port,
      isConnected: connection.readyState === 1,
      readyStateText: this.getReadyStateText(connection.readyState),
    };
  }

  /**
   * Get human-readable ready state
   * @param {number} readyState
   * @returns {string}
   */
  getReadyStateText(readyState) {
    const states = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting',
    };
    return states[readyState] || 'unknown';
  }

  /**
   * Test database connection
   * @returns {Promise<boolean>}
   */
  async testConnection() {
    try {
      await this.connect();
      const status = this.getStatus();

      if (status.isConnected) {
        console.log('✅ Database connection test successful');
        return true;
      } else {
        console.log('❌ Database connection test failed');
        return false;
      }
    } catch (error) {
      console.error('❌ Database connection test error:', error.message);
      return false;
    }
  }
}

// Create singleton instance
const databaseConfig = new DatabaseConfig();

module.exports = databaseConfig;
