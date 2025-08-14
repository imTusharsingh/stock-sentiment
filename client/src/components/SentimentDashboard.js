import React, { useState, useEffect } from "react";
import axios from "axios";

const SentimentDashboard = ({ ticker, onBack }) => {
  const [sentimentData, setSentimentData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchSentimentData();
  }, [ticker]);

  const fetchSentimentData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await axios.post("/graphql", {
        query: `
          query GetSentiment($ticker: String!) {
            getSentiment(ticker: $ticker) {
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
        `,
        variables: {
          ticker: ticker,
        },
      });

      if (response.data.data?.getSentiment) {
        setSentimentData(response.data.data.getSentiment);
      } else {
        throw new Error("Failed to fetch sentiment data");
      }
    } catch (error) {
      console.error("Error fetching sentiment data:", error);
      setError(error.message || "Failed to fetch sentiment analysis");
      
      // Fallback to mock data for development
      const mockSentimentData = {
        ticker: ticker,
        overallSentiment: {
          label: "neutral",
          score: 0.5,
          confidence: 0.5,
        },
        articles: [],
        totalArticles: 0,
        sentimentBreakdown: {
          positive: 0,
          negative: 0,
          neutral: 0,
          positivePercentage: 0,
          negativePercentage: 0,
          neutralPercentage: 0,
        },
        lastUpdated: new Date().toISOString(),
      };
      setSentimentData(mockSentimentData);
    } finally {
      setIsLoading(false);
    }
  };

  const getSentimentColor = (label) => {
    switch (label) {
      case "positive":
        return "text-green-600 bg-green-100";
      case "negative":
        return "text-red-600 bg-red-100";
      case "neutral":
        return "text-gray-600 bg-gray-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  const getSentimentIcon = (label) => {
    switch (label) {
      case "positive":
        return "📈";
      case "negative":
        return "📉";
      case "neutral":
        return "➡️";
      default:
        return "➡️";
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Analyzing sentiment for {ticker}...</p>
            <p className="text-sm text-gray-500 mt-2">This may take a few moments</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <button
              onClick={onBack}
              className="text-blue-600 hover:text-blue-800 mb-4 flex items-center mx-auto"
            >
              ← Back to Stock Dashboard
            </button>
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-red-800 mb-2">
                Error Loading Sentiment Analysis
              </h2>
              <p className="text-red-600 mb-4">{error}</p>
              <button
                onClick={fetchSentimentData}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!sentimentData) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <p className="text-gray-600">No sentiment data available</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <button
              onClick={onBack}
              className="text-blue-600 hover:text-blue-800 mb-2 flex items-center"
            >
              ← Back to Stock Dashboard
            </button>
            <h1 className="text-3xl font-bold text-gray-900">
              Sentiment Analysis: {sentimentData.ticker}
            </h1>
            <p className="text-gray-600 mt-2">
              Last updated:{" "}
              {new Date(sentimentData.lastUpdated).toLocaleString()}
            </p>
          </div>
        </div>

        {/* Overall Sentiment Card */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Overall Sentiment</h2>
          <div className="flex items-center space-x-4">
            <div
              className={`text-4xl ${getSentimentIcon(
                sentimentData.overallSentiment.label
              )}`}
            ></div>
            <div>
              <div
                className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getSentimentColor(
                  sentimentData.overallSentiment.label
                )}`}
              >
                {sentimentData.overallSentiment.label.charAt(0).toUpperCase() +
                  sentimentData.overallSentiment.label.slice(1)}
              </div>
              <p className="text-2xl font-bold text-gray-900 mt-2">
                {(sentimentData.overallSentiment.score * 100).toFixed(1)}%
              </p>
              <p className="text-gray-600">
                Confidence:{" "}
                {(sentimentData.overallSentiment.confidence * 100).toFixed(1)}%
              </p>
            </div>
          </div>
        </div>

        {/* Sentiment Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold mb-4 text-green-700">
              Positive
            </h3>
            <div className="text-3xl font-bold text-green-600 mb-2">
              {sentimentData.sentimentBreakdown.positive}
            </div>
            <div className="text-sm text-gray-600">
              {sentimentData.sentimentBreakdown.positivePercentage.toFixed(1)}%
              of articles
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold mb-4 text-red-700">
              Negative
            </h3>
            <div className="text-3xl font-bold text-red-600 mb-2">
              {sentimentData.sentimentBreakdown.negative}
            </div>
            <div className="text-sm text-gray-600">
              {sentimentData.sentimentBreakdown.negativePercentage.toFixed(1)}%
              of articles
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold mb-4 text-gray-700">
              Neutral
            </h3>
            <div className="text-3xl font-bold text-gray-600 mb-2">
              {sentimentData.sentimentBreakdown.neutral}
            </div>
            <div className="text-sm text-gray-600">
              {sentimentData.sentimentBreakdown.neutralPercentage.toFixed(1)}%
              of articles
            </div>
          </div>
        </div>

        {/* Articles List */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">
            Recent Articles ({sentimentData.totalArticles})
          </h2>
          {sentimentData.articles.length > 0 ? (
            <div className="space-y-4">
              {sentimentData.articles.map((article, index) => (
                <div
                  key={index}
                  className="border-b border-gray-200 pb-4 last:border-b-0"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        <a
                          href={article.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-blue-600"
                        >
                          {article.title}
                        </a>
                      </h3>
                      <p className="text-gray-600 mb-2">{article.description}</p>
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <span>{article.source}</span>
                        <span>
                          {new Date(article.publishedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="ml-4 text-right">
                      <div
                        className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getSentimentColor(
                          article.sentiment.label
                        )}`}
                      >
                        {article.sentiment.label.charAt(0).toUpperCase() +
                          article.sentiment.label.slice(1)}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {(article.sentiment.score * 100).toFixed(1)}%
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p className="text-lg mb-2">📰 No recent articles found</p>
              <p className="text-sm">
                Try searching for a different stock or check back later
              </p>
            </div>
          )}
        </div>

        {/* Placeholder for Charts */}
        <div className="bg-white rounded-lg shadow-md p-6 mt-8">
          <h2 className="text-xl font-semibold mb-4">
            Charts & Visualizations
          </h2>
          <div className="text-center py-12 text-gray-500">
            <p className="text-lg mb-2">📊 Charts coming in Feature 4</p>
            <p className="text-sm">
              Pie charts, line charts, and word clouds will be added here
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SentimentDashboard;
