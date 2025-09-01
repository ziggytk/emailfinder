// Test script for Phase 5: OpenAI Integration
import { openaiResponsesService } from './src/services/openaiResponsesService.ts';

async function testOpenAIIntegration() {
  try {
    console.log('🧪 Testing Phase 5: OpenAI Integration...');
    
    // Test 1: Basic conversation
    console.log('\n📋 Test 1: Basic conversation...');
    const result1 = await openaiResponsesService.startConversation(
      'Navigate to https://www.google.com and search for "OpenAI"',
      (update) => {
        console.log('🔄 Update:', update);
      }
    );
    
    console.log('✅ Conversation result:', result1);
    
    // Test 2: Utility provider navigation
    console.log('\n📋 Test 2: Utility provider navigation...');
    const result2 = await openaiResponsesService.startConversation(
      'Navigate to ConEdison website and find the guest payment page',
      (update) => {
        console.log('🔄 Update:', update);
      }
    );
    
    console.log('✅ Utility navigation result:', result2);
    
    console.log('\n✅ Phase 5 OpenAI integration test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testOpenAIIntegration();
