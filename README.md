# Stock Sentiment Analyzer - Feature 2: Sentiment Analysis Processing

## 🚀 Project Overview

This is an AI-Powered Stock Sentiment Analyzer Web App for the Indian Market. We're building this feature by feature, and this repository now contains **Feature 1: Stock Search and Input** and **Feature 2: Sentiment Analysis Processing**.

## ✨ Current Features

### ✅ Feature 1: Stock Search and Input (Complete)

- Real-time search with 300ms debouncing
- Keyboard navigation (Arrow keys, Enter, Escape)
- Click outside to close suggestions
- Responsive design with Tailwind CSS
- MongoDB schema with proper indexing
- 56 Indian stocks (NSE/BSE) with real data
- Redis caching for performance
- GraphQL API with Apollo Server v5
- Rate limiting and error handling

### ✅ Feature 2: Sentiment Analysis Processing (Complete)

- **GNews API Integration**: Fetches recent news articles for selected stocks
- **Hugging Face AI Integration**: Uses FinBERT model for financial sentiment analysis
- **Smart Text Preprocessing**: Optimizes text for better AI analysis
- **Sentiment Scoring**: Provides positive/negative/neutral classification with confidence scores
- **Article Aggregation**: Combines multiple articles with weighted scoring by recency
- **Sentiment Dashboard**: Beautiful UI showing sentiment breakdown, articles, and insights
- **Caching**: Redis-based caching to avoid repeated API calls
- **Error Handling**: Graceful fallbacks when APIs are unavailable

### 🔄 Feature 3: Stock Price Integration (Coming Next)

- Yahoo Finance integration for price data
- Price-sentiment correlation analysis
- Historical price trends

### 🔄 Feature 4: Visualization Dashboard (Coming Soon)

- Interactive charts with Chart.js
- Word clouds from news articles
- Sentiment vs. price correlation charts

### 🔄 Feature 5: User Authentication and Favorites (Coming Soon)

- User registration and login
- Save favorite stocks
- Personalized dashboard

### 🔄 Feature 6: Data Export (Coming Soon)

- CSV export functionality
- PDF reports with charts

## 🏗️ Project Structure

```
stock-sentiment-app/
├── server/                 # Backend server
│   ├── config/            # Database and Redis config
│   ├── graphql/           # GraphQL schema and resolvers
│   ├── models/            # MongoDB models
│   ├── services/          # Business logic services
│   │   └── sentimentService.js  # Sentiment analysis service
│   ├── scripts/           # Database seeding
│   ├── test/              # Test files
│   │   └── test-sentiment.js    # Sentiment service tests
│   ├── index.js           # Main server file
│   └── package.json       # Server dependencies
├── client/                 # React frontend
│   ├── public/            # Static files
│   ├── src/               # React components
│   │   ├── components/    # React components
│   │   │   ├── Header.js
│   │   │   ├── StockDashboard.js
│   │   │   ├── StockSearch.js
│   │   │   └── SentimentDashboard.js  # New sentiment dashboard
│   │   ├── App.js         # Main app component
│   │   └── index.js       # Entry point
│   └── package.json       # Client dependencies
└── README.md              # This file
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)
- Redis (optional, will work without it)
- GNews API key (free tier: 100 requests/day)
- Hugging Face API key (free tier: 1,000 requests/month)

### Installation

1. **Clone and install dependencies:**

```bash
git clone <repository-url>
cd stock-sentiment-app
pnpm install-all
```

2. **Set up environment variables:**

```bash
cd server
cp env.example .env
# Edit .env with your configuration:
# GNEWS_API_KEY=your-gnews-api-key
# HUGGINGFACE_API_KEY=your-huggingface-api-key
```

3. **Seed the database:**

```bash
cd server
node scripts/seedStocks.js
```

4. **Test the sentiment service:**

```bash
cd server
node test/test-sentiment.js
```

5. **Start the development servers:**

```bash
# From root directory
pnpm dev
```

This will start:

- Backend: http://localhost:5000
- Frontend: http://localhost:3000
- GraphQL: http://localhost:4000

## 🧪 Testing the Features

### Feature 1: Stock Search

1. **Open the app** at http://localhost:3000
2. **Search for stocks** using:
   - Ticker symbols: `RELIANCE`, `TCS`, `HDFCBANK`
   - Company names: `Reliance`, `Tata`, `HDFC`
   - Sectors: `Banking`, `IT`, `Oil`
3. **Use keyboard navigation:**
   - Arrow keys to navigate suggestions
   - Enter to select
   - Escape to close

### Feature 2: Sentiment Analysis

1. **Select a stock** from the search results
2. **Click "View Sentiment Analysis"** button
3. **Explore the sentiment dashboard:**
   - Overall sentiment score and confidence
   - Sentiment breakdown (positive/negative/neutral percentages)
   - List of analyzed articles with individual sentiment scores
   - Article sources and publication dates

## 📊 API Endpoints

### GraphQL Queries

**Get Stock Suggestions:**

```graphql
query GetStockSuggestions($query: String!, $limit: Int!) {
  getStockSuggestions(query: $query, limit: $limit) {
    suggestions {
      ticker
      name
      exchange
      sector
    }
    totalCount
  }
}
```

**Get Sentiment Analysis:**

```graphql
query GetSentiment($ticker: String!, $dateRange: DateRangeInput) {
  getSentiment(ticker: $ticker, dateRange: $dateRange) {
    ticker
    overallSentiment {
      label
      score
      confidence
    }
    articles {
      title
      description
      url
      publishedAt
      source
      sentiment {
        label
        score
        confidence
      }
    }
    totalArticles
    sentimentBreakdown {
      positive
      negative
      neutral
      positivePercentage
      negativePercentage
      neutralPercentage
    }
    lastUpdated
  }
}
```

**Get Sentiment History:**

```graphql
query GetSentimentHistory($ticker: String!, $days: Int!) {
  getSentimentHistory(ticker: $ticker, days: $days) {
    ticker
    overallSentiment {
      label
      score
      confidence
    }
    lastUpdated
  }
}
```

### REST Endpoints

- `GET /health` - Health check
- `POST /graphql` - GraphQL endpoint (port 4000)

## 🔧 Configuration

### Environment Variables

```env
# MongoDB
MONGODB_URI=mongodb://localhost:27017/stock-sentiment

