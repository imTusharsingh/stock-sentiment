const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');

/**
 * GET /sentiments
 * Get all sentiments (placeholder)
 */
router.get('/', (req, res) => {
  logger.api('Sentiments route accessed (placeholder)', {
    requestId: req.requestId,
    method: req.method,
    url: req.originalUrl,
  });

  res.status(200).json({
    message: 'Sentiments endpoint - Coming soon!',
    timestamp: new Date().toISOString(),
    status: 'placeholder',
  });
});

/**
 * GET /sentiments/:symbol
 * Get sentiment by stock symbol (placeholder)
 */
router.get('/:symbol', (req, res) => {
  const { symbol } = req.params;

  logger.api('Sentiment by symbol route accessed (placeholder)', {
    requestId: req.requestId,
    symbol,
    method: req.method,
    url: req.originalUrl,
  });

  res.status(200).json({
    message: `Sentiment for ${symbol} endpoint - Coming soon!`,
    symbol,
    timestamp: new Date().toISOString(),
    status: 'placeholder',
  });
});

module.exports = router;
