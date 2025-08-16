require("dotenv").config();
const { ApolloServer } = require("@apollo/server");
const { startStandaloneServer } = require("@apollo/server/standalone");
const typeDefs = require("./graphql/schema");
const resolvers = require("./graphql/resolvers");

/**
 * Test script for GraphQL resolvers
 * Tests the new stockDataInterface integration
 */
async function testGraphQLResolvers() {
  console.log("🧪 Testing GraphQL Resolvers...\n");

  try {
    // Create Apollo Server
    const server = new ApolloServer({
      typeDefs,
      resolvers,
    });

    // Start standalone server
    const { url } = await startStandaloneServer(server, {
      listen: { port: 5001 }, // Use different port to avoid conflicts
    });

    console.log(`🚀 GraphQL server running at ${url}`);

    // Test 1: Health check
    console.log("\n1️⃣ Testing health check...");
    const healthResult = await server.executeOperation({
      query: "{ health }",
    });
    console.log("   Health result:", healthResult.body.singleResult.data);

    // Test 2: Stock suggestions
    console.log("\n2️⃣ Testing stock suggestions...");
    const suggestionsResult = await server.executeOperation({
      query:
        '{ getStockSuggestions(query: "RELIANCE", limit: 3) { suggestions { ticker name exchange sector } totalCount query searchTime } }',
    });
    console.log(
      "   Suggestions result:",
      suggestionsResult.body.singleResult.data
    );

    // Test 3: Stock details
    console.log("\n3️⃣ Testing stock details...");
    const detailsResult = await server.executeOperation({
      query:
        '{ getStockDetails(ticker: "RELIANCE") { ticker name exchange sector isin faceValue } }',
    });
    console.log("   Details result:", detailsResult.body.singleResult.data);

    // Test 4: Stock data status
    console.log("\n4️⃣ Testing stock data status...");
    const statusResult = await server.executeOperation({
      query:
        "{ getStockDataStatus { isInitialized dataSource lastSync nextSync } }",
    });
    console.log("   Status result:", statusResult.body.singleResult.data);

    // Test 5: Sync stock data
    console.log("\n5️⃣ Testing sync stock data...");
    const syncResult = await server.executeOperation({
      query:
        "{ syncStockData(forceSync: false) { success message lastSync nextSync } }",
    });
    console.log("   Sync result:", syncResult.body.singleResult.data);

    console.log("\n✅ All GraphQL tests completed successfully!");

    // Stop the server
    await server.stop();
    console.log("🛑 GraphQL server stopped");
  } catch (error) {
    console.error("❌ GraphQL test failed:", error);
  }
}

// Run the test
testGraphQLResolvers();
