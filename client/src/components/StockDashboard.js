import React from "react";

const StockDashboard = ({ stock, onBackToSearch }) => {
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

      {/* Placeholder for future features */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
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
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Sentiment Analysis Coming Soon
        </h3>
        <p className="text-gray-500 mb-4">
          This feature will analyze news sentiment and provide insights for{" "}
          {stock.ticker}
        </p>
        <div className="flex items-center justify-center space-x-4 text-sm text-gray-400">
          <span>📰 News Analysis</span>
          <span>•</span>
          <span>📊 Sentiment Score</span>
          <span>•</span>
          <span>📈 Price Correlation</span>
        </div>
      </div>
    </div>
  );
};

export default StockDashboard;
