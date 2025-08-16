const { ApolloServer } = require("@apollo/server");
const { startStandaloneServer } = require("@apollo/server/standalone");
const mongoose = require("mongoose");
require("dotenv").config();

const typeDefs = require("./graphql/schema");
const resolvers = require("./graphql/resolvers");
const { connectDB } = require("./config/database");
const { connectRedis, testRedisConnection } = require("./config/redis");
const authService = require("./services/authService");

const PORT = process.env.PORT || 5000;

// Start server
async function startServer() {
  try {
    // Connect to MongoDB
    await connectDB();
    console.log("✅ Connected to MongoDB");

    // Connect to Redis
    await connectRedis();

    // Test Redis connection
    if (process.env.REDIS_HOST) {
      const redisTest = await testRedisConnection();
      if (redisTest) {
        console.log("✅ Redis connection test passed");
      } else {
        console.log("⚠️  Redis connection test failed");
      }
    }

    // Create Apollo Server
    const server = new ApolloServer({
      typeDefs,
      resolvers,
      formatError: (error) => {
        console.error("GraphQL Error:", error);
        return {
          message: error.message,
          code: error.extensions?.code || "INTERNAL_SERVER_ERROR",
        };
      },
      csrfPrevention: false, // Disable CSRF prevention for development
    });

    // Start Apollo Server in standalone mode
    const { url } = await startStandaloneServer(server, {
      listen: { port: PORT },
      context: async ({ req }) => {
        try {
          const token =
            req.headers.authorization?.replace("Bearer ", "") ||
            req.headers.authorization;

          if (!token) {
            return { user: null };
          }

          const decoded = authService.verifyToken(token);
          const user = await authService.getUserById(decoded.userId);

          return { user };
        } catch (error) {
          return { user: null };
        }
      },
    });

    console.log(`🚀 Server running on ${url}`);
    console.log(`🔍 GraphQL endpoint: ${url}`);
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
}

startServer();

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down gracefully");
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log("SIGINT received, shutting down gracefully");
  process.exit(0);
});
