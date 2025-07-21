import { useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { gmailApiService } from '../services/gmailApi';

export default function AuthCallback() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        console.log('🔄 Handling auth callback...');
        
        // Get the current session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('❌ Session error:', sessionError);
          setError(sessionError.message);
          setStatus('error');
          return;
        }

        if (!session) {
          console.error('❌ No session found');
          setError('No authentication session found');
          setStatus('error');
          return;
        }

        console.log('✅ Session found:', session);
        
        // Process the auth callback in the Gmail service
        const success = await gmailApiService.handleAuthCallback();
        
        if (success) {
          console.log('✅ Auth callback processed successfully');
          setStatus('success');
          
          // Redirect to the main app after a short delay
          setTimeout(() => {
            window.location.href = '/';
          }, 1000);
        } else {
          console.error('❌ Failed to process auth callback');
          setError('Failed to process authentication');
          setStatus('error');
        }
      } catch (error) {
        console.error('❌ Error in auth callback:', error);
        setError(error instanceof Error ? error.message : 'Unknown error occurred');
        setStatus('error');
      }
    };

    handleAuthCallback();
  }, []);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Processing Authentication</h2>
          <p className="text-gray-600">Please wait while we complete your sign-in...</p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <h2 className="text-xl font-semibold mb-2">Authentication Error</h2>
            <p className="text-sm">{error}</p>
          </div>
          <button
            onClick={() => window.location.href = '/'}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded transition-colors"
          >
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          <h2 className="text-xl font-semibold mb-2">Authentication Successful!</h2>
          <p className="text-sm">You have been successfully signed in.</p>
        </div>
        <p className="text-gray-600">Redirecting to the application...</p>
      </div>
    </div>
  );
} 