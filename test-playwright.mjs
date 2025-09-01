// Simple test script to verify Playwright Phase 1 is working
import { PlaywrightAgent } from './src/services/playwrightAgent.ts';

async function testPlaywright() {
  const agent = new PlaywrightAgent();
  
  try {
    console.log('🧪 Testing Playwright Phase 1...');
    
    // Initialize browser
    await agent.initialize();
    
    // Test 1: Open a simple website
    console.log('\n📋 Test 1: Opening a website...');
    const result1 = await agent.openUrl('https://www.google.com');
    console.log('Result:', result1);
    
    // Test 2: Get current URL
    console.log('\n📋 Test 2: Getting current URL...');
    const result2 = await agent.getCurrentUrl();
    console.log('Result:', result2);
    
    // Test 3: Get DOM text
    console.log('\n📋 Test 3: Getting DOM text...');
    const result3 = await agent.getDomText();
    console.log('Result:', result3);
    
    console.log('\n✅ All Phase 1 tests completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    // Clean up
    await agent.cleanup();
  }
}

// Run the test
testPlaywright();
