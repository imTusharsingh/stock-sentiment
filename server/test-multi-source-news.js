require("dotenv").config();

async function testMultiSourceNews() {
  console.log("🧪 Testing Multi-Source News Service...\n");

  try {
    const MultiSourceNewsService = require("./services/multiSourceNewsService");
    const multiSourceService = new MultiSourceNewsService();

    // Test service availability
    const isAvailable = await multiSourceService.isAvailable();
    if (!isAvailable) {
      console.log("❌ Multi-source service not available");
      console.log("💡 Make sure you have at least one news source configured:");
      console.log("   - MoneyControl (Indian stocks)");
      console.log("   - Reddit API credentials");
      return;
    }

    console.log("✅ Multi-source service is available");

    // Test status
    const status = await multiSourceService.getStatus();
    console.log("\n📊 Service Status:");
    console.log(`   Name: ${status.name}`);
    console.log(`   Total Sources: ${status.totalSources}`);
    console.log(`   Overall Status: ${status.overallStatus}`);

    console.log("\n🔍 Available Sources:");
    Object.entries(status.sources).forEach(([sourceName, sourceStatus]) => {
      console.log(`   ${sourceName}:`);
      console.log(`     Available: ${sourceStatus.available}`);
      console.log(`     Rate Limit: ${sourceStatus.rateLimit || "N/A"}`);
      console.log(`     Coverage: ${sourceStatus.coverage || "N/A"}`);
      if (sourceStatus.error) {
        console.log(`     Error: ${sourceStatus.error}`);
      }
    });

    // Test news fetching for Indian stocks
    const testTickers = ["RELIANCE", "TCS", "HDFC", "INFY", "WIPRO"];

    for (const ticker of testTickers) {
      console.log(`\n🔍 Testing news for ${ticker}...`);

      try {
        const newsResult = await multiSourceService.fetchNews(ticker, null, 10);

        if (newsResult.articles.length > 0) {
          console.log(`   ✅ Found ${newsResult.articles.length} articles`);
          console.log(
            `   📰 Sources: ${Object.keys(newsResult.sources).join(", ")}`
          );

          // Show first article details
          const firstArticle = newsResult.articles[0];
          console.log(
            `   📝 Sample: ${firstArticle.title.substring(0, 60)}...`
          );
          console.log(`      Source: ${firstArticle.source}`);
          console.log(
            `      Sentiment: ${firstArticle.sentiment?.label || "N/A"}`
          );
        } else {
          console.log(`   ⚠️ No articles found`);
          console.log(`   📊 Source results:`, newsResult.sources);
        }
      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
      }

      // Add delay between tests
      if (ticker !== testTickers[testTickers.length - 1]) {
        console.log("   ⏳ Waiting 2 seconds...");
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    // Test sentiment analysis
    console.log("\n🎯 Testing sentiment analysis for RELIANCE...");
    try {
      const sentimentResult = await multiSourceService.getSentiment("RELIANCE");

      if (sentimentResult.totalArticles > 0) {
        console.log(`   ✅ Sentiment analysis successful`);
        console.log(
          `   📊 Overall: ${
            sentimentResult.overallSentiment.label
          } (${sentimentResult.overallSentiment.score.toFixed(3)})`
        );
        console.log(
          `   📈 Breakdown: +${sentimentResult.sentimentBreakdown.positivePercentage.toFixed(
            1
          )}% / -${sentimentResult.sentimentBreakdown.negativePercentage.toFixed(
            1
          )}% / ~${sentimentResult.sentimentBreakdown.neutralPercentage.toFixed(
            1
          )}%`
        );
        console.log(`   📰 Articles: ${sentimentResult.totalArticles}`);
        console.log(`   📝 Message: ${sentimentResult.message}`);
      } else {
        console.log(`   ⚠️ No sentiment data available`);
        console.log(`   📝 Message: ${sentimentResult.message}`);
      }
    } catch (error) {
      console.log(`   ❌ Sentiment analysis failed: ${error.message}`);
    }

    console.log("\n🎉 Multi-source news service test completed!");
    console.log("\n💡 Next steps:");
    console.log("   1. Integrate with your sentiment service");
    console.log("   2. Replace GNews API calls");
    console.log("   3. Test with various stock tickers");
    console.log("   4. Enjoy better news coverage!");
  } catch (error) {
    console.error("❌ Test failed:", error.message);
    console.error("Stack trace:", error.stack);
  }
}

testMultiSourceNews().catch(console.error);
