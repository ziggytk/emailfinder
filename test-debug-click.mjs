// Debug test for understanding click element detection
import { PlaywrightAgent } from './src/services/playwrightAgent.ts';

async function testDebugClick() {
  const agent = new PlaywrightAgent();
  
  try {
    console.log('🧪 Debug test for click element detection...');
    
    // Initialize browser
    await agent.initialize();
    
    // Open ConEdison homepage
    console.log('\n📋 Opening ConEdison homepage...');
    await agent.openUrl('https://www.coned.com/');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Try clicking with a very simple approach
    console.log('\n📋 Trying to click "Pay Bill" directly...');
    
    // Use a simpler selector approach
    const result = await agent.page.evaluate(() => {
      const payBillElements = Array.from(document.querySelectorAll('a, button')).filter(el => {
        const text = el.textContent?.trim() || '';
        return text.toLowerCase().includes('pay bill');
      });
      
      console.log('Found Pay Bill elements:', payBillElements.length);
      payBillElements.forEach((el, i) => {
        console.log(`  ${i + 1}. "${el.textContent?.trim()}" (${el.tagName})`);
      });
      
      return payBillElements.map(el => ({
        text: el.textContent?.trim() || '',
        tagName: el.tagName.toLowerCase(),
        href: el.getAttribute('href') || ''
      }));
    });
    
    console.log('Pay Bill elements found:', result);
    
    console.log('\n✅ Debug test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await agent.cleanup();
  }
}

// Run the test
testDebugClick();
