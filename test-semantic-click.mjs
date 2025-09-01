// Test script for Phase 3: Semantic click matching on ConEdison
import { PlaywrightAgent } from './src/services/playwrightAgent.ts';

async function testSemanticClick() {
  const agent = new PlaywrightAgent();
  
  try {
    console.log('🧪 Testing Phase 3: Semantic Click Matching on ConEdison...');
    
    // Initialize browser
    await agent.initialize();
    
    // Test 1: Open ConEdison homepage
    console.log('\n📋 Test 1: Opening ConEdison homepage...');
    const result1 = await agent.openUrl('https://www.coned.com/');
    console.log('Navigation result:', result1);
    
    // Wait for page to fully load
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Test 2: Try to click "Pay Bill" with synonyms
    console.log('\n📋 Test 2: Clicking "Pay Bill" with synonyms...');
    const result2 = await agent.clickTextLike('Pay Bill', [
      'pay bill',
      'pay my bill',
      'payment',
      'billing',
      'pay online'
    ]);
    console.log('Click result:', result2);
    
    // Wait for navigation
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Test 3: Get current URL after click
    console.log('\n📋 Test 3: Getting current URL after click...');
    const result3 = await agent.getCurrentUrl();
    console.log('Current URL after click:', result3);
    
    // Test 4: Try to click "Guest Pay" if we're on a payment page
    const parsedUrl = JSON.parse(result3);
    if (parsedUrl.ok && parsedUrl.url.includes('pay')) {
      console.log('\n📋 Test 4: Attempting to find Guest Pay option...');
      const result4 = await agent.clickTextLike('Guest Pay', [
        'guest payment',
        'one-time payment',
        'pay without logging in',
        'pay as guest',
        'make a payment'
      ]);
      console.log('Guest Pay click result:', result4);
      
      // Wait and check URL again
      await new Promise(resolve => setTimeout(resolve, 3000));
      const result5 = await agent.getCurrentUrl();
      console.log('Final URL:', result5);
    }
    
    console.log('\n✅ Phase 3 test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    // Clean up
    await agent.cleanup();
  }
}

// Run the test
testSemanticClick();
