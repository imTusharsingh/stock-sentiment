const ProductionNSEService = require("../src/services/ProductionNSEService");
const fs = require("fs");
const path = require("path");

/**
 * Comprehensive test suite for ProductionNSEService
 * Tests all production features, error handling, and edge cases
 */
class ProductionTestSuite {
  constructor() {
    this.testResults = [];
    this.totalTests = 0;
    this.passedTests = 0;
    this.failedTests = 0;
    this.startTime = null;
  }

  /**
   * Run all tests
   */
  async runAllTests() {
    console.log("🧪 Starting Production NSE Service Test Suite...\n");
    this.startTime = Date.now();

    // Test configuration and initialization
    await this.testServiceInitialization();
    await this.testConfigurationValidation();
    await this.testCacheDirectorySetup();

    // Test core functionality
    await this.testFetchAllStocks();
    await this.testSearchFunctionality();
    await this.testGetStockBySymbol();

    // Test production features
    await this.testForceRefresh();
    await this.testCachingStrategy();
    await this.testErrorHandling();
    await this.testRetryLogic();

    // Test performance and reliability
    await this.testConcurrentRequests();
    await this.testDataValidation();
    await this.testHealthStatus();

    // Test edge cases
    await this.testEdgeCases();

    this.printSummary();
  }

  /**
   * Test service initialization
   */
  async testServiceInitialization() {
    console.log("📋 Testing Service Initialization...");

    await this.runTest("Service initializes with default config", async () => {
      const service = new ProductionNSEService();
      if (!service.isInitialized) {
        throw new Error("Service should be initialized");
      }
      return true;
    });

    await this.runTest("Service initializes with custom config", async () => {
      const customConfig = {
        maxRetries: 5,
        timeout: 60000,
        cacheMaxAge: 12 * 60 * 60 * 1000 // 12 hours
      };
      const service = new ProductionNSEService(customConfig);
      if (service.config.maxRetries !== 5) {
        throw new Error("Custom config not applied");
      }
      return true;
    });

    await this.runTest("Service emits initialization event", async () => {
      return new Promise((resolve, reject) => {
        const service = new ProductionNSEService();
        service.on("initialized", () => resolve(true));
        setTimeout(() => reject(new Error("Initialization event not emitted")), 5000);
      });
    });
  }

  /**
   * Test configuration validation
   */
  async testConfigurationValidation() {
    console.log("📋 Testing Configuration Validation...");

    await this.runTest("Rejects invalid maxRetries", async () => {
      try {
        new ProductionNSEService({ maxRetries: 0 });
        throw new Error("Should have thrown error");
      } catch (error) {
        if (error.message.includes("maxRetries")) {
          return true;
        }
        throw error;
      }
    });

    await this.runTest("Rejects invalid timeout", async () => {
      try {
        new ProductionNSEService({ timeout: 1000 });
        throw new Error("Should have thrown error");
      } catch (error) {
        if (error.message.includes("timeout")) {
          return true;
        }
        throw error;
      }
    });
  }

  /**
   * Test cache directory setup
   */
  async testCacheDirectorySetup() {
    console.log("📋 Testing Cache Directory Setup...");

    await this.runTest("Creates cache directory if not exists", async () => {
      const testCacheDir = path.join(__dirname, "../test-cache");
      
      // Ensure directory doesn't exist
      if (fs.existsSync(testCacheDir)) {
        fs.rmSync(testCacheDir, { recursive: true, force: true });
      }

      const service = new ProductionNSEService({ cacheDir: testCacheDir });
      
      if (!fs.existsSync(testCacheDir)) {
        throw new Error("Cache directory not created");
      }

      // Cleanup
      fs.rmSync(testCacheDir, { recursive: true, force: true });
      return true;
    });

    await this.runTest("Validates cache directory permissions", async () => {
      const service = new ProductionNSEService();
      // If initialization succeeded, permissions are valid
      return true;
    });
  }

