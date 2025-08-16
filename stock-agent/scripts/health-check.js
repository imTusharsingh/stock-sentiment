#!/usr/bin/env node

const ProductionNSEService = require("../src/services/ProductionNSEService");
const config = require("../config/production.config");

/**
 * Health Check Script
 * Validates service health and reports status
 */
class HealthChecker {
  constructor() {
    this.service = null;
    this.results = {
      overall: "unknown",
      checks: {},
      timestamp: new Date().toISOString(),
      duration: 0
    };
  }

  /**
   * Run comprehensive health checks
   */
  async runHealthChecks() {
    console.log("🏥 Stock Agent Health Check\n");
    const startTime = Date.now();

    try {
      // Initialize service
      await this.checkServiceInitialization();
      
      // Check configuration
      await this.checkConfiguration();
      
      // Check cache system
      await this.checkCacheSystem();
      
      // Check data availability
      await this.checkDataAvailability();
      
      // Check external dependencies
      await this.checkExternalDependencies();
      
      // Calculate overall health
      this.calculateOverallHealth();
      
    } catch (error) {
      this.results.checks.general = {
        status: "fail",
        message: `Health check failed: ${error.message}`,
        error: true
      };
      this.results.overall = "unhealthy";
    } finally {
      this.results.duration = Date.now() - startTime;
      this.printResults();
      
      if (this.service) {
        // Cleanup
        console.log("\n🧹 Cleaning up...");
      }
    }

    // Exit with appropriate code
    process.exit(this.results.overall === "healthy" ? 0 : 1);
  }

  /**
   * Check service initialization
   */
  async checkServiceInitialization() {
    console.log("📋 Checking service initialization...");
    
    try {
      this.service = new ProductionNSEService(config.nse);
      
      // Wait for initialization
      if (!this.service.isInitialized) {
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error("Service initialization timeout"));
          }, 5000);
          
          this.service.on("initialized", () => {
            clearTimeout(timeout);
            resolve();
          });
          
