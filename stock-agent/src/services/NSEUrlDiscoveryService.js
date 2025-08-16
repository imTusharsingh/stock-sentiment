const axios = require("axios");
const cheerio = require("cheerio");
const CSVIntelligenceService = require("./CSVIntelligenceService");
const NSECrawlerService = require("./NSECrawlerService");

/**
 * NSE URL Discovery Service
 * Automatically discovers CSV download URLs from official NSE pages
 * Falls back to known URLs if discovery fails
 */
class NSEUrlDiscoveryService {
  constructor() {
    this.discoveredUrls = new Map();
    this.allDiscoveredCSVs = new Set();
    this.intelligentRecommendations = null;
    this.lastDiscovery = null;
    this.discoveryTTL = 24 * 60 * 60 * 1000; // 24 hours
    this.csvIntelligence = new CSVIntelligenceService();

    // Use the modular crawler service
    this.crawler = new NSECrawlerService();

    // Fallback URLs (current working ones with alternatives)
    this.fallbackUrls = {
      equity: "https://nsearchives.nseindia.com/content/equities/EQUITY_L.csv",
      sme: "https://nsearchives.nseindia.com/emerge/corporates/content/SME_EQUITY_L.csv",
      etf: "https://nsearchives.nseindia.com/content/equities/eq_etfseclist.csv",
      reits: "https://nsearchives.nseindia.com/content/equities/REITS_L.csv",
      invits: "https://nsearchives.nseindia.com/content/equities/INVITS_L.csv",
    };

    // Alternative URLs for when primary fails
    this.alternativeUrls = {
      sme: [
        "https://nsearchives.nseindia.com/emerge/corporates/content/SME_EQUITY_L.csv",
        "https://www.nseindia.com/emerge/corporates/content/SME_EQUITY_L.csv",
        "https://nsearchives.nseindia.com/content/equities/SME_EQUITY_L.csv",
      ],
    };
  }

  /**
   * Get URLs with auto-discovery
   */
  async getUrls(forceDiscovery = false) {
    try {
      // Check if we need to discover URLs
      const needsDiscovery =
        forceDiscovery ||
        !this.lastDiscovery ||
        Date.now() - this.lastDiscovery > this.discoveryTTL ||
        this.discoveredUrls.size === 0;

      if (needsDiscovery) {
        console.log("🔍 Discovering latest NSE CSV URLs...");
        await this.discoverUrls();
      }

      // Return discovered URLs with working URL validation
      const urls = {};
      for (const [key, fallbackUrl] of Object.entries(this.fallbackUrls)) {
        const primaryUrl = this.discoveredUrls.get(key) || fallbackUrl;
        // For critical endpoints, validate URL availability
        if (key === "sme" || forceDiscovery) {
          urls[key] = await this.getWorkingUrl(key, primaryUrl);
        } else {
          urls[key] = primaryUrl;
        }
      }

      return {
        success: true,
        urls,
        discoveredAt: this.lastDiscovery,
        source: this.discoveredUrls.size > 0 ? "discovered" : "fallback",
      };
    } catch (error) {
      console.warn(
        `⚠️ URL discovery failed: ${error.message}, using fallback URLs`
      );

      return {
        success: true,
        urls: this.fallbackUrls,
        source: "fallback",
        error: error.message,
      };
    }
  }

