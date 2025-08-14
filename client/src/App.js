import React, { useState, useEffect } from "react";
import StockSearch from "./components/StockSearch";
import StockDashboard from "./components/StockDashboard";
import SentimentDashboard from "./components/SentimentDashboard";
import Header from "./components/Header";
import FavoritesPanel from "./components/FavoritesPanel";
import "./App.css";

function App() {
  const [selectedStock, setSelectedStock] = useState(null);
  const [currentView, setCurrentView] = useState("search"); // 'search', 'stock', 'sentiment'
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [favoritesRefreshTrigger, setFavoritesRefreshTrigger] = useState(0);

  // Check for existing authentication on app load
  useEffect(() => {
    const token = localStorage.getItem("authToken");
    const userData = localStorage.getItem("user");

    if (token && userData) {
      try {
        setUser(JSON.parse(userData));
      } catch (error) {
        console.error("Error parsing user data:", error);
        localStorage.removeItem("authToken");
        localStorage.removeItem("user");
      }
    }
  }, []);

  const handleAuthSuccess = (authData) => {
    setUser(authData.user);
  };

  const handleLogout = () => {
    setUser(null);
  };

  const handleStockSelect = (stock) => {
    setSelectedStock(stock);
    setCurrentView("stock");
  };

  const handleBackToSearch = () => {
    setSelectedStock(null);
    setCurrentView("search");
  };

  const handleViewSentiment = (ticker) => {
    setCurrentView("sentiment");
  };

  const handleBackToStock = () => {
    setCurrentView("stock");
  };

  const handleAddFavorite = async (ticker, name) => {
    if (!user) return;

    try {
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
          variables: { ticker, name },
        }),
      });

      const result = await response.json();

      if (result.errors) {
        throw new Error(result.errors[0].message);
      }

      if (result.data.addFavorite.success) {
        // Trigger favorites refresh in the sidebar
        setFavoritesRefreshTrigger((prev) => prev + 1);
      }
    } catch (error) {
      console.error("Error adding favorite:", error);
      throw error; // Re-throw to let the component handle the error
    }
  };

  const renderMainContent = () => {
    switch (currentView) {
      case "stock":
        return (
          <StockDashboard
            stock={selectedStock}
            onBackToSearch={handleBackToSearch}
            onViewSentiment={handleViewSentiment}
            onAddFavorite={handleAddFavorite}
            onFavoritesChange={() =>
              setFavoritesRefreshTrigger((prev) => prev + 1)
            }
            isLoading={isLoading}
            setIsLoading={setIsLoading}
            user={user}
          />
        );
      case "sentiment":
        return (
          <SentimentDashboard
            ticker={selectedStock.ticker}
            onBack={handleBackToStock}
          />
        );
      default:
        return (
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold text-gray-900 mb-4">
                AI-Powered Stock Sentiment Analyzer
              </h1>
              <p className="text-xl text-gray-600">
                Analyze sentiment for Indian stocks using AI and get insights
                from news articles
              </p>
            </div>

            <StockSearch
              onStockSelect={handleStockSelect}
              setIsLoading={setIsLoading}
            />
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        user={user}
        onAuthSuccess={handleAuthSuccess}
        onLogout={handleLogout}
      />

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main content area */}
          <div className="lg:col-span-3">{renderMainContent()}</div>

          {/* Sidebar with favorites */}
          <div className="lg:col-span-1">
            <FavoritesPanel
              user={user}
              refreshTrigger={favoritesRefreshTrigger}
              onStockSelect={(ticker) => {
                // Find stock data and select it
                setSelectedStock({ ticker });
                setCurrentView("stock");
              }}
            />
          </div>
        </div>
      </main>

      {isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 flex items-center space-x-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="text-lg">Analyzing stock sentiment...</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
