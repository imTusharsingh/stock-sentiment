# 🚀 Stock Discovery Agent - Comprehensive Implementation Plan

## 🎯 **Project Overview**

Create a **dedicated, autonomous stock discovery agent** using Puppeteer that:

- Runs **separately** from the main stock sentiment server
- Scrapes **all active stocks** from NSE and BSE daily
- Operates during **market hours** for real-time updates
- Caches results in **database and Redis**
- Handles errors **super robustly** with retry mechanisms
- Is **fully modular** and maintainable

## 🏗️ **Architecture Design**

### **Service Separation**

```
┌─────────────────────┐    ┌─────────────────────┐    ┌─────────────────────┐
│   Stock Sentiment   │    │   Stock Discovery   │    │   Shared Database   │
│      Server         │◄──►│       Agent         │◄──►│   (MongoDB/Redis)   │
│   (Main App)        │    │   (Separate Process)│    │                     │
└─────────────────────┘    └─────────────────────┘    └─────────────────────┘
```

### **Agent Components**

```
Stock Discovery Agent
├── Core Engine (Puppeteer)
├── NSE Scraper Module
├── BSE Scraper Module
├── Data Processor
├── Cache Manager (Redis)
├── Database Manager (MongoDB)
├── Error Handler & Retry
├── Scheduler (Cron Jobs)
├── Health Monitor
└── Logging & Analytics
```

## 🔍 **Deep Research: NSE & BSE Scraping Strategy**

### **NSE Scraping Approach**

**Target Pages to Scrape:**

1. **Market Watch Page**: `https://www.nseindia.com/market-data/equity-derivatives-watch`
2. **All Securities**: `https://www.nseindia.com/get-quotes/equity`
3. **New Listings**: `https://www.nseindia.com/companies-listing/new-listings`
4. **Delisted Securities**: `https://www.nseindia.com/companies-listing/delisted-securities`

**Scraping Strategy:**

- Use Puppeteer to navigate through pagination
- Extract stock symbols, names, ISIN codes, series
- Handle dynamic content loading
- Parse table data systematically

### **BSE Scraping Approach**

**Target Pages to Scrape:**

1. **Market Watch**: `https://www.bseindia.com/markets/equity/equity_marketwatch.aspx`
2. **All Securities**: `https://www.bseindia.com/markets/equity/equity_marketwatch.aspx`
3. **New Listings**: `https://www.bseindia.com/markets/equity/new-listings.aspx`

**Scraping Strategy:**

- Use Puppeteer with stealth plugins
- Handle ASP.NET page structure
- Extract BSE codes, company names, groups
- Navigate through multiple pages

## 🛠️ **Technical Implementation Plan**

### **Phase 1: Core Infrastructure**

1. **Agent Service Setup**

   - Create standalone Node.js service
   - Install Puppeteer and dependencies
   - Set up environment configuration
   - Implement logging and monitoring

2. **Database Schema Design**

   ```javascript
   // Stocks Collection
   {
     symbol: "RELIANCE",
     name: "Reliance Industries Limited",
     exchange: "NSE", // or "BSE"
     isin: "INE002A01018",
     series: "EQ",
     faceValue: "10",
     listingDate: "1995-11-29",
     isActive: true,
     lastUpdated: "2024-01-15T09:30:00Z",
     marketCap: "18590948392960",
     sector: "Oil & Gas",
     bseCode: "500325" // if cross-listed
   }

   // Scraping Logs Collection
   {
     timestamp: "2024-01-15T09:30:00Z",
     exchange: "NSE",
     status: "success",
     stocksFound: 5821,
     duration: 45000,
     errors: [],
     newStocks: 5,
     delistedStocks: 2
   }
   ```

### **Phase 2: Scraping Engine**

1. **Puppeteer Setup with Stealth**

   ```javascript
   const puppeteer = require('puppeteer-extra');
   const StealthPlugin = require('puppeteer-extra-plugin-stealth');
   puppeteer.use(StealthPlugin());

   // Anti-detection measures
   - Random user agents
   - Human-like delays
   - Cookie management
   - Proxy rotation (if needed)
   ```

