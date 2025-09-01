// Simple test to verify scoring algorithm
import { PlaywrightAgent } from './src/services/playwrightAgent.ts';

async function testSimpleClick() {
  const agent = new PlaywrightAgent();
  
  try {
    console.log('🧪 Simple test for scoring algorithm...');
    
    // Initialize browser
    await agent.initialize();
    
    // Open ConEdison homepage
    console.log('\n📋 Opening ConEdison homepage...');
    await agent.openUrl('https://www.coned.com/');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Test with exact match
    console.log('\n📋 Testing exact "Pay Bill" match...');
    const result = await agent.clickTextLike('Pay Bill', []);
    console.log('Result:', result);
    
    // Wait and check URL
    await new Promise(resolve => setTimeout(resolve, 3000));
    const urlResult = await agent.getCurrentUrl();
    console.log('URL after click:', urlResult);
    
    console.log('\n✅ Test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await agent.cleanup();
  }
}

// Run the test
testSimpleClick();
