const axios = require("axios");
const csv = require("csvtojson");

/**
 * AI-Powered CSV Intelligence Service
 * Smart agent that analyzes and categorizes discovered CSV files
 */
class CSVIntelligenceService {
  constructor() {
    this.knownPatterns = new Map();
    this.csvClassifications = new Map();
    this.qualityScores = new Map();
    this.learningData = {
      successfulParsing: new Set(),
      failedParsing: new Set(),
      highQualityData: new Set(),
      lowQualityData: new Set(),
    };

    // Initialize with known patterns
    this.initializeKnownPatterns();
  }

  /**
   * Initialize known patterns for CSV classification
   */
  initializeKnownPatterns() {
    // Stock data patterns - PRIORITY ORDER MATTERS!
    this.knownPatterns.set("equity_main", {
      urlPatterns: [/EQUITY_L\.csv/i],
      headerPatterns: [
        "SYMBOL",
        "NAME OF COMPANY",
        "SERIES",
        "DATE OF LISTING",
      ],
      priority: 10, // HIGHEST PRIORITY - ONLY EQUITY_L.csv should have this
      category: "equity",
      description: "Main equity securities list",
    });

    this.knownPatterns.set("sme_equity", {
      urlPatterns: [/SME_EQUITY/i, /sme.*equity/i],
      headerPatterns: ["SYMBOL", "NAME OF COMPANY", "SERIES"],
      priority: 9, // High priority but below main equity
      category: "sme",
      description: "SME equity securities",
    });

    this.knownPatterns.set("etf_list", {
      urlPatterns: [/etf/i, /exchange.*traded/i],
      headerPatterns: ["SYMBOL", "SecurityName", "Underlying"],
      priority: 7, // Medium-high priority
      category: "etf",
      description: "Exchange Traded Funds",
    });

    this.knownPatterns.set("new_listings", {
      urlPatterns: [/new.*listing/i, /recent.*listing/i, /ipo/i],
      headerPatterns: ["SYMBOL", "COMPANY", "LISTING.*DATE"],
      priority: 8, // High priority for new listings
      category: "new_listings",
      description: "Recently listed securities",
    });

    this.knownPatterns.set("reits", {
      urlPatterns: [/REITS?_L/i, /reit/i],
      headerPatterns: ["SYMBOL", "NAME OF COMPANY"],
      priority: 6, // Medium priority
      category: "reits",
      description: "Real Estate Investment Trusts",
    });

    this.knownPatterns.set("invits", {
      urlPatterns: [/INVITS?_L/i, /invit/i],
      headerPatterns: ["SYMBOL", "NAME OF COMPANY"],
      priority: 6, // Medium priority
      category: "invits",
      description: "Infrastructure Investment Trusts",
    });

    // Add specific patterns for other CSV types with lower priorities
    this.knownPatterns.set("idr_list", {
      urlPatterns: [/IDR_W9\.csv/i, /idr/i],
      headerPatterns: ["SYMBOL", "NAME OF COMPANY"],
      priority: 5, // Lower priority
      category: "equity",
      description: "International Depository Receipts",
    });

    this.knownPatterns.set("pref_list", {
      urlPatterns: [/PREF\.csv/i, /pref/i],
      headerPatterns: ["SYMBOL", "NAME OF COMPANY"],
      priority: 5, // Lower priority
      category: "equity",
      description: "Preference shares",
    });

    this.knownPatterns.set("warrant_list", {
      urlPatterns: [/WARRANT\.csv/i, /warrant/i],
      headerPatterns: ["SYMBOL", "NAME OF COMPANY"],
      priority: 5, // Lower priority
      category: "equity",
      description: "Warrants",
    });

    this.knownPatterns.set("mf_close_end", {
      urlPatterns: [/mf_close-end\.csv/i, /close.*end/i],
      headerPatterns: ["SYMBOL", "NAME OF COMPANY"],
      priority: 5, // Lower priority
      category: "equity",
      description: "Close-ended mutual funds",
    });

    // Lower priority patterns
    this.knownPatterns.set("debt_instruments", {
      urlPatterns: [/DEBT\.csv/i, /debt/i, /bonds/i],
      headerPatterns: ["SYMBOL", "NAME OF COMPANY", "SERIES", "FACE VALUE"],
      priority: 3, // LOW PRIORITY - we want equity, not debt
      category: "debt",
      description: "Debt instruments and bonds",
    });

    this.knownPatterns.set("delisted", {
      urlPatterns: [/delist/i, /suspend/i],
      headerPatterns: ["SYMBOL", "COMPANY", "DELIST"],
      priority: 2, // Very low priority
      category: "delisted",
      description: "Delisted securities",
    });

    this.knownPatterns.set("name_changes", {
      urlPatterns: [/name.*change/i, /company.*name/i],
      headerPatterns: ["OLD.*NAME", "NEW.*NAME", "SYMBOL"],
      priority: 4, // Low priority
      category: "name_changes",
      description: "Company name changes",
    });

    this.knownPatterns.set("symbol_changes", {
      urlPatterns: [/symbol.*change/i],
      headerPatterns: ["OLD.*SYMBOL", "NEW.*SYMBOL"],
      priority: 4, // Low priority
      category: "symbol_changes",
      description: "Symbol changes",
    });
  }

