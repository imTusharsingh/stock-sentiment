# 📊 DATA RETENTION & STORAGE POLICIES

## 🎯 **Overview**

This document outlines the data retention policies, storage optimization strategies, and lifecycle management for the Indian Stock Sentiment Service.

## ⏰ **Data Retention Timeline**

### **News Articles**

```
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│   HOT DATA      │  │   WARM DATA     │  │   COLD DATA     │  │  ARCHIVE DATA   │
│   0-7 days     │  │   8-30 days     │  │   31-90 days    │  │   90+ days     │
├─────────────────┤  ├─────────────────┤  ├─────────────────┤  ├─────────────────┤
│ • Full content  │  │ • Full content  │  │ • Summary only  │  │ • Trends only   │
│ • Metadata      │  │ • Summary cache │  │ • No cache      │  │ • No content    │
│ • Redis cache   │  │ • MongoDB       │  │ • MongoDB       │  │ • MongoDB       │
│ • Fast access   │  │ • Medium speed  │  │ • Slow access   │  │ • Archive DB    │
└─────────────────┘  └─────────────────┘  └─────────────────┘  └─────────────────┘
```

### **Sentiment Data**

```
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│  REAL-TIME      │  │    DAILY        │  │    MONTHLY      │  │     YEARLY      │
│  0-24 hours    │  │   1-30 days     │  │   1-12 months  │  │    1+ years     │
├─────────────────┤  ├─────────────────┤  ├─────────────────┤  ├─────────────────┤
│ • Full analysis │  │ • Aggregated    │  │ • Aggregated    │  │ • Aggregated    │
│ • Redis cache   │  │ • Daily trends  │  │ • Monthly avg   │  │ • Yearly trends │
│ • Fast access   │  │ • Cache 2 hours │  │ • No cache      │  │ • No cache      │
└─────────────────┘  └─────────────────┘  └─────────────────┘  └─────────────────┘
```

## 🗄️ **MongoDB TTL Indexes**

### **Automatic Expiration**

```javascript
// News Collection - 90 days TTL
db.news.createIndex(
  { publishedAt: 1 },
  { expireAfterSeconds: 7776000 } // 90 days
);

// Sentiments Collection - 1 year TTL
db.sentiments.createIndex(
  { createdAt: 1 },
  { expireAfterSeconds: 31536000 } // 1 year
);

// CrawlSessions Collection - 30 days TTL
db.crawlSessions.createIndex(
  { startTime: 1 },
  { expireAfterSeconds: 2592000 } // 30 days
);
```

### **Manual Cleanup Jobs**

```javascript
// Daily cleanup job (run at 2 AM)
const cleanupOldData = async () => {
  // 1. Compress news content older than 7 days
  await compressOldNewsContent();

  // 2. Archive sentiment data older than 1 year
  await archiveOldSentiments();

  // 3. Clean up expired crawl sessions
  await cleanupExpiredSessions();

  // 4. Optimize database indexes
  await optimizeIndexes();

  // 5. Update storage statistics
  await updateStorageStats();
};
```

## 🚀 **Redis Cache TTL Policies**

### **Cache Expiration Times**

```bash
# Stock Sentiment (15 minutes)
CACHE_TTL_SENTIMENT=900

# News Articles (1 hour)
CACHE_TTL_NEWS=3600

# Trends - 1 Day (30 minutes)
CACHE_TTL_TRENDS_1D=1800

# Trends - 30 Days (2 hours)
CACHE_TTL_TRENDS_30D=7200

# Trends - 90 Days (6 hours)
CACHE_TTL_TRENDS_90D=21600

# Source Performance (1 hour)
CACHE_TTL_SOURCE_PERF=3600
```

### **Cache Key Patterns**

```bash
# Stock sentiment cache
stock:sentiment:{symbol} -> TTL: 15 minutes

# News cache
stock:news:{symbol} -> TTL: 1 hour

# Trends cache
stock:trends:{symbol}:1d -> TTL: 30 minutes
stock:trends:{symbol}:30d -> TTL: 2 hours
stock:trends:{symbol}:90d -> TTL: 6 hours

# Source performance cache
source:performance:{sourceName} -> TTL: 1 hour
```

## 📈 **Storage Growth Projections**

### **Daily Data Volume Estimates**

```
News Articles:     ~10,000 articles/day
Sentiment Analysis: ~10,000 analyses/day
Crawl Sessions:    ~100 sessions/day
Stock Updates:     ~500 updates/day

Total Daily:       ~20,600 records/day
```

### **Monthly Storage Growth**

```
Month 1:  ~618,000 records (~2 GB)
Month 3:  ~1,854,000 records (~6 GB)
Month 6:  ~3,708,000 records (~12 GB)
Month 12: ~7,416,000 records (~24 GB)
```

### **Storage Optimization Impact**

```
With TTL (90 days news, 1 year sentiments):
Month 12: ~3,000,000 records (~10 GB) - 60% reduction

With compression (7+ days old):
Month 12: ~2,500,000 records (~8 GB) - 70% reduction
```

## 🔄 **Data Lifecycle Management**

### **Phase 1: Active Data (0-7 days)**

- **Storage**: MongoDB + Redis cache
- **Access**: Fast, real-time
- **Operations**: Full CRUD operations
- **Backup**: Daily incremental backups

