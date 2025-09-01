// Test script for Phase 4: URL-based Navigation Detection
import { PlaywrightAgent } from './src/services/playwrightAgent.ts';

async function testUrlNavigation() {
  const agent = new PlaywrightAgent();
  
  try {
    console.log('🧪 Testing Phase 4: URL-based Navigation Detection...');
    
    // Initialize browser
    await agent.initialize();
    
    // Test 1: Direct URL navigation (should detect URL change)
    console.log('\n📋 Test 1: Direct URL navigation (Google to GitHub)...');
    const result1 = await agent.openUrl('https://www.google.com/');
    console.log('Google result:', result1);
    
    // Wait for initial navigation
    await agent.waitForNavigation();
    
    // Navigate to different site (should detect URL change)
    console.log('\n📋 Test 1b: Navigating to GitHub (should detect URL change)...');
    const result2 = await agent.openUrl('https://github.com/');
    console.log('GitHub result:', result2);
    
    // Wait for navigation - this should detect URL change
    console.log('\n⏳ Waiting for navigation (should detect URL change)...');
    const navResult1 = await agent.waitForNavigation();
    console.log('Navigation detection result:', navResult1);
    
    // Test 2: Internal navigation on GitHub (should detect URL change)
    console.log('\n📋 Test 2: Internal navigation on GitHub...');
    const result3 = await agent.clickTextLike('About', ['about', 'company']);
    console.log('GitHub About click result:', result3);
    
    // Wait for navigation - this should detect URL change
    console.log('\n⏳ Waiting for navigation after About click...');
    const navResult2 = await agent.waitForNavigation();
    console.log('Navigation detection result:', navResult2);
    
    // Test 3: Navigate back to GitHub home (should detect URL change)
    console.log('\n📋 Test 3: Navigate back to GitHub home...');
    const result4 = await agent.clickTextLike('GitHub', ['github', 'home']);
    console.log('GitHub home click result:', result4);
    
    // Wait for navigation
    console.log('\n⏳ Waiting for navigation after home click...');
    const navResult3 = await agent.waitForNavigation();
    console.log('Navigation detection result:', navResult3);
    
    // Test 4: Navigate to a different domain (should detect URL change)
    console.log('\n📋 Test 4: Navigate to different domain (GitHub to Stack Overflow)...');
    const result5 = await agent.openUrl('https://stackoverflow.com/');
    console.log('Stack Overflow result:', result5);
    
    // Wait for navigation
    console.log('\n⏳ Waiting for navigation to Stack Overflow...');
    const navResult4 = await agent.waitForNavigation();
    console.log('Navigation detection result:', navResult4);
    
    console.log('\n✅ Phase 4 URL navigation test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    // Clean up
    await agent.cleanup();
  }
}

// Run the test
testUrlNavigation();
