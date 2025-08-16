require("dotenv").config();
const NSECrawlerService = require("./src/services/NSECrawlerService");

async function testCrawlerService() {
  console.log("🧪 Testing NSECrawlerService (CSV URL Crawling Only)...\n");

  try {
    // Initialize the crawler service
    const crawler = new NSECrawlerService();
    console.log("✅ Crawler service initialized\n");

    // Test 1: Check service status
    console.log("📊 Test 1: Service Status");
    const status = crawler.getStatus();
    console.log(`   CSV Crawling Available: ${status.csvCrawlingAvailable}`);
    console.log(`   URLs: ${Object.keys(status.urls).length} configured`);
    console.log(`   User Agent: ${status.userAgent.substring(0, 50)}...\n`);

    // Test 2: Test CSV URL crawling
    console.log("🔍 Test 2: CSV URL Crawling");
    const csvResult = await crawler.crawlCSVUrls();
    console.log(`   Success: ${csvResult.success}`);
    console.log(`   Method: ${csvResult.method}`);
    console.log(`   Total Found: ${csvResult.totalFound}`);
    if (csvResult.success && csvResult.csvUrls.length > 0) {
      console.log(`   Sample URLs:`);
      csvResult.csvUrls.slice(0, 5).forEach((url, i) => {
        console.log(`     ${i + 1}. ${url}`);
      });
      if (csvResult.csvUrls.length > 5) {
        console.log(`     ... and ${csvResult.csvUrls.length - 5} more`);
      }
    } else {
      console.log(`   Error: ${csvResult.error}`);
    }
    console.log("");

    console.log("🎉 All tests completed!");
    console.log("\n📝 NOTE: New listings functionality removed for now.");
    console.log("   FUTURE IMPROVEMENT: Add new listings crawling once NSE bot protection is better understood.");

  } catch (error) {
    console.error("❌ Test failed:", error.message);
    console.error(error.stack);
  }
}

// Run the test
testCrawlerService().catch(console.error);
