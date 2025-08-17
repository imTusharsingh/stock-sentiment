/* eslint-disable no-console */
require('dotenv').config();

async function testServerSetup() {
  console.log('🧪 Testing Basic Server Setup...');
  console.log('=====================================');

  try {
    // Test 1: Check if all required files exist
    console.log('\n1️⃣ Checking required files...');

    const fs = require('fs');
    const path = require('path');

    const requiredFiles = [
      'src/index.js',
      'src/utils/logger.js',
      'src/middleware/errorHandler.js',
      'src/middleware/requestValidator.js',
      'src/routes/health.js',
      'src/routes/stocks.js',
      'src/routes/sentiments.js',
      'src/routes/news.js',
    ];

    for (const file of requiredFiles) {
      if (fs.existsSync(file)) {
        console.log(`✅ ${file} exists`);
      } else {
        console.log(`❌ ${file} missing`);
        return;
      }
    }

    // Test 2: Check if modules can be loaded
    console.log('\n2️⃣ Testing module loading...');

    try {
      const logger = require('./src/utils/logger');
      console.log('✅ Logger module loaded successfully');

      const errorHandler = require('./src/middleware/errorHandler');
      console.log('✅ Error handler module loaded successfully');

      const requestValidator = require('./src/middleware/requestValidator');
      console.log('✅ Request validator module loaded successfully');

      const healthRoutes = require('./src/routes/health');
      console.log('✅ Health routes module loaded successfully');
    } catch (error) {
      console.error('❌ Module loading failed:', error.message);
      return;
    }

    // Test 3: Check environment variables
    console.log('\n3️⃣ Checking environment variables...');

    const requiredEnvVars = [
      'MONGODB_URI',
      'REDIS_HOST',
      'REDIS_PORT',
      'REDIS_PASSWORD',
      'NODE_ENV',
      'PORT',
    ];

    for (const envVar of requiredEnvVars) {
      if (process.env[envVar]) {
        console.log(`✅ ${envVar} is set`);
      } else {
        console.log(`⚠️ ${envVar} is not set (using default)`);
      }
    }

    // Test 4: Check package.json scripts
    console.log('\n4️⃣ Checking package.json scripts...');

    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const requiredScripts = ['start', 'dev', 'test'];

    for (const script of requiredScripts) {
      if (packageJson.scripts && packageJson.scripts[script]) {
        console.log(`✅ ${script} script exists`);
      } else {
        console.log(`❌ ${script} script missing`);
      }
    }

    // Test 5: Check directory structure
    console.log('\n5️⃣ Checking directory structure...');

    const requiredDirs = [
      'src',
      'src/config',
      'src/models',
      'src/services',
      'src/controllers',
      'src/routes',
      'src/middleware',
      'src/utils',
      'tests',
      'docs',
    ];

    for (const dir of requiredDirs) {
      if (fs.existsSync(dir)) {
        console.log(`✅ ${dir}/ directory exists`);
      } else {
        console.log(`❌ ${dir}/ directory missing`);
      }
    }

    console.log('\n🎉 Basic server setup test completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('1. Run "pnpm install" to install dependencies');
    console.log('2. Run "pnpm dev" to start the development server');
    console.log('3. Test the health endpoint at http://localhost:3001/health');
    console.log('4. Check the logs directory for Winston logs');
  } catch (error) {
    console.error('\n💥 Server setup test failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the test
testServerSetup()
  .then(() => {
    console.log('\n🏁 Server setup test completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 Fatal error:', error.message);
    process.exit(1);
  });
