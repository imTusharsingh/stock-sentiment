# 🏗️ SYSTEM DESIGN: Indian Stock Sentiment Service

## 📋 **System Overview**

A scalable, real-time stock sentiment analysis service for Indian stocks using web crawling, AI sentiment analysis, and advanced analytics.

## 🎯 **Core Features**

1. **Real-time sentiment analysis** for Indian stocks
2. **Multi-source news crawling** (10-20 sources)
3. **Pre-crawling system** for top 200-300 stocks every 1h 15m
4. **On-demand crawling** with previous data fallback
5. **Historical sentiment trends** (1, 30, 90 days)
6. **RAG-enhanced analysis** with vector database
7. **Analytics dashboard** with news source tracking

## 🏗️ **Architecture Components**

### **1. Frontend Layer**

```
┌─────────────────────────────────────────────────────────────┐
│                    REACT FRONTEND                          │
├─────────────────────────────────────────────────────────────┤
│  • Stock Search Interface                                  │
│  • Sentiment Dashboard                                     │
│  • Historical Trends (Charts)                              │
│  • News Source Analytics                                   │
│  • Real-time Updates                                       │
└─────────────────────────────────────────────────────────────┘
```

### **2. API Gateway Layer**

```
┌─────────────────────────────────────────────────────────────┐
│                    EXPRESS API GATEWAY                     │
├─────────────────────────────────────────────────────────────┤
│  • Authentication & Rate Limiting                          │
│  • Request Routing                                         │
│  • Response Caching                                        │
│  • Error Handling                                          │
└─────────────────────────────────────────────────────────────┘
```

### **3. Core Services Layer**

```
┌─────────────────────────────────────────────────────────────┐
│                    CORE SERVICES                           │
├─────────────────────────────────────────────────────────────┤
│  • Sentiment Service (Main API)                            │
│  • Crawler Service (Puppeteer)                             │
│  • Parser Service (HTML Processing)                        │
│  • Analytics Service (Trends & Reports)                    │
│  • Scheduler Service (Pre-crawling)                        │
└─────────────────────────────────────────────────────────────┘
```

### **4. Data Layer**

```
┌─────────────────────────────────────────────────────────────┐
│                    DATA STORAGE                            │
├─────────────────────────────────────────────────────────────┤
│  • MongoDB (Stocks, News, Sentiments)                     │
│  • Redis (Cache, Sessions, Queues)                        │
│  • Vector Database (News Embeddings)                       │
│  • File Storage (Logs, Exports)                            │
└─────────────────────────────────────────────────────────────┘
```

## 🗄️ **Database Schema Design**

### **MongoDB Collections**

#### **1. Stocks Collection**

```javascript
{
  _id: ObjectId,
  symbol: String,           // e.g., "RELIANCE"
  name: String,             // e.g., "Reliance Industries Limited"
  exchange: String,         // "NSE" or "BSE"
  sector: String,           // e.g., "Oil & Gas"
  marketCap: Number,        // Market capitalization
  isTrending: Boolean,      // Top 200-300 stocks
  lastUpdated: Date,
  createdAt: Date,
  updatedAt: Date
}
```

#### **2. News Collection**

```javascript
{
  _id: ObjectId,
  stockId: ObjectId,        // Reference to Stocks
  title: String,            // News headline
  content: String,          // News content
  summary: String,          // Extracted summary
  url: String,              // Source URL
  source: String,           // News source name
  sourceUrl: String,        // Source website
  publishedAt: Date,        // Publication date
  crawledAt: Date,          // When we crawled it
  language: String,         // "en" or "hi"
  category: String,         // "earnings", "corporate", "market"
  tags: [String],           // Keywords
  isDuplicate: Boolean,     // Duplicate detection
  createdAt: Date
}
```

#### **3. Sentiments Collection**

