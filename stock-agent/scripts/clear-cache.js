#!/usr/bin/env node

const ProductionNSEService = require("../src/services/ProductionNSEService");
const config = require("../config/production.config");
const fs = require("fs");
const path = require("path");

/**
 * Cache Management Script
 * Provides utilities for cache management and cleanup
 */
class CacheManager {
  constructor() {
    this.service = new ProductionNSEService(config.nse);
    this.cacheDir = config.nse.cacheDir;
  }

  /**
   * Clear all cache with confirmation
   */
  async clearAllCache(force = false) {
    console.log("🗑️  Cache Clear Operation\n");
    
    if (!force) {
      const confirmed = await this.confirmAction(
        "This will delete all cached stock data. Continue? (y/N): "
      );
      
      if (!confirmed) {
        console.log("❌ Operation cancelled");
        return false;
      }
    }
    
    try {
      console.log("🧹 Clearing cache...");
      
      const cleared = await this.service.clearCache();
      
      if (cleared) {
        console.log("✅ Cache cleared successfully");
        this.showCacheStatus();
        return true;
      } else {
        console.log("❌ Failed to clear cache");
        return false;
      }
      
    } catch (error) {
      console.error(`❌ Error clearing cache: ${error.message}`);
      return false;
    }
  }

  /**
   * Show cache status and statistics
   */
  showCacheStatus() {
    console.log("\n📊 Cache Status:");
    
    try {
      const cacheStatus = this.service.getCacheStatus();
      
      if (Object.keys(cacheStatus).length === 0) {
        console.log("  📁 Cache directory is empty");
        return;
      }
      
      let totalFiles = 0;
      let totalSize = 0;
      let validFiles = 0;
      
      Object.entries(cacheStatus).forEach(([endpoint, status]) => {
        const emoji = status.valid ? "✅" : status.exists ? "⚠️" : "❌";
        const ageStr = status.age ? `${status.age}min old` : "unknown age";
        const sizeStr = status.size ? `${Math.round(status.size/1024)}KB` : "unknown size";
        
        console.log(`  ${emoji} ${endpoint}: ${ageStr}, ${sizeStr}`);
        
        if (status.exists) {
          totalFiles++;
          totalSize += status.size || 0;
          if (status.valid) validFiles++;
        }
      });
      
      console.log(`\n📈 Summary:`);
      console.log(`  Total files: ${totalFiles}`);
      console.log(`  Valid files: ${validFiles}/${totalFiles}`);
      console.log(`  Total size: ${Math.round(totalSize/1024)}KB`);
      
    } catch (error) {
      console.error(`❌ Error getting cache status: ${error.message}`);
    }
  }

  /**
   * Clean expired cache files only
   */
  async cleanExpiredCache() {
    console.log("🧹 Cleaning expired cache files...\n");
    
    try {
      const cacheStatus = this.service.getCacheStatus();
      let cleanedCount = 0;
      
      for (const [endpoint, status] of Object.entries(cacheStatus)) {
        if (status.exists && !status.valid) {
          const cachePath = path.join(this.cacheDir, `nse_${endpoint}.csv`);
          const metadataPath = cachePath.replace(".csv", ".meta.json");
          
          try {
            if (fs.existsSync(cachePath)) {
              fs.unlinkSync(cachePath);
            }
            if (fs.existsSync(metadataPath)) {
              fs.unlinkSync(metadataPath);
            }
            
            console.log(`  🗑️  Removed expired cache for ${endpoint}`);
            cleanedCount++;
            
          } catch (error) {
            console.log(`  ❌ Failed to remove ${endpoint}: ${error.message}`);
          }
        }
      }
      
      if (cleanedCount === 0) {
        console.log("  ✅ No expired cache files found");
      } else {
        console.log(`\n✅ Cleaned ${cleanedCount} expired cache files`);
      }
      
      this.showCacheStatus();
      return true;
      
    } catch (error) {
      console.error(`❌ Error cleaning expired cache: ${error.message}`);
      return false;
    }
  }

