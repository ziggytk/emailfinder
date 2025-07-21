import React, { useState, useEffect, useCallback } from 'react';
import { LoginScreen } from './components/LoginScreen';
import { UtilityProviderSelection } from './components/UtilityProviderSelection';
import { UtilityBillResults } from './components/UtilityBillResults';
import { gmailApiService } from './services/gmailApi';
import { utilityService } from './services/utilityService';
import { User } from './types/email';
import { UtilityProvider, UtilityBill } from './types/utility';
import { Loader2 } from 'lucide-react';

type AppState = 'loading' | 'login' | 'provider-selection' | 'searching' | 'results';

function App() {
  const [appState, setAppState] = useState<AppState>('loading');
  const [user, setUser] = useState<User | null>(null);
  const [selectedProviders, setSelectedProviders] = useState<UtilityProvider[]>([]);
  const [bills, setBills] = useState<UtilityBill[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const loadUserProfile = useCallback(async () => {
    try {
      const profile = await gmailApiService.getUserProfile();
      const user: User = {
        id: '1',
        name: profile.name,
        email: profile.email,
        avatar: profile.avatar
      };
      setUser(user);
      setAppState('provider-selection');
    } catch (error) {
      console.error('Error loading user profile:', error);
      throw error;
    }
  }, []);

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
      } else {
        setAppState('login');
      }
    } catch (error) {
      console.error('Error checking existing auth:', error);
      setAppState('login');
    } finally {
      // Only set to login if we're still in loading state
      setAppState(prevState => prevState === 'loading' ? 'login' : prevState);
    }
  }, [loadUserProfile]);

  useEffect(() => {
    checkExistingAuth();
  }, [checkExistingAuth]);

  const handleLogin = async () => {
    try {
      setAppState('loading');
      setAuthError(null);
      
      // Sign in with Google - this will redirect to Google OAuth
      await gmailApiService.signInWithGoogle();
      
      // Note: The page will redirect to Google OAuth, so this code won't execute
      // The authentication will be handled in checkExistingAuth when the user returns
    } catch (error) {
      console.error('Login error:', error);
      setAuthError('Failed to initiate Google login');
      setAppState('login');
    }
  };

  const handleLogout = async () => {
    await gmailApiService.logout();
    setUser(null);
    setSelectedProviders([]);
    setBills([]);
    setAuthError(null);
    setAppState('login');
  };

  const handleProvidersSelected = (providers: UtilityProvider[]) => {
    console.log('🏢 handleProvidersSelected called with:', providers);
    setSelectedProviders(providers);
    // Update the utility service with selected providers
    utilityService.clearProviders();
    providers.forEach(provider => utilityService.addProvider(provider));
    console.log('✅ Providers updated in utility service');
  };

  const handleSearchBills = async () => {
    console.log('🔍 handleSearchBills called');
    console.log('Selected providers:', selectedProviders);
    console.log('Current appState:', appState);
    
    if (selectedProviders.length === 0) {
      console.log('❌ No providers selected');
      return;
    }

    console.log('✅ Starting search...');
    setIsSearching(true);
    setAppState('searching');
    console.log('🔄 Set appState to searching');

    try {
      console.log('🔍 Calling utilityService.searchUtilityBills...');
      const result = await utilityService.searchUtilityBills(6); // 6 months
      console.log('📊 Search result:', result);
      
      setBills(result.bills);
      setAppState('results');
      console.log('✅ Search completed, showing results');
    } catch (error) {
      console.error('❌ Error searching for bills:', error);
      setAuthError('Failed to search for utility bills');
      setAppState('provider-selection');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchAgain = () => {
    setAppState('searching');
    handleSearchBills();
  };

  const handleBackToSelection = () => {
    setAppState('provider-selection');
  };

  // Show loading screen during initial auth check
  if (appState === 'loading') {
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
              setAppState('login');
            }}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Show login screen if not authenticated
  if (appState === 'login') {
    return (
      <LoginScreen onLogin={handleLogin} isLoading={false} />
    );
  }

  // Show provider selection
  console.log('🎨 Rendering with appState:', appState);
  if (appState === 'provider-selection') {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-4xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Utility Bill Finder</h1>
                <p className="text-gray-600">Welcome, {user?.name}</p>
              </div>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>

        <UtilityProviderSelection onProvidersSelected={handleProvidersSelected} />

        {/* Search Button */}
        {selectedProviders.length > 0 && (
          <div className="max-w-4xl mx-auto px-6 pb-8">
            <div className="text-center">
              <button
                onClick={() => {
                  console.log('🔘 Search button clicked!');
                  handleSearchBills();
                }}
                className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Search for Utility Bills
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Show searching state
  console.log('🔍 Checking searching state, appState:', appState);
  if (appState === 'searching') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Searching for Utility Bills</h2>
          <p className="text-gray-600">This may take a moment as we search through your emails...</p>
        </div>
      </div>
    );
  }

  // Show results
  if (appState === 'results') {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-6xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Utility Bill Finder</h1>
                <p className="text-gray-600">Welcome, {user?.name}</p>
              </div>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>

        <UtilityBillResults
          bills={bills}
          isLoading={isSearching}
          onSearchAgain={handleSearchAgain}
          onBackToSelection={handleBackToSelection}
        />
      </div>
    );
  }

  return null;
}

export default App;