  /**
   * Analyze and classify discovered CSV URLs
   */
  async analyzeCSVs(csvUrls) {
    console.log(`🧠 Analyzing ${csvUrls.length} discovered CSV files...`);

    const analysis = {
      classified: [],
      unclassified: [],
      highPriority: [],
      recommended: [],
      quality: {},
    };

    for (const url of csvUrls) {
      try {
        const classification = await this.classifyCSV(url);

        if (classification.category !== "unknown") {
          analysis.classified.push(classification);

          if (classification.priority >= 8) {
            analysis.highPriority.push(classification);
          }

          if (classification.shouldUse) {
            analysis.recommended.push(classification);
          }
        } else {
          analysis.unclassified.push({ url, classification });
        }

        analysis.quality[url] = classification.qualityScore;
      } catch (error) {
        console.warn(`⚠️ Failed to analyze ${url}: ${error.message}`);
        analysis.unclassified.push({ url, error: error.message });
      }
    }

    // Sort by priority and quality
    analysis.recommended.sort(
      (a, b) => b.priority * b.qualityScore - a.priority * a.qualityScore
    );

    console.log(
      `✅ Analysis complete: ${analysis.classified.length} classified, ${analysis.recommended.length} recommended`
    );

    return analysis;
  }

  /**
   * Classify a single CSV file
   */
  async classifyCSV(url) {
    console.log(`🔍 Classifying: ${url}`);

    try {
      // Step 1: URL-based classification
      let bestMatch = this.classifyByUrl(url);

      // Step 2: Sample content analysis
      const contentAnalysis = await this.analyzeCSVContent(url);

      // Step 3: Combine URL and content analysis
      // Prioritize URL-based classification over header-based classification
      if (
        contentAnalysis.headerMatch &&
        contentAnalysis.headerMatch.priority > bestMatch.priority &&
        bestMatch.priority === 0 // Only override if URL classification failed
      ) {
        bestMatch = contentAnalysis.headerMatch;
      }

      // Step 4: Calculate quality score
      const qualityScore = this.calculateQualityScore(url, contentAnalysis);

      // Step 5: Determine if we should use this CSV
      const shouldUse = this.shouldUseCSV(
        bestMatch,
        qualityScore,
        contentAnalysis
      );

      const classification = {
        url,
        category: bestMatch.category,
        description: bestMatch.description,
        priority: bestMatch.priority,
        qualityScore,
        shouldUse,
        confidence: bestMatch.confidence || 0.7,
        metadata: {
          estimatedRows: contentAnalysis.estimatedRows,
          headers: contentAnalysis.headers,
          fileSize: contentAnalysis.fileSize,
          lastModified: contentAnalysis.lastModified,
        },
      };

      // Learn from this classification
      this.learnFromClassification(classification, contentAnalysis);

      return classification;
    } catch (error) {
      console.warn(`⚠️ Classification failed for ${url}: ${error.message}`);
      return {
        url,
        category: "unknown",
        description: "Unable to classify",
        priority: 0,
        qualityScore: 0,
        shouldUse: false,
        error: error.message,
      };
    }
  }

  /**
   * Classify CSV by URL patterns
   */
  classifyByUrl(url) {
    let bestMatch = {
      category: "unknown",
      priority: 0,
      description: "Unknown CSV type",
    };
    let highestScore = 0;

    for (const [patternName, pattern] of this.knownPatterns.entries()) {
      for (const urlPattern of pattern.urlPatterns) {
        if (urlPattern.test(url)) {
          const score = pattern.priority;
          if (score > highestScore) {
            highestScore = score;
            bestMatch = {
              category: pattern.category,
              priority: pattern.priority,
              description: pattern.description,
              confidence: 0.8,
              matchedPattern: patternName,
            };
          }
        }
      }
    }

    return bestMatch;
  }

