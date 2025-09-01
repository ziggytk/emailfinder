// Test script for Phase 2: DOM text extraction on ConEdison homepage
import { PlaywrightAgent } from './src/services/playwrightAgent.ts';

async function testConEdisonExtraction() {
  const agent = new PlaywrightAgent();
  
  try {
    console.log('🧪 Testing Phase 2: DOM Text Extraction on ConEdison...');
    
    // Initialize browser
    await agent.initialize();
    
    // Test 1: Open ConEdison homepage
    console.log('\n📋 Test 1: Opening ConEdison homepage...');
    const result1 = await agent.openUrl('https://www.coned.com/');
    console.log('Navigation result:', result1);
    
    // Wait a bit for page to fully load
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Test 2: Get current URL
    console.log('\n📋 Test 2: Getting current URL...');
    const result2 = await agent.getCurrentUrl();
    console.log('Current URL:', result2);
    
    // Test 3: Enhanced DOM text extraction
    console.log('\n📋 Test 3: Enhanced DOM text extraction...');
    const result3 = await agent.getDomText();
    
    // Parse and display results
    const parsed = JSON.parse(result3);
    if (parsed.ok) {
      console.log(`✅ Found ${parsed.count} clickable elements`);
      console.log('\n📋 All clickable text elements:');
      parsed.links.forEach((text, index) => {
        console.log(`  ${index + 1}. "${text}"`);
      });
      
      console.log('\n🔍 Detailed element analysis:');
      parsed.elements.slice(0, 10).forEach((el, index) => {
        console.log(`  ${index + 1}. "${el.text}"`);
        console.log(`     Type: ${el.tagName}${el.role ? ` (role: ${el.role})` : ''}`);
        console.log(`     Href: ${el.href || 'none'}`);
        console.log(`     Position: (${el.position.x}, ${el.position.y})`);
        console.log(`     Size: ${el.position.width}x${el.position.height}`);
        console.log('');
      });
    } else {
      console.error('❌ DOM extraction failed:', parsed.error);
    }
    
    console.log('\n✅ Phase 2 test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    // Clean up
    await agent.cleanup();
  }
}

// Run the test
testConEdisonExtraction();
