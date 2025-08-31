import React, { useState, useEffect, useCallback } from 'react';
import { LoginScreen } from './components/LoginScreen';
import { UtilityProviderSelection } from './components/UtilityProviderSelection';
import { UtilityBillResults } from './components/UtilityBillResults';
import { BillExtractionModal } from './components/BillExtractionModal';
import { BillDataTable } from './components/BillDataTable';
import { gmailApiService } from './services/gmailApi';
import { utilityService } from './services/utilityService';
import { billExtractionService } from './services/billExtractionService';
import { openaiService } from './services/openaiService';

import { User } from './types/email';
import { UtilityBill, UtilityProvider, UtilityAccount } from './types/utility';
import { BillData } from './types/bill';
import { Loader2 } from 'lucide-react';

type AppState = 'loading' | 'login' | 'provider-selection' | 'searching' | 'results' | 'bill-extraction';

export default function App() {
  const [appState, setAppState] = useState<AppState>('loading');
  const [user, setUser] = useState<User | null>(null);
  const [selectedAccounts, setSelectedAccounts] = useState<UtilityAccount[]>([]);
  const [bills, setBills] = useState<UtilityBill[]>([]);
  const [extractedBills, setExtractedBills] = useState<BillData[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [showBillExtractionModal, setShowBillExtractionModal] = useState(false);


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

  // Load existing bill extractions when user is authenticated
  useEffect(() => {
    const loadBillExtractions = async () => {
      if (user) {
        try {
          const response = await billExtractionService.getBillExtractions();
          if (response.success && response.data) {
            setExtractedBills(response.data);
          }
        } catch (error) {
          console.error('Error loading bill extractions:', error);
        }
      }
    };

    loadBillExtractions();
  }, [user]);

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
    setExtractedBills([]);
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

  const handleBillExtracted = (billData: BillData) => {
    setExtractedBills(prev => [...prev, billData]);
    setShowBillExtractionModal(false);
  };

  const handleDeleteBill = (billId: string) => {
    setExtractedBills(prev => prev.filter(bill => bill.id !== billId));
  };

  const handleApproveBill = async (billId: string) => {
    try {
      const response = await billExtractionService.approveBillExtraction(billId);
      if (response.success) {
        setExtractedBills(prev => prev.map(bill => 
          bill.id === billId ? { 
            ...bill, 
            status: 'approved' as const
          } : bill
        ));
      } else {
        console.error('Failed to approve bill:', response.error);
      }
    } catch (error) {
      console.error('Error approving bill:', error);
    }
  };

  const handleRejectBill = async (billId: string) => {
    try {
      const response = await billExtractionService.rejectBillExtraction(billId);
      if (response.success) {
        setExtractedBills(prev => prev.filter(bill => bill.id !== billId));
      } else {
        console.error('Failed to reject bill:', response.error);
      }
    } catch (error) {
      console.error('Error rejecting bill:', error);
    }
  };

  const handleBillDataUpdated = (updatedBill: BillData) => {
    setExtractedBills(prev => prev.map(bill => 
      bill.id === updatedBill.id ? updatedBill : bill
    ));
  };

  const handleOpenBillExtraction = () => {
    setShowBillExtractionModal(true);
  };

  const handleExtractAllBills = async () => {
    setIsExtracting(true);
    try {
      // Get all bills with processed images
      const billsWithImages = bills.filter(bill => 
        bill.pdfProcessingStatus === 'completed' && 
        bill.imageUrls && 
        bill.imageUrls.length > 0
      );

      console.log(`🔍 Starting bulk extraction for ${billsWithImages.length} bills`);

      // Extract data from each image URL
      const extractionPromises = billsWithImages.flatMap(bill => 
        bill.imageUrls!.map(async (imageUrl) => {
          try {
            console.log(`📄 Extracting from: ${imageUrl}`);
            const response = await openaiService.extractBillData({ imageUrl });
            
            if (response.success && response.data) {
              // Save to database
              const saveResponse = await billExtractionService.saveBillExtraction(response.data);
              if (saveResponse.success) {
                console.log(`✅ Successfully extracted and saved bill data`);
                return response.data;
              } else {
                console.error(`❌ Failed to save bill data:`, saveResponse.error);
                return null;
              }
            } else {
              console.error(`❌ Failed to extract bill data:`, response.error);
              return null;
            }
          } catch (error) {
            console.error(`❌ Error processing image ${imageUrl}:`, error);
            return null;
          }
        })
      );

      const results = await Promise.all(extractionPromises);
      const successfulExtractions = results.filter((result): result is BillData => result !== null);

      console.log(`✅ Bulk extraction completed: ${successfulExtractions.length} successful out of ${billsWithImages.length} bills`);

      // Update the extracted bills list
      setExtractedBills(prev => [...prev, ...successfulExtractions]);

      // Show success message
      alert(`Successfully extracted ${successfulExtractions.length} bills! Check the "Extracted Bill Data" section below.`);

    } catch (error) {
      console.error('❌ Bulk extraction failed:', error);
      alert('Bulk extraction failed. Please try again.');
    } finally {
      setIsExtracting(false);
    }
  };

  const renderAppState = () => {
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
                      
                      <div className="space-y-4">
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

                        <button
                          onClick={handleOpenBillExtraction}
                          className="w-full px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-200"
                        >
                          <div className="flex items-center justify-center space-x-2">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>Extract Bill from Image</span>
                          </div>
                        </button>
                      </div>
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
            <div className="space-y-8">
              {/* Extracted Bills Section */}
              {extractedBills.length > 0 && (
                <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-gray-900">Extracted Bill Data</h2>
                    <button
                      onClick={handleOpenBillExtraction}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      Extract Another Bill
                    </button>
                  </div>
                  <BillDataTable 
                    bills={extractedBills} 
                    onDelete={handleDeleteBill}
                    onApprove={handleApproveBill}
                    onReject={handleRejectBill}
                    onDataUpdated={handleBillDataUpdated}
                  />
                </div>
              )}

              {/* Gmail Search Results */}
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">Gmail Search Results</h2>
                  {extractedBills.length === 0 && (
                    <button
                      onClick={handleOpenBillExtraction}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      Extract Bill from Image
                    </button>
                  )}
                </div>
                <UtilityBillResults
                  bills={bills}
                  isLoading={isSearching}
                  onSearchAgain={handleSearchAgain}
                  onBackToSelection={handleBackToSelection}
                  onExtractAllBills={handleExtractAllBills}
                  isExtracting={isExtracting}
                />
              </div>
            </div>
          </div>
        </div>
      );
      default:
        return null;
    }
  };

  // Bill Extraction Modal
  return (
    <>
      {renderAppState()}
      <BillExtractionModal
        isOpen={showBillExtractionModal}
        onClose={() => setShowBillExtractionModal(false)}
        onBillExtracted={handleBillExtracted}
      />
    </>
  );
}