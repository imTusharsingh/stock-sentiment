const axios = require("axios");

const BASE_URL = "http://localhost:5000";
const GRAPHQL_URL = "http://localhost:4000";

// Test configuration
const TEST_CONFIG = {
  timeout: 5000,
  retries: 3,
};

// Test utilities
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const retryRequest = async (requestFn, retries = TEST_CONFIG.retries) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await requestFn();
    } catch (error) {
      if (i === retries - 1) throw error;
      await wait(1000 * (i + 1)); // Exponential backoff
    }
  }
};

// Test functions
async function testHealthEndpoint() {
  console.log("🧪 Testing health endpoint...");

  try {
    const response = await retryRequest(() =>
      axios.get(`${BASE_URL}/health`, { timeout: TEST_CONFIG.timeout })
    );

    if (response.status === 200 && response.data.status === "OK") {
      console.log("✅ Health check passed:", response.data);
      return true;
    } else {
      console.error(
        "❌ Health check failed - unexpected response:",
        response.data
      );
      return false;
    }
  } catch (error) {
    console.error("❌ Health check failed:", error.message);
    return false;
  }
}

async function testGraphQLStockSuggestions() {
  console.log("\n🧪 Testing GraphQL stock suggestions...");

  try {
    const query = `
      query GetStockSuggestions($query: String!, $limit: Int!) {
        getStockSuggestions(query: $query, limit: $limit) {
          suggestions {
            ticker
            name
            exchange
            sector
          }
          totalCount
        }
      }
    `;

    const variables = {
      query: "RELIANCE",
      limit: 5,
    };

    const response = await retryRequest(() =>
      axios.post(
        GRAPHQL_URL,
        {
          query,
          variables,
        },
        {
          timeout: TEST_CONFIG.timeout,
          headers: { "Content-Type": "application/json" },
        }
      )
    );

    if (response.data.data?.getStockSuggestions) {
      const result = response.data.data.getStockSuggestions;
      console.log("✅ Stock suggestions query passed");
      console.log(`📊 Found ${result.totalCount} suggestions`);
      console.log("📋 First suggestion:", result.suggestions[0]);

      // Validate response structure
      if (
        result.suggestions.length > 0 &&
        result.suggestions[0].ticker &&
        result.suggestions[0].name
      ) {
        return true;
      } else {
        console.error("❌ Invalid response structure");
        return false;
      }
    } else {
      console.error("❌ Unexpected response format:", response.data);
      return false;
    }
  } catch (error) {
    console.error("❌ Stock suggestions query failed:", error.message);
    if (error.response) {
      console.error("Response data:", error.response.data);
    }
    return false;
  }
}

async function testGraphQLStockByTicker() {
  console.log("\n🧪 Testing get stock by ticker...");

  try {
    const query = `
      query GetStockByTicker($ticker: String!) {
        getStockByTicker(ticker: $ticker) {
          id
          ticker
          name
          exchange
          sector
          marketCap
          lastUpdated
        }
      }
    `;

    const variables = {
      ticker: "TCS",
    };

    const response = await retryRequest(() =>
      axios.post(
        GRAPHQL_URL,
        {
          query,
          variables,
        },
        {
          timeout: TEST_CONFIG.timeout,
          headers: { "Content-Type": "application/json" },
        }
      )
    );

    if (response.data.data?.getStockByTicker) {
      const stock = response.data.data.getStockByTicker;
      console.log("✅ Get stock by ticker query passed");
      console.log("📋 Stock details:", stock);

      // Validate stock data
      if (stock.ticker === "TCS" && stock.name && stock.exchange) {
        return true;
      } else {
        console.error("❌ Invalid stock data returned");
        return false;
      }
    } else {
      console.error("❌ Unexpected response format:", response.data);
      return false;
    }
  } catch (error) {
    console.error("❌ Get stock by ticker query failed:", error.message);
    if (error.response) {
      console.error("Response data:", error.response.data);
    }
    return false;
  }
}