2. **NSE Scraper Module**

   - Navigate to market data pages
   - Handle pagination and dynamic loading
   - Extract stock information systematically
   - Handle rate limiting gracefully

3. **BSE Scraper Module**
   - Navigate through ASP.NET pages
   - Handle session management
   - Extract BSE-specific data
   - Implement fallback strategies

### **Phase 3: Data Processing & Storage**

1. **Data Normalization**

   - Standardize data formats
   - Handle missing/incomplete data
   - Validate data integrity
   - Cross-reference with existing data

2. **Cache Management**

   - Redis for fast access
   - TTL-based expiration
   - Batch updates
   - Memory optimization

3. **Database Operations**
   - Bulk upserts for efficiency
   - Change detection (new/delisted stocks)
   - Historical tracking
   - Index optimization

### **Phase 4: Error Handling & Resilience**

1. **Retry Mechanisms**

   ```javascript
   // Exponential backoff with jitter
   const retry = async (fn, maxAttempts = 3) => {
     for (let attempt = 1; attempt <= maxAttempts; attempt++) {
       try {
         return await fn();
       } catch (error) {
         if (attempt === maxAttempts) throw error;
         const delay = Math.min(1000 * Math.pow(2, attempt), 30000);
         await new Promise((resolve) =>
           setTimeout(resolve, delay + Math.random() * 1000)
         );
       }
     }
   };
   ```

2. **Circuit Breaker Pattern**

   - Monitor failure rates
   - Temporarily disable failing scrapers
   - Gradual recovery
   - Health check endpoints

3. **Graceful Degradation**
   - Continue with partial data
   - Use cached data when scraping fails
   - Alert administrators for critical failures
   - Log detailed error information

### **Phase 5: Scheduling & Automation**

1. **Market Hours Detection**

   ```javascript
   // Indian market hours: 9:15 AM - 3:30 PM IST
   const isMarketOpen = () => {
     const now = new Date();
     const istTime = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
     const hour = istTime.getHours();
     const minute = istTime.getMinutes();
     const timeInMinutes = hour * 60 + minute;

     return timeInMinutes >= 555 && timeInMinutes <= 930; // 9:15 AM - 3:30 PM
   };
   ```

2. **Cron Jobs**

   - **Daily at 9:00 AM**: Pre-market preparation
   - **Every 30 minutes during market hours**: Incremental updates
   - **Daily at 4:00 PM**: Post-market full refresh
   - **Weekly**: Deep validation and cleanup

3. **Event-Driven Updates**
   - Webhook notifications for new listings
   - Real-time alerts for delistings
   - Market event triggers

## 📦 **Dependencies & Installation**

### **Core Dependencies**

```json
{
  "puppeteer": "^21.0.0",
  "puppeteer-extra": "^3.3.6",
  "puppeteer-extra-plugin-stealth": "^2.11.2",
  "mongoose": "^8.0.0",
  "redis": "^4.6.10",
  "node-cron": "^3.0.3",
  "winston": "^3.11.0",
  "axios": "^1.11.0",
  "cheerio": "^1.0.0-rc.12"
}
```

### **Optional Dependencies**

```json
{
  "puppeteer-extra-plugin-adblocker": "^2.13.6",
  "puppeteer-extra-plugin-user-preferences": "^2.4.4",
  "proxy-chain": "^2.4.0"
}
```

## 🚀 **Deployment Strategy**

### **Service Configuration**

