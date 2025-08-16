import React, { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";

const StockSearch = ({ onStockSelect }) => {
  const inputRef = useRef(null);
  const firstSuggestionRef = useRef(null);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isSearching, setIsSearching] = useState(false);
  const [searchStats, setSearchStats] = useState(null);
  const debounceRef = useRef(null);

  // Basic search fallback
  const performBasicSearch = useCallback(async (searchQuery) => {
    try {
      const response = await axios.post("/graphql", {
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
        variables: { query: searchQuery, limit: 10 },
      });

      if (response.data.data?.getStockSuggestions) {
        const result = response.data.data.getStockSuggestions;
        setSuggestions(result.suggestions);
        setSearchStats({
          totalCount: result.totalCount,
          searchTime: new Date().toISOString(),
          query: searchQuery,
        });
        setShowSuggestions(true);
      }
    } catch (error) {
      console.error("Basic search failed:", error);
    }
  }, []);

  // Enhanced search
  const performEnhancedSearch = useCallback(
    async (searchQuery) => {
      try {
        setIsSearching(true);

        const response = await axios.post("/graphql", {
          query: `
            query GetEnhancedStockSuggestions($query: String!, $limit: Int, $sortBy: String, $sortOrder: Int) {
              getStockSuggestions(query: $query, limit: $limit, sortBy: $sortBy, sortOrder: $sortOrder) {
                suggestions {
                  ticker
                  name
                  exchange
                  sector
                  industry
                  marketCap
                  isin
                  priority
                }
                totalCount
                query
                searchTime
              }
            }
          `,
          variables: {
            query: searchQuery,
            limit: 20,
            sortBy: "priority",
            sortOrder: -1,
          },
        });

        if (response.data.data?.getStockSuggestions) {
          const result = response.data.data.getStockSuggestions;
          setSuggestions(result.suggestions);
          setSearchStats({
            totalCount: result.totalCount,
            searchTime: result.searchTime,
            query: result.query,
          });
          setShowSuggestions(true);
        }
      } catch (error) {
        console.error("Enhanced search error:", error);
        await performBasicSearch(searchQuery);
      } finally {
        setIsSearching(false);
      }
    },
    [performBasicSearch]
  );

  // Debounced search
  const debouncedSearch = useCallback(
    (searchQuery) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        if (searchQuery.trim().length >= 2) {
          performEnhancedSearch(searchQuery);
        } else {
          setSuggestions([]);
          setShowSuggestions(false);
          setSearchStats(null);
        }
      }, 500);
    },
    [performEnhancedSearch]
  );

  // Input change
  const handleInputChange = (e) => {
    const value = e.target.value;
    setQuery(value);
    debouncedSearch(value);
  };

  // Move selection
  const handleItemKeyDown = (e, index, stock) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      const next = document.getElementById(`suggestion-${index + 1}`);
      if (next) {
        next.focus();
        setSelectedIndex(index + 1);
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (index === 0) {
        inputRef.current?.focus();
        setSelectedIndex(-1);
      } else {
        const prev = document.getElementById(`suggestion-${index - 1}`);
        if (prev) {
          prev.focus();
          setSelectedIndex(index - 1);
        }
      }
    } else if (e.key === "Enter") {
      e.preventDefault();
      handleStockSelect(stock);
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
      setSelectedIndex(-1);
      inputRef.current?.focus();
    }
  };

  // Keyboard navigation from input
  const handleKeyDown = (e) => {
    if (e.key === "ArrowDown" && showSuggestions && suggestions.length > 0) {
      e.preventDefault();
      firstSuggestionRef.current?.focus();
      setSelectedIndex(0);
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
      setSelectedIndex(-1);
      inputRef.current?.focus();
    }
  };

  // Stock select
  const handleStockSelect = (stock) => {
    onStockSelect(stock);
    setQuery(stock.ticker);
    setShowSuggestions(false);
    setSelectedIndex(-1);
    setSearchStats(null);
    inputRef.current?.focus();
  };

  // Focus on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Auto-focus first suggestion when suggestions appear (only if there are results)
  useEffect(() => {
    if (
      showSuggestions &&
      suggestions.length > 0 &&
      firstSuggestionRef.current
    ) {
      // Small delay to ensure DOM is fully updated
      const timer = setTimeout(() => {
        firstSuggestionRef.current.focus();
        setSelectedIndex(0);
      }, 100);
      return () => clearTimeout(timer);
    } else if (showSuggestions && suggestions.length === 0) {
      // If no results, keep focus on input
      setSelectedIndex(-1);
      inputRef.current?.focus();
    }
  }, [showSuggestions, suggestions.length]);

  // Click outside
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
    <div className="stock-search-container relative w-full max-w-2xl mx-auto">
      <div className="relative">
        <input
          ref={inputRef}
          autoFocus
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder="Search for stocks (e.g., RELIANCE, TCS, HDFC)..."
          className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none transition-colors duration-200"
          disabled={isSearching}
        />

        {isSearching && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
          </div>
        )}
      </div>

      {/* Info text - only show when input is empty */}
      {query.length === 0 && (
        <div className="mt-1 text-xs text-gray-500 text-left">
          Enter at least 2 characters to search
        </div>
      )}

      {searchStats && (
        <div className="mt-2 text-sm text-gray-600">
          <span className="font-medium">{searchStats.totalCount}</span> stocks
          found{" "}
          {searchStats.searchTime && (
            <span className="ml-2 text-gray-500">
              at {new Date(searchStats.searchTime).toLocaleTimeString()}
            </span>
          )}
        </div>
      )}

      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-2 bg-white border-2 border-gray-200 rounded-lg shadow-lg max-h-96 overflow-y-auto">
          {suggestions.map((stock, index) => (
            <div
              key={`${stock.ticker}-${index}`}
              id={`suggestion-${index}`}
              ref={index === 0 ? firstSuggestionRef : null}
              tabIndex={0}
              onKeyDown={(e) => handleItemKeyDown(e, index, stock)}
              onMouseDown={() => handleStockSelect(stock)}
              onMouseEnter={() => setSelectedIndex(index)}
              className={`px-4 py-3 cursor-pointer transition-colors duration-150 ${
                index === selectedIndex
                  ? "bg-blue-100 border-l-4 border-blue-500"
                  : "hover:bg-gray-50"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-lg text-gray-800">
                      {stock.ticker}
                    </span>
                    <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                      {stock.exchange}
                    </span>
                    {stock.priority && (
                      <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                        Priority {stock.priority}
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">{stock.name}</div>
                  <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500">
                    {stock.sector && <span>📊 {stock.sector}</span>}
                    {stock.industry && <span>🏭 {stock.industry}</span>}
                    {stock.marketCap && (
                      <span>
                        💰 ₹{(stock.marketCap / 10000000).toFixed(1)} Cr
                      </span>
                    )}
                  </div>
                </div>
                {stock.isin && (
                  <div className="text-right text-xs text-gray-400">
                    ISIN: {stock.isin}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showSuggestions &&
        suggestions.length === 0 &&
        query.length >= 2 &&
        !isSearching && (
          <div className="absolute z-50 w-full mt-2 bg-white border-2 border-gray-200 rounded-lg shadow-lg p-4 text-center text-gray-500">
            No stocks found for "{query}"
          </div>
        )}
    </div>
  );
};

export default StockSearch;
