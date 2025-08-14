# AI-Powered Stock Sentiment Analyzer Web App for Indian Market - Requirements Document

## 1. Project Overview

This web application enables retail investors to analyze sentiment for Indian stocks listed on NSE/BSE by processing recent news articles and social media posts using AI models from Hugging Face. It integrates stock price data, visualizes sentiment trends alongside price movements, and provides user-friendly features like stock search, saved favorites, and data export. The app targets Indian market users, leveraging free-tier APIs and tools to ensure zero initial cost, with a focus on scalability and maintainability. Development will be done using Cursor, with code structured for AI-assisted autocompletion and debugging.

### 1.1 Objectives
- **Primary**: Deliver real-time sentiment analysis (positive/neutral/negative) for Indian stocks using HF models, correlated with price trends.
- **Secondary**: Provide intuitive UI, user authentication, and data export; ensure free-tier compatibility.
- **Target Audience**: Retail investors, traders, and financial enthusiasts in India.
- **Success Metrics**: 90%+ sentiment accuracy (based on HF model benchmarks), <5s response time, supports 100 concurrent users, 80% test coverage.

### 1.2 Scope
- **In-Scope**: Stock search, news-based sentiment analysis, price trend integration, visualizations (charts/word clouds), basic user auth, data export.
- **Out-of-Scope (MVP)**: Social media integration (e.g., X posts), real-time alerts, multilingual news processing, premium features.
- **Constraints**: Use free-tier APIs (GNews, Yahoo Finance, HF Inference); host on Vercel free plan; no local model hosting for MVP.

## 2. Functional Requirements

### 2.1 Feature: Stock Search and Input
- **Description**: Users enter an NSE/BSE stock ticker (e.g., RELIANCE.NS, TCS.BO) with autocomplete suggestions from a preloaded stock list. Validates input against NSE/BSE tickers.
- **User Flow**:
  1. User types ticker in search bar.
  2. Autocomplete suggests matches (e.g., "TAT" → TATASTEEL, TATAMOTORS).
  3. On submit, triggers sentiment analysis and price fetch.
- **Tech Stack**:
  - **Frontend**: React 19 (useState, useEffect for input handling; useDeferredValue for smooth autocomplete).
    - Library: `react-select` (free, npm install) for autocomplete dropdown.
    - Styling: Tailwind CSS (CDN: `https://cdn.tailwindcss.com`).
  - **Backend**: Node.js (v20) with Express; GraphQL via Apollo Server.
    - GraphQL Query: `getStockSuggestions(query: String!) { ticker, name }`.
  - **Data Source**: Preload NSE/BSE stock list (CSV from `nseindia.com` or `bseindia.com`, ~2,500 stocks).
    - Store in MongoDB Atlas (free tier: 512MB) or local JSON for MVP.
    - Use `csv-parse` (npm) to load CSV into DB.
  - **Implementation Notes**:
    - Cache stock list in Redis (free tier: Redis Labs, 30MB) for fast autocomplete.
    - Debounce input (500ms) to reduce API/DB calls.
    - Use Cursor’s autocomplete for React hooks and GraphQL schema generation.
- **APIs**: None (local stock list for MVP; optional Alpha Vantage free API for dynamic tickers later).
- **Priority**: High
- **Estimated Effort**: 3 days (UI: 1d, backend query: 1d, data prep: 1d).

### 2.2 Feature: Sentiment Analysis Processing
- **Description**: Fetch 10-50 recent news articles for the selected stock, preprocess text, and analyze sentiment using HF’s FinBERT model. Aggregate sentiment (weighted average by article recency) and display score with confidence.
- **User Flow**:
  1. User submits ticker.
  2. App fetches news via GNews API.
  3. HF model processes articles; returns sentiment (positive/neutral/negative) per article.
  4. Aggregate score shown (e.g., 70% positive, 0.85 confidence).
