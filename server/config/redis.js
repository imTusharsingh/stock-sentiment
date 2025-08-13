const redis = require("redis");

let redisClient = null;

const connectRedis = async () => {
  try {
    // Use Redis Cloud credentials from environment variables
    const redisUrl =
      process.env.REDIS_URL ||
      `redis://${process.env.REDIS_USERNAME}:${process.env.REDIS_PASSWORD}@${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`;

    console.log("🔗 Connecting to Redis Cloud...");

    redisClient = redis.createClient({
      url: redisUrl,
      socket: {
        host: process.env.REDIS_HOST || "localhost",
        port: process.env.REDIS_PORT || 6379,
      },
      username: process.env.REDIS_USERNAME,
      password: process.env.REDIS_PASSWORD,
    });

    redisClient.on("error", (err) => {
      console.error("Redis Client Error:", err);
    });

    redisClient.on("connect", () => {
      console.log("✅ Redis Cloud connected successfully");
    });

    redisClient.on("ready", () => {
      console.log("🚀 Redis Cloud ready for operations");
    });

    await redisClient.connect();
  } catch (error) {
    console.error("Redis connection error:", error);
    // For MVP, we can continue without Redis
    console.log("⚠️  Continuing without Redis cache...");
  }
};

const getRedisClient = () => redisClient;

const setCache = async (key, value, ttl = 3600) => {
  if (!redisClient) return false;

  try {
    await redisClient.setEx(key, ttl, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error("Redis set error:", error);
    return false;
  }
};

const getCache = async (key) => {
  if (!redisClient) return null;

  try {
    const value = await redisClient.get(key);
    return value ? JSON.parse(value) : null;
  } catch (error) {
    console.error("Redis get error:", error);
    return null;
  }
};

const deleteCache = async (key) => {
  if (!redisClient) return false;

  try {
    await redisClient.del(key);
    return true;
  } catch (error) {
    console.error("Redis delete error:", error);
    return false;
  }
};

// Test Redis connection
const testRedisConnection = async () => {
  try {
    if (!redisClient) return false;

    await redisClient.set("test", "connection-test");
    const result = await redisClient.get("test");
    await redisClient.del("test");

    return result === "connection-test";
  } catch (error) {
    console.error("Redis test failed:", error);
    return false;
  }
};

module.exports = {
  connectRedis,
  getRedisClient,
  setCache,
  getCache,
  deleteCache,
  testRedisConnection,
};
