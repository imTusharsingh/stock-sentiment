const express = require('express');
const router = express.Router();
const databaseConfig = require('../config/database');
const redisService = require('../services/redisService');
const logger = require('../utils/logger');

/**
 * GET /health
 * Basic health check endpoint
 */
router.get('/', (req, res) => {
  try {
    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0',
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        external: Math.round(process.memoryUsage().external / 1024 / 1024),
      },
      pid: process.pid,
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
    };

    logger.api('Health check requested', {
      requestId: req.requestId,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
    });

    res.status(200).json(healthStatus);
  } catch (error) {
    logger.error('Health check failed', {
      error: error.message,
      requestId: req.requestId,
    });

    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /health/detailed
 * Detailed health check with database and Redis status
 */
router.get('/detailed', async (req, res) => {
  try {
    const startTime = Date.now();
    const healthChecks = {};

    // Check database connectivity
    try {
      const dbStatus = databaseConfig.getStatus();
      healthChecks.database = {
        status: dbStatus.isConnected ? 'healthy' : 'unhealthy',
        details: dbStatus,
        responseTime: Date.now() - startTime,
      };
    } catch (error) {
      healthChecks.database = {
        status: 'unhealthy',
        error: error.message,
        responseTime: Date.now() - startTime,
      };
    }

    // Check Redis connectivity
    try {
      const redisHealth = await redisService.healthCheck();
      healthChecks.redis = {
        status: redisHealth ? 'healthy' : 'unhealthy',
        details: {
          isConnected: redisHealth,
          host: process.env.REDIS_HOST,
          port: process.env.REDIS_PORT,
        },
        responseTime: Date.now() - startTime,
      };
    } catch (error) {
      healthChecks.redis = {
        status: 'unhealthy',
        error: error.message,
        responseTime: Date.now() - startTime,
      };
    }

    // Check system resources
    const systemResources = {
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        external: Math.round(process.memoryUsage().external / 1024 / 1024),
        rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
      },
      cpu: {
        usage: process.cpuUsage(),
        uptime: process.uptime(),
      },
      process: {
        pid: process.pid,
        version: process.version,
        platform: process.platform,
        arch: process.arch,
      },
    };

    // Determine overall status
    const allHealthy = Object.values(healthChecks).every(
      check => check.status === 'healthy'
    );
    const overallStatus = allHealthy ? 'healthy' : 'degraded';

    const detailedHealth = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      responseTime: Date.now() - startTime,
      checks: healthChecks,
      system: systemResources,
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0',
    };

    logger.api('Detailed health check requested', {
      requestId: req.requestId,
      status: overallStatus,
      responseTime: detailedHealth.responseTime,
    });

    res.status(200).json(detailedHealth);
  } catch (error) {
    logger.error('Detailed health check failed', {
      error: error.message,
      requestId: req.requestId,
    });

    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /health/ready
 * Readiness probe for Kubernetes/container orchestration
 */
router.get('/ready', async (req, res) => {
  try {
    // Check if database is ready
    const dbStatus = databaseConfig.getStatus();
    const dbReady = dbStatus.isConnected;

    // Check if Redis is ready
    let redisReady = false;
    try {
      redisReady = await redisService.healthCheck();
    } catch (_error) {
      redisReady = false;
    }

    // Service is ready if both database and Redis are connected
    const isReady = dbReady && redisReady;

    if (isReady) {
      res.status(200).json({
        status: 'ready',
        timestamp: new Date().toISOString(),
        checks: {
          database: dbReady,
          redis: redisReady,
        },
      });
    } else {
      res.status(503).json({
        status: 'not_ready',
        timestamp: new Date().toISOString(),
        checks: {
          database: dbReady,
          redis: redisReady,
        },
        message: 'Service is not ready to handle requests',
      });
    }
  } catch (error) {
    logger.error('Readiness check failed', {
      error: error.message,
      requestId: req.requestId,
    });

    res.status(503).json({
      status: 'not_ready',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /health/live
 * Liveness probe for Kubernetes/container orchestration
 */
router.get('/live', (req, res) => {
  // Simple liveness check - if we can respond, the process is alive
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    pid: process.pid,
    uptime: process.uptime(),
  });
});

module.exports = router;
