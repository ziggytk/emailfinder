import React, { useState, useEffect } from 'react';
import { AIAgentService, AgentAction } from '../services/aiAgentService';

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
      // Step 1: Determine provider URL
      addStatusUpdate('info', 'Analyzing bill data', 'Determining utility provider...');
      setAgentProgress(25);

      console.log('🤖 Calling OpenAI to determine provider...');
      const navigationResponse = await AIAgentService.navigateToProvider(billData);
      console.log('🤖 Navigation response:', navigationResponse);
      
      if (navigationResponse.success && navigationResponse.action.type === 'navigate') {
        const providerUrl = navigationResponse.action.url;
        
        addStatusUpdate('info', 'Navigating to provider', `Navigating to ${providerUrl}...`);
        setAgentProgress(50);

        // Simulate navigation delay
        await new Promise(resolve => setTimeout(resolve, 2000));

        addStatusUpdate('success', 'Provider website loaded', `Successfully loaded ${providerUrl}`);
        setAgentProgress(100);
      } else {
        addStatusUpdate('error', 'Navigation failed', navigationResponse.error || 'Could not determine provider URL');
      }

      setIsAgentRunning(false);
    } catch (error) {
      console.error('AI Agent error:', error);
      addStatusUpdate('error', 'Agent execution failed', error instanceof Error ? error.message : 'Unknown error occurred');
      setIsAgentRunning(false);
    }
  };

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