```javascript
// config/agent.config.js
module.exports = {
  // Scraping Configuration
  scraping: {
    nse: {
      enabled: true,
      baseUrl: "https://www.nseindia.com",
      maxRetries: 3,
      delayBetweenRequests: 2000,
      timeout: 30000,
    },
    bse: {
      enabled: true,
      baseUrl: "https://www.bseindia.com",
      maxRetries: 3,
      delayBetweenRequests: 3000,
      timeout: 30000,
    },
  },

  // Database Configuration
  database: {
    mongoUri: process.env.MONGO_URI,
    redisUri: process.env.REDIS_URI,
    maxConnections: 10,
  },

  // Scheduling Configuration
  schedule: {
    marketOpen: "0 9 * * 1-5", // 9:00 AM weekdays
    marketClose: "0 16 * * 1-5", // 4:00 PM weekdays
    incrementalUpdate: "*/30 9-15 * * 1-5", // Every 30 min during market hours
  },
};
```

### **Docker Configuration**

```dockerfile
FROM node:18-alpine

# Install Chromium dependencies
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont

# Set Puppeteer environment
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
EXPOSE 3001

CMD ["npm", "start"]
```

## 📊 **Monitoring & Analytics**

### **Health Checks**

- Service uptime monitoring
- Scraping success rates
- Database connection status
- Redis cache hit rates
- Error rate tracking

### **Metrics Dashboard**

- Stocks discovered per day
- Scraping duration trends
- Error patterns and frequencies
- Cache performance metrics
- Market coverage statistics

### **Alerting System**

- Critical failures (scraping down)
- High error rates
- Database connection issues
- Cache performance degradation
- New stock discoveries

## 🔒 **Security & Compliance**

### **Anti-Detection Measures**

- Rotate user agents
- Randomize request timing
- Handle cookies properly
- Respect robots.txt
- Implement rate limiting

### **Data Privacy**

- Secure API keys storage
- Encrypted database connections
- Audit logging
- Access control
- Data retention policies

## 📈 **Performance Optimization**

### **Parallel Processing**

- Scrape NSE and BSE simultaneously
- Use worker threads for data processing
- Implement connection pooling
- Optimize database queries

### **Caching Strategy**

- Redis for hot data
- Database for persistent storage
- In-memory caching for frequently accessed data
- Smart cache invalidation

### **Resource Management**

- Memory leak prevention
- Connection cleanup
- Garbage collection optimization
- Resource monitoring

## 🧪 **Testing Strategy**

### **Unit Tests**

- Individual scraper modules
- Data processing functions
- Error handling logic
- Cache management

### **Integration Tests**

- End-to-end scraping workflows
- Database operations
- Redis interactions
- Error recovery scenarios

### **Load Testing**

- Concurrent scraping operations
- Database performance under load
- Memory usage patterns
- Network timeout handling

## 📝 **Implementation Timeline**

### **Week 1: Foundation**

- Set up project structure
- Install dependencies
- Configure database connections
- Implement basic logging

### **Week 2: Core Scraping**

- Implement NSE scraper
- Implement BSE scraper
- Add error handling
- Basic data processing

### **Week 3: Data Management**

- Database schema implementation
- Redis caching layer
- Data validation and normalization
- Change detection logic

### **Week 4: Production Ready**

- Scheduling and automation
- Monitoring and alerting
- Performance optimization
- Documentation and deployment

## 🎯 **Success Metrics**

### **Reliability**

- 99.9% uptime
- <1% error rate
- <5 minute recovery time
- Zero data loss

### **Performance**

- <2 minutes for full NSE scrape
- <3 minutes for full BSE scrape
- <100ms cache response time
- <1 second database queries

### **Coverage**

- 100% of active NSE stocks
- 100% of active BSE stocks
- Real-time new listing detection
- Accurate delisting tracking

## 🚨 **Risk Mitigation**

### **Technical Risks**

- **Website changes**: Implement flexible selectors
- **Rate limiting**: Add intelligent delays
- **IP blocking**: Use proxy rotation
- **Data corruption**: Implement validation

### **Operational Risks**

- **Service downtime**: Health monitoring
- **Data inconsistency**: Regular validation
- **Performance degradation**: Resource monitoring
- **Security breaches**: Access control

---

**This plan provides a comprehensive, production-ready approach to building a robust stock discovery agent that operates independently and reliably. The modular design ensures maintainability, while the robust error handling ensures resilience.**
