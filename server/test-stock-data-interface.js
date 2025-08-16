require("dotenv").config();
const stockDataInterface = require("./services/stockDataInterface");

/**
 * Test script for the new StockDataInterface
 * This tests the decoupled interface without direct stock-agent dependencies
 */
async function testStockDataInterface() {
  console.log("🧪 Testing Stock Data Interface...\n");

  try {
    // Test 1: Initialize
    console.log("1️⃣ Testing initialization...");
    const initResult = await stockDataInterface.initialize();
    console.log("   Result:", initResult);
    console.log("");

    // Test 2: Get status
    console.log("2️⃣ Testing status...");
    const status = stockDataInterface.getStatus();
    console.log("   Status:", status);
    console.log("");

    // Test 3: Search stocks
    console.log("3️⃣ Testing stock search...");
    const searchResult = await stockDataInterface.searchStocks("RELIANCE", 5);
    console.log("   Search result:", searchResult);
    console.log("");

    // Test 4: Get stock details
    console.log("4️⃣ Testing stock details...");
    const detailsResult = await stockDataInterface.getStockDetails("RELIANCE");
    console.log("   Details result:", detailsResult);
    console.log("");

    // Test 5: Sync data (if external source available)
    console.log("5️⃣ Testing data sync...");
    const syncResult = await stockDataInterface.syncStockData(false);
    console.log("   Sync result:", syncResult);
    console.log("");

    console.log("✅ All tests completed successfully!");
    console.log("\n📊 Final Status:", stockDataInterface.getStatus());
  } catch (error) {
    console.error("❌ Test failed:", error);
  }
}

// Run the test
testStockDataInterface();