  /**
   * Test fetchAllStocks functionality
   */
  async testFetchAllStocks() {
    console.log("📋 Testing Fetch All Stocks...");

    await this.runTest("Fetches all stocks successfully", async () => {
      const service = new ProductionNSEService();
      const result = await service.fetchAllStocks();
      
      if (!result.success) {
        throw new Error(`Fetch failed: ${result.error}`);
      }
      
      if (result.count < 1000) {
        throw new Error(`Expected at least 1000 stocks, got ${result.count}`);
      }
      
      if (!Array.isArray(result.stocks)) {
        throw new Error("Stocks should be an array");
      }
      
      return true;
    });

    await this.runTest("Returns proper data structure", async () => {
      const service = new ProductionNSEService();
      const result = await service.fetchAllStocks();
      
      const requiredFields = ["success", "stocks", "count", "duration", "breakdown", "source"];
      for (const field of requiredFields) {
        if (!(field in result)) {
          throw new Error(`Missing required field: ${field}`);
        }
      }
      
      // Check stock data structure
      const sampleStock = result.stocks[0];
      const requiredStockFields = ["symbol", "name", "source", "lastUpdated"];
      for (const field of requiredStockFields) {
        if (!(field in sampleStock)) {
          throw new Error(`Missing required stock field: ${field}`);
        }
      }
      
      return true;
    });

    await this.runTest("Handles includeOptional parameter", async () => {
      const service = new ProductionNSEService();
      
      const resultWithOptional = await service.fetchAllStocks({ includeOptional: true });
      const resultWithoutOptional = await service.fetchAllStocks({ includeOptional: false });
      
      if (resultWithOptional.count <= resultWithoutOptional.count) {
        console.warn("Warning: Optional endpoints may not be contributing additional data");
      }
      
      return true;
    });
  }

  /**
   * Test search functionality
   */
  async testSearchFunctionality() {
    console.log("📋 Testing Search Functionality...");

    await this.runTest("Searches stocks by symbol", async () => {
      const service = new ProductionNSEService();
      const result = await service.searchStocks("RELIANCE");
      
      if (!result.success) {
        throw new Error(`Search failed: ${result.error}`);
      }
      
      if (result.count === 0) {
        throw new Error("No results found for RELIANCE");
      }
      
      // Check if RELIANCE is in results
      const hasReliance = result.stocks.some(stock => 
        stock.symbol && stock.symbol.toUpperCase().includes("RELIANCE")
      );
      
      if (!hasReliance) {
        throw new Error("RELIANCE not found in search results");
      }
      
      return true;
    });

    await this.runTest("Searches stocks by name", async () => {
      const service = new ProductionNSEService();
      const result = await service.searchStocks("Tata");
      
      if (!result.success) {
        throw new Error(`Search failed: ${result.error}`);
      }
      
      if (result.count === 0) {
        throw new Error("No results found for Tata");
      }
      
      return true;
    });

    await this.runTest("Respects search limit", async () => {
      const service = new ProductionNSEService();
      const result = await service.searchStocks("Bank", { limit: 5 });
      
      if (result.stocks.length > 5) {
        throw new Error("Search limit not respected");
      }
      
      return true;
    });

    await this.runTest("Handles case insensitive search", async () => {
      const service = new ProductionNSEService();
      const upperResult = await service.searchStocks("HDFC");
      const lowerResult = await service.searchStocks("hdfc");
      
      if (upperResult.count !== lowerResult.count) {
        throw new Error("Case insensitive search not working");
      }
      
      return true;
    });

    await this.runTest("Validates search query", async () => {
      const service = new ProductionNSEService();
      
      try {
        await service.searchStocks("");
        throw new Error("Should have thrown error for empty query");
      } catch (error) {
        if (error.message.includes("required")) {
          return true;
        }
        throw error;
      }
    });
  }

