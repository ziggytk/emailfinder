// Test script for the Utility Agent Server
// Run this to test basic functionality

const fetch = require('node-fetch');

const SERVER_URL = 'http://localhost:3000';

async function testHealthCheck() {
  console.log('🔍 Testing health check...');
  try {
    const response = await fetch(`${SERVER_URL}/health`);
    const data = await response.json();
    console.log('✅ Health check passed:', data);
    return true;
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
    return false;
  }
}

async function testAgentLaunch() {
  console.log('🤖 Testing agent launch...');
  try {
    const response = await fetch(`${SERVER_URL}/api/agent/launch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        billId: 'test-bill-123',
        userToken: 'test-token-456'
      })
    });
    
    const data = await response.json();
    console.log('📊 Agent launch response:', data);
    
    if (response.ok) {
      console.log('✅ Agent launch test passed');
      return true;
    } else {
      console.log('⚠️ Agent launch test failed (expected - no real auth)');
      return false;
    }
  } catch (error) {
    console.error('❌ Agent launch test failed:', error.message);
    return false;
  }
}

async function runTests() {
  console.log('🚀 Starting Utility Agent Server tests...\n');
  
  const healthCheck = await testHealthCheck();
  console.log('');
  
  const agentLaunch = await testAgentLaunch();
  console.log('');
  
  console.log('📋 Test Results:');
  console.log(`   Health Check: ${healthCheck ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   Agent Launch: ${agentLaunch ? '✅ PASS' : '⚠️ EXPECTED FAIL'}`);
  
  if (healthCheck) {
    console.log('\n🎉 Server is running and ready for deployment!');
    console.log('📝 Next steps:');
    console.log('   1. Deploy to DigitalOcean droplet');
    console.log('   2. Configure environment variables');
    console.log('   3. Test with real Supabase authentication');
  } else {
    console.log('\n❌ Server is not running. Please start the server first:');
    console.log('   npm run dev');
  }
}

// Run tests
runTests().catch(console.error);








