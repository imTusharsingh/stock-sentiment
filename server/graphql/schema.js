const { gql } = require("graphql-tag");

const typeDefs = gql`
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

  type Query {
    # Stock Search and Suggestions
    getStockSuggestions(query: String!, limit: Int = 10): StockSearchResult!
    getStockByTicker(ticker: String!): Stock
    getAllStocks(limit: Int = 50, offset: Int = 0): [Stock!]!

    # Sentiment Analysis
    getSentiment(ticker: String!, dateRange: DateRangeInput): SentimentResult!
    getSentimentHistory(ticker: String!, days: Int = 7): [SentimentResult!]!

    # Health check
    health: String!
  }

  input DateRangeInput {
    from: String
    to: String
  }

  type Mutation {
    # Placeholder for future mutations
    _: Boolean
  }

  type Subscription {
    # Placeholder for future subscriptions
    _: Boolean
  }
`;

module.exports = typeDefs;