async function testSearchFunctionality() {
  console.log("\n🧪 Testing search functionality...");

  try {
    // Test different search queries
    const testQueries = ["RELIANCE", "TCS", "HDFC", "BANK"];
    let passedTests = 0;

    for (const query of testQueries) {
      const graphqlQuery = `
        query GetStockSuggestions($query: String!, $limit: Int!) {
          getStockSuggestions(query: $query, limit: $limit) {
            suggestions {
              ticker
              name
              exchange
              sector
            }
            totalCount
          }
        }
      `;

      const response = await axios.post(
        GRAPHQL_URL,
        {
          query: graphqlQuery,
          variables: { query, limit: 3 },
        },
        { timeout: TEST_CONFIG.timeout }
      );

      if (response.data.data?.getStockSuggestions?.suggestions?.length > 0) {
        console.log(
          `✅ Search for "${query}" returned ${response.data.data.getStockSuggestions.totalCount} results`
        );
        passedTests++;
      } else {
        console.log(`⚠️  Search for "${query}" returned no results`);
      }

      await wait(200); // Small delay between requests
    }

    const successRate = (passedTests / testQueries.length) * 100;
    console.log(
      `📊 Search functionality: ${passedTests}/${testQueries.length} tests passed (${successRate}%)`
    );

    return successRate >= 75; // At least 75% success rate
  } catch (error) {
    console.error("❌ Search functionality test failed:", error.message);
    return false;
  }
}

// Main test runner
async function runAllTests() {
  console.log("🚀 Starting Stock Search Feature Tests...\n");
  console.log(`⏱️  Test timeout: ${TEST_CONFIG.timeout}ms`);
  console.log(`🔄 Retry attempts: ${TEST_CONFIG.retries}\n`);

  const tests = [
    { name: "Health Endpoint", fn: testHealthEndpoint },
    { name: "GraphQL Stock Suggestions", fn: testGraphQLStockSuggestions },
    { name: "GraphQL Stock by Ticker", fn: testGraphQLStockByTicker },
    { name: "Search Functionality", fn: testSearchFunctionality },
  ];

  let passedTests = 0;
  let totalTests = tests.length;

  for (const test of tests) {
    try {
      console.log(`\n${"=".repeat(50)}`);
      const result = await test.fn();

      if (result) {
        console.log(`✅ ${test.name}: PASSED`);
        passedTests++;
      } else {
        console.log(`❌ ${test.name}: FAILED`);
      }
    } catch (error) {
      console.error(`💥 ${test.name}: ERROR - ${error.message}`);
    }

    // Wait between tests
    await wait(1000);
  }

  // Final results
  console.log(`\n${"=".repeat(50)}`);
  console.log("📊 FINAL TEST RESULTS:");
  console.log(`✅ Passed: ${passedTests}/${totalTests}`);
  console.log(`❌ Failed: ${totalTests - passedTests}/${totalTests}`);
  console.log(
    `📈 Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`
  );

  if (passedTests === totalTests) {
    console.log("\n🎉 ALL TESTS PASSED! Feature 1 is working correctly.");
    console.log("🚀 Ready for Feature 2: Sentiment Analysis Processing");
  } else if (passedTests >= totalTests * 0.75) {
    console.log("\n⚠️  Most tests passed. Feature 1 is mostly working.");
    console.log("🔧 Check failed tests before proceeding.");
  } else {
    console.log("\n❌ Many tests failed. Feature 1 needs attention.");
    console.log("🔧 Fix issues before proceeding to Feature 2.");
  }

  return passedTests === totalTests;
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error("💥 Test runner crashed:", error);
      process.exit(1);
    });
}

module.exports = {
  testHealthEndpoint,
  testGraphQLStockSuggestions,
  testGraphQLStockByTicker,
  testSearchFunctionality,
  runAllTests,
};
