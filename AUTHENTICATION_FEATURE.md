# Authentication & Favorites Feature

## Overview

This feature adds user authentication and favorites management to the Stock Sentiment Analyzer application.

## Features Implemented

### 1. User Authentication

- **User Registration**: Users can create accounts with email, password, and name
- **User Login**: Secure authentication with JWT tokens
- **Password Security**: Passwords are hashed using bcrypt
- **Session Management**: JWT tokens stored in localStorage with 7-day expiry

### 2. Favorites Management

- **Add to Favorites**: Users can save stocks to their favorites list
- **Remove from Favorites**: Remove stocks from favorites
- **Favorites Panel**: Sidebar showing all user's favorite stocks
- **Quick Access**: Click on favorites to quickly view stock details

### 3. User Interface

- **Authentication Modal**: Clean login/register form with toggle between modes
- **User Header**: Shows user info and logout button when authenticated
- **Favorites Button**: Add/remove favorites directly from stock dashboard
- **Responsive Design**: Works on both desktop and mobile devices

## Technical Implementation

### Backend

- **User Model**: MongoDB schema with password hashing and favorites array
- **Authentication Service**: Handles registration, login, and token management
- **GraphQL Schema**: Extended with User, Favorite, and authentication types
- **JWT Middleware**: Secure token verification for protected routes
- **Favorites API**: CRUD operations for user favorites

### Frontend

- **React Components**: AuthModal, FavoritesPanel, updated Header and StockDashboard
- **State Management**: User authentication state managed in App component
- **GraphQL Integration**: Direct GraphQL queries for authentication and favorites
- **Local Storage**: Secure token and user data storage

## API Endpoints

### Authentication

```graphql
mutation Register($input: RegisterInput!) {
  register(input: $input) {
    user {
      id
      email
      name
      favorites
    }
    token
  }
}

mutation Login($input: LoginInput!) {
  login(input: $input) {
    user {
      id
      email
      name
      favorites
    }
    token
  }
}
```

### Favorites

```graphql
query GetFavorites {
  getFavorites {
    ticker
    name
    addedAt
  }
}

mutation AddFavorite($ticker: String!, $name: String) {
  addFavorite(ticker: $ticker, name: $name) {
    success
    message
    favorites
  }
}

mutation RemoveFavorite($ticker: String!) {
  removeFavorite(ticker: $ticker) {
    success
    message
    favorites
  }
}
```

## Security Features

- **Password Hashing**: bcrypt with salt rounds
- **JWT Tokens**: Secure token-based authentication
- **Input Validation**: Server-side validation for all inputs
- **Rate Limiting**: API rate limiting to prevent abuse
- **Secure Headers**: CORS and security headers configured

## Usage

### For Users

1. **Register/Login**: Use the buttons in the header to create an account or sign in
2. **Add Favorites**: When viewing a stock, click "Add to Favorites" button
3. **View Favorites**: Check the right sidebar to see all your favorite stocks
4. **Quick Access**: Click on any favorite to quickly view that stock
5. **Remove Favorites**: Use the × button in the favorites panel or toggle from stock view

### For Developers

1. **Environment Setup**: Add `JWT_SECRET` to your `.env` file
2. **Dependencies**: Install required packages with `pnpm install`
3. **Database**: Ensure MongoDB is running and accessible
4. **Testing**: Run the authentication test with `node server/test/test-auth.js`

## Future Enhancements

- **Password Reset**: Email-based password recovery
- **Social Login**: OAuth integration with Google, GitHub, etc.
- **User Profiles**: Extended user information and preferences
- **Favorites Sync**: Cloud sync across devices
- **Notifications**: Alerts for favorite stock updates

## Testing

The feature includes comprehensive testing:

- **Backend Tests**: Authentication service unit tests
- **Frontend Tests**: Component integration tests
- **API Tests**: GraphQL endpoint validation
- **Security Tests**: Token verification and validation

## Dependencies Added

- `jsonwebtoken`: JWT token management
- `bcryptjs`: Password hashing
- `express-validator`: Input validation
- `@apollo/server/express4`: Apollo Server Express integration
