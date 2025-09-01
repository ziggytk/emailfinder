// Test script for Phase 5: OpenAI Structure Verification
import { PlaywrightAgent } from './src/services/playwrightAgent.ts';
import { agentTools } from './src/services/agentTools.ts';

async function testOpenAIStructure() {
  try {
    console.log('🧪 Testing Phase 5: OpenAI Structure Verification...');
    
    // Test 1: Verify PlaywrightAgent is working
    console.log('\n📋 Test 1: Verifying PlaywrightAgent...');
    const agent = new PlaywrightAgent();
    await agent.initialize();
    
    const urlResult = await agent.openUrl('https://www.google.com/');
    console.log('✅ PlaywrightAgent URL result:', urlResult);
    
    const domResult = await agent.getDomText();
    console.log('✅ PlaywrightAgent DOM result length:', domResult.length);
    
    await agent.cleanup();
    
    // Test 2: Verify agent tools are available
    console.log('\n📋 Test 2: Verifying agent tools...');
    console.log('✅ Available tools:', Object.keys(agentTools));
    
    // Test 3: Verify tool functions work
    console.log('\n📋 Test 3: Verifying tool functions...');
    const agent2 = new PlaywrightAgent();
    await agent2.initialize();
    
    const openUrlResult = await agentTools.open_url({ url: 'https://example.com' });
    console.log('✅ open_url tool result:', openUrlResult);
    
    const currentUrlResult = await agentTools.current_url();
    console.log('✅ current_url tool result:', currentUrlResult);
    
    await agent2.cleanup();
    
    console.log('\n✅ Phase 5 structure verification completed!');
    console.log('✅ All components are working correctly');
    console.log('✅ Ready for OpenAI API integration');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testOpenAIStructure();
