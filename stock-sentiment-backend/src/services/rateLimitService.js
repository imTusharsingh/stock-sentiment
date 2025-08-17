/**
 * Rate Limit Service
 * Manages request rate limiting for different news sources
 */

const logger = require('../utils/logger');
const crawlerConfig = require('../config/crawler');

class RateLimitService {
  constructor() {
    this.rateLimitCounters = new Map();
    this.enabledSources = crawlerConfig.getEnabledSources();
    this.initializeCounters();
  }

  /**
   * Initialize rate limit counters for each news source
   */
  initializeCounters() {
    this.enabledSources.forEach(source => {
      this.rateLimitCounters.set(source.name, {
        requests: 0,
        lastReset: Date.now(),
        maxRequests: source.maxRequestsPerHour,
        priority: source.priority
      });
    });

    logger.info('Rate limit counters initialized', {
      sources: this.enabledSources.map(s => s.name)
    });
  }

  /**
   * Check if request is allowed for a specific source
   */
  canMakeRequest(sourceName) {
    const counter = this.rateLimitCounters.get(sourceName);
    if (!counter) {
      logger.warn('Unknown source for rate limiting', { sourceName });
      return false;
    }

    const now = Date.now();
    const hourAgo = now - (60 * 60 * 1000);

    // Reset counter if an hour has passed
    if (counter.lastReset < hourAgo) {
      counter.requests = 0;
      counter.lastReset = now;
      logger.info('Rate limit counter reset', { sourceName });
    }

    // Check if limit exceeded
    if (counter.requests >= counter.maxRequests) {
      logger.warn('Rate limit exceeded', { 
        sourceName, 
        requests: counter.requests, 
        maxRequests: counter.maxRequests 
      });
      return false;
    }

    return true;
  }

  /**
   * Increment request counter for a source
   */
  incrementRequest(sourceName) {
    const counter = this.rateLimitCounters.get(sourceName);
    if (counter) {
      counter.requests++;
      logger.debug('Request counter incremented', { 
        sourceName, 
        current: counter.requests, 
        max: counter.maxRequests 
      });
    }
  }

  /**
   * Get remaining requests for a source
   */
  getRemainingRequests(sourceName) {
    const counter = this.rateLimitCounters.get(sourceName);
    if (!counter) return 0;

    const now = Date.now();
    const hourAgo = now - (60 * 60 * 1000);

    if (counter.lastReset < hourAgo) {
      return counter.maxRequests;
    }

    return Math.max(0, counter.maxRequests - counter.requests);
  }

  /**
   * Get time until next reset for a source
   */
  getTimeUntilReset(sourceName) {
    const counter = this.rateLimitCounters.get(sourceName);
    if (!counter) return 0;

    const now = Date.now();
    const nextReset = counter.lastReset + (60 * 60 * 1000);
    return Math.max(0, nextReset - now);
  }

  /**
   * Get all sources with their rate limit status
   */
  getAllSourceStatuses() {
    const statuses = {};
    
    this.enabledSources.forEach(source => {
      const counter = this.rateLimitCounters.get(source.name);
      if (counter) {
        statuses[source.name] = {
          enabled: source.enabled,
          priority: source.priority,
          currentRequests: counter.requests,
          maxRequests: counter.maxRequests,
          remainingRequests: this.getRemainingRequests(source.name),
          timeUntilReset: this.getTimeUntilReset(source.name),
          canMakeRequest: this.canMakeRequest(source.name)
        };
      }
    });

    return statuses;
  }

  /**
   * Get sources that can make requests
   */
  getAvailableSources() {
    return this.enabledSources.filter(source => 
      this.canMakeRequest(source.name)
    );
  }

  /**
   * Get sources by priority that can make requests
   */
  getAvailableSourcesByPriority() {
    const available = this.getAvailableSources();
    return available.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Force reset rate limit for a source (for testing/admin purposes)
   */
  forceReset(sourceName) {
    const counter = this.rateLimitCounters.get(sourceName);
    if (counter) {
      counter.requests = 0;
      counter.lastReset = Date.now();
      logger.info('Rate limit force reset', { sourceName });
      return true;
    }
    return false;
  }

  /**
   * Update rate limit configuration for a source
   */
  updateSourceLimit(sourceName, newMaxRequests) {
    const counter = this.rateLimitCounters.get(sourceName);
    if (counter) {
      counter.maxRequests = newMaxRequests;
      logger.info('Rate limit updated', { 
        sourceName, 
        newMaxRequests 
      });
      return true;
    }
    return false;
  }

  /**
   * Get rate limit statistics
   */
  getStatistics() {
    const totalRequests = Array.from(this.rateLimitCounters.values())
      .reduce((sum, counter) => sum + counter.requests, 0);
    
    const totalMaxRequests = Array.from(this.rateLimitCounters.values())
      .reduce((sum, counter) => sum + counter.maxRequests, 0);

    return {
      totalSources: this.enabledSources.length,
      totalRequests,
      totalMaxRequests,
      totalRemaining: totalMaxRequests - totalRequests,
      sourceStatuses: this.getAllSourceStatuses()
    };
  }

  /**
   * Check if any source is available
   */
  hasAvailableSources() {
    return this.getAvailableSources().length > 0;
  }

  /**
   * Get recommended delay for a source
   */
  getRecommendedDelay(sourceName) {
    const counter = this.rateLimitCounters.get(sourceName);
    if (!counter) return 0;

    const remaining = this.getRemainingRequests(sourceName);
    const timeUntilReset = this.getTimeUntilReset(sourceName);
    
    // If we're close to the limit, suggest a longer delay
    if (remaining < counter.maxRequests * 0.2) {
      return Math.max(5000, timeUntilReset / 10); // At least 5 seconds
    }
    
    return 1000; // Default 1 second delay
  }
}

module.exports = RateLimitService;
