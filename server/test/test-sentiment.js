const axios = require("axios");

const BASE_URL = "http://localhost:5000";
const GRAPHQL_ENDPOINT = `${BASE_URL}/graphql`;

console.log("🚀 Starting Sentiment Analysis Feature Tests...\n");

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

async function testSentimentAnalysis() {
  console.log("\n🧪 Testing sentiment analysis...");
  try {
    const response = await axios.post(GRAPHQL_ENDPOINT, {
      query: `
        query GetSentiment($ticker: String!) {
          getSentiment(ticker: $ticker) {
            ticker
            overallSentiment {
              label
              score
              confidence
            }
            articles {
              title
              description
              url
              publishedAt
              source
              sentiment {
                label
                score
                confidence
              }
            }
            totalArticles
            sentimentBreakdown {
              positive
              negative
              neutral
              positivePercentage
              negativePercentage
              neutralPercentage
            }
            lastUpdated
          }
        }
      `,
      variables: {
        ticker: "RELIANCE",
      },
    });

    if (response.data.data?.getSentiment) {
      const sentiment = response.data.data.getSentiment;
      console.log("✅ Sentiment analysis query passed");
      console.log(`📊 Stock: ${sentiment.ticker}`);
      console.log(`🎯 Overall Sentiment: ${sentiment.overallSentiment.label} (${(sentiment.overallSentiment.score * 100).toFixed(1)}%)`);
      console.log(`📰 Articles found: ${sentiment.totalArticles}`);
      console.log(`📈 Sentiment breakdown: ${sentiment.sentimentBreakdown.positive} positive, ${sentiment.sentimentBreakdown.negative} negative, ${sentiment.sentimentBreakdown.neutral} neutral`);
      return true;
    } else {
      console.log("❌ Sentiment analysis query failed:", response.data);
      return false;
    }
  } catch (error) {
    console.log("❌ Sentiment analysis query failed:", error.message);
    if (error.response?.data) {
      console.log("Error details:", error.response.data);
    }
    return false;
  }
}

async function testSentimentHistory() {
  console.log("\n🧪 Testing sentiment history...");
  try {
    const response = await axios.post(GRAPHQL_ENDPOINT, {
      query: `
        query GetSentimentHistory($ticker: String!, $days: Int!) {
          getSentimentHistory(ticker: $ticker, days: $days) {
            ticker
            overallSentiment {
              label
              score
              confidence
            }
            lastUpdated
          }
        }
      `,
      variables: {
        ticker: "TCS",
        days: 7,
      },
    });

    if (response.data.data?.getSentimentHistory) {
      const history = response.data.data.getSentimentHistory;
      console.log("✅ Sentiment history query passed");
      console.log(`📊 Found ${history.length} sentiment records for TCS`);
      return true;
    } else {
      console.log("❌ Sentiment history query failed:", response.data);
      return false;
    }
  } catch (error) {
    console.log("❌ Sentiment history query failed:", error.message);
    return false;
  }
}

async function testErrorHandling() {
  console.log("\n🧪 Testing error handling...");
  try {
    const response = await axios.post(GRAPHQL_ENDPOINT, {
      query: `
        query GetSentiment($ticker: String!) {
          getSentiment(ticker: $ticker) {
            ticker
            overallSentiment {
              label
              score
              confidence
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
      console.log("❌ Error handling failed - should have returned error for invalid ticker");
      return false;
    }
  } catch (error) {
    console.log("❌ Error handling test failed:", error.message);
    return false;
  }
}

async function runAllTests() {
  const tests = [
    { name: "Health Endpoint", test: testHealthEndpoint },
    { name: "Sentiment Analysis", test: testSentimentAnalysis },
    { name: "Sentiment History", test: testSentimentHistory },
    { name: "Error Handling", test: testErrorHandling },
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
    console.log("\n🎉 All tests passed! Sentiment Analysis feature is working correctly.");
    console.log("\n🚀 Next steps:");
    console.log("1. Set up your API keys in server/.env file");
    console.log("2. Test with real stocks in the frontend");
    console.log("3. Move to Feature 3: Stock Price Integration");
  } else {
    console.log("\n⚠️  Some tests failed. Check the errors above and fix them.");
  }
}

// Run all tests
runAllTests().catch(console.error);
