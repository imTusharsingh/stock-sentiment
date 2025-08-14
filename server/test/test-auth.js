const mongoose = require("mongoose");
const authService = require("../services/authService");
require("dotenv").config();

// Connect to test database
mongoose.connect(
  process.env.MONGODB_URI || "mongodb://localhost:27017/stock-sentiment-test"
);

async function testAuth() {
  try {
    console.log("🧪 Testing Authentication Service...\n");

    // Test 1: User Registration
    console.log("1. Testing User Registration...");
    const userData = {
      email: "test@example.com",
      password: "password123",
      name: "Test User",
    };

    const registerResult = await authService.register(userData);
    console.log("✅ Registration successful:", {
      userId: registerResult.user.id,
      email: registerResult.user.email,
      name: registerResult.user.name,
      hasToken: !!registerResult.token,
    });

    // Test 2: User Login
    console.log("\n2. Testing User Login...");
    const loginResult = await authService.login(
      "test@example.com",
      "password123"
    );
    console.log("✅ Login successful:", {
      userId: loginResult.user.id,
      email: loginResult.user.email,
      hasToken: !!loginResult.token,
    });

    // Test 3: Add Favorite
    console.log("\n3. Testing Add Favorite...");
    const addFavoriteResult = await authService.addFavorite(
      registerResult.user.id,
      "RELIANCE.NS",
      "Reliance Industries"
    );
    console.log("✅ Add favorite successful:", addFavoriteResult);

    // Test 4: Get Favorites
    console.log("\n4. Testing Get Favorites...");
    const favorites = await authService.getFavorites(registerResult.user.id);
    console.log("✅ Get favorites successful:", favorites);

    // Test 5: Remove Favorite
    console.log("\n5. Testing Remove Favorite...");
    const removeFavoriteResult = await authService.removeFavorite(
      registerResult.user.id,
      "RELIANCE.NS"
    );
    console.log("✅ Remove favorite successful:", removeFavoriteResult);

    // Test 6: Token Verification
    console.log("\n6. Testing Token Verification...");
    const decoded = authService.verifyToken(registerResult.token);
    console.log("✅ Token verification successful:", decoded);

    console.log("\n🎉 All authentication tests passed!");
  } catch (error) {
    console.error("❌ Test failed:", error.message);
  } finally {
    // Clean up test data
    try {
      const User = require("../models/User");
      await User.deleteOne({ email: "test@example.com" });
      console.log("\n🧹 Test data cleaned up");
    } catch (cleanupError) {
      console.error("⚠️ Cleanup failed:", cleanupError.message);
    }

    await mongoose.disconnect();
    console.log("🔌 Disconnected from database");
  }
}

testAuth();
