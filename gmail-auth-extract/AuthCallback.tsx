import React, { useEffect, useState } from 'react';
import { gmailAuthService } from './GmailAuthService';
import { Loader2 } from 'lucide-react';

interface AuthCallbackProps {
  onAuthSuccess: () => void;
  onAuthError: (error: string) => void;
}

export const AuthCallback: React.FC<AuthCallbackProps> = ({ onAuthSuccess, onAuthError }) => {
  const [isProcessing, setIsProcessing] = useState(true);

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const success = await gmailAuthService.handleAuthCallback();
        
        if (success) {
          // Add a small delay to ensure session is properly established
          await new Promise(resolve => setTimeout(resolve, 500));
          onAuthSuccess();
        } else {
          onAuthError('Failed to complete authentication');
        }
      } catch (error) {
        console.error('Auth callback error:', error);
        onAuthError('Failed to complete authentication');
      } finally {
        setIsProcessing(false);
      }
    };

    handleAuthCallback();
  }, [onAuthSuccess, onAuthError]);

  if (isProcessing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-red-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Completing Authentication</h2>
          <p className="text-gray-600">Please wait while we connect to your Gmail account...</p>
        </div>
      </div>
    );
  }

  return null;
}; 