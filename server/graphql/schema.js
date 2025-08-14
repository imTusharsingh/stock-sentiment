const { gql } = require("graphql-tag");

const typeDefs = gql`
  scalar Date

  type Stock {
    id: ID!
    ticker: String!
    name: String!
    exchange: String!
    sector: String
    marketCap: Float
    lastUpdated: String
  }

  type StockSuggestion {
    ticker: String!
    name: String!
    exchange: String!
    sector: String
  }

  type StockSearchResult {
    suggestions: [StockSuggestion!]!
    totalCount: Int!
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
    name: String
    addedAt: Date!
  }

  type AuthPayload {
    user: User!
    token: String!
  }

  type FavoriteOperationResult {
    success: Boolean!
    message: String!
    favorites: [Favorite!]!
  }

  type Query {
    # Stock Search and Suggestions
    getStockSuggestions(query: String!, limit: Int = 10): StockSearchResult!
    getStockByTicker(ticker: String!): Stock
    getAllStocks(limit: Int = 50, offset: Int = 0): [Stock!]!

    # Sentiment Analysis
    getSentiment(ticker: String!, dateRange: DateRangeInput): SentimentResult!
    getSentimentHistory(ticker: String!, days: Int = 7): [SentimentResult!]!

    # Price Data
    getPriceTrend(ticker: String!, dateRange: DateRangeInput): PriceTrend!
    getStockPrice(ticker: String!, period: String = "1mo"): PriceTrend!

    # User and Favorites
    me: User
    getFavorites: [Favorite!]!

    # Health check
    health: String!
  }

  input DateRangeInput {
    from: String
    to: String
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

  type Mutation {
    # Authentication
    register(input: RegisterInput!): AuthPayload!
    login(input: LoginInput!): AuthPayload!

    # Favorites Management
    addFavorite(ticker: String!, name: String): FavoriteOperationResult!
    removeFavorite(ticker: String!): FavoriteOperationResult!

    # Placeholder for future mutations
    _: Boolean
  }

  type Subscription {
    # Placeholder for future subscriptions
    _: Boolean
  }
`;

module.exports = typeDefs;