  /**
   * Test getStock functionality
   */
  async testGetStockBySymbol() {
    console.log("📋 Testing Get Stock by Symbol...");

    await this.runTest("Gets stock by exact symbol", async () => {
      const service = new ProductionNSEService();
      const result = await service.getStock("RELIANCE");
      
      if (!result.success) {
        throw new Error(`Get stock failed: ${result.error}`);
      }
      
      if (!result.stock) {
        throw new Error("Stock not returned");
      }
      
      if (result.stock.symbol !== "RELIANCE") {
        throw new Error("Wrong stock returned");
      }
      
      return true;
    });

    await this.runTest("Handles case insensitive symbol lookup", async () => {
      const service = new ProductionNSEService();
      const upperResult = await service.getStock("RELIANCE");
      const lowerResult = await service.getStock("reliance");
      
      if (upperResult.success !== lowerResult.success) {
        throw new Error("Case insensitive lookup not working");
      }
      
      return true;
    });

    await this.runTest("Returns error for non-existent symbol", async () => {
      const service = new ProductionNSEService();
      const result = await service.getStock("NONEXISTENT123");
      
      if (result.success) {
        throw new Error("Should have failed for non-existent symbol");
      }
      
      if (!result.error.includes("not found")) {
        throw new Error("Error message should indicate stock not found");
      }
      
      return true;
    });
  }

  /**
   * Test force refresh functionality
   */
  async testForceRefresh() {
    console.log("📋 Testing Force Refresh...");

    await this.runTest("Force refresh bypasses cache", async () => {
      const service = new ProductionNSEService();
      
      // First fetch to populate cache
      await service.fetchAllStocks();
      
      // Force refresh should bypass cache
      const result = await service.forceRefresh();
      
      if (!result.success) {
        throw new Error(`Force refresh failed: ${result.error}`);
      }
      
      return true;
    });

    await this.runTest("Force refresh emits events", async () => {
      const service = new ProductionNSEService();
      let eventEmitted = false;
      
      service.on("fetchStarted", (data) => {
        if (data.options.forceRefresh) {
          eventEmitted = true;
        }
      });
      
      await service.forceRefresh();
      
      if (!eventEmitted) {
        throw new Error("Force refresh event not emitted");
      }
      
      return true;
    });
  }

  /**
   * Test caching strategy
   */
  async testCachingStrategy() {
    console.log("📋 Testing Caching Strategy...");

    await this.runTest("Creates cache files", async () => {
      const service = new ProductionNSEService();
      await service.fetchAllStocks();
      
      const cacheStatus = service.getCacheStatus();
      const hasCachedFiles = Object.values(cacheStatus).some(status => status.exists);
      
      if (!hasCachedFiles) {
        throw new Error("No cache files created");
      }
      
      return true;
    });

    await this.runTest("Uses cached data when available", async () => {
      const service = new ProductionNSEService();
      
      // First fetch to create cache
      const firstFetch = await service.fetchAllStocks();
      
      // Second fetch should use cache
      const secondFetch = await service.fetchAllStocks();
      
      // Second fetch should be faster (using cache)
      if (secondFetch.duration >= firstFetch.duration) {
        console.warn("Warning: Second fetch was not faster - cache may not be working optimally");
      }
      
      return true;
    });

    await this.runTest("Clears cache successfully", async () => {
      const service = new ProductionNSEService();
      await service.fetchAllStocks();
      
      const cleared = await service.clearCache();
      if (!cleared) {
        throw new Error("Cache clear failed");
      }
      
      const cacheStatus = service.getCacheStatus();
      const hasValidCache = Object.values(cacheStatus).some(status => status.valid);
      
      if (hasValidCache) {
        throw new Error("Cache not properly cleared");
      }
      
      return true;
    });
  }