# Redis (optional)
REDIS_URL=redis://localhost:6379

# Server
PORT=5000
NODE_ENV=development

# API Keys (Required for Feature 2)
GNEWS_API_KEY=your-gnews-api-key
HUGGINGFACE_API_KEY=your-huggingface-api-key

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### API Keys Setup

1. **GNews API** (Free tier: 100 requests/day):

   - Visit: https://gnews.io/
   - Sign up for free account
   - Get API key from dashboard

2. **Hugging Face API** (Free tier: 1,000 requests/month):
   - Visit: https://huggingface.co/
   - Sign up for free account
   - Go to Settings → Access Tokens
   - Create new token

## 🎯 How Sentiment Analysis Works

### 1. News Fetching

- Queries GNews API with stock ticker + "stock India"
- Filters for English articles from Indian sources
- Limits to 20 most recent articles

### 2. AI Processing

- Uses Hugging Face's FinBERT model (99% F1 score on financial text)
- Preprocesses text: lowercase, remove special chars, limit length
- Returns sentiment label + confidence score

### 3. Aggregation

- Combines article sentiments with time-based weighting
- Newer articles get higher weight (exponential decay over 7 days)
- Calculates overall sentiment and breakdown statistics

### 4. Caching

- Redis caches results for 1 hour
- Avoids repeated API calls for same stock
- Improves response time significantly

## 🧹 Clean Codebase

This codebase has been cleaned up to:

- ✅ Remove unused dependencies
- ✅ Keep only essential packages
- ✅ Clean, readable code structure
- ✅ Minimal footprint for Features 1 & 2
- ✅ Easy to extend for future features

## 🤝 Contributing

This is a feature-by-feature development. Each feature will be:

1. Developed in a new branch
2. Self-reviewed and tested
3. Code reviewed
4. Merged to main

## 📝 License

MIT License - see LICENSE file for details

## 🆘 Support

If you encounter issues:

1. Check the console for errors
2. Verify MongoDB connection
3. Check environment variables and API keys
4. Ensure all dependencies are installed
5. Test sentiment service: `node test/test-sentiment.js`

---

**Current Status**: ✅ Feature 1 Complete - Stock Search and Input
**Current Status**: ✅ Feature 2 Complete - Sentiment Analysis Processing  
**Next**: 🔄 Feature 3 - Stock Price Integration
