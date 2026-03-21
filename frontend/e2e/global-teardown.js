// global-teardown.js
async function globalTeardown(config) {
  console.log('🧹 Cleaning up E2E test environment...')
  
  // Clean up test data, close connections, etc.
  
  console.log('✅ E2E test environment cleaned up')
}

module.exports = globalTeardown