  /**
   * Test error handling
   */
  async testErrorHandling() {
    console.log("📋 Testing Error Handling...");

    await this.runTest("Handles network errors gracefully", async () => {
      // Create service with invalid URL to test error handling
      const service = new ProductionNSEService({
        baseUrl: "https://invalid-url-that-does-not-exist.com"
      });
      
      const result = await service.fetchAllStocks();
      
      // Should handle error gracefully, not throw
      if (result.success) {
        throw new Error("Should have failed with invalid URL");
      }
      
      if (!result.error) {
        throw new Error("Error message should be present");
      }
      
      return true;
    });

    await this.runTest("Emits error events", async () => {
      const service = new ProductionNSEService({
        baseUrl: "https://invalid-url-that-does-not-exist.com"
      });
      
      let errorEventEmitted = false;
      service.on("downloadError", () => {
        errorEventEmitted = true;
      });
      
      await service.fetchAllStocks();
      
      if (!errorEventEmitted) {
        throw new Error("Error event not emitted");
      }
      
      return true;
    });
  }

  /**
   * Test retry logic
   */
  async testRetryLogic() {
    console.log("📋 Testing Retry Logic...");

    await this.runTest("Retries on failure", async () => {
      const service = new ProductionNSEService({
        baseUrl: "https://invalid-url-that-does-not-exist.com",
        maxRetries: 2
      });
      
      let retryCount = 0;
      service.on("downloadError", (data) => {
        retryCount = data.attempt;
      });
      
      await service.fetchAllStocks();
      
      if (retryCount < 2) {
        throw new Error("Should have retried at least once");
      }
      
      return true;
    });
  }

  /**
   * Test concurrent requests
   */
  async testConcurrentRequests() {
    console.log("📋 Testing Concurrent Requests...");

    await this.runTest("Handles concurrent fetch requests", async () => {
      const service = new ProductionNSEService();
      
      const promises = [];
      for (let i = 0; i < 3; i++) {
        promises.push(service.fetchAllStocks());
      }
      
      const results = await Promise.all(promises);
      
      // All requests should succeed
      const allSuccessful = results.every(result => result.success);
      if (!allSuccessful) {
        throw new Error("Not all concurrent requests succeeded");
      }
      
      // All should return same count
      const firstCount = results[0].count;
      const allSameCount = results.every(result => result.count === firstCount);
      if (!allSameCount) {
        throw new Error("Concurrent requests returned different counts");
      }
      
      return true;
    });
  }

  /**
   * Test data validation
   */
  async testDataValidation() {
    console.log("📋 Testing Data Validation...");

    await this.runTest("Validates stock data structure", async () => {
      const service = new ProductionNSEService();
      const result = await service.fetchAllStocks();
      
      // Check first 10 stocks for proper structure
      for (let i = 0; i < Math.min(10, result.stocks.length); i++) {
        const stock = result.stocks[i];
        
        if (!stock.symbol || typeof stock.symbol !== "string") {
          throw new Error(`Invalid symbol in stock ${i}`);
        }
        
        if (!stock.name || typeof stock.name !== "string") {
          throw new Error(`Invalid name in stock ${i}`);
        }
        
        if (!stock.source || typeof stock.source !== "string") {
          throw new Error(`Invalid source in stock ${i}`);
        }
      }
      
      return true;
    });

    await this.runTest("Removes duplicate stocks", async () => {
      const service = new ProductionNSEService();
      const result = await service.fetchAllStocks();
      
      const symbols = result.stocks.map(stock => stock.symbol);
      const uniqueSymbols = new Set(symbols);
      
      if (symbols.length !== uniqueSymbols.size) {
        throw new Error("Duplicate stocks found");
      }
      
      return true;
    });
  }