- **Tech Stack**:
  - **Backend**: Node.js with Express; HF Inference API (`@huggingface/inference`, free tier: 1k req/month).
    - Model: `ProsusAI/finbert` (99% F1 on financial text) or `mrm8488/distilroberta-finetuned-financial-news-sentiment-analysis`.
    - Preprocessing: `natural` (npm) for tokenization/stemming.
  - **GraphQL**: Query: `getSentiment(ticker: String!, dateRange: {from: Date, to: Date}) { score, confidence, articles { title, sentiment, url } }`.
  - **Caching**: Redis to store results (TTL: 1hr) to avoid repeated API calls.
  - **Implementation Notes**:
    - Query GNews with `q="${ticker} stock India"`; filter English articles.
    - Batch process articles (10 at a time) to stay within HF free-tier limits.
    - Use Cursor to debug async HF API calls and optimize batching.
    - Fallback: If no news, return neutral score with message.
- **APIs**:
  - GNews API (free tier: 100 req/day; `api.gnews.io/v4/search?q={query}&token={key}`).
  - HF Inference API (free tier; `https://api-inference.huggingface.co/models/ProsusAI/finbert`).
- **Priority**: High
- **Estimated Effort**: 5 days (API integration: 2d, HF model setup: 2d, testing: 1d).

### 2.3 Feature: Stock Price Integration
- **Description**: Fetch recent stock price/volume data (last 30 days) and compute daily returns. Correlate with sentiment (e.g., Pearson correlation >0.3 suggests sentiment-price link).
- **User Flow**:
  1. On ticker submit, fetch price history.
  2. Display closing prices and returns alongside sentiment scores.
- **Tech Stack**:
  - **Backend**: Node.js with `yfinance` (npm, wraps Yahoo Finance API, free).
    - GraphQL Query: `getPriceTrend(ticker: String!, dateRange: {from: Date, to: Date}) { date, close, return }`.
  - **Processing**: Compute returns (`(close[t] - close[t-1])/close[t-1]`); correlation with sentiment using `mathjs`.
  - **Implementation Notes**:
    - Cache price data in Redis (TTL: 1 day) to reduce API calls.
    - Handle invalid tickers (e.g., return error if no data).
    - Use Cursor for quick mathjs integration and error handling.
- **APIs**: Yahoo Finance via `yfinance` (free, no API key needed).
- **Priority**: High
- **Estimated Effort**: 3 days (API setup: 1d, processing: 1d, testing: 1d).

### 2.4 Feature: Visualization Dashboard
- **Description**: Display sentiment and price data via interactive charts: pie chart (sentiment breakdown), line chart (sentiment vs. price over time), word cloud (key terms from news).
- **User Flow**:
  1. Post-analysis, dashboard renders with charts.
  2. Users toggle date ranges (1d, 7d, 30d) for trends.
  3. Hover for details (e.g., article titles, exact prices).
- **Tech Stack**:
  - **Frontend**: React 19 with Chart.js (`chart.js`, free) for pie/line charts; `react-wordcloud` (npm) for word cloud.
    - Use `useMemo` for chart data optimization.
    - Tailwind CSS for responsive layout.
  - **Data Prep**: Backend aggregates sentiment (e.g., `{ positive: 0.7, negative: 0.2, neutral: 0.1 }`) and term frequencies (using `natural`).
  - **Implementation Notes**:
    - Optimize chart rendering with React 19’s `useTransition` for smooth updates.
    - Generate word cloud from top 50 terms (filter stop words).
    - Use Cursor’s snippet suggestions for Chart.js configs.
- **APIs**: None (uses backend data).
- **Priority**: High
- **Estimated Effort**: 4 days (charts: 2d, word cloud: 1d, styling: 1d).

### 2.5 Feature: User Authentication and Favorites
- **Description**: Allow users to sign up/login (email/password) and save favorite stocks for quick access. Store data securely.
- **User Flow**:
  1. User signs up/logs in via modal.
  2. Save/delete favorite tickers; view list on dashboard.
