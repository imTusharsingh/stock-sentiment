const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');

/**
 * GET /stocks
 * Get all stocks (placeholder)
 */
router.get('/', (req, res) => {
  logger.api('Stocks route accessed (placeholder)', {
    requestId: req.requestId,
    method: req.method,
    url: req.originalUrl,
  });

  res.status(200).json({
    message: 'Stocks endpoint - Coming soon!',
    timestamp: new Date().toISOString(),
    status: 'placeholder',
  });
});

/**
 * GET /stocks/:symbol
 * Get stock by symbol (placeholder)
 */
router.get('/:symbol', (req, res) => {
  const { symbol } = req.params;

  logger.api('Stock by symbol route accessed (placeholder)', {
    requestId: req.requestId,
    symbol,
    method: req.method,
    url: req.originalUrl,
  });

  res.status(200).json({
    message: `Stock ${symbol} endpoint - Coming soon!`,
    symbol,
    timestamp: new Date().toISOString(),
    status: 'placeholder',
  });
});

module.exports = router;
