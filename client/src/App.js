import React, { useState } from "react";
import StockSearch from "./components/StockSearch";
import StockDashboard from "./components/StockDashboard";
import SentimentDashboard from "./components/SentimentDashboard";
import Header from "./components/Header";
import "./App.css";

function App() {
  const [selectedStock, setSelectedStock] = useState(null);
  const [currentView, setCurrentView] = useState("search"); // 'search', 'stock', 'sentiment'
  const [isLoading, setIsLoading] = useState(false);

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

  const renderMainContent = () => {
    switch (currentView) {
      case "stock":
        return (
          <StockDashboard
            stock={selectedStock}
            onBackToSearch={handleBackToSearch}
            onViewSentiment={handleViewSentiment}
            isLoading={isLoading}
            setIsLoading={setIsLoading}
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
      <Header />

      <main className="container mx-auto px-4 py-8">{renderMainContent()}</main>

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
