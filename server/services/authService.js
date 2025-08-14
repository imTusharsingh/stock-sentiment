const jwt = require("jsonwebtoken");
const User = require("../models/User");

class AuthService {
  constructor() {
    this.secret =
      process.env.JWT_SECRET || "your-secret-key-change-in-production";
    this.expiresIn = "7d";
  }

  // Generate JWT token
  generateToken(userId) {
    return jwt.sign({ userId }, this.secret, { expiresIn: this.expiresIn });
  }

  // Verify JWT token
  verifyToken(token) {
    try {
      return jwt.verify(token, this.secret);
    } catch (error) {
      throw new Error("Invalid token");
    }
  }

  // User registration
  async register(userData) {
    const { email, password, name } = userData;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new Error("User with this email already exists");
    }

    // Create new user
    const user = new User({
      email,
      password,
      name,
    });

    await user.save();

    // Generate token
    const token = this.generateToken(user._id);

    return {
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        favorites: user.favorites,
      },
      token,
    };
  }

  // User login
  async login(email, password) {
    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      throw new Error("Invalid email or password");
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      throw new Error("Invalid email or password");
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate token
    const token = this.generateToken(user._id);

    return {
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        favorites: user.favorites,
      },
      token,
    };
  }

  // Get user by ID
  async getUserById(userId) {
    const user = await User.findById(userId).select("-password");
    if (!user) {
      throw new Error("User not found");
    }
    return user;
  }

  // Add favorite stock
  async addFavorite(userId, ticker, name) {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error("User not found");
    }

    const added = user.addFavorite(ticker, name);
    if (added) {
      await user.save();
    }

    return {
      success: added,
      message: added
        ? "Stock added to favorites"
        : "Stock already in favorites",
      favorites: user.favorites,
    };
  }

  // Remove favorite stock
  async removeFavorite(userId, ticker) {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error("User not found");
    }

    const removed = user.removeFavorite(ticker);
    if (removed) {
      await user.save();
    }

    return {
      success: removed,
      message: removed
        ? "Stock removed from favorites"
        : "Stock not found in favorites",
      favorites: user.favorites,
    };
  }

  // Get user favorites
  async getFavorites(userId) {
    const user = await User.findById(userId).select("favorites");
    if (!user) {
      throw new Error("User not found");
    }
    return user.favorites;
  }
}

module.exports = new AuthService();
