/**
 * Database Models Index
 * Exports all Mongoose models for easy importing
 */

const Stock = require('./Stock');
const News = require('./News');
const Sentiment = require('./Sentiment');
const StockSentiment = require('./StockSentiment');
const CrawlSession = require('./CrawlSession');
const NewsSource = require('./NewsSource');

module.exports = {
  Stock,
  News,
  Sentiment,
  StockSentiment,
  CrawlSession,
  NewsSource,
};
