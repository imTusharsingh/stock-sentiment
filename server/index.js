const express = require("express");
const { ApolloServer } = require("@apollo/server");
const { startStandaloneServer } = require("@apollo/server/standalone");
const mongoose = require("mongoose");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
require("dotenv").config();

const typeDefs = require("./graphql/schema");
const resolvers = require("./graphql/resolvers");
const { connectDB } = require("./config/database");
const { connectRedis, testRedisConnection } = require("./config/redis");

const app = express();
const PORT = process.env.PORT || 5000;

// Trust proxy to fix rate limiting error
app.set("trust proxy", 1);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(cors());
app.use(express.json());
app.use(limiter);

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

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

    // Start Express server
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`🔍 Health check: http://localhost:${PORT}/health`);
    });

    // Start Apollo Server in standalone mode
    const { url } = await startStandaloneServer(
      new ApolloServer({
        typeDefs,
        resolvers,
        formatError: (error) => {
          console.error("GraphQL Error:", error);
          return {
            message: error.message,
            code: error.extensions?.code || "INTERNAL_SERVER_ERROR",
          };
        },
      }),
      {
        listen: { port: 4000 },
        context: async ({ req }) => {
          const token = req.headers.authorization || "";
          return { token };
        },
      }
    );

    console.log(`🚀 Apollo Server ready at ${url}`);
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
