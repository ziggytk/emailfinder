// Test script for Phase 3: Priority-based semantic clicking
import { PlaywrightAgent } from './src/services/playwrightAgent.ts';

async function testPriorityClick() {
  const agent = new PlaywrightAgent();
  
  try {
    console.log('🧪 Testing Phase 3: Priority-based Semantic Clicking on ConEdison...');
    
    // Initialize browser
    await agent.initialize();
    
    // Test 1: Open ConEdison homepage
    console.log('\n📋 Test 1: Opening ConEdison homepage...');
    const result1 = await agent.openUrl('https://www.coned.com/');
    console.log('Navigation result:', result1);
    
    // Wait for page to fully load
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Test 2: Try to click "My Account" first (priority target)
    console.log('\n📋 Test 2: Clicking "My Account" (priority target)...');
    const result2 = await agent.clickTextLike('My Account', [
      'my account',
      'account',
      'login',
      'sign in'
    ]);
    console.log('My Account click result:', result2);
    
    // Wait for navigation
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Test 3: Get current URL after My Account click
    console.log('\n📋 Test 3: Getting current URL after My Account click...');
    const result3 = await agent.getCurrentUrl();
    console.log('Current URL after My Account click:', result3);
    
    // Test 4: If we're on an account page, try to find "Pay Bill"
    const parsedUrl = JSON.parse(result3);
    if (parsedUrl.ok && (parsedUrl.url.includes('account') || parsedUrl.url.includes('login'))) {
      console.log('\n📋 Test 4: Looking for "Pay Bill" on account page...');
      const result4 = await agent.clickTextLike('Pay Bill', [
        'pay bill',
        'pay my bill',
        'payment',
        'billing',
        'pay online'
      ]);
      console.log('Pay Bill click result:', result4);
      
      // Wait and check URL again
      await new Promise(resolve => setTimeout(resolve, 3000));
      const result5 = await agent.getCurrentUrl();
      console.log('Final URL:', result5);
    } else {
      console.log('\n📋 Test 4: Not on account page, trying "Pay Bill" from homepage...');
      const result4 = await agent.clickTextLike('Pay Bill', [
        'pay bill',
        'pay my bill',
        'payment',
        'billing',
        'pay online'
      ]);
      console.log('Pay Bill click result:', result4);
      
      // Wait and check URL
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
testPriorityClick();