### **Phase 2: Warm Data (8-30 days)**

- **Storage**: MongoDB + Redis summary cache
- **Access**: Medium speed
- **Operations**: Read operations + limited updates
- **Backup**: Weekly incremental backups

### **Phase 3: Cold Data (31-90 days)**

- **Storage**: MongoDB only (compressed)
- **Access**: Slow, batch operations
- **Operations**: Read-only, analytics
- **Backup**: Monthly full backups

### **Phase 4: Archive Data (90+ days)**

- **Storage**: Archive MongoDB + file storage
- **Access**: Very slow, batch only
- **Operations**: Analytics and reporting only
- **Backup**: Quarterly archival backups

## 🛠️ **Implementation Details**

### **Environment Configuration**

```bash
# Data Retention Configuration
NEWS_RETENTION_DAYS=90          # Keep news for 90 days
SENTIMENT_RETENTION_DAYS=365    # Keep sentiments for 1 year
CRAWL_SESSION_RETENTION_DAYS=30 # Keep crawl sessions for 30 days

# Cache TTL Configuration
CACHE_TTL_SENTIMENT=900         # 15 minutes in seconds
CACHE_TTL_NEWS=3600            # 1 hour in seconds
CACHE_TTL_TRENDS_1D=1800       # 30 minutes in seconds
CACHE_TTL_TRENDS_30D=7200      # 2 hours in seconds
CACHE_TTL_TRENDS_90D=21600     # 6 hours in seconds
```

### **Database Models with TTL**

```javascript
// News Schema with TTL
const newsSchema = new mongoose.Schema({
  // ... other fields
  publishedAt: {
    type: Date,
    required: true,
    index: { expireAfterSeconds: 7776000 }, // 90 days
  },
});

// Sentiment Schema with TTL
const sentimentSchema = new mongoose.Schema({
  // ... other fields
  createdAt: {
    type: Date,
    default: Date.now,
    index: { expireAfterSeconds: 31536000 }, // 1 year
  },
});
```

### **Redis Cache Implementation**

```javascript
// Cache service with TTL
class CacheService {
  async setStockSentiment(symbol, data) {
    const key = `stock:sentiment:${symbol}`;
    await this.redis.setex(key, 900, JSON.stringify(data)); // 15 minutes
  }

  async setStockNews(symbol, data) {
    const key = `stock:news:${symbol}`;
    await this.redis.setex(key, 3600, JSON.stringify(data)); // 1 hour
  }

  async setStockTrends(symbol, period, data) {
    const key = `stock:trends:${symbol}:${period}`;
    const ttl = this.getTrendsTTL(period);
    await this.redis.setex(key, ttl, JSON.stringify(data));
  }

  getTrendsTTL(period) {
    const ttlMap = {
      '1d': 1800, // 30 minutes
      '30d': 7200, // 2 hours
      '90d': 21600, // 6 hours
    };
    return ttlMap[period] || 3600; // Default 1 hour
  }
}
```

## 📊 **Monitoring & Alerts**

### **Storage Metrics**

```javascript
// Daily storage monitoring
const monitorStorage = async () => {
  const stats = await getDatabaseStats();

  // Alert if storage growth > 20% in a day
  if (stats.dailyGrowth > 20) {
    await sendAlert('High storage growth detected', stats);
  }

  // Alert if cache memory usage > 80%
  if (stats.cacheMemoryUsage > 80) {
    await sendAlert('High cache memory usage', stats);
  }

  // Alert if TTL indexes not working
  if (!stats.ttlIndexesActive) {
    await sendAlert('TTL indexes not active', stats);
  }
};
```

### **Performance Metrics**

```javascript
// Cache hit rate monitoring
const monitorCachePerformance = async () => {
  const hitRate = await calculateCacheHitRate();

  if (hitRate < 70) {
    await sendAlert('Low cache hit rate detected', { hitRate });
  }

  if (hitRate > 95) {
    await sendAlert('Cache TTL might be too long', { hitRate });
  }
};
```

## ⚠️ **Compliance & Legal Considerations**

### **Data Privacy**

- **Personal Data**: No personal information stored
- **Financial Data**: Only public market information
- **Retention**: Compliant with financial regulations

### **Legal Requirements**

- **SEBI Guidelines**: Follow Indian market regulations
- **Data Protection**: Comply with Indian data protection laws
- **Audit Trail**: Maintain logs for compliance

### **Data Sovereignty**

- **Storage Location**: Data stored in India
- **Backup Location**: Backup within Indian jurisdiction
- **Access Control**: Restricted to authorized personnel

## 🚀 **Future Optimizations**

### **Phase 2: Advanced Storage**

- **Data Lake**: Implement data lake for historical analysis
- **Columnar Storage**: Use columnar databases for analytics
- **Data Partitioning**: Partition by date and stock symbol

### **Phase 3: AI-Powered Optimization**

- **Predictive Cleanup**: AI predicts which data to keep
- **Smart Compression**: Intelligent compression based on importance
- **Dynamic TTL**: Adjust TTL based on usage patterns

---

**Status**: Data Retention Policies Defined
**Next**: Implement in Week 3 of development
**Goal**: Optimize storage while maintaining performance