  /**
   * Analyze CSV content by sampling
   */
  async analyzeCSVContent(url) {
    try {
      // Get headers and sample data (first 2KB only for speed)
      const response = await axios.get(url, {
        timeout: 15000,
        headers: {
          Range: "bytes=0-2048", // Sample first 2KB
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
        validateStatus: (status) => status === 206 || status === 200,
      });

      const sampleData = response.data;
      const lines = sampleData.split("\n").filter((line) => line.trim());

      if (lines.length === 0) {
        throw new Error("Empty CSV content");
      }

      // Parse headers
      const headers = lines[0]
        .split(",")
        .map((h) => h.trim().replace(/^["']|["']$/g, ""));

      // Estimate total rows from content-length or range
      const contentLength = response.headers["content-length"];
      const estimatedRows = contentLength
        ? Math.round(contentLength / (sampleData.length / lines.length))
        : lines.length;

      // Find header-based match
      let headerMatch = { category: "unknown", priority: 0 };
      for (const [patternName, pattern] of this.knownPatterns.entries()) {
        const matchScore = this.calculateHeaderMatch(
          headers,
          pattern.headerPatterns
        );
        if (matchScore > 0.6 && pattern.priority > headerMatch.priority) {
          headerMatch = {
            category: pattern.category,
            priority: pattern.priority,
            description: pattern.description,
            confidence: matchScore,
            matchedPattern: patternName,
          };
        }
      }

      return {
        headers,
        sampleLines: lines.slice(0, 5),
        estimatedRows,
        fileSize: contentLength,
        lastModified: response.headers["last-modified"],
        headerMatch: headerMatch.category !== "unknown" ? headerMatch : null,
      };
    } catch (error) {
      console.warn(`⚠️ Content analysis failed for ${url}: ${error.message}`);
      return {
        headers: [],
        estimatedRows: 0,
        error: error.message,
      };
    }
  }

  /**
   * Calculate header match score
   */
  calculateHeaderMatch(actualHeaders, expectedPatterns) {
    if (!expectedPatterns || expectedPatterns.length === 0) return 0;

    const normalizedHeaders = actualHeaders.map((h) => h.toUpperCase());
    let matches = 0;

    for (const pattern of expectedPatterns) {
      const regex = new RegExp(pattern.replace(/\s+/g, ".*"), "i");
      if (normalizedHeaders.some((header) => regex.test(header))) {
        matches++;
      }
    }

    return matches / expectedPatterns.length;
  }

  /**
   * Calculate quality score for a CSV
   */
  calculateQualityScore(url, contentAnalysis) {
    let score = 0;

    // Base score for successful content analysis
    if (contentAnalysis.headers && contentAnalysis.headers.length > 0) {
      score += 3;
    }

    // Header quality (more headers = better structure)
    if (contentAnalysis.headers) {
      score += Math.min(contentAnalysis.headers.length / 5, 2); // Max 2 points
    }

    // Data volume (more rows = more valuable)
    if (contentAnalysis.estimatedRows) {
      if (contentAnalysis.estimatedRows > 1000) score += 2;
      else if (contentAnalysis.estimatedRows > 100) score += 1;
      else if (contentAnalysis.estimatedRows > 10) score += 0.5;
    }

    // URL quality indicators - STRONG PREFERENCE FOR EQUITY
    if (url.includes("nsearchives.nseindia.com")) score += 1; // Official source
    if (url.includes("EQUITY_L.csv")) score += 3; // Main equity file - HIGH BONUS
    if (url.includes("EQUITY") && !url.includes("DEBT")) score += 2; // Equity files (not debt)
    if (url.includes("securities")) score += 1; // Securities-related
    if (url.includes("_L.csv")) score += 0.5; // Standard NSE format

    // PENALIZE DEBT/BOND FILES
    if (
      url.includes("DEBT.csv") ||
      url.includes("debt") ||
      url.includes("bonds")
    ) {
      score -= 2; // Significant penalty for debt instruments
    }

    // File freshness (if available)
    if (contentAnalysis.lastModified) {
      const age = Date.now() - new Date(contentAnalysis.lastModified).getTime();
      const daysSinceUpdate = age / (1000 * 60 * 60 * 24);
      if (daysSinceUpdate < 7) score += 1;
      else if (daysSinceUpdate < 30) score += 0.5;
    }

    // Learning-based adjustments
    if (this.learningData.highQualityData.has(url)) score += 1;
    if (this.learningData.lowQualityData.has(url)) score -= 1;

    return Math.max(0, Math.min(10, score)); // 0-10 scale
  }

  /**
   * Determine if we should use this CSV
   */
  shouldUseCSV(classification, qualityScore, contentAnalysis) {
    // Must have minimum quality
    if (qualityScore < 3) return false;

    // Must have recognizable structure
    if (!contentAnalysis.headers || contentAnalysis.headers.length < 2)
      return false;

    // Must have reasonable data volume
    if (contentAnalysis.estimatedRows < 10) return false;

    // Must be classified (not unknown)
    if (classification.category === "unknown") return false;

    // STRONG PREFERENCE FOR EQUITY OVER DEBT
    if (classification.category === "equity" && qualityScore >= 5) return true; // Always use good equity data
    if (classification.category === "debt" && classification.priority < 5)
      return false; // Avoid low-priority debt

    // Priority-based decision
    if (classification.priority >= 8) return true; // High priority always use
    if (classification.priority >= 6 && qualityScore >= 6) return true; // Medium priority with good quality
    if (classification.priority >= 4 && qualityScore >= 8) return true; // Low priority with excellent quality

    // Learning-based decision
    if (this.learningData.successfulParsing.has(classification.url))
      return true;
    if (this.learningData.failedParsing.has(classification.url)) return false;

    return false;
  }

  /**
   * Learn from classification results
   */
  learnFromClassification(classification, contentAnalysis) {
    // Store classification for future reference
    this.csvClassifications.set(classification.url, classification);
    this.qualityScores.set(classification.url, classification.qualityScore);

    // Update learning data based on results
    if (classification.shouldUse && contentAnalysis.estimatedRows > 100) {
      this.learningData.highQualityData.add(classification.url);
    }

    if (contentAnalysis.error || contentAnalysis.estimatedRows < 5) {
      this.learningData.lowQualityData.add(classification.url);
    }
  }

  /**
   * Get smart recommendations for CSV usage
   */
  getSmartRecommendations(analysis) {
    const recommendations = {
      mustUse: [],
      shouldUse: [],
      maybeUse: [],
      skip: [],
      reasoning: {},
    };

    for (const item of analysis.classified) {
      const reason = [];

      if (item.priority >= 9) {
        recommendations.mustUse.push(item);
        reason.push(`Critical data source (priority ${item.priority})`);
      } else if (item.shouldUse && item.qualityScore >= 7) {
        recommendations.shouldUse.push(item);
        reason.push(`High quality and useful (score: ${item.qualityScore})`);
      } else if (item.shouldUse && item.qualityScore >= 5) {
        recommendations.maybeUse.push(item);
        reason.push(`Moderate quality but potentially useful`);
      } else {
        recommendations.skip.push(item);
        reason.push(
          `Low priority or quality (priority: ${item.priority}, quality: ${item.qualityScore})`
        );
      }

      recommendations.reasoning[item.url] = reason.join(", ");
    }

    return recommendations;
  }

  /**
   * Report successful parsing for learning
   */
  reportSuccessfulParsing(url, stockCount) {
    this.learningData.successfulParsing.add(url);
    if (stockCount > 100) {
      this.learningData.highQualityData.add(url);
    }
    console.log(`📚 Learning: ${url} successfully parsed ${stockCount} stocks`);
  }

  /**
   * Report failed parsing for learning
   */
  reportFailedParsing(url, error) {
    this.learningData.failedParsing.add(url);
    this.learningData.lowQualityData.add(url);
    console.log(`📚 Learning: ${url} failed to parse - ${error}`);
  }

  /**
   * Get learning statistics
   */
  getLearningStats() {
    return {
      totalClassified: this.csvClassifications.size,
      successfulParsing: this.learningData.successfulParsing.size,
      failedParsing: this.learningData.failedParsing.size,
      highQualityData: this.learningData.highQualityData.size,
      lowQualityData: this.learningData.lowQualityData.size,
      knownPatterns: this.knownPatterns.size,
    };
  }
}

module.exports = CSVIntelligenceService;
