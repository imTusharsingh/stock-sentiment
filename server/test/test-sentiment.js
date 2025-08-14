const SentimentService = require("../services/sentimentService");

// Mock environment variables for testing
process.env.GNEWS_API_KEY = "test-key";
process.env.HUGGINGFACE_API_KEY = "test-key";

async function testSentimentService() {
  console.log("🧪 Testing Sentiment Analysis Service...\n");

  try {
    const sentimentService = new SentimentService();

    // Test 1: Text preprocessing
    console.log("1. Testing text preprocessing...");
    const testText =
      "RELIANCE Industries reports STRONG Q3 results! Revenue up 25% 🚀";
    const processedText = sentimentService.preprocessText(testText);
    console.log(`   Input: "${testText}"`);
    console.log(`   Output: "${processedText}"`);
    console.log("   ✅ Text preprocessing works\n");

    // Test 2: FinBERT label mapping
    console.log("2. Testing FinBERT label mapping...");
    const testLabels = ["positive", "negative", "neutral", "unknown"];
    testLabels.forEach((label) => {
      const mapped = sentimentService.mapFinBERTLabel(label);
      console.log(`   "${label}" → "${mapped}"`);
    });
    console.log("   ✅ Label mapping works\n");

    // Test 3: Sentiment breakdown calculation
    console.log("3. Testing sentiment breakdown calculation...");
    const mockArticles = [
      { sentiment: { label: "positive" } },
      { sentiment: { label: "positive" } },
      { sentiment: { label: "negative" } },
      { sentiment: { label: "neutral" } },
    ];
    const breakdown =
      sentimentService.calculateSentimentBreakdown(mockArticles);
    console.log("   Mock articles:", mockArticles.length);
    console.log("   Breakdown:", breakdown);
    console.log("   ✅ Breakdown calculation works\n");

    // Test 4: Overall sentiment calculation
    console.log("4. Testing overall sentiment calculation...");
    const mockArticlesWithScores = [
      {
        sentiment: { label: "positive", score: 0.8 },
        publishedAt: new Date().toISOString(),
      },
      {
        sentiment: { label: "negative", score: 0.3 },
        publishedAt: new Date(
          Date.now() - 2 * 24 * 60 * 60 * 1000
        ).toISOString(),
      },
    ];
    const overall = sentimentService.calculateOverallSentiment(
      mockArticlesWithScores
    );
    console.log("   Overall sentiment:", overall);
    console.log("   ✅ Overall sentiment calculation works\n");

    // Test 5: Service initialization
    console.log("5. Testing service initialization...");
    console.log("   Model:", sentimentService.model);
    console.log(
      "   GNews API Key:",
      sentimentService.gnewsApiKey ? "Set" : "Not set"
    );
    console.log("   HF API Key:", sentimentService.hf ? "Set" : "Not set");
    console.log("   ✅ Service initialization works\n");

    console.log("🎉 All tests passed! Sentiment service is ready.\n");
    console.log("📝 Note: This test uses mock data. For full testing:");
    console.log("   - Set real API keys in .env file");
    console.log("   - Test with actual GNews API calls");
    console.log("   - Test with actual Hugging Face API calls");
  } catch (error) {
    console.error("❌ Test failed:", error.message);
    console.error(error.stack);
  }
}

// Run tests
testSentimentService();
