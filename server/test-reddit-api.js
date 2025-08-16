require("dotenv").config();

async function testRedditAPI() {
  console.log("🧪 Testing Reddit API Integration...\n");

  // Check if API credentials are available
  if (!process.env.REDDIT_CLIENT_ID || !process.env.REDDIT_CLIENT_SECRET) {
    console.log("❌ Reddit API credentials not found in environment variables");
    console.log("💡 Get your Reddit API credentials:");
    console.log("   1. Go to https://www.reddit.com/prefs/apps");
    console.log('   2. Click "Create App" or "Create Another App"');
    console.log('   3. Choose "script" as the app type');
    console.log("   4. Add your credentials to .env file:");
    console.log("      REDDIT_CLIENT_ID=your-client-id");
    console.log("      REDDIT_CLIENT_SECRET=your-client-secret");
    return;
  }

  console.log("✅ Reddit API credentials found");

  try {
    const RedditNewsService = require("./services/redditNewsService");
    const redditService = new RedditNewsService();

    // Test service availability
    const isAvailable = await redditService.isAvailable();
    if (!isAvailable) {
      console.log("❌ Reddit service not available");
      return;
    }

    console.log("✅ Reddit service is available");

    // Test status
    const status = redditService.getStatus();
    console.log("\n📊 Service Status:");
    console.log(`   Name: ${status.name}`);
    console.log(`   Available: ${status.available}`);
    console.log(`   Rate Limit: ${status.rateLimit}`);
    console.log(`   Coverage: ${status.coverage}`);
    console.log(`   Features: ${status.features.join(", ")}`);
    console.log(`   Subreddits: ${status.subreddits.join(", ")}`);

    // Test discussion search
    console.log('\n🔍 Testing discussion search for "AAPL"...');
    const discussions = await redditService.searchDiscussions("AAPL", 5);

    if (discussions && discussions.length > 0) {
      console.log(`✅ Found ${discussions.length} discussions`);

      // Show first discussion details
      const firstDiscussion = discussions[0];
      console.log("\n💬 Sample Discussion:");
      console.log(`   Title: ${firstDiscussion.title}`);
      console.log(`   Subreddit: r/${firstDiscussion.subreddit}`);
      console.log(`   Score: ${firstDiscussion.score}`);
      console.log(`   Upvote Ratio: ${firstDiscussion.upvoteRatio}`);
      console.log(`   Comments: ${firstDiscussion.numComments}`);
      console.log(
        `   Sentiment: ${
          firstDiscussion.sentiment.label
        } (${firstDiscussion.sentiment.score.toFixed(3)})`
      );
      console.log(`   URL: ${firstDiscussion.url}`);

      console.log("\n🎯 Reddit API is ready to use!");
      console.log("💡 Next steps:");
      console.log("   1. Integrate with your multi-source news service");
      console.log("   2. Test with various stock tickers");
      console.log("   3. Enjoy community sentiment insights!");
    } else {
      console.log("⚠️ No discussions found");
      console.log("   This might be due to:");
      console.log("   - Rate limiting");
      console.log("   - No recent discussions for this ticker");
      console.log("   - API authentication issues");
    }
  } catch (error) {
    console.error("❌ Test failed:", error.message);

    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Data:`, error.response.data);
    }
  }
}

testRedditAPI().catch(console.error);