  /**
   * Discover URLs from NSE pages with AI intelligence
   */
  async discoverUrls() {
    try {
      // Clear previous discoveries
      this.allDiscoveredCSVs.clear();
      this.discoveredUrls.clear(); // Clear discovered URLs to let AI set them

      // Discover from main trading page (only collect CSVs, don't set URLs yet)
      await this.discoverFromTradingPage();

      // Apply AI intelligence to all discovered CSVs (this will set the URLs)
      await this.applyIntelligentAnalysis();

      this.lastDiscovery = Date.now();
      console.log(
        `✅ Discovered ${this.allDiscoveredCSVs.size} total CSVs, ${this.discoveredUrls.size} categorized`
      );
    } catch (error) {
      console.warn(`⚠️ URL discovery failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Discover URLs from securities trading page
   */
  async discoverFromTradingPage() {
    try {
      console.log("🔍 Discovering CSV URLs from NSE trading page...");

      // Use the modular crawler service
      const csvResult = await this.crawler.crawlCSVUrls();

      if (csvResult.success && csvResult.csvUrls.length > 0) {
        // Add all discovered CSVs to our collection
        csvResult.csvUrls.forEach((url) => {
          this.allDiscoveredCSVs.add(url);
        });

        console.log(
          `🔍 Found ${csvResult.csvUrls.length} CSV links on trading page`
        );
        console.log(`📊 Total discovered CSVs: ${this.allDiscoveredCSVs.size}`);
      } else {
        console.warn(`⚠️ CSV discovery failed: ${csvResult.error}`);

        // Add fallback CSVs if discovery fails
        const fallbackCSVs = [
          "https://nsearchives.nseindia.com/content/equities/EQUITY_L.csv",
          "https://nsearchives.nseindia.com/emerge/corporates/content/SME_EQUITY_L.csv",
          "https://nsearchives.nseindia.com/content/equities/eq_etfseclist.csv",
          "https://nsearchives.nseindia.com/content/equities/REITS_L.csv",
          "https://nsearchives.nseindia.com/content/equities/INVITS_L.csv",
        ];

        fallbackCSVs.forEach((url) => {
          this.allDiscoveredCSVs.add(url);
        });

        console.log(`🔄 Added ${fallbackCSVs.length} fallback CSV URLs`);
      }
    } catch (error) {
      console.warn(`⚠️ Failed to discover from trading page: ${error.message}`);

      // Add fallback CSVs on error
      const fallbackCSVs = [
        "https://nsearchives.nseindia.com/content/equities/EQUITY_L.csv",
        "https://nsearchives.nseindia.com/emerge/corporates/content/SME_EQUITY_L.csv",
        "https://nsearchives.nseindia.com/content/equities/eq_etfseclist.csv",
        "https://nsearchives.nseindia.com/content/equities/REITS_L.csv",
        "https://nsearchives.nseindia.com/content/equities/INVITS_L.csv",
      ];

      fallbackCSVs.forEach((url) => {
        this.allDiscoveredCSVs.add(url);
      });

      console.log(
        `🔄 Added ${fallbackCSVs.length} fallback CSV URLs due to error`
      );
    }
  }

  /**
   * Apply AI intelligence to analyze all discovered CSVs
   */
  async applyIntelligentAnalysis() {
    try {
      console.log("🧠 Applying AI intelligence to discovered CSVs...");

      const csvArray = Array.from(this.allDiscoveredCSVs);
      const analysis = await this.csvIntelligence.analyzeCSVs(csvArray);

      // Get smart recommendations
      const recommendations =
        this.csvIntelligence.getSmartRecommendations(analysis);
      this.intelligentRecommendations = recommendations;

      // Update discovered URLs based on AI recommendations
      this.updateUrlsFromRecommendations(recommendations);

      console.log(`🎯 AI Analysis Results:`);
      console.log(`   Must use: ${recommendations.mustUse.length} CSVs`);
      console.log(`   Should use: ${recommendations.shouldUse.length} CSVs`);
      console.log(`   Maybe use: ${recommendations.maybeUse.length} CSVs`);
      console.log(`   Skip: ${recommendations.skip.length} CSVs`);
    } catch (error) {
      console.warn(`⚠️ AI analysis failed: ${error.message}`);
      // Continue with basic categorization
    }
  }

  /**
   * Update URLs based on AI recommendations
   */
  updateUrlsFromRecommendations(recommendations) {
    console.log(
      "🔧 updateUrlsFromRecommendations called with:",
      recommendations.mustUse.length,
      "must-use CSVs"
    );

    // Process must-use and should-use CSVs
    const priorityCSVs = [
      ...recommendations.mustUse,
      ...recommendations.shouldUse,
    ];

    // Sort by priority and quality to ensure best CSVs are selected first
    priorityCSVs.sort((a, b) => {
      const scoreA = a.priority * 10 + a.qualityScore;
      const scoreB = b.priority * 10 + b.qualityScore;
      return scoreB - scoreA; // Higher score first
    });

    console.log("🔧 Sorted priority CSVs:");
    priorityCSVs.forEach((csv, index) => {
      console.log(
        `   ${index + 1}. ${csv.url} (${csv.category}, priority: ${csv.priority}, quality: ${csv.qualityScore})`
      );
    });

    for (const csv of priorityCSVs) {
      // Map AI categories to our endpoint names
      const endpointMap = {
        equity: "equity",
        sme: "sme",
        etf: "etf",
        reits: "reits",
        invits: "invits",
        new_listings: "new_listings",
        name_changes: "name_changes",
        symbol_changes: "symbol_changes",
      };

      const endpoint = endpointMap[csv.category];
      if (endpoint) {
        const currentUrl = this.discoveredUrls.get(endpoint);
        console.log(
          `🔧 Processing ${csv.url} for endpoint ${endpoint} (current: ${currentUrl})`
        );

        // For equity endpoint, ALWAYS prefer EQUITY_L.csv over anything else
        if (endpoint === "equity") {
          // Special case: If this is SME_EQUITY_L.csv, don't set it as main equity
          if (csv.url.includes("SME_EQUITY_L.csv")) {
            console.log(
              `⏭️ Skipping ${endpoint}: ${csv.url} - SME_EQUITY_L.csv should not be main equity`
            );
            continue; // Skip SME_EQUITY_L.csv for main equity endpoint
          }

          if (csv.url.includes("EQUITY_L.csv")) {
            this.discoveredUrls.set(endpoint, csv.url);
            console.log(
              `🎯 AI recommended ${endpoint}: ${csv.url} (priority: ${csv.priority}, quality: ${csv.qualityScore}) - EQUITY_L.csv selected!`
            );
            continue; // Skip other equity options
          }

          // For equity endpoint, NEVER allow other CSVs to override if we already have a URL
          if (currentUrl) {
            console.log(
              `⏭️ Skipping ${endpoint}: ${csv.url} (priority: ${csv.priority}, quality: ${csv.qualityScore}) - equity endpoint already set`
            );
            continue; // Skip all other CSVs for equity once we have one
          }
        }

        // Use higher priority/quality CSV for other endpoints
        if (!currentUrl || csv.priority > 8 || csv.qualityScore > 7) {
          this.discoveredUrls.set(endpoint, csv.url);
          console.log(
            `🎯 AI recommended ${endpoint}: ${csv.url} (priority: ${csv.priority}, quality: ${csv.qualityScore})`
          );
        } else {
          console.log(
            `⏭️ Skipping ${endpoint}: ${csv.url} (priority: ${csv.priority}, quality: ${csv.qualityScore}) - not high enough priority`
          );
        }
      }
    }

    // Ensure all required endpoints have URLs
    const requiredEndpoints = ["equity", "sme", "etf", "reits", "invits"];

    for (const endpoint of requiredEndpoints) {
      if (!this.discoveredUrls.has(endpoint)) {
        // Find the best CSV for this endpoint
        let bestCSV = null;
        let bestScore = 0;

        for (const csv of priorityCSVs) {
          if (
            csv.category === endpoint ||
            (endpoint === "equity" && csv.category === "equity") ||
            (endpoint === "sme" && csv.category === "sme")
          ) {
            const score = csv.priority * 10 + csv.qualityScore;
            if (score > bestScore) {
              bestScore = score;
              bestCSV = csv;
            }
          }
        }

        if (bestCSV) {
          this.discoveredUrls.set(endpoint, bestCSV.url);
          console.log(
            `🔄 Fallback: Set ${endpoint} endpoint to ${bestCSV.url} (priority: ${bestCSV.priority}, quality: ${bestCSV.qualityScore})`
          );
        } else {
          // Use fallback URL if no AI recommendation
          const fallbackUrl = this.fallbackUrls[endpoint];
          if (fallbackUrl) {
            this.discoveredUrls.set(endpoint, fallbackUrl);
            console.log(
              `🔄 Fallback: Using default ${endpoint} URL: ${fallbackUrl}`
            );
          }
        }
      }
    }

    // Debug: Show final discovered URLs after AI update
    console.log("🔧 Final discovered URLs after AI update:");
    for (const [key, url] of this.discoveredUrls) {
      console.log(`   ${key}: ${url}`);
    }
  }

  /**
   * Get working URL with fallback testing
   */
  async getWorkingUrl(key, primaryUrl) {
    try {
      // Test primary URL first
      const response = await axios.head(primaryUrl, {
        timeout: 10000,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
      });

      if (response.status === 200) {
        return primaryUrl;
      }
    } catch (error) {
      console.warn(`⚠️ Primary URL failed for ${key}: ${error.message}`);
    }

    // Try alternative URLs if available
    if (this.alternativeUrls[key]) {
      for (const altUrl of this.alternativeUrls[key]) {
        if (altUrl === primaryUrl) continue; // Skip if same as primary

        try {
          const response = await axios.head(altUrl, {
            timeout: 10000,
            headers: {
              "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            },
          });

          if (response.status === 200) {
            console.log(`✅ Using alternative URL for ${key}: ${altUrl}`);
            return altUrl;
          }
        } catch (error) {
          console.warn(
            `⚠️ Alternative URL failed for ${key}: ${error.message}`
          );
        }
      }
    }

    // Return primary URL anyway (let the download handle the error)
    console.warn(
      `⚠️ No working URL found for ${key}, using primary: ${primaryUrl}`
    );
    return primaryUrl;
  }

  /**
   * Validate discovered URLs
   */
  async validateUrls(urls) {
    const validationResults = {};

    for (const [key, url] of Object.entries(urls)) {
      try {
        const response = await axios.head(url, {
          timeout: 10000,
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          },
        });

        validationResults[key] = {
          valid: response.status === 200,
          status: response.status,
          contentType: response.headers["content-type"],
          contentLength: response.headers["content-length"],
        };
      } catch (error) {
        validationResults[key] = {
          valid: false,
          error: error.message,
        };
      }
    }

    return validationResults;
  }

  /**
   * Get AI analysis and recommendations
   */
  getAIRecommendations() {
    return {
      recommendations: this.intelligentRecommendations,
      allDiscoveredCSVs: Array.from(this.allDiscoveredCSVs),
      learningStats: this.csvIntelligence.getLearningStats(),
      totalDiscovered: this.allDiscoveredCSVs.size,
    };
  }

  /**
   * Report parsing results for AI learning
   */
  reportParsingResult(url, success, stockCount = 0, error = null) {
    if (success) {
      this.csvIntelligence.reportSuccessfulParsing(url, stockCount);
    } else {
      this.csvIntelligence.reportFailedParsing(url, error);
    }
  }

  /**
   * Get discovery status
   */
  getDiscoveryStatus() {
    return {
      lastDiscovery: this.lastDiscovery,
      discoveredCount: this.discoveredUrls.size,
      discoveredUrls: Object.fromEntries(this.discoveredUrls),
      fallbackUrls: this.fallbackUrls,
      nextDiscovery: this.lastDiscovery
        ? new Date(this.lastDiscovery + this.discoveryTTL).toISOString()
        : "pending",
    };
  }

  /**
   * Force URL rediscovery
   */
  async forceRediscovery() {
    this.discoveredUrls.clear();
    this.lastDiscovery = null;
    return this.getUrls(true);
  }
}

module.exports = NSEUrlDiscoveryService;
