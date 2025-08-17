const logger = require('../utils/logger');

/**
 * Request validation middleware
 * Validates incoming requests and provides helpful error messages
 */
const requestValidator = (req, res, next) => {
  try {
    // Log incoming request
    logger.api('Incoming request', {
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      contentType: req.get('Content-Type'),
      contentLength: req.get('Content-Length'),
    });

    // Validate Content-Type for POST/PUT requests with body
    if (
      (req.method === 'POST' ||
        req.method === 'PUT' ||
        req.method === 'PATCH') &&
      req.body &&
      Object.keys(req.body).length > 0
    ) {
      const contentType = req.get('Content-Type');
      if (!contentType || !contentType.includes('application/json')) {
        return res.status(400).json({
          error: {
            message: 'Invalid Content-Type',
            details:
              'Content-Type must be application/json for requests with body',
            received: contentType,
            expected: 'application/json',
          },
        });
      }
    }

    // Validate request body size (if present)
    const contentLength = parseInt(req.get('Content-Length') || '0');
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (contentLength > maxSize) {
      return res.status(413).json({
        error: {
          message: 'Request Entity Too Large',
          details: `Request body size (${contentLength} bytes) exceeds maximum allowed size (${maxSize} bytes)`,
          received: contentLength,
          maxAllowed: maxSize,
        },
      });
    }

    // Validate query parameters (basic sanitization)
    if (req.query) {
      for (const [key, value] of Object.entries(req.query)) {
        // Check for potentially dangerous characters
        if (typeof value === 'string' && /[<>"'&]/.test(value)) {
          logger.warn('Potentially dangerous query parameter detected', {
            key,
            value,
            ip: req.ip,
            url: req.originalUrl,
          });
        }
      }
    }

    // Validate request headers
    const requiredHeaders = [];
    const missingHeaders = requiredHeaders.filter(header => !req.get(header));

    if (missingHeaders.length > 0) {
      return res.status(400).json({
        error: {
          message: 'Missing Required Headers',
          details: `The following headers are required: ${missingHeaders.join(', ')}`,
          missing: missingHeaders,
        },
      });
    }

    // Validate API version in URL (if present)
    const apiVersionMatch = req.originalUrl.match(/\/api\/v(\d+)/);
    if (apiVersionMatch) {
      const version = parseInt(apiVersionMatch[1]);
      const supportedVersions = [1]; // Add more versions as needed

      if (!supportedVersions.includes(version)) {
        return res.status(400).json({
          error: {
            message: 'Unsupported API Version',
            details: `API version ${version} is not supported. Supported versions: ${supportedVersions.join(', ')}`,
            received: version,
            supported: supportedVersions,
          },
        });
      }
    }

    // Add request metadata for logging
    req.requestId = generateRequestId();
    req.startTime = Date.now();

    // Continue to next middleware
    next();
  } catch (error) {
    logger.error('Request validation error', {
      error: error.message,
      stack: error.stack,
      url: req.originalUrl,
      method: req.method,
    });

    return res.status(500).json({
      error: {
        message: 'Request Validation Error',
        details: 'An error occurred while validating the request',
      },
    });
  }
};

/**
 * Generate a unique request ID
 * @returns {string} Request ID
 */
function generateRequestId() {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

module.exports = requestValidator;
