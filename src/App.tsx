import React, { useState, useEffect, useCallback } from 'react';
import { LoginScreen } from './components/LoginScreen';
import { UtilityProviderSelection } from './components/UtilityProviderSelection';
import { UtilityBillResults } from './components/UtilityBillResults';
import { gmailApiService } from './services/gmailApi';
import { utilityService } from './services/utilityService';

import { User } from './types/email';
import { UtilityBill, UtilityProvider, UtilityAccount } from './types/utility';
import { Loader2 } from 'lucide-react';

type AppState = 'loading' | 'login' | 'provider-selection' | 'searching' | 'results';

export default function App() {
  const [appState, setAppState] = useState<AppState>('loading');
  const [user, setUser] = useState<User | null>(null);
  const [selectedAccounts, setSelectedAccounts] = useState<UtilityAccount[]>([]);
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
    setSelectedAccounts([]);
    setBills([]);
    setAuthError(null);
    setAppState('login');
  };

  const handleAccountsSelected = (accounts: UtilityAccount[]) => {
    console.log('🏢 handleAccountsSelected called with:', accounts);
    setSelectedAccounts(accounts);
    // Set accounts in utility service (includes providers and addresses)
    utilityService.setSelectedAccounts(accounts);
    console.log('✅ Accounts updated in utility service');
  };

  const handleSearchBills = async () => {
    console.log('🔍 handleSearchBills called');
    console.log('Selected accounts:', selectedAccounts);
    console.log('Current appState:', appState);
    
    if (selectedAccounts.length === 0) {
      console.log('❌ No accounts selected');
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-12 text-center max-w-md mx-4">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <Loader2 className="w-8 h-8 animate-spin text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Loading</h2>
          <p className="text-gray-600">Checking authentication status...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (authError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg border border-gray-200 p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Authentication Error</h2>
          <p className="text-gray-600 mb-6">{authError}</p>
          <button
            onClick={() => {
              setAuthError(null);
              setAppState('login');
            }}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 px-6 rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl"
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
      <LoginScreen onLogin={handleLogin} />
    );
  }

  // Show provider selection
  console.log('🎨 Rendering with appState:', appState);
  switch (appState) {
    case 'provider-selection':
      return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
          {/* Header */}
          <div className="bg-white shadow-sm border-b border-gray-200">
            <div className="max-w-7xl mx-auto px-6 py-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900">Utility Bill Finder</h1>
                    <p className="text-gray-600">Welcome back, {user?.name}</p>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="max-w-7xl mx-auto px-6 py-8">
            <div className="flex flex-col lg:flex-row gap-8">
              {/* Main Content */}
              <div className="flex-1">
                <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
                  <UtilityProviderSelection onAccountsSelected={handleAccountsSelected} />
                </div>
              </div>
              
              {/* Sidebar */}
              <div className="lg:w-80">
                <div className="sticky top-8">
                  {selectedAccounts.length > 0 && (
                    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
                      <div className="flex items-center space-x-3 mb-4">
                        <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                          <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900">Ready to Search</h3>
                      </div>
                      
                      <div className="mb-6">
                        <p className="text-sm text-gray-600 mb-2">Selected Accounts</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {selectedAccounts.length} account{selectedAccounts.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                      
                      <button
                        onClick={() => {
                          console.log('🔘 Search button clicked!');
                          handleSearchBills();
                        }}
                        disabled={isSearching}
                        className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-200"
                      >
                        {isSearching ? (
                          <div className="flex items-center justify-center space-x-3">
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <span>Searching...</span>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center space-x-2">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            <span>Search for Bills</span>
                          </div>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    case 'searching':
      return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-12 text-center max-w-md mx-4">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <Loader2 className="w-8 h-8 animate-spin text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Searching for Utility Bills</h2>
            <p className="text-gray-600 mb-6">This may take a moment as we search through your emails...</p>
            <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
            </div>
          </div>
        </div>
      );
    case 'results':
      return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
          {/* Header */}
          <div className="bg-white shadow-sm border-b border-gray-200">
            <div className="max-w-7xl mx-auto px-6 py-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900">Utility Bill Finder</h1>
                    <p className="text-gray-600">Welcome back, {user?.name}</p>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>

          <div className="max-w-7xl mx-auto px-6 py-8">
            <UtilityBillResults
              bills={bills}
              isLoading={isSearching}
              onSearchAgain={handleSearchAgain}
              onBackToSelection={handleBackToSelection}
            />
          </div>
        </div>
      );
    default:
      return null;
  }
}