          this.service.on("error", (error) => {
            clearTimeout(timeout);
            reject(error);
          });
        });
      }
      
      this.results.checks.initialization = {
        status: "pass",
        message: "Service initialized successfully"
      };
      
      console.log("  ✅ Service initialization");
      
    } catch (error) {
      this.results.checks.initialization = {
        status: "fail",
        message: error.message,
        error: true
      };
      
      console.log(`  ❌ Service initialization: ${error.message}`);
      throw error;
    }
  }

  /**
   * Check configuration
   */
  async checkConfiguration() {
    console.log("📋 Checking configuration...");
    
    try {
      // Validate production config
      config.validateConfig(config);
      
      // Check required directories
      const fs = require("fs");
      if (!fs.existsSync(config.nse.cacheDir)) {
        throw new Error(`Cache directory does not exist: ${config.nse.cacheDir}`);
      }
      
      this.results.checks.configuration = {
        status: "pass",
        message: "Configuration is valid",
        cacheDir: config.nse.cacheDir,
        maxRetries: config.nse.maxRetries,
        timeout: config.nse.timeout
      };
      
      console.log("  ✅ Configuration validation");
      
    } catch (error) {
      this.results.checks.configuration = {
        status: "fail",
        message: error.message,
        error: true
      };
      
      console.log(`  ❌ Configuration: ${error.message}`);
    }
  }

  /**
   * Check cache system
   */
  async checkCacheSystem() {
    console.log("📋 Checking cache system...");
    
    try {
      const cacheStatus = this.service.getCacheStatus();
      const cacheEntries = Object.keys(cacheStatus).length;
      const validEntries = Object.values(cacheStatus).filter(s => s.valid).length;
      
      this.results.checks.cache = {
        status: "pass",
        message: `Cache system operational`,
        entries: cacheEntries,
        validEntries: validEntries,
        details: cacheStatus
      };
      
      console.log(`  ✅ Cache system (${validEntries}/${cacheEntries} valid entries)`);
      
    } catch (error) {
      this.results.checks.cache = {
        status: "fail",
        message: error.message,
        error: true
      };
      
      console.log(`  ❌ Cache system: ${error.message}`);
    }
  }

  /**
   * Check data availability
   */
  async checkDataAvailability() {
    console.log("📋 Checking data availability...");
    
    try {
      // Test basic fetch (should use cache if available)
      const result = await this.service.fetchAllStocks({ includeOptional: false });
      
      if (!result.success) {
        throw new Error(`Data fetch failed: ${result.error}`);
      }
      
      if (result.count < config.nse.minExpectedStocks) {
        throw new Error(`Insufficient stock count: ${result.count} < ${config.nse.minExpectedStocks}`);
      }
      
      // Check data freshness
      const health = this.service.getHealthStatus();
      const lastFetch = new Date(health.lastSuccessfulFetch || 0);
      const ageMinutes = Math.round((Date.now() - lastFetch.getTime()) / 1000 / 60);
      
      this.results.checks.data = {
        status: "pass",
        message: `Data available and fresh`,
        stockCount: result.count,
        lastFetch: health.lastSuccessfulFetch,
        ageMinutes: ageMinutes,
        breakdown: result.breakdown
      };
      
      console.log(`  ✅ Data availability (${result.count} stocks, ${ageMinutes}min old)`);
      
    } catch (error) {
      this.results.checks.data = {
        status: "fail",
        message: error.message,
        error: true
      };
      
      console.log(`  ❌ Data availability: ${error.message}`);
    }
  }

  /**
   * Check external dependencies
   */
  async checkExternalDependencies() {
    console.log("📋 Checking external dependencies...");
    
    try {
      const axios = require("axios");
      
      // Test actual CSV endpoint (first 1KB only for speed)
      const response = await axios.get("https://nsearchives.nseindia.com/content/equities/EQUITY_L.csv", {
        timeout: 15000,
        headers: { 
          Range: "bytes=0-1024", // Test only first 1KB
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        },
        validateStatus: (status) => status < 500 // Allow 4xx but not 5xx
      });
      
      if (response.status >= 500) {
        throw new Error(`NSE server error: ${response.status}`);
      }
      
      this.results.checks.external = {
        status: "pass",
        message: "External dependencies accessible",
        nseStatus: response.status,
        responseTime: response.headers["server-timing"] || "N/A"
      };
      
      console.log("  ✅ External dependencies");
      
    } catch (error) {
      this.results.checks.external = {
        status: "fail",
        message: error.message,
        error: true
      };
      
      console.log(`  ❌ External dependencies: ${error.message}`);
    }
  }

  /**
   * Calculate overall health status
   */
  calculateOverallHealth() {
    const checks = Object.values(this.results.checks);
    const failedChecks = checks.filter(check => check.status === "fail");
    const criticalFailures = failedChecks.filter(check => check.error);
    
    if (criticalFailures.length > 0) {
      this.results.overall = "unhealthy";
    } else if (failedChecks.length > 0) {
      this.results.overall = "degraded";
    } else {
      this.results.overall = "healthy";
    }
    
    this.results.summary = {
      totalChecks: checks.length,
      passedChecks: checks.filter(c => c.status === "pass").length,
      failedChecks: failedChecks.length,
      criticalFailures: criticalFailures.length
    };
  }

  /**
   * Print results
   */
  printResults() {
    console.log("\n" + "=".repeat(60));
    console.log("🏥 HEALTH CHECK RESULTS");
    console.log("=".repeat(60));
    
    const statusEmoji = {
      healthy: "🟢",
      degraded: "🟡", 
      unhealthy: "🔴"
    };
    
    console.log(`Overall Status: ${statusEmoji[this.results.overall]} ${this.results.overall.toUpperCase()}`);
    console.log(`Duration: ${this.results.duration}ms`);
    console.log(`Timestamp: ${this.results.timestamp}`);
    
    if (this.results.summary) {
      console.log(`\nSummary: ${this.results.summary.passedChecks}/${this.results.summary.totalChecks} checks passed`);
    }
    
    console.log("\nDetailed Results:");
    Object.entries(this.results.checks).forEach(([name, check]) => {
      const emoji = check.status === "pass" ? "✅" : "❌";
      console.log(`  ${emoji} ${name}: ${check.message}`);
    });
    
    // Show service metrics if available
    if (this.service) {
      const health = this.service.getHealthStatus();
      console.log("\nService Metrics:");
      console.log(`  Uptime: ${health.uptime}s`);
      console.log(`  Total Fetches: ${health.totalFetches}`);
      console.log(`  Success Rate: ${health.successRate}%`);
      console.log(`  Cache Hit Rate: ${Math.round(health.metrics.cacheHits / Math.max(health.metrics.totalRequests, 1) * 100)}%`);
    }
    
    console.log("=".repeat(60));
  }
}

// Run health check if called directly
if (require.main === module) {
  const checker = new HealthChecker();
  checker.runHealthChecks().catch(console.error);
}

module.exports = HealthChecker;
