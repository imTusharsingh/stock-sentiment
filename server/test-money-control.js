require("dotenv").config();

async function testMoneyControl() {
  console.log("🧪 Testing MoneyControl News Service for Indian Stocks...\n");

  try {
    const MoneyControlNewsService = require("./services/moneyControlNewsService");
    const moneyControlService = new MoneyControlNewsService();

    // Test service availability
    const isAvailable = await moneyControlService.isAvailable();
    if (!isAvailable) {
      console.log("❌ MoneyControl service not available");
      console.log("💡 This might be due to network issues or website changes");
      return;
    }

    console.log("✅ MoneyControl service is available");

    const status = moneyControlService.getStatus();
    console.log("\n📊 Service Status:");
    console.log(`   Name: ${status.name}`);
    console.log(`   Available: ${status.available}`);
    console.log(`   Rate Limit: ${status.rateLimit}`);
    console.log(`   Coverage: ${status.coverage}`);
    console.log(`   Features: ${status.features.join(", ")}`);

    // Test with Indian stocks
    const testStocks = ["RELIANCE", "TCS", "HDFC", "INFY", "WIPRO"];

    for (const stock of testStocks) {
      console.log(`\n🔍 Testing ${stock}...`);
      console.log("─".repeat(50));

      try {
        const startTime = Date.now();
        const articles = await moneyControlService.fetchNews(stock, null, 5);
        const endTime = Date.now();
        const duration = endTime - startTime;

        console.log(`   ⏱️  Duration: ${duration}ms`);

        if (articles && articles.length > 0) {
          console.log(`   ✅ Found ${articles.length} articles`);

          // Show first article details
          const firstArticle = articles[0];
          console.log(`   📰 Sample Article:`);
          console.log(`      Title: ${firstArticle.title}`);
          console.log(`      Source: ${firstArticle.source}`);
          console.log(`      Published: ${firstArticle.publishedAt}`);
          console.log(
            `      Sentiment: ${
              firstArticle.sentiment?.label
            } (${firstArticle.sentiment?.score?.toFixed(3)})`
          );
          console.log(`      URL: ${firstArticle.url}`);
        } else {
          console.log(`   ⚠️  No articles found for ${stock}`);
        }
      } catch (error) {
        console.log(`   ❌ Error fetching news for ${stock}: ${error.message}`);
      }

      // Add delay between tests to be respectful
      if (stock !== testStocks[testStocks.length - 1]) {
        console.log("   ⏳ Waiting 3 seconds...");
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }
    }

    console.log("\n🎉 MoneyControl test completed!");
    console.log("\n💡 Expected Results for Indian Stocks:");
    console.log("   • RELIANCE: Should find company news and market updates");
    console.log("   • TCS: Should find IT sector news and results");
    console.log("   • HDFC: Should find banking and financial news");
    console.log("   • INFY: Should find IT sector news and announcements");
    console.log("   • WIPRO: Should find IT sector news and results");
  } catch (error) {
    console.error("❌ Test failed:", error.message);
    console.error("Stack trace:", error.stack);
  }
}

testMoneyControl().catch(console.error);
