const path = require("path");

/**
 * Production Configuration for Stock Agent
 * Optimized for reliability, performance, and monitoring
 */
module.exports = {
  // Service Configuration
  service: {
    name: "stock-agent",
    version: "1.0.0",
    environment: process.env.NODE_ENV || "production",
    port: process.env.PORT || 3001,
    host: process.env.HOST || "0.0.0.0"
  },

  // NSE Data Service Configuration
  nse: {
    // Cache settings
    cacheDir: process.env.CACHE_DIR || path.join(__dirname, "../cache"),
    cacheMaxAge: parseInt(process.env.CACHE_MAX_AGE) || 6 * 60 * 60 * 1000, // 6 hours
    
    // Request settings
    maxRetries: parseInt(process.env.NSE_MAX_RETRIES) || 3,
    retryDelay: parseInt(process.env.NSE_RETRY_DELAY) || 2000,
    timeout: parseInt(process.env.NSE_TIMEOUT) || 30000,
    maxConcurrentDownloads: parseInt(process.env.NSE_MAX_CONCURRENT) || 3,
    
    // Force refresh settings
    forceRefresh: process.env.NSE_FORCE_REFRESH === "true",
    
    // Monitoring
    enableMetrics: process.env.NSE_ENABLE_METRICS !== "false",
    
    // Data validation
    minExpectedStocks: parseInt(process.env.NSE_MIN_STOCKS) || 1000,
    maxDataAge: parseInt(process.env.NSE_MAX_DATA_AGE) || 24 * 60 * 60 * 1000 // 24 hours
  },

  // Caching Strategy
  cache: {
    strategy: process.env.CACHE_STRATEGY || "file", // file, redis, memory
    redis: {
      host: process.env.REDIS_HOST || "localhost",
      port: parseInt(process.env.REDIS_PORT) || 6379,
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB) || 0,
      keyPrefix: process.env.REDIS_KEY_PREFIX || "stock-agent:",
      ttl: parseInt(process.env.REDIS_TTL) || 6 * 60 * 60 // 6 hours
    }
  },

  // Scheduling Configuration
  scheduler: {
    enabled: process.env.SCHEDULER_ENABLED !== "false",
    
    // Update schedules (cron format)
    schedules: {
      // Full refresh every 6 hours during market hours
      fullRefresh: process.env.CRON_FULL_REFRESH || "0 */6 * * 1-5", // Every 6 hours, Mon-Fri
      
      // Health check every hour
      healthCheck: process.env.CRON_HEALTH_CHECK || "0 * * * *", // Every hour
      
      // Cache cleanup daily at 2 AM
      cacheCleanup: process.env.CRON_CACHE_CLEANUP || "0 2 * * *", // 2 AM daily
      
      // Force refresh on market opening (9:15 AM IST)
      marketOpen: process.env.CRON_MARKET_OPEN || "15 9 * * 1-5" // 9:15 AM, Mon-Fri
    },
    
    // Market hours (IST)
    marketHours: {
      start: process.env.MARKET_START || "09:15",
      end: process.env.MARKET_END || "15:30",
      timezone: process.env.MARKET_TIMEZONE || "Asia/Kolkata"
    }
  },

  // API Configuration
  api: {
    enabled: process.env.API_ENABLED !== "false",
    port: parseInt(process.env.API_PORT) || 3001,
    host: process.env.API_HOST || "0.0.0.0",
    
    // Rate limiting
    rateLimit: {
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW) || 15 * 60 * 1000, // 15 minutes
      max: parseInt(process.env.RATE_LIMIT_MAX) || 1000, // requests per window
      skipSuccessfulRequests: false
    },
    
    // CORS settings
    cors: {
      origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(",") : ["*"],
      credentials: true
    },
    
    // Response settings
    pagination: {
      defaultLimit: parseInt(process.env.API_DEFAULT_LIMIT) || 20,
      maxLimit: parseInt(process.env.API_MAX_LIMIT) || 100
    }
  },

  // Logging Configuration
  logging: {
    level: process.env.LOG_LEVEL || "info", // error, warn, info, debug
    format: process.env.LOG_FORMAT || "json", // json, text
    
    // File logging
    file: {
      enabled: process.env.LOG_FILE_ENABLED !== "false",
      filename: process.env.LOG_FILE || path.join(__dirname, "../logs/stock-agent.log"),
      maxSize: process.env.LOG_MAX_SIZE || "10m",
      maxFiles: parseInt(process.env.LOG_MAX_FILES) || 5,
      compress: process.env.LOG_COMPRESS !== "false"
    },
    
    // Console logging
    console: {
      enabled: process.env.LOG_CONSOLE_ENABLED !== "false",
      colorize: process.env.NODE_ENV !== "production"
    },
    
    // External logging services
    external: {
      enabled: process.env.LOG_EXTERNAL_ENABLED === "true",
      service: process.env.LOG_EXTERNAL_SERVICE, // datadog, newrelic, etc.
      apiKey: process.env.LOG_EXTERNAL_API_KEY
    }
  },

  // Monitoring & Health Checks
  monitoring: {
    enabled: process.env.MONITORING_ENABLED !== "false",
    
    // Health check endpoints
    health: {
      enabled: process.env.HEALTH_CHECK_ENABLED !== "false",
      endpoint: process.env.HEALTH_ENDPOINT || "/health",
      detailedEndpoint: process.env.HEALTH_DETAILED_ENDPOINT || "/health/detailed"
    },
    
    // Metrics collection
    metrics: {
      enabled: process.env.METRICS_ENABLED !== "false",
      endpoint: process.env.METRICS_ENDPOINT || "/metrics",
      collectInterval: parseInt(process.env.METRICS_INTERVAL) || 60000, // 1 minute
      retentionPeriod: parseInt(process.env.METRICS_RETENTION) || 24 * 60 * 60 * 1000 // 24 hours
    },
    
    // Alerting thresholds
    alerts: {
      enabled: process.env.ALERTS_ENABLED === "true",
      
      thresholds: {
        errorRate: parseFloat(process.env.ALERT_ERROR_RATE) || 0.05, // 5%
        responseTime: parseInt(process.env.ALERT_RESPONSE_TIME) || 10000, // 10 seconds
        failedFetches: parseInt(process.env.ALERT_FAILED_FETCHES) || 3,
        cacheHitRate: parseFloat(process.env.ALERT_CACHE_HIT_RATE) || 0.8 // 80%
      },
      
      notifications: {
        email: process.env.ALERT_EMAIL,
        webhook: process.env.ALERT_WEBHOOK,
        slack: process.env.ALERT_SLACK_WEBHOOK
      }
    }
  },

  // Database Configuration (optional)
  database: {
    enabled: process.env.DATABASE_ENABLED === "true",
    type: process.env.DATABASE_TYPE || "mongodb", // mongodb, postgresql
    
    mongodb: {
      uri: process.env.MONGODB_URI || "mongodb://localhost:27017/stock-agent",
      options: {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        maxPoolSize: parseInt(process.env.MONGODB_MAX_POOL) || 10,
        serverSelectionTimeoutMS: parseInt(process.env.MONGODB_TIMEOUT) || 5000
      }
    },
    
    postgresql: {
      host: process.env.POSTGRES_HOST || "localhost",
      port: parseInt(process.env.POSTGRES_PORT) || 5432,
      database: process.env.POSTGRES_DB || "stock_agent",
      username: process.env.POSTGRES_USER || "postgres",
      password: process.env.POSTGRES_PASSWORD,
      pool: {
        max: parseInt(process.env.POSTGRES_POOL_MAX) || 10,
        min: parseInt(process.env.POSTGRES_POOL_MIN) || 0,
        acquire: parseInt(process.env.POSTGRES_POOL_ACQUIRE) || 30000,
        idle: parseInt(process.env.POSTGRES_POOL_IDLE) || 10000
      }
    }
  },

  // Security Configuration
  security: {
    // API Security
    api: {
      enabled: process.env.API_SECURITY_ENABLED !== "false",
      
      // API Key authentication
      apiKey: {
        enabled: process.env.API_KEY_ENABLED === "true",
        header: process.env.API_KEY_HEADER || "X-API-Key",
        keys: process.env.API_KEYS ? process.env.API_KEYS.split(",") : []
      },
      
      // JWT authentication
      jwt: {
        enabled: process.env.JWT_ENABLED === "true",
        secret: process.env.JWT_SECRET,
        expiresIn: process.env.JWT_EXPIRES_IN || "1h"
      }
    },
    
    // Request validation
    validation: {
      enabled: process.env.REQUEST_VALIDATION_ENABLED !== "false",
      maxRequestSize: process.env.MAX_REQUEST_SIZE || "1mb",
      sanitizeInput: process.env.SANITIZE_INPUT !== "false"
    },
    
    // IP filtering
    ipFilter: {
      enabled: process.env.IP_FILTER_ENABLED === "true",
      whitelist: process.env.IP_WHITELIST ? process.env.IP_WHITELIST.split(",") : [],
      blacklist: process.env.IP_BLACKLIST ? process.env.IP_BLACKLIST.split(",") : []
    }
  },

  // Performance Configuration
  performance: {
    // Response caching
    responseCache: {
      enabled: process.env.RESPONSE_CACHE_ENABLED !== "false",
      ttl: parseInt(process.env.RESPONSE_CACHE_TTL) || 300, // 5 minutes
      maxEntries: parseInt(process.env.RESPONSE_CACHE_MAX) || 1000
    },
    
    // Compression
    compression: {
      enabled: process.env.COMPRESSION_ENABLED !== "false",
      level: parseInt(process.env.COMPRESSION_LEVEL) || 6,
      threshold: parseInt(process.env.COMPRESSION_THRESHOLD) || 1024
    },
    
    // Connection pooling
    keepAlive: {
      enabled: process.env.KEEP_ALIVE_ENABLED !== "false",
      timeout: parseInt(process.env.KEEP_ALIVE_TIMEOUT) || 5000
    }
  },

  // Error Handling
  errorHandling: {
    // Global error handling
    global: {
      enabled: process.env.GLOBAL_ERROR_HANDLING !== "false",
      logStackTrace: process.env.LOG_STACK_TRACE !== "false"
    },
    
    // Circuit breaker
    circuitBreaker: {
      enabled: process.env.CIRCUIT_BREAKER_ENABLED === "true",
      failureThreshold: parseInt(process.env.CB_FAILURE_THRESHOLD) || 5,
      resetTimeout: parseInt(process.env.CB_RESET_TIMEOUT) || 60000 // 1 minute
    },
    
    // Graceful shutdown
    gracefulShutdown: {
      enabled: process.env.GRACEFUL_SHUTDOWN_ENABLED !== "false",
      timeout: parseInt(process.env.SHUTDOWN_TIMEOUT) || 30000 // 30 seconds
    }
  },

  // Development & Testing
  development: {
    // Hot reload
    hotReload: process.env.HOT_RELOAD_ENABLED === "true",
    
    // Debug mode
    debug: process.env.DEBUG === "true",
    
    // Mock data
    mockData: process.env.MOCK_DATA_ENABLED === "true",
    
    // Testing
    testing: {
      enabled: process.env.TESTING_ENABLED === "true",
      coverage: process.env.TEST_COVERAGE_ENABLED === "true",
      parallel: process.env.TEST_PARALLEL_ENABLED !== "false"
    }
  }
};

// Validation function
function validateConfig(config) {
  const errors = [];
  
  // Required environment checks
  if (config.service.environment === "production") {
    if (!config.logging.file.filename) {
      errors.push("Log file path is required in production");
    }
    
    if (config.security.api.apiKey.enabled && !config.security.api.apiKey.keys.length) {
      errors.push("API keys are required when API key authentication is enabled");
    }
    
    if (config.security.api.jwt.enabled && !config.security.api.jwt.secret) {
      errors.push("JWT secret is required when JWT authentication is enabled");
    }
  }
  
  // Numeric validations
  if (config.nse.maxRetries < 1 || config.nse.maxRetries > 10) {
    errors.push("NSE maxRetries must be between 1 and 10");
  }
  
  if (config.nse.timeout < 5000 || config.nse.timeout > 300000) {
    errors.push("NSE timeout must be between 5000ms and 300000ms");
  }
  
  if (errors.length > 0) {
    throw new Error(`Configuration validation failed:\n${errors.join("\n")}`);
  }
  
  return true;
}

// Export validation function
module.exports.validateConfig = validateConfig;
