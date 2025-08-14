import React, { useState, useEffect } from "react";

const SentimentDashboard = ({ ticker, onBack }) => {
  const [sentimentData, setSentimentData] = useState(null);

  useEffect(() => {
    // Mock data for development (remove when API is ready)
    const mockSentimentData = {
      ticker: ticker,
      overallSentiment: {
        label: "positive",
        score: 0.75,
        confidence: 0.85,
      },
      articles: [
        {
          title: `${ticker} Reports Strong Q3 Results`,
          description:
            "Company exceeds analyst expectations with 25% revenue growth",
          url: "#",
          publishedAt: "2024-01-15T10:00:00Z",
          source: "Financial Express",
          sentiment: { label: "positive", score: 0.85, confidence: 0.9 },
        },
        {
          title: `${ticker} Expands Operations in South India`,
          description: "Strategic move to capture growing market opportunities",
          url: "#",
          publishedAt: "2024-01-14T15:30:00Z",
          source: "Business Standard",
          sentiment: { label: "positive", score: 0.7, confidence: 0.8 },
        },
        {
          title: `${ticker} Faces Supply Chain Challenges`,
          description: "Company working to resolve temporary disruptions",
          url: "#",
          publishedAt: "2024-01-13T09:15:00Z",
          source: "Economic Times",
          sentiment: { label: "negative", score: 0.3, confidence: 0.75 },
        },
      ],
      totalArticles: 3,
      sentimentBreakdown: {
        positive: 2,
        negative: 1,
        neutral: 0,
        positivePercentage: 66.7,
        negativePercentage: 33.3,
        neutralPercentage: 0,
      },
      lastUpdated: new Date().toISOString(),
    };

    // For now, use mock data
    setSentimentData(mockSentimentData);

    // TODO: Replace with actual API call
    // fetchSentimentData();
  }, [ticker]);

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

  if (!sentimentData) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading sentiment data...</p>
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
              ← Back to Search
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
