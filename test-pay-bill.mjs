// Focused test for clicking "Pay Bill" on ConEdison
import { PlaywrightAgent } from './src/services/playwrightAgent.ts';

async function testPayBillClick() {
  const agent = new PlaywrightAgent();
  
  try {
    console.log('🧪 Testing "Pay Bill" click specifically...');
    
    // Initialize browser
    await agent.initialize();
    
    // Open ConEdison homepage
    console.log('\n📋 Opening ConEdison homepage...');
    await agent.openUrl('https://www.coned.com/');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // First, let's see what elements are available
    console.log('\n📋 Getting all clickable elements...');
    const domResult = await agent.getDomText();
    const parsed = JSON.parse(domResult);
    
    if (parsed.ok) {
      console.log('\n🔍 Looking for payment-related elements:');
      parsed.elements.forEach((el, index) => {
        if (el.text.toLowerCase().includes('pay') || 
            el.text.toLowerCase().includes('bill') || 
            el.text.toLowerCase().includes('payment')) {
          console.log(`  ${index + 1}. "${el.text}" (${el.tagName}) - ${el.href || 'no href'}`);
        }
      });
    }
    
    // Try clicking "Pay Bill" with more specific targeting
    console.log('\n📋 Attempting to click "Pay Bill"...');
    const result = await agent.clickTextLike('Pay Bill', [
      'pay bill',
      'pay my bill',
      'payment',
      'billing'
    ]);
    console.log('Click result:', result);
    
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
testPayBillClick();