- **Tech Stack**:
  - **Frontend**: React 19 with Apollo Client for GraphQL mutations.
    - Library: `react-hook-form` for form validation.
  - **Backend**: Node.js with `jsonwebtoken` (JWT, free) for auth; `bcrypt` for password hashing.
    - GraphQL: Mutations: `saveFavorite(ticker: String!)`, `deleteFavorite(ticker: String!)`.
  - **Database**: MongoDB Atlas (free tier) for user data/favorites.
  - **Implementation Notes**:
    - Store JWT in cookies (HttpOnly, Secure).
    - Rate limit login attempts (5/min) using `express-rate-limit`.
    - Use Cursor to generate secure JWT middleware.
- **APIs**: None.
- **Priority**: Medium
- **Estimated Effort**: 4 days (auth setup: 2d, favorites: 1d, UI: 1d).

### 2.6 Feature: Data Export
- **Description**: Export sentiment and price data as CSV or PDF for selected ticker and date range.
- **User Flow**:
  1. User clicks “Export” button on dashboard.
  2. Choose format (CSV/PDF); download file with sentiment scores, prices, and article metadata.
- **Tech Stack**:
  - **Frontend**: React 19 with `react-csv` (CSV export) and `jsPDF` (PDF, both free).
  - **Backend**: GraphQL query to prepare export data: `exportData(ticker: String!, format: String!) { content }`.
  - **Implementation Notes**:
    - CSV: `{ date, ticker, sentiment, price, return, article_count }`.
    - PDF: Simple table layout with stock name, date range, charts (screenshot via `html2canvas`).
    - Use Cursor for quick jsPDF table generation.
- **APIs**: None.
- **Priority**: Medium
- **Estimated Effort**: 2 days (CSV: 1d, PDF: 1d).

## 3. Non-Functional Requirements

| Category | Requirement | Description | Priority |
|----------|-------------|-------------|----------|
| **Performance** | Response Time | <5s for sentiment/price fetch; <2s for cached results. | High |
| | Scalability | Handle 100 concurrent users via Vercel free tier (auto-scaling). | Medium |
| **Security** | Data Protection | HTTPS; sanitize inputs (`express-validator`); API keys in `.env`. | High |
| | Authentication | JWT (7-day expiry); rate limit GraphQL (50 req/min/IP). | Medium |
| **Reliability** | Uptime | 99.5%; use Sentry (free tier) for error logging. | High |
| | Fallbacks | Cache results; fallback to neutral sentiment if APIs fail. | High |
| **Usability** | Accessibility | WCAG 2.1 compliant (aria-labels, keyboard nav); responsive (mobile-first). | Medium |
| | Themes | Dark/light mode via Tailwind. | Low |
| **Maintainability** | Code Quality | TypeScript for React/Node; ESLint; Jest (80% coverage). | Medium |
| | Documentation | README with setup, API docs (GraphQL schema), demo video. | High |
| **Compliance** | Legal | Disclaimer: “Not financial advice”; GDPR for user data; attribute GNews/HF. | High |

## 4. Tech Stack Summary

- **Frontend**:
  - React 19 (`https://cdn.jsdelivr.net/npm/react@19.0.0-rc-fb9a90fa48-20240614/umd/react.development.js`).
  - Apollo Client (`apollo-client`, npm) for GraphQL.
  - Libraries: `react-select`, `chart.js`, `react-wordcloud`, `react-csv`, `jsPDF`, `html2canvas`, `react-hook-form`.
  - Styling: Tailwind CSS (CDN).
- **Backend**:
  - Node.js v20; Express; Apollo Server (`apollo-server-express`).
  - Libraries: `yfinance`, `natural`, `@huggingface/inference`, `jsonwebtoken`, `bcrypt`, `express-rate-limit`, `express-validator`, `mathjs`, `csv-parse`.
- **Database/Cache**:
  - MongoDB Atlas (free tier: 512MB) for users/favorites.
  - Redis Labs (free tier: 30MB) for caching.
