import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";

const StockSearch = ({ onStockSelect, setIsLoading }) => {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isSearching, setIsSearching] = useState(false);

  // Debounced search function
  const debouncedSearch = useCallback(
    (() => {
      let timeoutId;
      return (searchQuery) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          if (searchQuery.trim().length >= 2) {
            performSearch(searchQuery);
          } else {
            setSuggestions([]);
            setShowSuggestions(false);
          }
        }, 300);
      };
    })(),
    []
  );

  // Perform search via GraphQL API
  const performSearch = async (searchQuery) => {
    try {
      setIsSearching(true);

      const response = await axios.post("http://localhost:4000/graphql", {
        query: `
          query GetStockSuggestions($query: String!, $limit: Int!) {
            getStockSuggestions(query: $query, limit: $limit) {
              suggestions {
                ticker
                name
                exchange
                sector
              }
              totalCount
            }
          }
        `,
        variables: {
          query: searchQuery,
          limit: 10,
        },
      });

      if (response.data.data?.getStockSuggestions) {
        setSuggestions(response.data.data.getStockSuggestions.suggestions);
        setShowSuggestions(true);
      }
    } catch (error) {
      console.error("Search error:", error);
      // Fallback to mock data for development
      const mockSuggestions = getMockSuggestions(searchQuery);
      setSuggestions(mockSuggestions);
      setShowSuggestions(true);
    } finally {
      setIsSearching(false);
    }
  };

  // Mock suggestions for development (remove in production)
  const getMockSuggestions = (searchQuery) => {
    const allStocks = [
      {
        ticker: "RELIANCE",
        name: "Reliance Industries Limited",
        exchange: "NSE",
        sector: "Oil & Gas",
      },
      {
        ticker: "TCS",
        name: "Tata Consultancy Services Limited",
        exchange: "NSE",
        sector: "Information Technology",
      },
      {
        ticker: "HDFCBANK",
        name: "HDFC Bank Limited",
        exchange: "NSE",
        sector: "Banking",
      },
      {
        ticker: "INFY",
        name: "Infosys Limited",
        exchange: "NSE",
        sector: "Information Technology",
      },
      {
        ticker: "ICICIBANK",
        name: "ICICI Bank Limited",
        exchange: "NSE",
        sector: "Banking",
      },
      {
        ticker: "HINDUNILVR",
        name: "Hindustan Unilever Limited",
        exchange: "NSE",
        sector: "FMCG",
      },
      { ticker: "ITC", name: "ITC Limited", exchange: "NSE", sector: "FMCG" },
      {
        ticker: "SBIN",
        name: "State Bank of India",
        exchange: "NSE",
        sector: "Banking",
      },
      {
        ticker: "BHARTIARTL",
        name: "Bharti Airtel Limited",
        exchange: "NSE",
        sector: "Telecommunications",
      },
      {
        ticker: "AXISBANK",
        name: "Axis Bank Limited",
        exchange: "NSE",
        sector: "Banking",
      },
    ];

    const query = searchQuery.toLowerCase();
    return allStocks
      .filter(
        (stock) =>
          stock.ticker.toLowerCase().includes(query) ||
          stock.name.toLowerCase().includes(query) ||
          stock.sector.toLowerCase().includes(query)
      )
      .slice(0, 10);
  };

  // Handle input change
  const handleInputChange = (e) => {
    const value = e.target.value;
    setQuery(value);
    setSelectedIndex(-1);
    debouncedSearch(value);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev < suggestions.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (selectedIndex >= 0 && suggestions[selectedIndex]) {
        handleStockSelect(suggestions[selectedIndex]);
      }
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
      setSelectedIndex(-1);
    }
  };

  // Handle stock selection
  const handleStockSelect = (stock) => {
    setQuery(stock.ticker);
    setShowSuggestions(false);
    setSelectedIndex(-1);
    onStockSelect(stock);
  };

  // Handle input focus
  const handleInputFocus = () => {
    if (suggestions.length > 0) {
      setShowSuggestions(true);
    }
  };

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest(".stock-search-container")) {
        setShowSuggestions(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="stock-search-container max-w-2xl mx-auto">
      <div className="relative">
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={handleInputFocus}
            placeholder="Search for Indian stocks (e.g., RELIANCE, TCS, HDFCBANK)..."
            className="w-full px-6 py-4 text-lg border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none transition-colors shadow-sm"
            autoComplete="off"
          />

          {isSearching && (
            <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            </div>
          )}

          {!isSearching && query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
        </div>

        {/* Search Suggestions Dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-lg z-10 max-h-80 overflow-y-auto">
            {suggestions.map((stock, index) => (
              <div
                key={stock.ticker}
                onClick={() => handleStockSelect(stock)}
                className={`px-4 py-3 cursor-pointer transition-colors ${
                  index === selectedIndex
                    ? "bg-blue-50 border-l-4 border-blue-500"
                    : "hover:bg-gray-50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <span className="font-semibold text-gray-900">
                        {stock.ticker}
                      </span>
                      <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full">
                        {stock.exchange}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{stock.name}</p>
                    <p className="text-xs text-gray-500 mt-1">{stock.sector}</p>
                  </div>
                  <div className="text-right">
                    <svg
                      className="w-5 h-5 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* No results message */}
        {showSuggestions &&
          suggestions.length === 0 &&
          query.length >= 2 &&
          !isSearching && (
            <div className="absolute w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-lg z-10 p-4">
              <p className="text-gray-500 text-center">
                No stocks found matching "{query}"
              </p>
            </div>
          )}
      </div>

      {/* Search tips */}
      <div className="mt-6 text-center">
        <p className="text-sm text-gray-500">
          💡 Try searching by company name, ticker symbol, or sector
        </p>
        <p className="text-xs text-gray-400 mt-2">
          Popular: RELIANCE, TCS, HDFCBANK, INFY, ICICIBANK
        </p>
      </div>
    </div>
  );
};

export default StockSearch;
