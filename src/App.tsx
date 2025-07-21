import React, { useState, useEffect, useCallback } from 'react';
import { LoginScreen } from './components/LoginScreen';
import { EmailDashboard } from './components/EmailDashboard';
import { gmailApiService } from './services/gmailApi';
import { User } from './types/email';
import { Loader2 } from 'lucide-react';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    checkExistingAuth();
  }, [checkExistingAuth]);

  const checkExistingAuth = useCallback(async () => {
    try {
      // Check if we're returning from OAuth callback (hash-based for implicit flow)
      if (window.location.hash.includes('access_token')) {
        const success = await gmailApiService.handleAuthCallback();
        if (success) {
          await loadUserProfile();
          return;
        }
      }

      const isAuthenticated = await gmailApiService.checkAuthStatus();
      if (isAuthenticated) {
        await loadUserProfile();
      }
    } catch (error) {
      console.error('Error checking existing auth:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadUserProfile = async () => {
    try {
      const profile = await gmailApiService.getUserProfile();
      const user: User = {
        id: '1',
        name: profile.name,
        email: profile.email,
        avatar: profile.avatar
      };
      setUser(user);
      setIsLoggedIn(true);
    } catch (error) {
      console.error('Error loading user profile:', error);
      throw error;
    }
  };

  const handleLogin = async () => {
    try {
      setIsLoading(true);
      setAuthError(null);
      
      // Sign in with Google - this will redirect to Google OAuth
      await gmailApiService.signInWithGoogle();
      
      // Note: The page will redirect to Google OAuth, so this code won't execute
      // The authentication will be handled in checkExistingAuth when the user returns
    } catch (error) {
      console.error('Login error:', error);
      setAuthError('Failed to initiate Google login');
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await gmailApiService.logout();
    setUser(null);
    setIsLoggedIn(false);
    setAuthError(null);
  };

  // Show loading screen during initial auth check
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Loading</h2>
          <p className="text-gray-600">Checking authentication status...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (authError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
          <div className="text-red-500 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Authentication Error</h2>
          <p className="text-gray-600 mb-4">{authError}</p>
          <button
            onClick={() => {
              setAuthError(null);
              setIsLoading(false);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Show main application
  if (isLoggedIn && user) {
    return <EmailDashboard user={user} onLogout={handleLogout} />;
  }

  return <LoginScreen onLogin={handleLogin} />;
}

export default App;