import React, { useState, useEffect, useCallback } from "react";
import "./FavoritesPanel.css";

const FavoritesPanel = ({ user, onStockSelect }) => {
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchFavorites = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setError("");

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

      setFavorites(result.data.getFavorites);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchFavorites();
    }
  }, [user, fetchFavorites]);

  const removeFavorite = async (ticker) => {
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
          variables: { ticker },
        }),
      });

      const result = await response.json();

      if (result.errors) {
        throw new Error(result.errors[0].message);
      }

      if (result.data.removeFavorite.success) {
        setFavorites(result.data.removeFavorite.favorites);
      }
    } catch (error) {
      console.error("Error removing favorite:", error);
    }
  };

  const formatDate = (dateString) => {
    try {
      // GraphQL now sends ISO date strings, so this should work reliably
      const date = new Date(dateString);

      // Check if date is valid
      if (isNaN(date.getTime())) {
        console.warn("Invalid date received:", dateString);
        return "Unknown date";
      }

      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch (error) {
      console.error(
        "Error formatting date:",
        error,
        "Date string:",
        dateString
      );
      return "Invalid date";
    }
  };

  if (!user) {
    return (
      <div className="favorites-panel">
        <div className="favorites-header">
          <h3>Favorites</h3>
        </div>
        <div className="favorites-content">
          <p className="login-prompt">Please login to view your favorites</p>
        </div>
      </div>
    );
  }

  return (
    <div className="favorites-panel">
      <div className="favorites-header">
        <h3>Favorites ({favorites.length})</h3>
        <button
          className="refresh-button"
          onClick={fetchFavorites}
          disabled={loading}
        >
          {loading ? "⟳" : "↻"}
        </button>
      </div>

      <div className="favorites-content">
        {loading && <div className="loading">Loading favorites...</div>}

        {error && <div className="error-message">{error}</div>}

        {!loading && !error && favorites.length === 0 && (
          <div className="empty-state">
            <p>No favorites yet</p>
            <p className="empty-state-subtitle">
              Add stocks to your favorites to see them here
            </p>
          </div>
        )}

        {!loading && !error && favorites.length > 0 && (
          <div className="favorites-list">
            {favorites.map((favorite) => (
              <div key={favorite.ticker} className="favorite-item">
                <div
                  className="favorite-info"
                  onClick={() => onStockSelect(favorite.ticker)}
                >
                  <div className="stock-ticker">{favorite.ticker}</div>
                  <div className="stock-name">{favorite.name || "N/A"}</div>
                  <div className="added-date">
                    Added {formatDate(favorite.addedAt)}
                  </div>
                </div>
                <button
                  className="remove-favorite-button"
                  onClick={() => removeFavorite(favorite.ticker)}
                  title="Remove from favorites"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FavoritesPanel;