```javascript
{
  _id: ObjectId,
  stockId: ObjectId,        // Reference to Stocks
  newsId: ObjectId,         // Reference to News
  sentiment: {
    label: String,          // "positive", "negative", "neutral"
    score: Number,          // 0.0 to 1.0
    confidence: Number,     // 0.0 to 1.0
    model: String           // "finbert", "custom", "rag"
  },
  analysis: {
    positiveKeywords: [String],
    negativeKeywords: [String],
    neutralKeywords: [String],
    financialTerms: [String]
  },
  metadata: {
    processingTime: Number,  // ms
    modelVersion: String,
    confidenceFactors: Object
  },
  createdAt: Date
}
```

#### **4. StockSentiments Collection (Aggregated)**

```javascript
{
  _id: ObjectId,
  stockId: ObjectId,        // Reference to Stocks
  date: Date,               // Date (for daily aggregation)
  timeSlot: String,         // "hourly", "daily", "weekly"
  sentiment: {
    overall: {
      label: String,        // "positive", "negative", "neutral"
      score: Number,        // 0.0 to 1.0
      confidence: Number    // 0.0 to 1.0
    },
    breakdown: {
      positive: Number,     // Count
      negative: Number,     // Count
      neutral: Number       // Count
    },
    percentages: {
      positive: Number,     // Percentage
      negative: Number,     // Percentage
      neutral: Number       // Percentage
    }
  },
  newsCount: Number,        // Total news articles
  sources: [String],        // News sources used
  lastUpdated: Date,
  createdAt: Date
}
```

#### **5. CrawlSessions Collection**

```javascript
{
  _id: ObjectId,
  type: String,             // "pre-crawl" or "on-demand"
  status: String,           // "running", "completed", "failed"
  stocks: [ObjectId],       // Stocks being crawled
  sources: [String],        // News sources crawled
  startTime: Date,
  endTime: Date,
  stats: {
    totalStocks: Number,
    successfulStocks: Number,
    failedStocks: Number,
    totalNews: Number,
    totalSentiments: Number
  },
  errors: [String],         // Any errors encountered
  createdAt: Date
}
```

#### **6. NewsSources Collection**

```javascript
{
  _id: ObjectId,
  name: String,             // Source name
  url: String,              // Base URL
  type: String,             // "primary", "secondary", "tertiary"
  priority: Number,         // 1-10 (higher = more important)
  status: String,           // "active", "inactive", "testing"
  lastCrawled: Date,
  successRate: Number,      // 0.0 to 1.0
  avgResponseTime: Number,  // ms
  rateLimit: {
    requestsPerMinute: Number,
    delayBetweenRequests: Number
  },
  config: {
    selectors: Object,      // CSS selectors for parsing
    patterns: Object,       // Regex patterns
    headers: Object         // Custom headers
  },
  createdAt: Date,
  updatedAt: Date
}
```

### **Database Indexes & TTL Policies**

#### **Performance Indexes**

```javascript
// Stocks Collection
db.stocks.createIndex({ symbol: 1 }, { unique: true });
db.stocks.createIndex({ isTrending: 1, lastUpdated: -1 });
db.stocks.createIndex({ sector: 1, marketCap: -1 });

// News Collection
db.news.createIndex({ stockId: 1, publishedAt: -1 });
db.news.createIndex({ source: 1, crawledAt: -1 });
db.news.createIndex({ url: 1 }, { unique: true });
db.news.createIndex({ publishedAt: 1 }, { expireAfterSeconds: 7776000 }); // 90 days TTL

// Sentiments Collection
db.sentiments.createIndex({ stockId: 1, createdAt: -1 });
db.sentiments.createIndex({ newsId: 1 });
db.sentiments.createIndex({ createdAt: 1 }, { expireAfterSeconds: 31536000 }); // 1 year TTL

// StockSentiments Collection
db.stockSentiments.createIndex({ stockId: 1, date: -1 });
db.stockSentiments.createIndex({ timeSlot: 1, date: -1 });

// CrawlSessions Collection
db.crawlSessions.createIndex({ type: 1, startTime: -1 });
db.crawlSessions.createIndex({ startTime: 1 }, { expireAfterSeconds: 2592000 }); // 30 days TTL

// NewsSources Collection
db.newsSources.createIndex({ name: 1 }, { unique: true });
db.newsSources.createIndex({ status: 1, priority: -1 });
```

