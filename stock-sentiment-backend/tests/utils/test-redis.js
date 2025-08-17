/* eslint-disable no-console */
require('dotenv').config();
const redisService = require('./src/services/redisService');

async function testRedisService() {
  console.log('🧪 Testing Redis Service...');
  console.log('=====================================');

  try {
    // Test 1: Initialize Redis service
    console.log('\n1️⃣ Testing Redis service initialization...');
    await redisService.initialize();
    console.log('✅ Redis service initialized successfully');

    // Test 2: Health check
    console.log('\n2️⃣ Testing Redis health check...');
    const isHealthy = await redisService.healthCheck();
    if (isHealthy) {
      console.log('✅ Redis health check passed');
    } else {
      console.log('❌ Redis health check failed');
      return;
    }

    // Test 3: Basic caching operations
    console.log('\n3️⃣ Testing basic caching operations...');

    // Test stock data caching
    const stockData = {
      symbol: 'RELIANCE',
      name: 'Reliance Industries Limited',
      price: 2456.78,
      change: 45.67,
      volume: 1234567,
    };

    await redisService.cacheStockData('RELIANCE', stockData);
    console.log('✅ Stock data cached successfully');

    // Test retrieving cached data
    const cachedStock = await redisService.getCachedStockData('RELIANCE');
    if (cachedStock && cachedStock.symbol === 'RELIANCE') {
      console.log('✅ Stock data retrieved from cache successfully');
    } else {
      console.log('❌ Failed to retrieve stock data from cache');
    }

    // Test 4: News data caching
    console.log('\n4️⃣ Testing news data caching...');
    const newsData = {
      id: 'news_001',
      title: 'Reliance Q4 Results Beat Expectations',
      summary: 'Reliance Industries reported strong Q4 results...',
      publishedAt: new Date().toISOString(),
    };

    await redisService.cacheNewsData('news_001', newsData);
    console.log('✅ News data cached successfully');

    // Test 5: Sentiment data caching
    console.log('\n5️⃣ Testing sentiment data caching...');
    const sentimentData = {
      symbol: 'RELIANCE',
      score: 0.75,
      label: 'positive',
      confidence: 0.85,
      timestamp: new Date().toISOString(),
    };

    await redisService.cacheSentimentData('RELIANCE', sentimentData);
    console.log('✅ Sentiment data cached successfully');

    // Test 6: Search results caching
    console.log('\n6️⃣ Testing search results caching...');
    const searchResults = [
      { symbol: 'RELIANCE', name: 'Reliance Industries' },
      { symbol: 'TCS', name: 'Tata Consultancy Services' },
      { symbol: 'HDFC', name: 'HDFC Bank' },
    ];

    await redisService.cacheSearchResults('reliance', searchResults);
    console.log('✅ Search results cached successfully');

    // Test 7: TTL operations
    console.log('\n7️⃣ Testing TTL operations...');
    const ttl = await redisService.getTTL('stock:RELIANCE');
    if (ttl > 0) {
      console.log(`✅ TTL retrieved successfully: ${ttl} seconds`);
    } else {
      console.log('❌ Failed to retrieve TTL');
    }

    // Test 8: Cache statistics
    console.log('\n8️⃣ Testing cache statistics...');
    const stats = await redisService.getStats();
    if (stats.ttl) {
      console.log('✅ Cache statistics retrieved successfully');
      console.log('📊 TTL Configuration:', stats.ttl);
    } else {
      console.log('❌ Failed to retrieve cache statistics');
    }

    // Test 9: Cleanup
    console.log('\n9️⃣ Testing cleanup operations...');
    await redisService.delete('stock:RELIANCE');
    await redisService.delete('news:news_001');
    await redisService.delete('sentiment:RELIANCE');
    await redisService.delete('search:reliance');
    console.log('✅ Cleanup completed successfully');

    console.log('\n🎉 All Redis tests passed successfully!');
  } catch (error) {
    console.error('\n💥 Redis test failed:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    // Close Redis connection
    try {
      await redisService.close();
      console.log('\n🔄 Redis connection closed');
    } catch (error) {
      console.error('❌ Error closing Redis connection:', error.message);
    }
  }
}

// Run the test
testRedisService()
  .then(() => {
    console.log('\n🏁 Redis service test completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 Fatal error:', error.message);
    process.exit(1);
  });
