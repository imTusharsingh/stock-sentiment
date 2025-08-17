# 🧪 **Testing Structure**

This directory contains all testing-related files for the Stock Sentiment Backend service.

## **Directory Structure**

```
tests/
├── unit/           # Unit tests for individual components
├── integration/    # Integration tests for component interactions
└── utils/          # Test utilities and debugging scripts
```

## **Test Files**

### **Utils (Development/Debugging)**

- `test-redis.js` - Redis service testing script
- `test-server.js` - Server setup testing script

### **Unit Tests** (Coming Soon)

- Database models testing
- Service layer testing
- Middleware testing
- Utility function testing

### **Integration Tests** (Coming Soon)

- API endpoint testing
- Database integration testing
- Redis integration testing
- Full workflow testing

## **Running Tests**

### **Development Scripts**

```bash
# Test Redis connection
node tests/utils/test-redis.js

# Test server setup
node tests/utils/test-server.js
```

### **Unit Tests** (Future)

```bash
pnpm test          # Run all tests
pnpm test:watch    # Run tests in watch mode
pnpm test:coverage # Run tests with coverage
```

## **Test Configuration**

- **Jest** for unit and integration testing
- **Supertest** for API testing
- **MongoDB Memory Server** for database testing
- **Redis Mock** for cache testing

## **Notes**

- Utils tests are for development/debugging only
- Unit and integration tests will be added in Phase 2+
- Test files in utils/ are not part of production builds