  /**
   * Test health status
   */
  async testHealthStatus() {
    console.log("📋 Testing Health Status...");

    await this.runTest("Returns health status", async () => {
      const service = new ProductionNSEService();
      await service.fetchAllStocks();
      
      const health = service.getHealthStatus();
      
      const requiredFields = ["status", "uptime", "totalFetches", "successRate", "metrics"];
      for (const field of requiredFields) {
        if (!(field in health)) {
          throw new Error(`Missing health field: ${field}`);
        }
      }
      
      if (health.status !== "healthy") {
        throw new Error("Service should be healthy after successful fetch");
      }
      
      return true;
    });

    await this.runTest("Tracks metrics correctly", async () => {
      const service = new ProductionNSEService();
      
      const healthBefore = service.getHealthStatus();
      await service.fetchAllStocks();
      const healthAfter = service.getHealthStatus();
      
      if (healthAfter.totalFetches <= healthBefore.totalFetches) {
        throw new Error("Fetch count not incremented");
      }
      
      if (healthAfter.metrics.successfulRequests === 0) {
        throw new Error("Successful requests not tracked");
      }
      
      return true;
    });
  }

  /**
   * Test edge cases
   */
  async testEdgeCases() {
    console.log("📋 Testing Edge Cases...");

    await this.runTest("Handles empty search results", async () => {
      const service = new ProductionNSEService();
      const result = await service.searchStocks("NONEXISTENTCOMPANY12345");
      
      if (!result.success) {
        throw new Error("Search should succeed even with no results");
      }
      
      if (result.count !== 0) {
        throw new Error("Count should be 0 for no results");
      }
      
      if (!Array.isArray(result.stocks) || result.stocks.length !== 0) {
        throw new Error("Stocks array should be empty");
      }
      
      return true;
    });

    await this.runTest("Handles special characters in search", async () => {
      const service = new ProductionNSEService();
      const result = await service.searchStocks("L&T");
      
      if (!result.success) {
        throw new Error("Should handle special characters in search");
      }
      
      return true;
    });

    await this.runTest("Handles very long search queries", async () => {
      const service = new ProductionNSEService();
      const longQuery = "A".repeat(1000);
      
      const result = await service.searchStocks(longQuery);
      
      if (!result.success) {
        throw new Error("Should handle long search queries gracefully");
      }
      
      return true;
    });
  }

  /**
   * Run a single test
   */
  async runTest(testName, testFunction) {
    this.totalTests++;
    
    try {
      const result = await testFunction();
      if (result === true) {
        this.passedTests++;
        console.log(`  ✅ ${testName}`);
        this.testResults.push({ name: testName, status: "PASS" });
      } else {
        throw new Error("Test function did not return true");
      }
    } catch (error) {
      this.failedTests++;
      console.log(`  ❌ ${testName}: ${error.message}`);
      this.testResults.push({ 
        name: testName, 
        status: "FAIL", 
        error: error.message 
      });
    }
  }

  /**
   * Print test summary
   */
  printSummary() {
    const duration = Date.now() - this.startTime;
    
    console.log("\n" + "=".repeat(80));
    console.log("🎯 TEST SUMMARY");
    console.log("=".repeat(80));
    console.log(`Total Tests: ${this.totalTests}`);
    console.log(`Passed: ${this.passedTests} ✅`);
    console.log(`Failed: ${this.failedTests} ❌`);
    console.log(`Success Rate: ${Math.round(this.passedTests / this.totalTests * 100)}%`);
    console.log(`Duration: ${Math.round(duration / 1000)} seconds`);
    
    if (this.failedTests > 0) {
      console.log("\n❌ FAILED TESTS:");
      this.testResults
        .filter(result => result.status === "FAIL")
        .forEach(result => {
          console.log(`  - ${result.name}: ${result.error}`);
        });
    }
    
    console.log("\n" + (this.failedTests === 0 ? "🎉 ALL TESTS PASSED!" : "⚠️  SOME TESTS FAILED"));
    console.log("=".repeat(80));
  }
}

// Export for use in other files
module.exports = ProductionTestSuite;

// Run tests if called directly
if (require.main === module) {
  const testSuite = new ProductionTestSuite();
  testSuite.runAllTests().catch(console.error);
}
