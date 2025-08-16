#!/usr/bin/env node

/**
 * Stock Discovery Agent - Production Entry Point
 */

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const rateLimit = require("express-rate-limit");

const ProductionNSEService = require("./services/ProductionNSEService");
const config = require("../config/production.config");

class StockAgentApp {
  constructor() {
    this.app = express();
    this.server = null;
    this.nseService = null;
    this.isShuttingDown = false;
    
    this.metrics = {
      startTime: Date.now(),
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      uptime: () => Math.round((Date.now() - this.metrics.startTime) / 1000)
    };
  }

  async initialize() {
    try {
      console.log("🚀 Initializing Stock Discovery Agent...");
      
      config.validateConfig(config);
      console.log("✅ Configuration validated");
      
      this.nseService = new ProductionNSEService(config.nse);
      console.log("✅ NSE Service initialized");
      
      this.setupEventListeners();
      this.setupMiddleware();
      this.setupRoutes();
      this.setupErrorHandling();
      
      console.log("✅ Application initialization complete");
      
    } catch (error) {
      console.error("❌ Initialization failed:", error.message);
      process.exit(1);
    }
  }

  setupEventListeners() {
    this.nseService.on("fetchCompleted", (data) => {
      console.log(`📊 Data fetch completed: ${data.count} stocks in ${Math.round(data.duration/1000)}s`);
    });

    this.nseService.on("fetchFailed", (data) => {
      console.error(`❌ Data fetch failed: ${data.error}`);
    });

    process.on("SIGTERM", () => this.gracefulShutdown("SIGTERM"));
    process.on("SIGINT", () => this.gracefulShutdown("SIGINT"));
  }

  setupMiddleware() {
    this.app.use(helmet());
    this.app.use(cors(config.api.cors));
    
    if (config.performance.compression.enabled) {
      this.app.use(compression({
        level: config.performance.compression.level,
        threshold: config.performance.compression.threshold
      }));
    }
    
    const limiter = rateLimit({
      windowMs: config.api.rateLimit.windowMs,
      max: config.api.rateLimit.max,
      message: { error: "Too many requests, please try again later" }
    });
    this.app.use(limiter);
    
    this.app.use(express.json({ limit: config.security.validation.maxRequestSize }));
    
    this.app.use((req, res, next) => {
      this.metrics.totalRequests++;
      
      res.on("finish", () => {
        if (res.statusCode < 400) {
          this.metrics.successfulRequests++;
        } else {
          this.metrics.failedRequests++;
        }
      });
      
      next();
    });
  }

  setupRoutes() {
    // Health check
    this.app.get("/health", (req, res) => {
      const health = {
        status: this.isShuttingDown ? "shutting-down" : "healthy",
        timestamp: new Date().toISOString(),
        uptime: this.metrics.uptime(),
        version: config.service.version
      };
      res.status(health.status === "healthy" ? 200 : 503).json(health);
    });

    // Get all stocks
    this.app.get("/stocks", async (req, res) => {
      try {
        const result = await this.nseService.fetchAllStocks({
          includeOptional: req.query.includeOptional !== "false",
          forceRefresh: req.query.forceRefresh === "true"
        });
        
        if (result.success) {
          res.json({
            success: true,
            data: result.stocks,
            count: result.count,
            source: result.source
          });
        } else {
          res.status(500).json({
            success: false,
            error: result.error
          });
        }
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    // Search stocks
    this.app.get("/stocks/search", async (req, res) => {
      try {
        const query = req.query.q || req.query.query;
        if (!query) {
          return res.status(400).json({
            success: false,
            error: "Search query is required"
          });
        }
        
        const limit = Math.min(
          parseInt(req.query.limit) || 20,
          100
        );
        
        const result = await this.nseService.searchStocks(query, { limit });
        
        if (result.success) {
          res.json({
            success: true,
            data: result.stocks,
            count: result.count,
            query: result.query
          });
        } else {
          res.status(500).json({
            success: false,
            error: result.error
          });
        }
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    // Get specific stock
    this.app.get("/stocks/:symbol", async (req, res) => {
      try {
        const symbol = req.params.symbol.toUpperCase();
        const result = await this.nseService.getStock(symbol);
        
        if (result.success) {
          res.json({
            success: true,
            data: result.stock
          });
        } else {
          res.status(404).json({
            success: false,
            error: result.error
          });
        }
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    // Force refresh cache
    this.app.post("/cache/refresh", async (req, res) => {
      try {
        const result = await this.nseService.forceRefresh();
        
        if (result.success) {
          res.json({
            success: true,
            message: "Cache refreshed",
            count: result.count
          });
        } else {
          res.status(500).json({
            success: false,
            error: result.error
          });
        }
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    // Root endpoint
    this.app.get("/", (req, res) => {
      res.json({
        name: config.service.name,
        version: config.service.version,
        description: "Production NSE Stock Data API",
        endpoints: {
          health: "GET /health",
          stocks: "GET /stocks",
          search: "GET /stocks/search?q=query",
          getStock: "GET /stocks/:symbol",
          refreshCache: "POST /cache/refresh"
        }
      });
    });
  }

  setupErrorHandling() {
    this.app.use((req, res) => {
      res.status(404).json({
        success: false,
        error: "Endpoint not found"
      });
    });

    this.app.use((error, req, res, next) => {
      console.error("💥 Error:", error);
      
      res.status(500).json({
        success: false,
        error: "Internal server error"
      });
    });
  }

  async start() {
    try {
      await this.initialize();
      
      const port = config.api.port;
      const host = config.api.host;
      
      this.server = this.app.listen(port, host, () => {
        console.log("🌟 Stock Discovery Agent started!");
        console.log(`📡 API Server: http://${host}:${port}`);
        console.log(`🏥 Health: http://${host}:${port}/health`);
        console.log(`🔍 Search: http://${host}:${port}/stocks/search?q=RELIANCE`);
        console.log("🚀 Ready to serve stock data!");
      });
      
    } catch (error) {
      console.error("❌ Failed to start server:", error.message);
      process.exit(1);
    }
  }

  async gracefulShutdown(signal) {
    if (this.isShuttingDown) return;
    
    this.isShuttingDown = true;
    console.log(`\n🛑 Received ${signal}. Shutting down gracefully...`);
    
    if (this.server) {
      this.server.close(() => {
        console.log("✅ Server closed");
        process.exit(0);
      });
    }
  }
}

if (require.main === module) {
  const app = new StockAgentApp();
  app.start().catch(console.error);
}

module.exports = StockAgentApp;
