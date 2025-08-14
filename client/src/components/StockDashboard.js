import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";

const StockDashboard = ({
  stock,
  onBackToSearch,
  onViewSentiment,
  onAddFavorite,
  onFavoritesChange,
  isLoading,
  setIsLoading,
  user,
}) => {
  const [priceData, setPriceData] = useState(null);
  const [isLoadingPrice, setIsLoadingPrice] = useState(false);
  const [priceError, setPriceError] = useState(null);
  const [favoriteMessage, setFavoriteMessage] = useState("");
  const [isInFavorites, setIsInFavorites] = useState(false);

  const fetchPriceData = useCallback(async () => {
    try {
      setIsLoadingPrice(true);
      setPriceError(null);

      const response = await axios.post("/graphql", {
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
        variables: {
          ticker: stock.ticker,
        },
      });

      if (response.data.data?.getStockPrice) {
        setPriceData(response.data.data.getStockPrice);
      } else {
        throw new Error("Failed to fetch price data");
      }
    } catch (error) {
      console.error("Error fetching price data:", error);
      setPriceError(error.message || "Failed to fetch price data");
    } finally {
      setIsLoadingPrice(false);
    }
  }, [stock?.ticker]);

  const checkIfInFavorites = useCallback(async () => {
    if (!user) return;

    try {
      const query = `
        query GetFavorites {
          getFavorites {
            ticker
            name
            addedAt
          }
        }
      `;

      const response = await fetch("/graphql", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("authToken")}`,
        },
        body: JSON.stringify({ query }),
      });

      const result = await response.json();

      if (result.errors) {
        throw new Error(result.errors[0].message);
      }

      const isFavorite = result.data.getFavorites.some(
        (fav) => fav.ticker === stock.ticker
      );
      setIsInFavorites(isFavorite);
    } catch (error) {
      console.error("Error checking favorites:", error);
    }
  }, [user, stock?.ticker]);

  useEffect(() => {
    if (stock?.ticker) {
      fetchPriceData();
    }
  }, [stock?.ticker, fetchPriceData]);

  useEffect(() => {
    if (user && stock?.ticker) {
      checkIfInFavorites();
    }
  }, [user, stock?.ticker, checkIfInFavorites]);

  const getReturnColor = (returnValue) => {
    if (returnValue > 0) return "text-green-600";
    if (returnValue < 0) return "text-red-600";
    return "text-gray-600";
  };

  const getReturnIcon = (returnValue) => {
    if (returnValue > 0) return "📈";
    if (returnValue < 0) return "📉";
    return "➡️";
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
    }).format(price);
  };

  const formatVolume = (volume) => {
    if (volume >= 1000000) {
      return `${(volume / 1000000).toFixed(1)}M`;
    } else if (volume >= 1000) {
      return `${(volume / 1000).toFixed(1)}K`;
    }
    return volume.toString();
  };

  const handleAddToFavorites = async () => {
    try {
      await onAddFavorite(stock.ticker, stock.name);
      setFavoriteMessage("✅ Added to favorites!");
      setIsInFavorites(true);
      setTimeout(() => setFavoriteMessage(""), 3000); // Clear message after 3 seconds
    } catch (error) {
      setFavoriteMessage("❌ Failed to add to favorites");
      setTimeout(() => setFavoriteMessage(""), 3000);
    }
  };

  const handleRemoveFromFavorites = async () => {
    try {
      const mutation = `
        mutation RemoveFavorite($ticker: String!) {
          removeFavorite(ticker: $ticker) {
            success
            message
            favorites {
              ticker
              name
              addedAt
            }
          }
        }
      `;

      const response = await fetch("/graphql", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("authToken")}`,
        },
        body: JSON.stringify({
          query: mutation,
          variables: { ticker: stock.ticker },
        }),
      });

      const result = await response.json();

      if (result.errors) {
        throw new Error(result.errors[0].message);
      }

      if (result.data.removeFavorite.success) {
        setFavoriteMessage("✅ Removed from favorites!");
        setIsInFavorites(false);
        // Trigger favorites refresh in the sidebar
        if (onFavoritesChange) {
          onFavoritesChange();
        }
        setTimeout(() => setFavoriteMessage(""), 3000);
      }
    } catch (error) {
      setFavoriteMessage("❌ Failed to remove from favorites");
      setTimeout(() => setFavoriteMessage(""), 3000);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <button
              onClick={onBackToSearch}
              className="text-blue-600 hover:text-blue-800 mb-2 flex items-center"
            >
              ← Back to Search
            </button>
            <h1 className="text-3xl font-bold text-gray-900">
              Stock Dashboard: {stock.ticker}
            </h1>
            <p className="text-gray-600 mt-2">
              {stock.name} • {stock.exchange} • {stock.sector}
            </p>
          </div>
          <div className="text-right">
            {user ? (
              <div className="flex flex-col items-end space-y-2">
                <div className="text-sm text-gray-500">
                  Welcome, {user.name}
                </div>
                <button
                  onClick={
                    isInFavorites
                      ? handleRemoveFromFavorites
                      : handleAddToFavorites
                  }
                  className={`${
                    isInFavorites
                      ? "bg-red-500 hover:bg-red-600"
                      : "bg-yellow-500 hover:bg-yellow-600"
                  } text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2`}
                  title={
                    isInFavorites ? "Remove from Favorites" : "Add to Favorites"
                  }
                >
                  <span>{isInFavorites ? "🗑️" : "⭐"}</span>
                  <span>
                    {isInFavorites
                      ? "Remove from Favorites"
                      : "Add to Favorites"}
                  </span>
                </button>
                {favoriteMessage && (
                  <div className="text-sm text-green-600 font-medium">
                    {favoriteMessage}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-sm text-gray-500">
                <span className="text-blue-600">Login to add favorites</span>
              </div>
            )}
          </div>
        </div>

        {/* Stock Information Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">
              Exchange
            </h3>
            <p className="mt-1 text-lg font-semibold text-gray-900">
              {stock.exchange}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">
              Sector
            </h3>
            <p className="mt-1 text-lg font-semibold text-gray-900">
              {stock.sector}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">
              Status
            </h3>
            <span className="mt-1 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              Active
            </span>
          </div>
        </div>

        {/* Price Data Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Price Data</h2>
            <button
              onClick={fetchPriceData}
              disabled={isLoadingPrice}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoadingPrice ? "🔄" : "🔄 Refresh"}
            </button>
          </div>

          {isLoadingPrice ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading price data...</p>
            </div>
          ) : priceError ? (
            <div className="text-center py-8">
              <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-red-800 mb-2">
                  Error Loading Price Data
                </h3>
                <p className="text-red-600 mb-4">{priceError}</p>
                <button
                  onClick={fetchPriceData}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
                >
                  Try Again
                </button>
              </div>
            </div>
          ) : priceData ? (
            <div>
              {/* Price Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl mb-2">💰</div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Current Price
                  </h3>
                  <p className="text-3xl font-bold text-blue-600">
                    {formatPrice(priceData.summary.currentPrice)}
                  </p>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl mb-2">
                    {getReturnIcon(priceData.summary.totalReturn)}
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Total Return
                  </h3>
                  <p
                    className={`text-3xl font-bold ${getReturnColor(
                      priceData.summary.totalReturn
                    )}`}
                  >
                    {priceData.summary.totalReturn.toFixed(2)}%
                  </p>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl mb-2">📊</div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Days Analyzed
                  </h3>
                  <p className="text-3xl font-bold text-purple-600">
                    {priceData.summary.daysAnalyzed}
                  </p>
                </div>
              </div>

              {/* Price Range */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">
                    Price Range
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Highest:</span>
                      <span className="font-semibold text-green-600">
                        {formatPrice(priceData.summary.highestPrice)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Lowest:</span>
                      <span className="font-semibold text-red-600">
                        {formatPrice(priceData.summary.lowestPrice)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Start Price:</span>
                      <span className="font-semibold text-gray-900">
                        {formatPrice(priceData.summary.startPrice)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Latest Volume:</span>
                      <span className="font-semibold text-blue-600">
                        {formatVolume(
                          priceData.data[priceData.data.length - 1].volume
                        )}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">
                    Recent Performance
                  </h4>
                  <div className="space-y-2">
                    {priceData.data.slice(-5).map((day, index) => (
                      <div
                        key={index}
                        className="flex justify-between items-center"
                      >
                        <span className="text-sm text-gray-600">
                          {new Date(day.date).toLocaleDateString()}
                        </span>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium">
                            {formatPrice(day.close)}
                          </span>
                          <span
                            className={`text-xs ${getReturnColor(
                              day.dailyReturn
                            )}`}
                          >
                            {day.dailyReturn > 0 ? "+" : ""}
                            {day.dailyReturn.toFixed(2)}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Last Updated */}
              <div className="text-center text-sm text-gray-500">
                Last updated: {new Date(priceData.lastUpdated).toLocaleString()}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>No price data available</p>
            </div>
          )}
        </div>

        {/* Sentiment Analysis Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-8">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-medium text-gray-900 mb-2">
              Sentiment Analysis Ready!
            </h3>
            <p className="text-gray-500 mb-6">
              Analyze news sentiment and get AI-powered insights for{" "}
              {stock.ticker}
            </p>
            <button
              onClick={() => onViewSentiment(stock.ticker)}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              📊 View Sentiment Analysis
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl mb-2">📰</div>
              <h4 className="font-medium text-gray-900">News Analysis</h4>
              <p className="text-sm text-gray-600">
                Latest articles from GNews
              </p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl mb-2">🤖</div>
              <h4 className="font-medium text-gray-900">AI Sentiment</h4>
              <p className="text-sm text-gray-600">Powered by Hugging Face</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl mb-2">📈</div>
              <h4 className="font-medium text-gray-900">Insights</h4>
              <p className="text-sm text-gray-600">
                Sentiment breakdown & trends
              </p>
            </div>
          </div>
        </div>

        {/* Coming Soon Features */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Coming Soon
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              <div className="text-2xl">📊</div>
              <div>
                <h4 className="font-medium text-gray-900">Charts & Visuals</h4>
                <p className="text-sm text-gray-600">
                  Interactive charts & word clouds
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              <div className="text-2xl">📤</div>
              <div>
                <h4 className="font-medium text-gray-900">Data Export</h4>
                <p className="text-sm text-gray-600">
                  CSV & PDF export functionality
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StockDashboard;