#### **Data Lifecycle Management**

```javascript
// Automatic cleanup jobs (run daily)
// 1. Compress news content older than 7 days
// 2. Archive sentiment data older than 1 year
// 3. Clean up expired crawl sessions
// 4. Optimize database indexes
```

### **Redis Data Structures**

#### **1. Cache Keys**

```
stock:sentiment:{symbol} -> JSON (cached sentiment data)
stock:news:{symbol} -> JSON (cached news data)
stock:trends:{symbol}:{period} -> JSON (cached trends)
news:embeddings:{newsId} -> Vector (news embeddings)
```

#### **2. Rate Limiting**

```
rate:limit:{source}:{ip} -> Number (request count)
rate:delay:{source} -> Number (next allowed request time)
```

#### **3. Queues**

```
queue:crawling -> List (stocks to crawl)
queue:processing -> List (news to process)
queue:sentiment -> List (content to analyze)
```

## 🔌 **API Design**

### **REST API Endpoints**

#### **1. Stock Sentiment API**

```
GET /api/sentiment/{symbol}
GET /api/sentiment/{symbol}/history?period=30d
GET /api/sentiment/{symbol}/news?limit=20
POST /api/sentiment/{symbol}/refresh
```

#### **2. Stock Management API**

```
GET /api/stocks
GET /api/stocks/{symbol}
GET /api/stocks/trending
POST /api/stocks/search
```

#### **3. Analytics API**

```
GET /api/analytics/sentiment/trends
GET /api/analytics/sources/performance
GET /api/analytics/market/overview
GET /api/analytics/stocks/comparison
```

#### **4. Admin API**

```
GET /api/admin/crawler/status
POST /api/admin/crawler/start
POST /api/admin/crawler/stop
GET /api/admin/sources/health
POST /api/admin/sources/test
```

### **GraphQL Schema (Alternative)**

```graphql
type Query {
  stock(symbol: String!): Stock
  sentiment(symbol: String!, period: String): SentimentData
  news(symbol: String!, limit: Int): [NewsArticle]
  analytics(period: String): AnalyticsData
}

type Stock {
  symbol: String!
  name: String!
  currentSentiment: Sentiment
  news: [NewsArticle]
  trends: SentimentTrend
}

type SentimentData {
  overall: Sentiment
  breakdown: SentimentBreakdown
  history: [SentimentPoint]
  newsCount: Int
  lastUpdated: String
}
```

## 🔄 **Data Flow Architecture**

### **1. Pre-crawling Flow (Every 1h)**

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Scheduler │───▶│  Stock List │───▶│  Crawler    │
│   Service   │    │  Generator  │    │  Service    │
└─────────────┘    └─────────────┘    └─────────────┘
                           │                   │
                           ▼                   ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Trending  │    │   Parser    │    │  Sentiment  │
│   Updater   │◀───│   Service   │◀───│  Analyzer   │
└─────────────┘    └─────────────┘    └─────────────┘
                           │                   │
                           ▼                   ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Analytics │    │   Vector    │    │   Cache     │
│   Service   │◀───│   Database  │◀───│   Service   │
└─────────────┘    └─────────────┘    └─────────────┘
```

### **2. On-demand Flow**

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   User      │───▶│   API       │───▶│   Cache     │
│   Request   │    │   Gateway   │    │   Check     │
└─────────────┘    └─────────────┘    └─────────────┘
                           │                   │
                           ▼                   ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Response  │◀───│   Crawler   │◀───│   Database  │
│   (Updated) │    │   Service   │    │   Check     │
└─────────────┘    └─────────────┘    └─────────────┘
```

## 🚀 **Implementation Plan**

### **Phase 1: Foundation (Week 1)**

1. **Database setup** - MongoDB, Redis
2. **Basic API structure** - Express server
3. **Stock data model** - Basic collections
4. **Simple sentiment service** - Hugging Face integration

### **Phase 2: Crawler System (Week 2)**

