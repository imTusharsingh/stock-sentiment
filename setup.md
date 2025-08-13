# 🚀 Feature 1 Testing Setup Guide

## 📋 Prerequisites Check

First, let's verify what you have installed:

```bash
# Check Node.js version (should be 18+)
node --version

# Check npm version
npm --version

# Check if pnpm is installed
pnpm --version
```

If pnpm is not installed, install it:

```bash
npm install -g pnpm
```

## 🔧 Step 1: Create Environment File

Create a `.env` file in the `server` folder with this content:

```bash
cd server
# Create .env file manually with this content:
```

```env
# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/stock-sentiment

# Redis Configuration (Redis Cloud)
REDIS_USERNAME=default
REDIS_PASSWORD=qSbFyBO9aV0gHM2C6UCt31XoK0Z3yBca
REDIS_HOST=redis-16403.c212.ap-south-1-1.ec2.redns.redis-cloud.com
REDIS_PORT=16403
REDIS_URL=redis://default:qSbFyBO9aV0gHM2C6UCt31XoK0Z3yBca@redis-16403.c212.ap-south-1-1.ec2.redns.redis-cloud.com:16403

# Server Configuration
PORT=5000
NODE_ENV=development

# JWT Configuration
JWT_SECRET=stock-sentiment-super-secret-jwt-key-2024
JWT_EXPIRES_IN=7d

# API Keys (Free Tier) - Add these later
GNEWS_API_KEY=your-gnews-api-key
HUGGINGFACE_API_KEY=your-huggingface-api-key

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## 🗄️ Step 2: MongoDB Setup

### Option A: MongoDB Atlas (Cloud - Recommended)

1. Go to https://www.mongodb.com/atlas
2. Create free account
3. Create new cluster
4. Get connection string
5. Replace `MONGODB_URI` in `.env` with your Atlas connection string

### Option B: MongoDB Local

1. Download from https://www.mongodb.com/try/download/community
2. Install MongoDB
3. Start MongoDB service
4. Keep default URI: `mongodb://localhost:27017/stock-sentiment`

## 📦 Step 3: Install Dependencies

```bash
# From the root directory (stock-sentiment-app)
pnpm install-all
```

This will install dependencies for:

- Root project
- Server backend
- Client frontend

## 🌱 Step 4: Seed Database

```bash
cd server
node scripts/seedStocks.js
```

You should see:

```
✅ Connected to MongoDB
🗑️  Cleared existing stocks
✅ Inserted 50 stocks successfully
✅ Indexes created
🎉 Database seeding completed successfully!
🔌 Disconnected from MongoDB
```

## 🚀 Step 5: Start Development Servers

```bash
# From root directory
pnpm dev
```

You should see:

```
✅ Connected to MongoDB
🔗 Connecting to Redis Cloud...
✅ Redis Cloud connected successfully
🚀 Redis Cloud ready for operations
✅ Redis connection test passed
🚀 Apollo Server ready at http://localhost:5000/graphql
🚀 Server running on http://localhost:5000
📊 GraphQL endpoint: http://localhost:5000/graphql
🔍 Health check: http://localhost:5000/health
```

## 🧪 Step 6: Test the Feature

### Test Backend API

```bash
# Test health endpoint
curl http://localhost:5000/health

# Test GraphQL endpoint
curl -X POST http://localhost:5000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"query { health }"}'
```

### Test Frontend

1. Open http://localhost:3000 in your browser
2. You should see the Stock Sentiment Analyzer homepage
3. Try searching for stocks:
   - Type "RELIANCE" in the search box
   - Use arrow keys to navigate suggestions
   - Press Enter to select a stock
   - See the stock dashboard

## 🔍 Step 7: Run Automated Tests

```bash
cd server
node test/test-stock-search.js
```

Expected output:

```
🚀 Starting Stock Search Feature Tests...

🧪 Testing health endpoint...
✅ Health check passed: { status: 'OK', timestamp: '...' }

🧪 Testing stock suggestions...
✅ Stock suggestions query passed
📊 Found 1 suggestions
📋 First suggestion: { ticker: 'RELIANCE', name: '...', ... }

🧪 Testing get stock by ticker...
✅ Get stock by ticker query passed
📋 Stock details: { ticker: 'TCS', name: '...', ... }

📊 Test Results:
✅ Passed: 3/3
❌ Failed: 0/3

🎉 All tests passed! Feature 1 is working correctly.
```

## 🐛 Troubleshooting

### MongoDB Connection Issues

- Check if MongoDB is running
- Verify connection string in `.env`
- Check firewall settings

### Redis Connection Issues

- Verify Redis Cloud credentials
- Check if Redis Cloud service is active
- Verify network connectivity

### Port Conflicts

- If port 5000 is busy, change `PORT` in `.env`
- If port 3000 is busy, React will automatically use next available port

### Dependencies Issues

```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
pnpm install
```

## ✅ Success Criteria

Feature 1 is working correctly when:

1. ✅ Backend server starts without errors
2. ✅ MongoDB connection successful
3. ✅ Redis Cloud connection successful
4. ✅ GraphQL endpoint accessible
5. ✅ Frontend loads at http://localhost:3000
6. ✅ Stock search with autocomplete works
7. ✅ All automated tests pass

## 🎯 Next Steps

Once Feature 1 is working:

- **Feature 2**: Sentiment Analysis Processing
- **Feature 3**: Stock Price Integration
- **Feature 4**: Visualization Dashboard

---

**Need Help?** Check the console logs for detailed error messages!
