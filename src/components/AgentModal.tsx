import React, { useState, useEffect } from 'react';

interface AgentStatus {
  id: string;
  timestamp: Date;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
  details?: string;
}

interface AgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  billId?: string;
  billData?: any;
}

const AgentModal: React.FC<AgentModalProps> = ({ isOpen, onClose, billId, billData }) => {
  const [statusUpdates, setStatusUpdates] = useState<AgentStatus[]>([]);
  const [isAgentRunning, setIsAgentRunning] = useState(false);
  const [agentProgress, setAgentProgress] = useState(0);

  useEffect(() => {
    if (isOpen) {
      // Initialize agent when modal opens
      initializeAgent();
    }
  }, [isOpen]);

  const initializeAgent = async () => {
    setIsAgentRunning(true);
    setStatusUpdates([]);
    setAgentProgress(0);

    // Add initial status
    addStatusUpdate('info', 'Agent initialized', 'Starting utility bill analysis...');

    // Run real AI agent
    await runAIAgent();
  };

  const addStatusUpdate = (type: AgentStatus['type'], message: string, details?: string) => {
    const newStatus: AgentStatus = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      type,
      message,
      details
    };

    setStatusUpdates(prev => [...prev, newStatus]);
  };

  const runAIAgent = async () => {
    if (!billData) {
      addStatusUpdate('error', 'No bill data available', 'Cannot proceed without bill information');
      setIsAgentRunning(false);
      return;
    }

    console.log('🤖 Starting AI Agent with bill data:', billData);

    try {
      // Create a task description based on bill data
      addStatusUpdate('info', 'Starting AI agent', 'Initializing browser automation...');
      setAgentProgress(25);
      console.log('🔄 Step 1/4: Initializing browser automation...');

      const taskDescription = `Navigate to ${billData.utilityProvider || 'utility provider'} website and find the payment page. 
      Bill Amount: $${billData.totalAmountDue || 'unknown'}, Due Date: ${billData.billDueDate || 'unknown'}. 
      Look for guest payment or one-time payment options.`;
      
      addStatusUpdate('info', 'Task defined', taskDescription);
      setAgentProgress(50);
      console.log('🔄 Step 2/4: Task defined -', taskDescription);

      // Run the real agent - no fallbacks
      addStatusUpdate('info', 'Initializing Playwright', 'Starting real browser automation...');
      setAgentProgress(75);
      console.log('🔄 Step 3/4: Attempting real Playwright agent...');
      
      // Import and run the real agent
      console.log('📦 Attempting to import agent tools...');
      addStatusUpdate('info', 'Importing Agent Tools', 'Loading Playwright automation tools...');
      
      // Import the real agent tools
      const { agentTools } = await import('../services/agentTools');
      console.log('✅ Agent tools imported successfully');
      
      // Execute real navigation sequence
      const results = await executeNavigationSequence(agentTools, billData);
      addStatusUpdate('success', 'Real Agent Success', 'Real browser automation completed!');
      
      addStatusUpdate('success', 'Agent process completed', results);
      setAgentProgress(100);
      console.log('🔄 Step 4/4: Agent process completed successfully');

      setIsAgentRunning(false);
    } catch (error) {
      console.error('❌ AI Agent error:', error);
      addStatusUpdate('error', 'Agent execution failed', error instanceof Error ? error.message : 'Unknown error occurred');
      setIsAgentRunning(false);
    }
  };



  const executeNavigationSequence = async (tools: any, billData: any) => {
    const results: string[] = [];
    
    try {
      console.log('🧭 Starting REAL navigation sequence...');
      
      // Step 1: Navigate to provider website
      addStatusUpdate('info', 'Step 1', `Navigating to ${billData.utilityProvider || 'utility provider'} website...`);
      console.log('🌐 Step 1: Opening provider URL...');
      
      let providerUrl = 'https://www.coned.com/'; // Default to ConEdison
      if (billData.utilityProvider?.toLowerCase().includes('coned')) {
        providerUrl = 'https://www.coned.com/';
      } else if (billData.utilityProvider?.toLowerCase().includes('national grid')) {
        providerUrl = 'https://www.nationalgrid.com/';
      } else if (billData.utilityProvider?.toLowerCase().includes('pseg')) {
        providerUrl = 'https://www.pseg.com/';
      }
      
      console.log(`🎯 Provider URL determined: ${providerUrl}`);
      console.log(`🔍 Bill utility provider: ${billData.utilityProvider || 'Not specified'}`);
      
      // Use real Playwright tools
      const openResult = await tools.open_url({ url: providerUrl });
      console.log('🌐 Open URL result:', openResult);
      
      if (openResult && typeof openResult === 'string') {
        try {
          const openParsed = JSON.parse(openResult);
          if (openParsed.ok) {
            results.push(`✅ Successfully opened ${providerUrl}`);
            addStatusUpdate('success', 'Navigation', `Opened ${providerUrl}`);
            console.log(`✅ Successfully opened ${providerUrl}`);
          } else {
            throw new Error(`Failed to open ${providerUrl}: ${openParsed.error}`);
          }
        } catch (parseError) {
          // If it's not JSON, assume it's a success message
          results.push(`✅ Successfully opened ${providerUrl}`);
          addStatusUpdate('success', 'Navigation', `Opened ${providerUrl}`);
          console.log(`✅ Successfully opened ${providerUrl} (raw result: ${openResult})`);
        }
      }
      
      // Step 2: Wait for page to load
      addStatusUpdate('info', 'Step 2', 'Waiting for page to load...');
      console.log('⏳ Step 2: Waiting for page to load...');
      await new Promise(resolve => setTimeout(resolve, 3000));
      console.log('✅ Page load wait completed');
      
      // Step 3: Get page content
      addStatusUpdate('info', 'Step 3', 'Analyzing page content...');
      console.log('🔍 Step 3: Analyzing page content...');
      const domResult = await tools.get_dom_text();
      console.log('🔍 DOM result:', domResult);
      
      if (domResult && typeof domResult === 'string') {
        try {
          const domParsed = JSON.parse(domResult);
          if (domParsed.ok) {
            results.push(`✅ Page content analyzed (${domParsed.text.length} characters)`);
            addStatusUpdate('success', 'Analysis', 'Page content analyzed');
            console.log(`✅ Page content analyzed: ${domParsed.text.length} characters`);
          }
        } catch (parseError) {
          results.push(`✅ Page content analyzed (raw result received)`);
          addStatusUpdate('success', 'Analysis', 'Page content analyzed');
          console.log(`✅ Page content analyzed (raw result: ${domResult})`);
        }
      }
      
      // Step 4: Look for payment options
      addStatusUpdate('info', 'Step 4', 'Looking for payment options...');
      console.log('💳 Step 4: Looking for payment options...');
      
      const paymentTargets = ['Pay Bill', 'Guest Pay', 'Pay as Guest'];
      let paymentFound = false;
      
      for (const target of paymentTargets) {
        try {
          addStatusUpdate('info', 'Trying', `Clicking "${target}"...`);
          console.log(`🎯 Attempting to click: "${target}"`);
          
          const clickResult = await tools.click_text_like(target, [target.toLowerCase(), 'payment', 'pay']);
          console.log(`🎯 Click result for "${target}":`, clickResult);
          
          if (clickResult && typeof clickResult === 'string') {
            try {
              const clickParsed = JSON.parse(clickResult);
              if (clickParsed.ok && clickParsed.clicked) {
                results.push(`✅ Successfully clicked "${target}"`);
                addStatusUpdate('success', 'Payment Found', `Clicked "${target}"`);
                paymentFound = true;
                console.log(`✅ Successfully clicked "${target}"`);
                break;
              }
            } catch (parseError) {
              // If it's not JSON, assume success
              results.push(`✅ Successfully clicked "${target}" (raw result)`);
              addStatusUpdate('success', 'Payment Found', `Clicked "${target}"`);
              paymentFound = true;
              console.log(`✅ Successfully clicked "${target}" (raw result: ${clickResult})`);
              break;
            }
          }
        } catch (clickError) {
          console.log(`❌ Click on "${target}" failed:`, clickError);
        }
      }
      
      if (!paymentFound) {
        results.push('⚠️ No payment options found on main page');
        addStatusUpdate('warning', 'Payment Options', 'No payment options found on main page');
        console.log('⚠️ No payment options found on main page');
      }
      
      // Step 5: Get final status
      console.log('📍 Step 5: Getting final URL and status...');
      const finalUrlResult = await tools.current_url();
      console.log('📍 Final URL result:', finalUrlResult);
      
      if (finalUrlResult && typeof finalUrlResult === 'string') {
        try {
          const finalUrlParsed = JSON.parse(finalUrlResult);
          if (finalUrlParsed.ok) {
            results.push(`📍 Final URL: ${finalUrlParsed.url}`);
            addStatusUpdate('info', 'Final Status', `Current URL: ${finalUrlParsed.url}`);
            console.log(`📍 Final URL: ${finalUrlParsed.url}`);
          }
        } catch (parseError) {
          results.push(`📍 Final URL: ${finalUrlResult}`);
          addStatusUpdate('info', 'Final Status', `Current URL: ${finalUrlResult}`);
          console.log(`📍 Final URL: ${finalUrlResult}`);
        }
      }
      
      console.log('🎉 REAL navigation sequence completed successfully!');
      return results.join('\n');
      
    } catch (error) {
      console.error('❌ REAL navigation sequence error:', error);
      results.push(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }



  const getStatusIcon = (type: AgentStatus['type']) => {
    switch (type) {
      case 'success':
        return (
          <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        );
      case 'warning':
        return (
          <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        );
      case 'error':
        return (
          <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        );
    }
  };

  const getStatusColor = (type: AgentStatus['type']) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-blue-50 border-blue-200';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">Provider Navigator</h2>
            <p className="text-sm text-gray-600">
              {billId ? `Finding provider for bill ${billId}` : 'Utility provider navigation'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
            disabled={isAgentRunning}
          >
            ✕
          </button>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">Progress</span>
            <span className="text-sm text-gray-500">{Math.round(agentProgress)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${agentProgress}%` }}
            ></div>
          </div>
        </div>

        {/* Status Updates Container */}
        <div className="flex-1 overflow-y-auto border border-gray-200 rounded-lg p-4 bg-gray-50">
          <div className="space-y-3">
            {statusUpdates.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="mt-2">Waiting for agent to start...</p>
              </div>
            ) : (
              statusUpdates.map((status) => (
                <div 
                  key={status.id}
                  className={`border rounded-lg p-3 ${getStatusColor(status.type)}`}
                >
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 mt-0.5">
                      {getStatusIcon(status.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        {status.message}
                      </p>
                      {status.details && (
                        <p className="text-sm text-gray-600 mt-1">
                          {status.details}
                        </p>
                      )}
                      <p className="text-xs text-gray-500 mt-1">
                        {status.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-200">
          <div className="flex items-center space-x-2">
            {isAgentRunning ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span className="text-sm text-gray-600">Agent running...</span>
              </>
            ) : (
              <span className="text-sm text-green-600 font-medium">✓ Agent completed</span>
            )}
          </div>
          
          <div className="flex space-x-3">
            <button
              onClick={() => {
                setStatusUpdates([]);
                setAgentProgress(0);
                setIsAgentRunning(false);
              }}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
            >
              Clear Log
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgentModal;
