const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');

/**
 * GET /news
 * Get all news (placeholder)
 */
router.get('/', (req, res) => {
  logger.api('News route accessed (placeholder)', {
    requestId: req.requestId,
    method: req.method,
    url: req.originalUrl,
  });

  res.status(200).json({
    message: 'News endpoint - Coming soon!',
    timestamp: new Date().toISOString(),
    status: 'placeholder',
  });
});

/**
 * GET /news/:symbol
 * Get news by stock symbol (placeholder)
 */
router.get('/:symbol', (req, res) => {
  const { symbol } = req.params;

  logger.api('News by symbol route accessed (placeholder)', {
    requestId: req.requestId,
    symbol,
    method: req.method,
    url: req.originalUrl,
  });

  res.status(200).json({
    message: `News for ${symbol} endpoint - Coming soon!`,
    symbol,
    timestamp: new Date().toISOString(),
    status: 'placeholder',
  });
});

module.exports = router;
