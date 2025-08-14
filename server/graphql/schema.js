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

  type Query {
    # Stock Search and Suggestions
    getStockSuggestions(query: String!, limit: Int = 10): StockSearchResult!
    getStockByTicker(ticker: String!): Stock
    getAllStocks(limit: Int = 50, offset: Int = 0): [Stock!]!

    # Health check
    health: String!
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
