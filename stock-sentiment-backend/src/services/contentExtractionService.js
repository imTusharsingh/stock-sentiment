/**
 * Content Extraction Service
 * Handles HTML parsing, content extraction, and data cleaning
 */

const logger = require('../utils/logger');
const crawlerConfig = require('../config/crawler');

class ContentExtractionService {
  constructor() {
    this.extractionLimits = crawlerConfig.getExtractionLimits();
    this.validationRules = crawlerConfig.getValidationRules();
  }

  /**
   * Extract page content with validation
   */
  async extractPageContent(page) {
    try {
       
      const rawContent = await page.evaluate(() => {
        // Remove script and style elements
        // eslint-disable-next-line no-undef
        const scripts = document.querySelectorAll('script, style, noscript');
        scripts.forEach(el => el.remove());

        // Get main content areas
        // eslint-disable-next-line no-undef
        const mainContent = document.querySelector('main, article, .content, .article-content, .story-content') || document.body;
        
        return {
          // eslint-disable-next-line no-undef
          title: document.title || '',
          // eslint-disable-next-line no-undef
          url: window.location.href,
           
          content: mainContent.textContent || '',
           
          html: mainContent.innerHTML || '',
          // eslint-disable-next-line no-undef
          metaDescription: document.querySelector('meta[name="description"]')?.content || '',
          // eslint-disable-next-line no-undef
          metaKeywords: document.querySelector('meta[name="keywords"]')?.content || '',
          publishedDate: null, // Will be extracted separately
          author: null // Will be extracted separately
        };
      });

      // Clean and validate content
      const cleanedContent = this.cleanContent(rawContent);
      const validationResult = this.validateContent(cleanedContent);

      if (!validationResult.isValid) {
        logger.warn('Content validation failed', {
          url: cleanedContent.url,
          errors: validationResult.errors
        });
      }

      logger.info('Page content extracted successfully', {
        url: cleanedContent.url,
        titleLength: cleanedContent.title.length,
        contentLength: cleanedContent.content.length,
        isValid: validationResult.isValid
      });

      return {
        ...cleanedContent,
        validation: validationResult
      };
    } catch (error) {
      logger.error('Failed to extract page content', { error: error.message });
      throw error;
    }
  }

  /**
   * Extract published date from page
   */
  extractPublishedDate(document) {
    try {
      const dateSelectors = [
        'meta[property="article:published_time"]',
        'meta[name="publish_date"]',
        'meta[name="date"]',
        '.published-date',
        '.article-date',
        '.story-date'
      ];

      for (const selector of dateSelectors) {
        const element = document.querySelector(selector);
        if (element) {
          const dateValue = element.content || element.textContent;
          if (dateValue) {
            const date = new Date(dateValue);
            if (!isNaN(date.getTime())) {
              return date.toISOString();
            }
          }
        }
      }

      return null;
    } catch (_error) {
      return null;
    }
  }

  /**
   * Extract author from page
   */
  extractAuthor(document) {
    try {
      const authorSelectors = [
        'meta[name="author"]',
        'meta[property="article:author"]',
        '.author',
        '.article-author',
        '.story-author'
      ];

      for (const selector of authorSelectors) {
        const element = document.querySelector(selector);
        if (element) {
          const author = element.content || element.textContent;
          if (author && author.trim()) {
            return author.trim();
          }
        }
      }

      return null;
    } catch (_error) {
      return null;
    }
  }

  /**
   * Clean and normalize extracted content
   */
  cleanContent(content) {
    return {
      title: this.normalizeText(content.title),
      url: content.url,
      content: this.normalizeText(content.content),
      html: content.html,
      metaDescription: this.normalizeText(content.metaDescription),
      metaKeywords: this.normalizeText(content.metaKeywords),
      publishedDate: content.publishedDate,
      author: content.author
    };
  }

  /**
   * Normalize text content
   */
  normalizeText(text) {
    if (!text) return '';
    
    return text
      .replace(/\s+/g, ' ')           // Replace multiple spaces with single space
      .replace(/\n+/g, ' ')           // Replace newlines with spaces
      .replace(/\t+/g, ' ')           // Replace tabs with spaces
      .replace(/\r+/g, '')            // Remove carriage returns
      .trim();                        // Trim whitespace
  }

  /**
   * Validate extracted content
   */
  validateContent(content) {
    const errors = [];
    const warnings = [];

    // Check required fields
    if (this.validationRules.requireTitle && (!content.title || content.title.length < 10)) {
      errors.push('Title is required and must be at least 10 characters');
    }

    if (this.validationRules.requireContent && (!content.content || content.content.length < this.extractionLimits.minContentLength)) {
      errors.push(`Content is required and must be at least ${this.extractionLimits.minContentLength} characters`);
    }

    if (this.validationRules.requireDate && !content.publishedDate) {
      warnings.push('Published date not found');
    }

    if (this.validationRules.requireSource && !content.url) {
      errors.push('Source URL is required');
    }

    // Check content length limits
    if (content.title && content.title.length > this.extractionLimits.maxTitleLength) {
      warnings.push(`Title exceeds maximum length of ${this.extractionLimits.maxTitleLength} characters`);
    }

    if (content.content && content.content.length > this.extractionLimits.maxContentLength) {
      warnings.push(`Content exceeds maximum length of ${this.extractionLimits.maxContentLength} characters`);
    }

    // Check for common issues
    if (content.content && content.content.includes('Access Denied')) {
      errors.push('Access denied to content');
    }

    if (content.content && content.content.includes('Page Not Found')) {
      errors.push('Page not found');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Extract specific data from HTML using selectors
   */
  async extractDataWithSelectors(page, selectors) {
    try {
       
      const data = await page.evaluate((sel) => {
        const result = {};
        
        for (const [key, selector] of Object.entries(sel)) {
          // eslint-disable-next-line no-undef
          const element = document.querySelector(selector);
          if (element) {
            result[key] = element.textContent?.trim() || element.getAttribute('content') || '';
          } else {
            result[key] = '';
          }
        }
        
        return result;
      }, selectors);

      return data;
    } catch (error) {
      logger.error('Failed to extract data with selectors', { 
        selectors, 
        error: error.message 
      });
      return {};
    }
  }

  /**
   * Extract links from page
   */
  async extractLinks(page, baseUrl) {
    try {
       
      const links = await page.evaluate((url) => {
        // eslint-disable-next-line no-undef
        const linkElements = document.querySelectorAll('a[href]');
        const links = [];
        
        linkElements.forEach(link => {
           
          const href = link.getAttribute('href');
          if (href && !href.startsWith('javascript:') && !href.startsWith('#')) {
            const absoluteUrl = new URL(href, url).href;
            links.push({
               
              text: link.textContent?.trim() || '',
              url: absoluteUrl,
               
              title: link.getAttribute('title') || ''
            });
          }
        });
        
        return links;
      }, baseUrl);

      return links;
    } catch (error) {
      logger.error('Failed to extract links', { error: error.message });
      return [];
    }
  }

  /**
   * Get extraction statistics
   */
  getExtractionStats() {
    return {
      extractionLimits: this.extractionLimits,
      validationRules: this.validationRules
    };
  }
}

module.exports = ContentExtractionService;