  /**
   * Refresh cache with latest data
   */
  async refreshCache(force = false) {
    console.log("🔄 Refreshing cache with latest data...\n");
    
    try {
      const result = await this.service.forceRefresh();
      
      if (result.success) {
        console.log(`✅ Cache refreshed successfully`);
        console.log(`📊 Fetched ${result.count} stocks in ${Math.round(result.duration/1000)}s`);
        
        // Show breakdown
        if (result.breakdown) {
          console.log(`\n📋 Data breakdown:`);
          Object.entries(result.breakdown).forEach(([type, count]) => {
            console.log(`  ${type}: ${count} items`);
          });
        }
        
        this.showCacheStatus();
        return true;
        
      } else {
        console.log(`❌ Cache refresh failed: ${result.error}`);
        return false;
      }
      
    } catch (error) {
      console.error(`❌ Error refreshing cache: ${error.message}`);
      return false;
    }
  }

  /**
   * Optimize cache directory
   */
  async optimizeCache() {
    console.log("⚡ Optimizing cache directory...\n");
    
    try {
      // Clean expired files first
      await this.cleanExpiredCache();
      
      // Check for orphaned metadata files
      const files = fs.readdirSync(this.cacheDir);
      const metadataFiles = files.filter(f => f.endsWith(".meta.json"));
      let orphanedCount = 0;
      
      for (const metaFile of metadataFiles) {
        const csvFile = metaFile.replace(".meta.json", ".csv");
        if (!files.includes(csvFile)) {
          const metaPath = path.join(this.cacheDir, metaFile);
          fs.unlinkSync(metaPath);
          console.log(`  🗑️  Removed orphaned metadata: ${metaFile}`);
          orphanedCount++;
        }
      }
      
      if (orphanedCount === 0) {
        console.log("  ✅ No orphaned files found");
      } else {
        console.log(`\n✅ Removed ${orphanedCount} orphaned metadata files`);
      }
      
      console.log("\n⚡ Cache optimization completed");
      return true;
      
    } catch (error) {
      console.error(`❌ Error optimizing cache: ${error.message}`);
      return false;
    }
  }

  /**
   * Get user confirmation
   */
  async confirmAction(question) {
    const readline = require("readline");
    
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    return new Promise((resolve) => {
      rl.question(question, (answer) => {
        rl.close();
        resolve(answer.toLowerCase().trim() === "y" || answer.toLowerCase().trim() === "yes");
      });
    });
  }

  /**
   * Show usage help
   */
  showHelp() {
    console.log("🗂️  Cache Management Utility\n");
    console.log("Usage: node scripts/clear-cache.js [command] [options]\n");
    console.log("Commands:");
    console.log("  status     Show current cache status (default)");
    console.log("  clear      Clear all cached data");
    console.log("  clean      Remove only expired cache files");
    console.log("  refresh    Refresh cache with latest data");
    console.log("  optimize   Clean and optimize cache directory");
    console.log("  help       Show this help message\n");
    console.log("Options:");
    console.log("  --force    Skip confirmation prompts");
    console.log("  --quiet    Minimal output\n");
    console.log("Examples:");
    console.log("  node scripts/clear-cache.js status");
    console.log("  node scripts/clear-cache.js clear --force");
    console.log("  node scripts/clear-cache.js refresh");
  }
}

// Command line interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || "status";
  const force = args.includes("--force");
  const quiet = args.includes("--quiet");
  
  const manager = new CacheManager();
  
  if (!quiet) {
    console.log("🗂️  Stock Agent Cache Manager\n");
  }
  
  try {
    switch (command) {
      case "status":
        manager.showCacheStatus();
        break;
        
      case "clear":
        await manager.clearAllCache(force);
        break;
        
      case "clean":
        await manager.cleanExpiredCache();
        break;
        
      case "refresh":
        await manager.refreshCache(force);
        break;
        
      case "optimize":
        await manager.optimizeCache();
        break;
        
      case "help":
      case "--help":
      case "-h":
        manager.showHelp();
        break;
        
      default:
        console.log(`❌ Unknown command: ${command}`);
        console.log("Use 'help' to see available commands");
        process.exit(1);
    }
    
  } catch (error) {
    console.error(`❌ Command failed: ${error.message}`);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = CacheManager;