1. **Puppeteer setup** - Basic web scraping
2. **News source configuration** - First 5 sources
3. **Parser service** - HTML extraction
4. **Rate limiting** - Respectful crawling

### **Phase 3: Core Features (Week 3)**

1. **Sentiment analysis pipeline** - Complete flow
2. **Data aggregation** - Daily/hourly sentiments
3. **Caching system** - Redis implementation
4. **Basic analytics** - Simple trends

### **Phase 4: Advanced Features (Week 4)**

1. **Scheduler service** - Pre-crawling system
2. **Vector database** - News embeddings
3. **RAG integration** - Enhanced analysis
4. **Analytics dashboard** - Charts and reports

### **Phase 5: Optimization (Week 5)**

1. **Performance tuning** - Database optimization
2. **Error handling** - Robust error management
3. **Monitoring** - Health checks and metrics
4. **Testing** - Unit and integration tests

## ⚠️ **Technical Considerations**

### **1. Scalability**

- **Horizontal scaling** for crawler instances
- **Load balancing** across multiple servers
- **Database sharding** for large datasets
- **CDN integration** for static assets

### **2. Performance**

- **Database indexing** for fast queries
- **Query optimization** for complex aggregations
- **Caching strategies** for frequently accessed data
- **Async processing** for non-blocking operations

### **3. Reliability**

- **Circuit breakers** for external services
- **Retry mechanisms** for failed requests
- **Data validation** at all layers
- **Backup and recovery** strategies

### **4. Security**

- **Rate limiting** to prevent abuse
- **Input validation** to prevent injection
- **Authentication** for admin endpoints
- **Data encryption** for sensitive information

## 📊 **Data Retention & Storage Policies**

### **1. Data Retention Strategy**

#### **News Articles**

- **Hot Data (0-7 days)**: Full content + metadata in MongoDB + Redis cache
- **Warm Data (8-30 days)**: Full content in MongoDB, summary in Redis cache
- **Cold Data (31-90 days)**: Summary + sentiment in MongoDB, no cache
- **Archive Data (90+ days)**: Aggregated sentiment trends only, content archived

#### **Sentiment Data**

- **Real-time (0-24 hours)**: Full sentiment analysis in MongoDB + Redis
- **Daily (1-30 days)**: Aggregated daily sentiments in MongoDB + Redis cache
- **Monthly (1-12 months)**: Aggregated monthly sentiments in MongoDB
- **Yearly (1+ years)**: Aggregated yearly trends in MongoDB

#### **Cache Retention**

- **Redis Cache TTL**:
  - Stock sentiment: 15 minutes
  - News articles: 1 hour
  - Trends (1 day): 30 minutes
  - Trends (30 days): 2 hours
  - Trends (90 days): 6 hours
  - Source performance: 1 hour

### **2. Storage Optimization**

#### **MongoDB Collections**

- **News Collection**: Implement TTL index (90 days auto-delete)
- **Sentiments Collection**: Implement TTL index (1 year auto-delete)
- **CrawlSessions Collection**: Implement TTL index (30 days auto-delete)
- **StockSentiments Collection**: Keep indefinitely (aggregated data)

#### **Data Compression**

- **News Content**: Compress content after 7 days
- **HTML Raw Data**: Delete after 30 days (keep only parsed content)
- **Screenshots**: Delete after 7 days (for debugging only)

## 📊 **Monitoring & Analytics**

### **1. System Metrics**

- **Response times** for API endpoints
- **Crawler performance** (success rate, speed)
- **Database performance** (query times, connections)
- **Resource usage** (CPU, memory, disk)

### **2. Business Metrics**

- **News coverage** per stock
- **Sentiment accuracy** (user feedback)
- **Source reliability** scores
- **User engagement** patterns

### **3. Alerting**

- **Crawler failures** - Immediate alerts
- **High error rates** - Threshold-based alerts
- **Performance degradation** - Trend-based alerts
- **Data quality issues** - Validation alerts

---

**Status**: System Design Complete
**Next**: Database setup and basic API structure
**Timeline**: 5 weeks for full implementation
