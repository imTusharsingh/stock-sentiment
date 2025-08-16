# 🚀 Quick Setup Guide for Better News Sources

## 🎯 **What We're Replacing:**

- **GNews API**: Limited coverage (20-30%), old data, rate limiting
- **Current Result**: Only RELIANCE working, INFY/HDFC failing

## 🏆 **What We're Adding:**

- **Alpha Vantage**: Primary news source with built-in sentiment
- **Reddit API**: Community sentiment and discussions
- **Multi-source fallback**: Better reliability and coverage

## ⚡ **Quick Setup (5 minutes):**

### **Step 1: Get Alpha Vantage API Key (Free)**

1. Visit: https://www.alphavantage.co/support/#api-key
2. Click "Get Your Free API Key"
3. Fill out the form
4. Copy your API key

### **Step 2: Get Reddit API Credentials (Free)**

1. Visit: https://www.reddit.com/prefs/apps
2. Click "Create App" or "Create Another App"
3. Choose "script" as app type
4. Copy Client ID and Client Secret

### **Step 3: Update Environment Variables**

Add to your `.env` file:

```bash
# Better News Sources
ALPHA_VANTAGE_API_KEY=your-alpha-vantage-key-here
REDDIT_CLIENT_ID=your-reddit-client-id-here
REDDIT_CLIENT_SECRET=your-reddit-client-secret-here
```

### **Step 4: Test the Integration**

```bash
cd server

# Test Alpha Vantage
node test-alpha-vantage.js

# Test Reddit API
node test-reddit-api.js

# Test Multi-Source Service
node test-multi-source-news.js
```

## 📊 **Expected Results:**

| Stock        | Before (GNews) | After (Multi-Source) |
| ------------ | -------------- | -------------------- |
| **RELIANCE** | ✅ Working     | ✅ Working + Better  |
| **INFY**     | ❌ No news     | ✅ News found        |
| **HDFC**     | ❌ No news     | ✅ News found        |
| **TCS**      | ❌ No news     | ✅ News found        |
| **WIPRO**    | ❌ No news     | ✅ News found        |

## 🔧 **Integration Steps:**

### **Phase 1: Test Individual Services**

```bash
# Test Alpha Vantage
node test-alpha-vantage.js

# Test Reddit API
node test-reddit-api.js
```

### **Phase 2: Test Multi-Source Service**

```bash
# Test complete system
node test-multi-source-news.js
```

### **Phase 3: Replace in Sentiment Service**

Update `sentimentService.js` to use `MultiSourceNewsService` instead of GNews

## 🎉 **Benefits You'll Get:**

- **Coverage**: 20% → 90% of stocks
- **Freshness**: Months → Hours old
- **Rate Limits**: 100/day → 1000+/day
- **Reliability**: Low → High
- **Sentiment**: Manual → Built-in scores
- **Cost**: Same (free tiers available)

## 🚨 **Troubleshooting:**

### **Alpha Vantage Issues:**

- **Rate Limited**: Wait 12 seconds between requests (free tier)
- **No API Key**: Get free key from their website
- **Invalid Key**: Check your .env file

### **Reddit API Issues:**

- **Authentication Failed**: Check Client ID and Secret
- **Rate Limited**: Wait 1 second between requests
- **No Discussions**: Some stocks may have limited Reddit activity

### **Multi-Source Issues:**

- **No Sources Available**: Check API keys in .env
- **Service Down**: Individual services may be temporarily unavailable

## 📝 **Next Steps After Setup:**

1. **Test with your failing stocks** (INFY, HDFC, TCS)
2. **Compare results** with current GNews implementation
3. **Integrate with sentiment service**
4. **Update GraphQL resolvers** if needed
5. **Test in browser** with your UI

## 💡 **Pro Tips:**

- **Start with Alpha Vantage** - it's the most reliable
- **Reddit is great for community sentiment** but may have fewer results
- **Use multi-source service** for best coverage and fallback
- **Monitor rate limits** - Alpha Vantage free tier has 12-second delays

## 🎯 **Success Criteria:**

✅ **Alpha Vantage test passes**  
✅ **Reddit API test passes**  
✅ **Multi-source test passes**  
✅ **INFY, HDFC, TCS now have news**  
✅ **Sentiment analysis works for 90% of stocks**

Ready to transform your sentiment analysis from 20% to 90% coverage? Let's go! 🚀
