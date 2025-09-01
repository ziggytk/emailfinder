// Test script for Phase 4: Navigation Detection with Delays
import { PlaywrightAgent } from './src/services/playwrightAgent.ts';

async function testNavigationWithDelay() {
  const agent = new PlaywrightAgent();
  
  try {
    console.log('🧪 Testing Phase 4: Navigation Detection with Delays...');
    
    // Initialize browser
    await agent.initialize();
    
    // Test 1: Navigate to Google and wait
    console.log('\n📋 Test 1: Navigate to Google...');
    const result1 = await agent.openUrl('https://www.google.com/');
    console.log('Google result:', result1);
    
    // Wait for initial load
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test 2: Navigate to GitHub (should detect URL change)
    console.log('\n📋 Test 2: Navigate to GitHub (should detect URL change)...');
    const result2 = await agent.openUrl('https://github.com/');
    console.log('GitHub result:', result2);
    
    // Wait for navigation detection
    console.log('\n⏳ Waiting for navigation detection...');
    const navResult1 = await agent.waitForNavigation();
    console.log('Navigation detection result:', navResult1);
    
    // Test 3: Navigate to a simple site (should detect URL change)
    console.log('\n📋 Test 3: Navigate to a simple site...');
    const result3 = await agent.openUrl('https://example.com/');
    console.log('Example.com result:', result3);
    
    // Wait for navigation detection
    console.log('\n⏳ Waiting for navigation detection...');
    const navResult2 = await agent.waitForNavigation();
    console.log('Navigation detection result:', navResult2);
    
    // Test 4: Navigate back to GitHub (should detect URL change)
    console.log('\n📋 Test 4: Navigate back to GitHub...');
    const result4 = await agent.openUrl('https://github.com/');
    console.log('GitHub result:', result4);
    
    // Wait for navigation detection
    console.log('\n⏳ Waiting for navigation detection...');
    const navResult3 = await agent.waitForNavigation();
    console.log('Navigation detection result:', navResult3);
    
    console.log('\n✅ Phase 4 navigation with delay test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    // Clean up
    await agent.cleanup();
  }
}

// Run the test
testNavigationWithDelay();
