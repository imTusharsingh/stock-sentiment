const { gql } = require("graphql-tag");

const typeDefs = gql`
  scalar Date

  type Stock {
    id: ID!
    ticker: String!
    name: String!
    exchange: String!
    exchangeName: String!
    sector: String
    industry: String
    marketCap: Float
    isin: String
    faceValue: Float
    marketLot: Int
    listingDate: String
    source: String
    priority: Int
    lastUpdated: String
    isActive: Boolean!
  }

  type StockSuggestion {
    ticker: String!
    name: String!
    exchange: String!
    sector: String
    industry: String
    marketCap: Float
    isin: String
    priority: Int
  }

  type StockSearchResult {
    suggestions: [StockSuggestion!]!
    totalCount: Int!
    query: String!
    searchTime: String!
  }

  type StockDetails {
    ticker: String!
    name: String!
    exchange: String!
    exchangeName: String!
    sector: String
    industry: String
    marketCap: Float
    isin: String
    faceValue: Float
    marketLot: Int
    listingDate: String
    source: String
    priority: Int
    lastUpdated: String!
    isActive: Boolean!
  }

  type StockSyncResult {
    success: Boolean!
    message: String!
    stats: StockSyncStats
    lastSync: String
    nextSync: String
    error: String
  }

  type StockSyncStats {
    created: Int!
    updated: Int!
    errors: Int!
    total: Int!
  }

  type StockDataStatus {
    isInitialized: Boolean!
    dataSource: String!
    lastSync: String
    nextSync: String
  }

  type Article {
    title: String!
    description: String
    url: String!
    publishedAt: String!
    source: String!
    sentiment: SentimentScore!
  }

  type SentimentScore {
    label: String! # positive, negative, neutral
    score: Float!
    confidence: Float!
  }

  type SentimentResult {
    ticker: String!
    overallSentiment: SentimentScore!
    articles: [Article!]!
    totalArticles: Int!
    sentimentBreakdown: SentimentBreakdown!
    lastUpdated: String!
  }

  type SentimentBreakdown {
    positive: Int!
    negative: Int!
    neutral: Int!
    positivePercentage: Float!
    negativePercentage: Float!
    neutralPercentage: Float!
  }

  # Price Data Types
  type PriceDataPoint {
    date: String!
    open: Float!
    high: Float!
    low: Float!
    close: Float!
    volume: Int!
    dailyReturn: Float!
  }

  type PriceSummary {
    currentPrice: Float!
    startPrice: Float!
    totalReturn: Float!
    highestPrice: Float!
    lowestPrice: Float!
    daysAnalyzed: Int!
  }

  type PriceTrend {
    ticker: String!
    period: String!
    data: [PriceDataPoint!]!
    summary: PriceSummary!
    lastUpdated: String!
  }

  # User and Authentication Types
  type User {
    id: ID!
    email: String!
    name: String!
    favorites: [Favorite!]!
    createdAt: Date!
    lastLogin: Date!
  }

  type Favorite {
    ticker: String!
    addedAt: Date!
  }

  type AuthPayload {
    token: String!
    user: User!
  }

  input DateRangeInput {
    from: String!
    to: String!
  }

  # Stock Agent Queries
  type Query {
    # Health check
    health: String!

    # Enhanced Stock Search
    getStockSuggestions(
      query: String!
      limit: Int
      exchange: String
      sector: String
      sortBy: String
      sortOrder: Int
    ): StockSearchResult!

    # Stock Details
    getStockDetails(ticker: String!): StockDetails

    # Stock Agent Management
    getStockDataStatus: StockDataStatus!
    syncStockData(forceSync: Boolean): StockSyncResult!

    # Stock Queries
    getStockByTicker(ticker: String!): Stock
    getAllStocks(limit: Int, offset: Int): [Stock!]!

    # Sentiment Analysis
    getSentiment(ticker: String!, dateRange: DateRangeInput): SentimentResult!
    getSentimentHistory(ticker: String!, days: Int): [SentimentResult!]!

    # Price Data
    getPriceTrend(ticker: String!, dateRange: DateRangeInput): PriceTrend!
    getStockPrice(ticker: String!, period: String): PriceTrend!

    # User Management
    me: User
    getFavorites: [Favorite!]!
  }

  # Stock Agent Mutations
  type Mutation {
    # Stock Data Management
    forceStockDataRefresh: StockSyncResult!

    # User Management
    register(input: RegisterInput!): AuthPayload!
    login(input: LoginInput!): AuthPayload!
    addFavorite(ticker: String!, name: String!): Favorite!
    removeFavorite(ticker: String!): Boolean!
  }

  input RegisterInput {
    email: String!
    password: String!
    name: String!
  }

  input LoginInput {
    email: String!
    password: String!
  }

  # Subscriptions for real-time updates
  type Subscription {
    stockDataUpdated: Stock!
    sentimentUpdated: SentimentResult!
  }
`;

module.exports = typeDefs;
