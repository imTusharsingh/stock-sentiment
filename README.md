# Stock Sentiment Analyzer - Feature 1: Stock Search and Input

## 🚀 Project Overview

This is an AI-Powered Stock Sentiment Analyzer Web App for the Indian Market. We're building this feature by feature, and this repository contains **Feature 1: Stock Search and Input**.

## ✨ Current Feature: Stock Search and Input

### What's Implemented

✅ **Stock Search with Autocomplete**

- Real-time search with 300ms debouncing
- Keyboard navigation (Arrow keys, Enter, Escape)
- Click outside to close suggestions
- Responsive design with Tailwind CSS

✅ **Stock Database**

- MongoDB schema with proper indexing
- 56 Indian stocks (NSE/BSE) with real data
- Stock model with ticker, name, exchange, sector, market cap
- Redis caching for performance

✅ **GraphQL API**

- Apollo Server v5 with Express
- Stock suggestions query with search
- Rate limiting and error handling
- Health check endpoint

✅ **React Frontend**

- Modern React 18 with hooks
- Responsive UI with Tailwind CSS
- Loading states and error handling
- Mock data fallback for development

### Tech Stack

**Backend:**

- Node.js + Express
- Apollo Server v5 (GraphQL)
- MongoDB with Mongoose
- Redis for caching
- Rate limiting and security

**Frontend:**

- React 18 with hooks
- Tailwind CSS (CDN)
- Axios for API calls
- Responsive design

## 🏗️ Project Structure

```
stock-sentiment-app/
├── server/                 # Backend server
│   ├── config/            # Database and Redis config
│   ├── graphql/           # GraphQL schema and resolvers
│   ├── models/            # MongoDB models
│   ├── scripts/           # Database seeding
│   ├── test/              # Test files
│   ├── index.js           # Main server file
│   └── package.json       # Server dependencies
├── client/                 # React frontend
│   ├── public/            # Static files
│   ├── src/               # React components
│   │   ├── components/    # React components
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
# Edit .env with your configuration
```

3. **Seed the database:**

```bash
cd server
node scripts/seedStocks.js
```

4. **Start the development servers:**

```bash
# From root directory
pnpm dev
```

This will start:

- Backend: http://localhost:5000
- Frontend: http://localhost:3000
- GraphQL: http://localhost:4000

## 🧪 Testing the Feature

1. **Open the app** at http://localhost:3000
2. **Search for stocks** using:
   - Ticker symbols: `RELIANCE`, `TCS`, `HDFCBANK`
   - Company names: `Reliance`, `Tata`, `HDFC`
   - Sectors: `Banking`, `IT`, `Oil`
3. **Use keyboard navigation:**
   - Arrow keys to navigate suggestions
   - Enter to select
   - Escape to close
4. **Select a stock** to see the dashboard placeholder

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

**Get Stock by Ticker:**

```graphql
query GetStockByTicker($ticker: String!) {
  getStockByTicker(ticker: $ticker) {
    id
    ticker
    name
    exchange
    sector
    marketCap
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
REDIS_USERNAME=default
REDIS_PASSWORD=your-redis-password
REDIS_HOST=your-redis-host
REDIS_PORT=your-redis-port
REDIS_URL=redis://username:password@host:port

# Server
PORT=5000
NODE_ENV=development

# API Keys (for future features)
GNEWS_API_KEY=your-gnews-api-key
HUGGINGFACE_API_KEY=your-huggingface-api-key
```

## 🎯 Next Features (Coming Soon)

- **Feature 2**: Sentiment Analysis Processing (GNews + Hugging Face)
- **Feature 3**: Stock Price Integration (Yahoo Finance)
- **Feature 4**: Visualization Dashboard (Charts + Word Cloud)
- **Feature 5**: User Authentication and Favorites
- **Feature 6**: Data Export (CSV/PDF)

## 🧹 Clean Codebase

This codebase has been cleaned up to:

- ✅ Remove unused dependencies
- ✅ Keep only essential packages
- ✅ Clean, readable code structure
- ✅ Minimal footprint for Feature 1
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
3. Check environment variables
4. Ensure all dependencies are installed

---

**Current Status**: ✅ Feature 1 Complete - Stock Search and Input
**Next**: 🔄 Feature 2 - Sentiment Analysis Processing
