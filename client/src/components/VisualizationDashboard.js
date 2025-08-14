import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from "chart.js";
import { Line, Pie } from "react-chartjs-2";
import WordCloud from "react-wordcloud";
import "./VisualizationDashboard.css";

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const VisualizationDashboard = ({ stock, onBackToStock, user }) => {
  const [selectedPeriod, setSelectedPeriod] = useState("30d");
  const [isLoading, setIsLoading] = useState(false);
  const [sentimentData, setSentimentData] = useState(null);
  const [priceData, setPriceData] = useState(null);
  const [error, setError] = useState(null);

  // Fetch sentiment data
  const fetchSentimentData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch("/graphql", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: `
            query GetSentiment($ticker: String!) {
              getSentiment(ticker: $ticker) {
                overallSentiment {
                  label
                  score
                  confidence
                }
                articles {
                  title
                  sentiment {
                    label
                    score
                    confidence
                  }
                  url
                  publishedAt
                }
                sentimentBreakdown {
                  positive
                  negative
                  neutral
                  positivePercentage
                  negativePercentage
                  neutralPercentage
                }
                totalArticles
                lastUpdated
              }
            }
          `,
          variables: { ticker: stock.ticker },
        }),
      });

      const result = await response.json();

      if (result.errors) {
        throw new Error(result.errors[0].message);
      }

      setSentimentData(result.data.getSentiment);
    } catch (error) {
      console.error("Error fetching sentiment data:", error);
      setError("Failed to fetch sentiment data");
    }
  }, [stock?.ticker]);

  // Fetch price data
  const fetchPriceData = useCallback(async () => {
    try {
      const response = await fetch("/graphql", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: `
            query GetStockPrice($ticker: String!) {
              getStockPrice(ticker: $ticker) {
                ticker
                period
                data {
                  date
                  open
                  high
                  low
                  close
                  volume
                  dailyReturn
                }
                summary {
                  currentPrice
                  startPrice
                  totalReturn
                  highestPrice
                  lowestPrice
                  daysAnalyzed
                }
                lastUpdated
              }
            }
          `,
          variables: { ticker: stock.ticker },
        }),
      });

      const result = await response.json();

      if (result.errors) {
        throw new Error(result.errors[0].message);
      }

      setPriceData(result.data.getStockPrice);
    } catch (error) {
      console.error("Error fetching price data:", error);
      setError("Failed to fetch price data");
    } finally {
      setIsLoading(false);
    }
  }, [stock?.ticker]);

  // Fetch data on component mount
  useEffect(() => {
    if (stock?.ticker) {
      fetchSentimentData();
      fetchPriceData();
    }
  }, [stock?.ticker, fetchSentimentData, fetchPriceData]);

  // Process sentiment data for charts
  const chartData = useMemo(() => {
    if (!sentimentData?.articles || !priceData?.data) return null;

    const periods = {
      "7d": 7,
      "30d": 30,
      "90d": 90,
    };

    const days = periods[selectedPeriod] || 30;
    const recentSentiments = sentimentData.articles?.slice(0, days) || [];
    const recentPrices = priceData.data?.slice(-days) || [];

    // Check if we have enough data
    if (recentSentiments.length === 0 || recentPrices.length === 0) return null;

    // Prepare line chart data (sentiment vs price over time)
    const lineChartData = {
      labels: recentPrices.map((item) => item.date),
      datasets: [
        {
          label: "Stock Price",
          data: recentPrices.map((item) => item.close),
          borderColor: "rgb(59, 130, 246)",
          backgroundColor: "rgba(59, 130, 246, 0.1)",
          yAxisID: "y",
          tension: 0.1,
        },
        {
          label: "Sentiment Score",
          data: recentSentiments.map((article) => {
            // Convert sentiment label to numeric score
            if (article.sentiment.label === "positive") return 1;
            if (article.sentiment.label === "negative") return -1;
            return 0;
          }),
          borderColor: "rgb(34, 197, 94)",
          backgroundColor: "rgba(34, 197, 94, 0.1)",
          yAxisID: "y1",
          tension: 0.1,
        },
      ],
    };

    // Prepare pie chart data (sentiment breakdown)
    const sentimentCounts = recentSentiments.reduce((acc, article) => {
      acc[article.sentiment.label] = (acc[article.sentiment.label] || 0) + 1;
      return acc;
    }, {});

    const pieChartData = {
      labels: Object.keys(sentimentCounts).map(
        (sentiment) => sentiment.charAt(0).toUpperCase() + sentiment.slice(1)
      ),
      datasets: [
        {
          data: Object.values(sentimentCounts),
          backgroundColor: [
            "rgba(34, 197, 94, 0.8)", // Green for positive
            "rgba(156, 163, 175, 0.8)", // Gray for neutral
            "rgba(239, 68, 68, 0.8)", // Red for negative
          ],
          borderColor: [
            "rgb(34, 197, 94)",
            "rgb(156, 163, 175)",
            "rgb(239, 68, 68)",
          ],
          borderWidth: 2,
        },
      ],
    };

    // Prepare word cloud data from article titles
    const words = recentSentiments
      .flatMap((article) => {
        return article.title
          .toLowerCase()
          .replace(/[^\w\s]/g, "")
          .split(/\s+/)
          .filter((word) => word.length > 3);
      })
      .reduce((acc, word) => {
        acc[word] = (acc[word] || 0) + 1;
        return acc;
      }, {});

    const wordCloudData = Object.entries(words)
      .map(([text, value]) => ({ text, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 50);

    return {
      lineChartData,
      pieChartData,
      wordCloudData,
    };
  }, [sentimentData, priceData, selectedPeriod]);

  const lineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: "index",
      intersect: false,
      axis: "x",
    },
    layout: {
      padding: {
        top: 40,
        right: 40,
        bottom: 40,
        left: 40,
      },
    },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: "Date",
        },
      },
      y: {
        type: "linear",
        display: true,
        position: "left",
        title: {
          display: true,
          text: "Stock Price (₹)",
        },
      },
      y1: {
        type: "linear",
        display: true,
        position: "right",
        title: {
          display: true,
          text: "Sentiment Score",
        },
        grid: {
          drawOnChartArea: false,
        },
        min: -1,
        max: 1,
        ticks: {
          stepSize: 0.5,
        },
      },
    },
    plugins: {
      title: {
        display: true,
        text: `Sentiment vs Price Trend - ${selectedPeriod}`,
      },
      tooltip: {
        enabled: true,
        position: "nearest",
        backgroundColor: "rgba(0, 0, 0, 0.95)",
        titleColor: "white",
        bodyColor: "white",
        borderColor: "rgba(255, 255, 255, 0.4)",
        borderWidth: 1,
        cornerRadius: 4,
        displayColors: false,
        padding: 6,
        titleFont: {
          size: 10,
          weight: "bold",
        },
        bodyFont: {
          size: 9,
        },
        callbacks: {
          title: function (context) {
            return `Date: ${context[0].label}`;
          },
          afterBody: function (context) {
            const dataIndex = context[0].dataIndex;
            if (sentimentData?.articles?.[dataIndex]) {
              const article = sentimentData.articles[dataIndex];
              // Much shorter article titles to minimize tooltip size
              const truncatedTitle =
                article.title.length > 40
                  ? article.title.substring(0, 40) + "..."
                  : article.title;
              return [
                `Article: ${truncatedTitle}`,
                `Sentiment: ${article.sentiment.label}`,
              ];
            }
            return [];
          },
        },
        // Force tooltip to appear above the chart when possible
        positioner: function (elements, eventPosition) {
          const chart = this.chart;
          const chartArea = chart.chartArea;

          // Try to position tooltip above the data point
          let x = eventPosition.x;
          let y = eventPosition.y - 80; // Move tooltip much higher

          // If tooltip would go above chart area, position it below
          if (y < chartArea.top + 20) {
            y = eventPosition.y + 80; // Move tooltip much lower
          }

          // Ensure tooltip doesn't go outside chart bounds
          if (x < chartArea.left + 100) {
            x = chartArea.left + 100;
          } else if (x > chartArea.right - 100) {
            x = chartArea.right - 100;
          }

          return { x, y };
        },
      },
    },
  };

  const pieChartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: "bottom",
      },
      title: {
        display: true,
        text: "Sentiment Distribution",
      },
      tooltip: {
        callbacks: {
          label: function (context) {
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const percentage = ((context.parsed / total) * 100).toFixed(1);
            return `${context.label}: ${context.parsed} (${percentage}%)`;
          },
        },
      },
    },
  };

  const wordCloudOptions = {
    rotations: 2,
    rotationAngles: [-90, 0],
    fontSizes: [12, 60],
    padding: 1,
  };

  if (!stock) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            No Stock Selected
          </h2>
          <p className="text-gray-600">
            Please select a stock to view visualizations.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 visualization-dashboard">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <button
            onClick={onBackToStock}
            className="text-blue-600 hover:text-blue-800 mb-2 flex items-center"
          >
            ← Back to Stock Dashboard
          </button>
          <h1 className="text-3xl font-bold text-gray-900">
            Visualization Dashboard: {stock.ticker}
          </h1>
          <p className="text-gray-600 mt-2">
            {stock.name} • Interactive charts and sentiment analysis
          </p>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-red-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  Error loading data
                </h3>
                <div className="mt-2 text-sm text-red-700">{error}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Period Selector */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center space-x-4">
            <label className="text-sm font-medium text-gray-700">
              Time Period:
            </label>
            <div className="flex space-x-2">
              {["7d", "30d", "90d"].map((period) => (
                <button
                  key={period}
                  onClick={() => setSelectedPeriod(period)}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    selectedPeriod === period
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {period}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Sentiment vs Price Line Chart */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Sentiment vs Price Trend
            </h3>
            {isLoading ? (
              <div className="h-96 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-gray-500">
                  Loading chart data...
                </span>
              </div>
            ) : chartData?.lineChartData ? (
              <div className="h-96 relative">
                <Line
                  data={chartData.lineChartData}
                  options={lineChartOptions}
                />
              </div>
            ) : (
              <div className="h-96 flex items-center justify-center text-gray-500">
                No data available
              </div>
            )}
          </div>

          {/* Sentiment Distribution Pie Chart */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Sentiment Distribution
            </h3>
            {isLoading ? (
              <div className="h-80 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-gray-500">
                  Loading chart data...
                </span>
              </div>
            ) : chartData?.pieChartData ? (
              <div className="h-80 relative">
                <Pie data={chartData.pieChartData} options={pieChartOptions} />
              </div>
            ) : (
              <div className="h-80 flex items-center justify-center text-gray-500">
                No data available
              </div>
            )}
          </div>
        </div>

        {/* Word Cloud */}
        <div className="mt-6 bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Key Terms from News Articles
          </h3>
          {chartData?.wordCloudData && chartData.wordCloudData.length > 0 ? (
            <div className="h-96">
              <WordCloud
                words={chartData.wordCloudData}
                options={wordCloudOptions}
              />
            </div>
          ) : (
            <div className="h-96 flex items-center justify-center text-gray-500">
              No news data available for word cloud
            </div>
          )}
        </div>

        {/* Summary Stats */}
        {sentimentData && priceData && (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h4 className="text-sm font-medium text-gray-500 mb-2">
                Overall Sentiment
              </h4>
              <p className="text-2xl font-bold text-gray-900">
                {sentimentData.overallSentiment?.label
                  ?.charAt(0)
                  .toUpperCase() +
                  sentimentData.overallSentiment?.label?.slice(1) || "N/A"}
              </p>
              <p className="text-sm text-gray-600">
                Score:{" "}
                {sentimentData.overallSentiment?.score?.toFixed(2) || "N/A"}
              </p>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h4 className="text-sm font-medium text-gray-500 mb-2">
                Articles Analyzed
              </h4>
              <p className="text-2xl font-bold text-gray-900">
                {sentimentData.totalArticles || 0}
              </p>
              <p className="text-sm text-gray-600">News articles</p>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h4 className="text-sm font-medium text-gray-500 mb-2">
                Price Change
              </h4>
              <p
                className={`text-2xl font-bold ${
                  priceData.summary?.totalReturn > 0
                    ? "text-green-600"
                    : "text-red-600"
                }`}
              >
                {priceData.summary?.totalReturn?.toFixed(2) || "N/A"}%
              </p>
              <p className="text-sm text-gray-600">{selectedPeriod} period</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VisualizationDashboard;