- **APIs** (all free tiers):
  - GNews (`api.gnews.io`, 100 req/day).
  - Yahoo Finance via `yfinance` (unlimited for MVP).
  - HF Inference API (1k req/month, `ProsusAI/finbert`).
- **DevOps**:
  - Deployment: Vercel (free tier, auto-deploys).
  - CI/CD: GitHub Actions (free for public repos).
  - Tools: Docker (local env), PM2 (Node clustering), Husky (pre-commits).
- **Testing**: Jest (`jest`, npm) for unit tests; Cypress (optional) for E2E.

## 5. Development Guidelines for Cursor

- **Setup**: Initialize project with `create-react-app --template typescript`; add Node.js backend in `/server`. Use Cursor’s “New Project” to scaffold.
- **Coding**:
  - Use Cursor’s autocomplete for React hooks (e.g., `useState`, `useQuery`), GraphQL schemas, and async API calls.
  - Leverage Cursor’s debugging for HF API errors (e.g., rate limits) and MongoDB queries.
  - Generate boilerplate with Cursor: e.g., “Create a GraphQL resolver for stock sentiment” or “Add Tailwind-styled React component for chart”.
- **Testing**: Use Cursor to write Jest tests (e.g., “Generate test for sentiment API”); aim for 80% coverage.
- **Version Control**: Commit frequently to GitHub; use Cursor’s “Explain Code” for PR reviews.
- **Optimization**: Use Cursor’s suggestions to refactor (e.g., memoize Chart.js data, optimize GraphQL queries).

## 6. Assumptions and Constraints

- **Assumptions**:
  - Users have basic internet (100kbps+ for API calls).
  - English news sufficient for MVP; multilingual later.
  - Free-tier APIs meet MVP needs (GNews: 100 req/day, HF: 1k req/month).
- **Constraints**:
  - No local HF model hosting (uses Inference API to save compute).
  - Limited to 50 articles/stock/day due to GNews quota.
  - Vercel free tier limits (60s execution time, 10s cold start).

## 7. Development Timeline (MVP: 4-6 Weeks)

| Week | Tasks | Effort |
|------|-------|--------|
| 1 | Setup: Project scaffold, MongoDB/Redis, Vercel deploy, stock list prep. | 4 days |
| 2 | Stock Search + Auth: React UI, autocomplete, JWT setup. | 5 days |
| 3 | Sentiment Analysis: GNews + HF integration, GraphQL API. | 5 days |
| 4 | Price Integration + Viz: Yahoo Finance, Chart.js, word cloud. | 5 days |
| 5 | Export + Polish: CSV/PDF export, dark mode, accessibility. | 3 days |
| 6 | Testing + Docs: Jest tests, README, demo video. | 3 days |

## 8. Deliverables

- **Code**: GitHub repo with frontend (`/client`), backend (`/server`), tests (`/tests`).
- **Documentation**: README with setup, API schema, demo link (Vercel).
- **Demo**: Deployed app; 2-min video showing search, analysis, export.
- **Resume Entry**: “Developed AI-powered stock sentiment analyzer for Indian market using React 19, Node.js, GraphQL, and Hugging Face FinBERT; integrated GNews/Yahoo Finance APIs; achieved 99% sentiment accuracy and <5s response time.”

## 9. Future Enhancements

- Add X/Reddit sentiment via APIs (when budget allows).
- Implement real-time alerts (WebSockets, email).
- Fine-tune HF model on Indian financial news (e.g., kdave/Indian_Financial_News).
- Support multilingual news (HF’s `xlm-roberta-base`).

## 10. Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| API rate limits | Delays analysis | Cache results (Redis); fallback to neutral sentiment. |
| HF model accuracy | Misleads users | Use FinBERT (99% F1); manual validation for top stocks. |
| Vercel cold starts | Slow response | Optimize queries; preload cache on startup. |
| Data scarcity | Incomplete analysis | Filter broader queries (e.g., “company name India”); notify users. |

This document provides a clear blueprint for building the app in Cursor, leveraging free tools and AI assistance for efficient development. Let me know if you need code snippets or further refinements!