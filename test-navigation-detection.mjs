// Test script for Phase 4: Navigation Detection
import { PlaywrightAgent } from './src/services/playwrightAgent.ts';

async function testNavigationDetection() {
  const agent = new PlaywrightAgent();
  
  try {
    console.log('🧪 Testing Phase 4: Navigation Detection...');
    
    // Initialize browser
    await agent.initialize();
    
    // Test 1: Basic navigation detection on Google
    console.log('\n📋 Test 1: Basic navigation detection on Google...');
    const result1 = await agent.openUrl('https://www.google.com/');
    console.log('Google navigation result:', result1);
    
    // Wait for navigation
    console.log('\n⏳ Waiting for navigation after Google load...');
    const navResult1 = await agent.waitForNavigation();
    console.log('Navigation detection result:', navResult1);
    
    // Test 2: URL change navigation (Google to another site)
    console.log('\n📋 Test 2: URL change navigation (Google to GitHub)...');
    const result2 = await agent.openUrl('https://github.com/');
    console.log('GitHub navigation result:', result2);
    
    // Wait for navigation
    console.log('\n⏳ Waiting for navigation after GitHub load...');
    const navResult2 = await agent.waitForNavigation();
    console.log('Navigation detection result:', navResult2);
    
    // Test 3: SPA navigation (GitHub internal navigation)
    console.log('\n📋 Test 3: SPA navigation (GitHub internal navigation)...');
    const result3 = await agent.clickTextLike('About', ['about', 'company']);
    console.log('GitHub About click result:', result3);
    
    // Wait for navigation
    console.log('\n⏳ Waiting for navigation after About click...');
    const navResult3 = await agent.waitForNavigation();
    console.log('Navigation detection result:', navResult3);
    
    // Test 4: ConEdison navigation (utility site)
    console.log('\n📋 Test 4: ConEdison navigation (utility site)...');
    const result4 = await agent.openUrl('https://www.coned.com/');
    console.log('ConEdison navigation result:', result4);
    
    // Wait for navigation
    console.log('\n⏳ Waiting for navigation after ConEdison load...');
    const navResult4 = await agent.waitForNavigation();
    console.log('Navigation detection result:', navResult4);
    
    // Test 5: Click navigation on ConEdison
    console.log('\n📋 Test 5: Click navigation on ConEdison...');
    const result5 = await agent.clickTextLike('My Account', ['my account', 'account', 'login']);
    console.log('ConEdison My Account click result:', result5);
    
    // Wait for navigation
    console.log('\n⏳ Waiting for navigation after My Account click...');
    const navResult5 = await agent.waitForNavigation();
    console.log('Navigation detection result:', navResult5);
    
    // Test 6: Timeout handling (try to navigate to a slow site)
    console.log('\n📋 Test 6: Timeout handling (slow site)...');
    const result6 = await agent.openUrl('https://httpstat.us/200?sleep=3000');
    console.log('Slow site navigation result:', result6);
    
    // Wait for navigation with timeout
    console.log('\n⏳ Waiting for navigation on slow site...');
    const navResult6 = await agent.waitForNavigation();
    console.log('Navigation detection result:', navResult6);
    
    console.log('\n✅ Phase 4 navigation detection test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    // Clean up
    await agent.cleanup();
  }
}

// Run the test
testNavigationDetection();
