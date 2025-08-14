const axios = require("axios");

const BASE_URL = "http://localhost:5000";
const GRAPHQL_ENDPOINT = `${BASE_URL}/graphql`;

console.log("🚀 Starting Stock Price Integration Feature Tests...\n");

async function testHealthEndpoint() {
  console.log("🧪 Testing health endpoint...");
  try {
    const response = await axios.get(`${BASE_URL}/health`);
    if (response.data === "OK") {
      console.log("✅ Health check passed:", response.data);
      return true;
    } else {
      console.log("❌ Health check failed:", response.data);
      return false;
    }
  } catch (error) {
    console.log("❌ Health check failed:", error.message);
    return false;
  }
}

async function testGetStockPrice() {
  console.log("\n🧪 Testing getStockPrice query...");
  try {
    const response = await axios.post(GRAPHQL_ENDPOINT, {
      query: `
        query GetStockPrice($ticker: String!, $period: String!) {
          getStockPrice(ticker: $ticker, period: $period) {
            ticker
            period
            data {
              date
              open
              high
              low
              close
              volume
              dailyReturn
            }
            summary {
              currentPrice
              startPrice
              totalReturn
              highestPrice
              lowestPrice
              daysAnalyzed
            }
            lastUpdated
          }
        }
      `,
      variables: {
        ticker: "RELIANCE.NS",
        period: "1mo",
      },
    });

    if (response.data.data?.getStockPrice) {
      const priceData = response.data.data.getStockPrice;
      console.log("✅ GetStockPrice query passed");
      console.log(`📊 Stock: ${priceData.ticker}`);
      console.log(`📅 Period: ${priceData.period}`);
      console.log(`💰 Current Price: ₹${priceData.summary.currentPrice}`);
      console.log(
        `📈 Total Return: ${priceData.summary.totalReturn.toFixed(2)}%`
      );
      console.log(`📊 Data Points: ${priceData.data.length} days`);
      return true;
    } else {
      console.log("❌ GetStockPrice query failed:", response.data);
      return false;
    }
  } catch (error) {
    console.log("❌ GetStockPrice query failed:", error.message);
    if (error.response?.data) {
      console.log("Error details:", error.response.data);
    }
    return false;
  }
}

async function testGetPriceTrend() {
  console.log("\n🧪 Testing getPriceTrend query...");
  try {
    const response = await axios.post(GRAPHQL_ENDPOINT, {
      query: `
        query GetPriceTrend($ticker: String!, $dateRange: DateRangeInput) {
          getPriceTrend(ticker: $ticker, dateRange: $dateRange) {
            ticker
            period
            data {
              date
              open
              high
              low
              close
              volume
              dailyReturn
            }
            summary {
              currentPrice
              startPrice
              totalReturn
              highestPrice
              lowestPrice
              daysAnalyzed
            }
            lastUpdated
          }
        }
      `,
      variables: {
        ticker: "TCS.NS",
        dateRange: {
          from: "2024-01-01",
          to: "2024-01-31",
        },
      },
    });

    if (response.data.data?.getPriceTrend) {
      const priceTrend = response.data.data.getPriceTrend;
      console.log("✅ GetPriceTrend query passed");
      console.log(`📊 Stock: ${priceTrend.ticker}`);
      console.log(`📅 Period: ${priceTrend.period}`);
      console.log(`💰 Current Price: ₹${priceTrend.summary.currentPrice}`);
      console.log(
        `📈 Total Return: ${priceTrend.summary.totalReturn.toFixed(2)}%`
      );
      console.log(`📊 Data Points: ${priceTrend.data.length} days`);
      return true;
    } else {
      console.log("❌ GetPriceTrend query failed:", response.data);
      return false;
    }
  } catch (error) {
    console.log("❌ GetPriceTrend query failed:", error.message);
    return false;
  }
}

async function testErrorHandling() {
  console.log("\n🧪 Testing error handling...");
  try {
    const response = await axios.post(GRAPHQL_ENDPOINT, {
      query: `
        query GetStockPrice($ticker: String!) {
          getStockPrice(ticker: $ticker) {
            ticker
            summary {
              currentPrice
            }
          }
        }
      `,
      variables: {
        ticker: "INVALID_TICKER_123",
      },
    });

    if (response.data.errors) {
      console.log("✅ Error handling working correctly");
      console.log(`❌ Expected error: ${response.data.errors[0].message}`);
      return true;
    } else {
      console.log(
        "❌ Error handling failed - should have returned error for invalid ticker"
      );
      return false;
    }
  } catch (error) {
    console.log("❌ Error handling test failed:", error.message);
    return false;
  }
}

async function testPriceDataStructure() {
  console.log("\n🧪 Testing price data structure...");
  try {
    const response = await axios.post(GRAPHQL_ENDPOINT, {
      query: `
        query GetStockPrice($ticker: String!) {
          getStockPrice(ticker: "RELIANCE.NS") {
            ticker
            period
            data {
              date
              open
              high
              low
              close
              volume
              dailyReturn
            }
            summary {
              currentPrice
              startPrice
              totalReturn
              highestPrice
              lowestPrice
              daysAnalyzed
            }
            lastUpdated
          }
        }
      `,
      variables: {},
    });

    if (response.data.data?.getStockPrice) {
      const priceData = response.data.data.getStockPrice;

      // Validate data structure
      const isValid =
        priceData.ticker &&
        priceData.period &&
        Array.isArray(priceData.data) &&
        priceData.data.length > 0 &&
        priceData.summary &&
        priceData.summary.currentPrice > 0 &&
        priceData.lastUpdated;

      if (isValid) {
        console.log("✅ Price data structure is valid");
        console.log(
          `📊 Sample data point: ${JSON.stringify(priceData.data[0], null, 2)}`
        );
        return true;
      } else {
        console.log("❌ Price data structure validation failed");
        return false;
      }
    } else {
      console.log("❌ Price data structure test failed:", response.data);
      return false;
    }
  } catch (error) {
    console.log("❌ Price data structure test failed:", error.message);
    return false;
  }
}

async function runAllTests() {
  const tests = [
    { name: "Health Endpoint", test: testHealthEndpoint },
    { name: "Get Stock Price", test: testGetStockPrice },
    { name: "Get Price Trend", test: testGetPriceTrend },
    { name: "Error Handling", test: testErrorHandling },
    { name: "Price Data Structure", test: testPriceDataStructure },
  ];

  let passed = 0;
  let failed = 0;

  for (const testCase of tests) {
    try {
      const result = await testCase.test();
      if (result) {
        passed++;
      } else {
        failed++;
      }
    } catch (error) {
      console.log(`❌ ${testCase.name} test crashed:`, error.message);
      failed++;
    }
  }

  console.log("\n📊 Test Results:");
  console.log(`✅ Passed: ${passed}/${tests.length}`);
  console.log(`❌ Failed: ${failed}/${tests.length}`);

  if (failed === 0) {
    console.log(
      "\n🎉 All tests passed! Stock Price Integration feature is working correctly."
    );
    console.log("\n🚀 Next steps:");
    console.log("1. Test the frontend integration");
    console.log("2. Move to Feature 4: Visualization Dashboard");
    console.log("3. Add price charts to the sentiment dashboard");
  } else {
    console.log(
      "\n⚠️  Some tests failed. Check the errors above and fix them."
    );
  }
}

// Run all tests
runAllTests().catch(console.error);
