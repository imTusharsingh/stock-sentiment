#!/usr/bin/env node

const config = require("../config/production.config");
const fs = require("fs");
const path = require("path");

/**
 * Configuration Validation Script
 * Validates production configuration and environment setup
 */
class ConfigValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.info = [];
  }

  /**
   * Run comprehensive configuration validation
   */
  async validateConfiguration() {
    console.log("⚙️  Configuration Validation\n");
    
    try {
      // Validate basic config structure
      this.validateConfigStructure();
      
      // Validate service configuration
      this.validateServiceConfig();
      
      // Validate NSE configuration
      this.validateNSEConfig();
      
      // Validate environment variables
      this.validateEnvironmentVariables();
      
      // Validate file system permissions
      this.validateFileSystemPermissions();
      
      // Validate external dependencies
      await this.validateExternalDependencies();
      
      // Print results
      this.printValidationResults();
      
    } catch (error) {
      this.errors.push(`Validation failed: ${error.message}`);
      this.printValidationResults();
      process.exit(1);
    }
    
    // Exit with appropriate code
    process.exit(this.errors.length > 0 ? 1 : 0);
  }

  /**
   * Validate basic configuration structure
   */
  validateConfigStructure() {
    console.log("📋 Validating configuration structure...");
    
    const requiredSections = [
      "service", "nse", "cache", "scheduler", "api", 
      "logging", "monitoring", "security", "performance"
    ];
    
    for (const section of requiredSections) {
      if (!config[section]) {
        this.errors.push(`Missing configuration section: ${section}`);
      } else {
        this.info.push(`✅ Configuration section '${section}' present`);
      }
    }
    
    // Check for required functions
    if (typeof config.validateConfig !== "function") {
      this.errors.push("Missing validateConfig function");
    }
    
    console.log("  ✅ Configuration structure");
  }

  /**
   * Validate service configuration
   */
  validateServiceConfig() {
    console.log("📋 Validating service configuration...");
    
    const service = config.service;
    
    // Validate required fields
    const requiredFields = ["name", "version", "environment", "port", "host"];
    for (const field of requiredFields) {
      if (!service[field]) {
        this.errors.push(`Missing service.${field}`);
      }
    }
    
    // Validate port range
    if (service.port < 1024 || service.port > 65535) {
      this.warnings.push(`Service port ${service.port} may require special privileges or be invalid`);
    }
    
    // Validate environment
    const validEnvironments = ["development", "staging", "production"];
    if (!validEnvironments.includes(service.environment)) {
      this.warnings.push(`Unusual environment: ${service.environment}`);
    }
    
    this.info.push(`Service: ${service.name} v${service.version} (${service.environment})`);
    console.log("  ✅ Service configuration");
  }

  /**
   * Validate NSE configuration
   */
  validateNSEConfig() {
    console.log("📋 Validating NSE configuration...");
    
    const nse = config.nse;
    
    // Validate numeric ranges
    const numericValidations = [
      { field: "maxRetries", min: 1, max: 10 },
      { field: "timeout", min: 5000, max: 300000 },
      { field: "retryDelay", min: 1000, max: 30000 },
      { field: "maxConcurrentDownloads", min: 1, max: 10 }
    ];
    
    for (const validation of numericValidations) {
      const value = nse[validation.field];
      if (typeof value !== "number" || value < validation.min || value > validation.max) {
        this.errors.push(
          `${validation.field} must be a number between ${validation.min} and ${validation.max}, got: ${value}`
        );
      }
    }
    
    // Validate cache directory
    if (!nse.cacheDir) {
      this.errors.push("NSE cache directory not specified");
    } else {
      this.info.push(`Cache directory: ${nse.cacheDir}`);
    }
    
    // Validate cache max age
    if (nse.cacheMaxAge < 60000) { // Less than 1 minute
      this.warnings.push("Cache max age is very short, may cause excessive API calls");
    }
    
    console.log("  ✅ NSE configuration");
  }

  /**
   * Validate environment variables
   */
  validateEnvironmentVariables() {
    console.log("📋 Validating environment variables...");
    
    const requiredEnvVars = [];
    const optionalEnvVars = [
      "NODE_ENV", "PORT", "HOST", "CACHE_DIR", "LOG_LEVEL",
      "NSE_MAX_RETRIES", "NSE_TIMEOUT", "REDIS_HOST", "REDIS_PORT"
    ];
    
    // Check required environment variables
    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar]) {
        this.errors.push(`Missing required environment variable: ${envVar}`);
      }
    }
    
    // Check optional environment variables
    const setOptionalVars = optionalEnvVars.filter(envVar => process.env[envVar]);
    this.info.push(`Optional environment variables set: ${setOptionalVars.length}/${optionalEnvVars.length}`);
    
    // Validate NODE_ENV
    if (process.env.NODE_ENV === "production") {
      this.info.push("Running in production mode");
      
      // Additional production checks
      if (!process.env.LOG_LEVEL) {
        this.warnings.push("LOG_LEVEL not set in production");
      }
    }
    
    console.log("  ✅ Environment variables");
  }

  /**
   * Validate file system permissions
   */
  validateFileSystemPermissions() {
    console.log("📋 Validating file system permissions...");
    
    const pathsToCheck = [
      { path: config.nse.cacheDir, type: "cache directory", permissions: ["read", "write"] },
      { path: path.dirname(config.logging.file.filename), type: "log directory", permissions: ["read", "write"] }
    ];
    
    for (const check of pathsToCheck) {
      try {
        // Check if path exists
        if (!fs.existsSync(check.path)) {
          try {
            fs.mkdirSync(check.path, { recursive: true });
            this.info.push(`Created ${check.type}: ${check.path}`);
          } catch (error) {
            this.errors.push(`Cannot create ${check.type}: ${check.path} - ${error.message}`);
            continue;
          }
        }
        
        // Test permissions
        for (const permission of check.permissions) {
          try {
            if (permission === "read") {
              fs.accessSync(check.path, fs.constants.R_OK);
            } else if (permission === "write") {
              fs.accessSync(check.path, fs.constants.W_OK);
              
              // Test actual write
              const testFile = path.join(check.path, ".write-test");
              fs.writeFileSync(testFile, "test");
              fs.unlinkSync(testFile);
            }
          } catch (error) {
            this.errors.push(`No ${permission} permission for ${check.type}: ${check.path}`);
          }
        }
        
        this.info.push(`✅ ${check.type} permissions OK`);
        
      } catch (error) {
        this.errors.push(`Error checking ${check.type}: ${error.message}`);
      }
    }
    
    console.log("  ✅ File system permissions");
  }

  /**
   * Validate external dependencies
   */
  async validateExternalDependencies() {
    console.log("📋 Validating external dependencies...");
    
    try {
      const axios = require("axios");
      
      // Test NSE connectivity
      const response = await axios.get("https://nsearchives.nseindia.com", {
        timeout: 10000,
        validateStatus: (status) => status < 500
      });
      
      if (response.status < 400) {
        this.info.push("✅ NSE Archives accessible");
      } else {
        this.warnings.push(`NSE Archives returned ${response.status}`);
      }
      
    } catch (error) {
      this.warnings.push(`Cannot reach NSE Archives: ${error.message}`);
    }
    
    // Test Redis if configured
    if (config.cache.strategy === "redis") {
      try {
        const redis = require("redis");
        const client = redis.createClient({
          host: config.cache.redis.host,
          port: config.cache.redis.port,
          password: config.cache.redis.password,
          db: config.cache.redis.db,
          connectTimeout: 5000
        });
        
        await client.ping();
        await client.quit();
        
        this.info.push("✅ Redis connection OK");
        
      } catch (error) {
        this.errors.push(`Redis connection failed: ${error.message}`);
      }
    }
    
    // Test MongoDB if configured
    if (config.database.enabled && config.database.type === "mongodb") {
      try {
        const mongoose = require("mongoose");
        
        await mongoose.connect(config.database.mongodb.uri, {
          ...config.database.mongodb.options,
          serverSelectionTimeoutMS: 5000
        });
        
        await mongoose.disconnect();
        this.info.push("✅ MongoDB connection OK");
        
      } catch (error) {
        this.errors.push(`MongoDB connection failed: ${error.message}`);
      }
    }
    
    console.log("  ✅ External dependencies");
  }

  /**
   * Print validation results
   */
  printValidationResults() {
    console.log("\n" + "=".repeat(60));
    console.log("⚙️  CONFIGURATION VALIDATION RESULTS");
    console.log("=".repeat(60));
    
    const hasErrors = this.errors.length > 0;
    const hasWarnings = this.warnings.length > 0;
    
    if (hasErrors) {
      console.log(`\n❌ ERRORS (${this.errors.length}):`);
      this.errors.forEach(error => console.log(`  ❌ ${error}`));
    }
    
    if (hasWarnings) {
      console.log(`\n⚠️  WARNINGS (${this.warnings.length}):`);
      this.warnings.forEach(warning => console.log(`  ⚠️  ${warning}`));
    }
    
    if (this.info.length > 0) {
      console.log(`\n✅ INFO (${this.info.length}):`);
      this.info.forEach(info => console.log(`  ${info}`));
    }
    
    console.log("\n" + "=".repeat(60));
    
    if (hasErrors) {
      console.log("❌ VALIDATION FAILED - Configuration has errors that must be fixed");
    } else if (hasWarnings) {
      console.log("⚠️  VALIDATION PASSED WITH WARNINGS - Review warnings before production deployment");
    } else {
      console.log("✅ VALIDATION PASSED - Configuration is ready for production");
    }
    
    console.log("=".repeat(60));
  }
}

// Run validation if called directly
if (require.main === module) {
  const validator = new ConfigValidator();
  validator.validateConfiguration().catch(console.error);
}

module.exports = ConfigValidator;
