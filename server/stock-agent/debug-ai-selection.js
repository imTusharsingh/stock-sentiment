require("dotenv").config();
const ProductionNSEService = require("./src/services/ProductionNSEService");

async function debugAISelection() {
  console.log("🔍 Debugging AI Selection and URL Updates...");

  try {
    // Initialize the service
    const service = new ProductionNSEService();
    console.log("✅ Service initialized\n");

    // Step 1: Check initial state
    console.log("📋 Step 1: Initial discovered URLs (before AI):");
    const initialUrls = service.urlDiscovery.getDiscoveryStatus();
    console.log(`   Discovered URLs: ${initialUrls.discoveredCount}`);
    console.log(
      `   Last Discovery: ${initialUrls.lastDiscovery ? new Date(initialUrls.lastDiscovery).toISOString() : "Never"}\n`
    );

    // Step 2: Trigger URL discovery
    console.log("🔍 Step 2: Triggering URL discovery...");
    const discoveryResult = await service.urlDiscovery.getUrls(true);
    console.log(
      `   Discovery Result: ${discoveryResult.success ? "Success" : "Failed"}`
    );
    console.log(`   Source: ${discoveryResult.source}`);
    if (discoveryResult.error) {
      console.log(`   Error: ${discoveryResult.error}`);
    }
    console.log("");

    // Step 3: Check discovered URLs
    console.log("📋 Step 3: Discovered URLs after discovery:");
    const finalUrls = service.urlDiscovery.getDiscoveryStatus();
    for (const [key, url] of Object.entries(finalUrls.discoveredUrls)) {
      console.log(`   ${key}: ${url}`);
    }
    console.log("");

    // Step 4: Check AI recommendations
    console.log("🧠 Step 4: AI Recommendations:");
    const aiResults = service.urlDiscovery.getAIRecommendations();
    console.log(`   Total Discovered: ${aiResults.totalDiscovered}`);
    console.log(`   Must Use: ${aiResults.recommendations.mustUse.length}`);
    console.log(`   Should Use: ${aiResults.recommendations.shouldUse.length}`);
    console.log(`   Maybe Use: ${aiResults.recommendations.maybeUse.length}`);
    console.log(`   Skip: ${aiResults.recommendations.skip.length}`);
    console.log("");

    // Step 5: Verify EQUITY_L.csv is selected
    console.log("🎯 Step 5: Equity endpoint verification:");
    const equityUrl = finalUrls.discoveredUrls.equity;
    if (equityUrl && equityUrl.includes("EQUITY_L.csv")) {
      console.log("   ✅ EQUITY_L.csv correctly selected for equity endpoint!");
    } else {
      console.log("   ❌ EQUITY_L.csv NOT selected for equity endpoint");
      console.log(`   Current equity URL: ${equityUrl}`);
    }
    console.log("");

    // Step 6: Test CSV download capability
    console.log("📥 Step 6: Testing CSV download capability...");
    try {
      // Get the equity endpoint object from the service
      const equityEndpoint = service.endpoints.equity;
      if (equityEndpoint) {
        const testResult = await service.downloadCSV(equityEndpoint);
        console.log(`   Download Result: Success`);
        console.log(
          `   Data Length: ${testResult ? testResult.length : 0} characters`
        );
        if (testResult && testResult.length > 100) {
          console.log(`   Sample Data: ${testResult.substring(0, 100)}...`);
        }
      } else {
        console.log(`   Download Test Failed: Equity endpoint not found`);
      }
    } catch (error) {
      console.log(`   Download Test Failed: ${error.message}`);
    }

    console.log("\n🎉 Debug session completed successfully!");
    console.log("\n📝 NOTE: New listings functionality removed for now.");
    console.log(
      "   FUTURE IMPROVEMENT: Add new listings crawling once NSE bot protection is better understood."
    );
  } catch (error) {
    console.error("❌ Debug session failed:", error.message);
    console.error(error.stack);
  }
}

// Run the debug function
debugAISelection().catch(console.error);
