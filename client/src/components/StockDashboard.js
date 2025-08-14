import React, { useState, useEffect, useCallback } from "react";

const StockDashboard = ({ stock, onBackToSearch, onViewSentiment, user }) => {
  const [isFavorite, setIsFavorite] = useState(false);

  const fetchFavorites = useCallback(async () => {
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

      const userFavorites = result.data.getFavorites;
      setIsFavorite(userFavorites.some((fav) => fav.ticker === stock.ticker));
    } catch (error) {
      console.error("Error fetching favorites:", error);
    }
  }, [user, stock.ticker]);

  // Check if stock is in favorites
  useEffect(() => {
    if (user) {
      fetchFavorites();
    }
  }, [user, stock.ticker, fetchFavorites]);

  const toggleFavorite = async () => {
    if (!user) return;

    try {
      if (isFavorite) {
        // Remove from favorites
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
          setIsFavorite(false);
        }
      } else {
        // Add to favorites
        const mutation = `
          mutation AddFavorite($ticker: String!, $name: String) {
            addFavorite(ticker: $ticker, name: $name) {
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
            variables: { ticker: stock.ticker, name: stock.name },
          }),
        });

        const result = await response.json();

        if (result.errors) {
          throw new Error(result.errors[0].message);
        }

        if (result.data.addFavorite.success) {
          setIsFavorite(true);
        }
      }
    } catch (error) {
      console.error("Error toggling favorite:", error);
    }
  };
  return (
    <div className="max-w-6xl mx-auto">
      {/* Header with back button */}
      <div className="flex items-center justify-between mb-8">
        <button
          onClick={onBackToSearch}
          className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          <span>Back to Search</span>
        </button>

        <div className="text-right">
          <div className="flex items-center justify-end space-x-3 mb-2">
            {user && (
              <button
                onClick={toggleFavorite}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  isFavorite
                    ? "bg-red-100 text-red-700 hover:bg-red-200"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
                title={
                  isFavorite ? "Remove from favorites" : "Add to favorites"
                }
              >
                {isFavorite ? "❤️" : "🤍"}{" "}
                {isFavorite ? "Favorited" : "Add to Favorites"}
              </button>
            )}
          </div>
          <h1 className="text-3xl font-bold text-gray-900">{stock.ticker}</h1>
          <p className="text-lg text-gray-600">{stock.name}</p>
        </div>
      </div>

      {/* Stock Info Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">
              Exchange
            </h3>
            <p className="mt-1 text-lg font-semibold text-gray-900">
              {stock.exchange}
            </p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">
              Sector
            </h3>
            <p className="mt-1 text-lg font-semibold text-gray-900">
              {stock.sector}
            </p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">
              Status
            </h3>
            <span className="mt-1 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              Active
            </span>
          </div>
        </div>
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
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
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
            <p className="text-sm text-gray-600">Latest articles from GNews</p>
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
        <h3 className="text-lg font-medium text-gray-900 mb-4">Coming Soon</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl">💰</div>
            <div>
              <h4 className="font-medium text-gray-900">Price Integration</h4>
              <p className="text-sm text-gray-600">
                Yahoo Finance data & correlation
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl">📊</div>
            <div>
              <h4 className="font-medium text-gray-900">Charts & Visuals</h4>
              <p className="text-sm text-gray-600">
                Interactive charts & word clouds
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StockDashboard;
