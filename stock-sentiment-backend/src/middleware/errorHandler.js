const logger = require('../utils/logger');

/**
 * Global error handler middleware
 * Must be the last middleware in the stack
 */
const errorHandler = (err, req, res, _next) => {
  // Log the error
  logger.error('Unhandled error occurred', {
    error: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString(),
  });

  // Default error response
  let statusCode = 500;
  let message = 'Internal Server Error';
  let details = null;

  // Handle different types of errors
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation Error';
    details = err.details || err.message;
  } else if (err.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid ID format';
    details = 'The provided ID is not in the correct format';
  } else if (err.name === 'MongoError' || err.name === 'MongoServerError') {
    if (err.code === 11000) {
      statusCode = 409;
      message = 'Duplicate Entry';
      details = 'A record with this information already exists';
    } else {
      statusCode = 500;
      message = 'Database Error';
      details = 'An error occurred while accessing the database';
    }
  } else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid Token';
    details = 'The provided authentication token is invalid';
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token Expired';
    details = 'The authentication token has expired';
  } else if (err.name === 'UnauthorizedError') {
    statusCode = 401;
    message = 'Unauthorized';
    details = 'You are not authorized to access this resource';
  } else if (err.name === 'ForbiddenError') {
    statusCode = 403;
    message = 'Forbidden';
    details = 'You do not have permission to access this resource';
  } else if (err.name === 'NotFoundError') {
    statusCode = 404;
    message = 'Not Found';
    details = 'The requested resource was not found';
  } else if (err.name === 'RateLimitExceeded') {
    statusCode = 429;
    message = 'Too Many Requests';
    details = 'You have exceeded the rate limit for this endpoint';
  } else if (err.status) {
    // Handle custom HTTP errors
    statusCode = err.status;
    message = err.message || 'HTTP Error';
    details = err.details;
  } else if (err.message) {
    // Handle generic errors with messages
    message = err.message;
    details = err.details;
  }

  // Don't leak error details in production
  if (process.env.NODE_ENV === 'production' && statusCode === 500) {
    details = 'An internal error occurred. Please try again later.';
  }

  // Send error response
  res.status(statusCode).json({
    error: {
      message: message,
      statusCode: statusCode,
      timestamp: new Date().toISOString(),
      path: req.originalUrl,
      method: req.method,
      ...(details && { details: details }),
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    },
  });
};

module.exports = errorHandler;
