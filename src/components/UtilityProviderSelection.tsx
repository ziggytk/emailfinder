import React, { useState } from 'react';
import { UtilityProvider, UtilityAccount, Address } from '../types/utility';
import { utilityService } from '../services/utilityService';
import { Check, X, MapPin, Plus, Edit2, Building2, Home } from 'lucide-react';

interface UtilityProviderSelectionProps {
  onAccountsSelected: (accounts: UtilityAccount[]) => void;
}

export const UtilityProviderSelection: React.FC<UtilityProviderSelectionProps> = ({ 
  onAccountsSelected 
}) => {
  const [selectedAccounts, setSelectedAccounts] = useState<UtilityAccount[]>([]);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [showProviderSelection, setShowProviderSelection] = useState(false);
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [addressForm, setAddressForm] = useState<Address>({
    street: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'USA'
  });
  const [accountNumber, setAccountNumber] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [selectedProviders, setSelectedProviders] = useState<UtilityProvider[]>([]);
  
  const availableProviders = utilityService.getAvailableProviders();
  
  // Get unique addresses from existing accounts
  const getUniqueAddresses = () => {
    const addresses = selectedAccounts.map(account => account.address);
    const uniqueAddresses: Address[] = [];
    
    addresses.forEach(address => {
      const addressKey = `${address.street}-${address.city}-${address.state}-${address.zipCode}`;
      const exists = uniqueAddresses.some(existing => 
        `${existing.street}-${existing.city}-${existing.state}-${existing.zipCode}` === addressKey
      );
      if (!exists) {
        uniqueAddresses.push(address);
      }
    });
    
    return uniqueAddresses;
  };

  const handleAddAddress = () => {
    setShowAddressForm(true);
  };

  const handleAddressAdded = () => {
    const newAddress: Address = { ...addressForm };
    
    // Create a temporary account with just the address (no provider yet)
    const tempAccount: UtilityAccount = {
      id: `temp-address-${Date.now()}`,
      provider: {
        id: 'temp',
        name: 'Address Only',
        domains: [],
        description: 'Address added, provider not yet selected'
      },
      address: newAddress,
      accountNumber: accountNumber || undefined,
      customerName: customerName || undefined
    };
    
    // Add to selected accounts immediately
    const updated = [...selectedAccounts, tempAccount];
    setSelectedAccounts(updated);
    onAccountsSelected(updated);
    
    // Set for provider selection
    setSelectedAddress(newAddress);
    setShowAddressForm(false);
    setShowProviderSelection(true);
    
    // Reset form
    setAddressForm({
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'USA'
    });
    setAccountNumber('');
    setCustomerName('');
  };

  const handleProviderSelect = (provider: UtilityProvider) => {
    if (!selectedAddress) return;
    
    setSelectedProviders(prev => {
      const isSelected = prev.some(p => p.id === provider.id);
      if (isSelected) {
        // Remove provider if already selected
        return prev.filter(p => p.id !== provider.id);
      } else {
        // Add provider if not selected
        return [...prev, provider];
      }
    });
  };

  const handleAddAccount = () => {
    if (selectedProviders.length === 0 || !selectedAddress) return;
    
    // Find and remove the temporary account
    const updated = selectedAccounts.filter(account => account.provider.id !== 'temp');
    
    // Add accounts for each selected provider
    selectedProviders.forEach(provider => {
      const newAccount: UtilityAccount = {
        id: `${provider.id}-${Date.now()}-${Math.random()}`,
        provider: provider,
        address: selectedAddress,
        accountNumber: accountNumber || undefined,
        customerName: customerName || undefined
      };
      
      updated.push(newAccount);
    });
    
    setSelectedAccounts(updated);
    onAccountsSelected(updated);
    
    // Close the modal and reset form
    setShowProviderSelection(false);
    setSelectedProviders([]);
    setSelectedAddress(null);
    setAccountNumber('');
    setCustomerName('');
  };

  const handleEditAccount = (account: UtilityAccount) => {
    setEditingAccountId(account.id);
    setSelectedProviders([account.provider]);
    setAddressForm(account.address);
    setAccountNumber(account.accountNumber || '');
    setCustomerName(account.customerName || '');
    setShowAddressForm(true);
  };

  const handleUpdateAccount = () => {
    if (selectedProviders.length === 0 || !editingAccountId) return;
    
    const updated = selectedAccounts.map(account => 
      account.id === editingAccountId 
        ? {
            ...account,
            provider: selectedProviders[0], // For editing, we only support single provider
            address: { ...addressForm },
            accountNumber: accountNumber || undefined,
            customerName: customerName || undefined
          }
        : account
    );
    
    setSelectedAccounts(updated);
    onAccountsSelected(updated);
    
    // Reset form
    setShowAddressForm(false);
    setEditingAccountId(null);
    setSelectedProviders([]);
    setAddressForm({
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'USA'
    });
    setAccountNumber('');
    setCustomerName('');
  };

  const handleRemoveAccount = (accountId: string) => {
    const updated = selectedAccounts.filter(account => account.id !== accountId);
    setSelectedAccounts(updated);
    onAccountsSelected(updated);
  };

  const handleClearSelection = () => {
    setSelectedAccounts([]);
    onAccountsSelected([]);
  };

  const handleCancelForm = () => {
    setShowAddressForm(false);
    setShowProviderSelection(false);
    setEditingAccountId(null);
    setSelectedProvider(null);
    setSelectedAddress(null);
    
    // Remove temporary account if user cancels provider selection
    if (showProviderSelection) {
      const updated = selectedAccounts.filter(account => account.provider.id !== 'temp');
      setSelectedAccounts(updated);
      onAccountsSelected(updated);
    }
    
    setAddressForm({
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'USA'
    });
    setAccountNumber('');
    setCustomerName('');
  };

  return (
    <div className="w-4/5 mx-auto px-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Add Your Properties
        </h1>
        <p className="text-gray-600">
          We'll search for the most recent utility bills from the providers you select.
        </p>
      </div>

      {/* Add Address Button - Only show when there are existing accounts */}
      {selectedAccounts.length > 0 && (
        <div className="mb-8">
          <button
            onClick={handleAddAddress}
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            <Plus className="w-5 h-5" />
            Add New Address
          </button>
        </div>
      )}

      {/* Accounts Organized by Address */}
      {selectedAccounts.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              Your Utility Accounts
            </h2>
            <button
              onClick={handleClearSelection}
              className="text-red-600 hover:text-red-800 text-sm font-medium"
            >
              Clear All
            </button>
          </div>
          
          <div className="space-y-6">
            {getUniqueAddresses().map((address, addressIndex) => {
              const accountsForAddress = selectedAccounts.filter(account => 
                account.address.street === address.street &&
                account.address.city === address.city &&
                account.address.state === address.state &&
                account.address.zipCode === address.zipCode
              );
              
              return (
                <div key={addressIndex} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  {/* Address Header */}
                  <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <Home className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">
                            {address.street}
                          </h3>
                          <p className="text-sm text-gray-600">
                            {address.city}, {address.state} {address.zipCode}
                          </p>
                        </div>
                      </div>
                      {accountsForAddress.some(account => account.provider.id === 'temp') ? (
                        <span className="text-sm text-yellow-600 font-medium">
                          Provider selection pending
                        </span>
                      ) : (
                        <button
                          onClick={() => {
                            setSelectedAddress(address);
                            setShowProviderSelection(true);
                          }}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
                        >
                          <Plus className="w-4 h-4" />
                          Add Provider
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {/* Providers for this address */}
                  <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {accountsForAddress.map(account => {
                        const isTempAccount = account.provider.id === 'temp';
                        
                        return (
                          <div
                            key={account.id}
                            className={`flex items-center justify-between p-4 border rounded-lg ${
                              isTempAccount 
                                ? 'border-yellow-300 bg-yellow-50' 
                                : 'border-gray-200 hover:bg-gray-50'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                isTempAccount ? 'bg-yellow-100' : 'bg-green-100'
                              }`}>
                                {isTempAccount ? (
                                  <Plus className="w-4 h-4 text-yellow-600" />
                                ) : (
                                  <Building2 className="w-4 h-4 text-green-600" />
                                )}
                              </div>
                              <div>
                                <h4 className="font-medium text-gray-900">
                                  {isTempAccount ? 'Select Provider' : account.provider.name}
                                </h4>
                                {isTempAccount ? (
                                  <p className="text-xs text-yellow-600">Address added, provider needed</p>
                                ) : (
                                  account.accountNumber && (
                                    <p className="text-xs text-gray-500">#{account.accountNumber}</p>
                                  )
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              {isTempAccount ? (
                                <button
                                  onClick={() => {
                                    setSelectedAddress(account.address);
                                    setShowProviderSelection(true);
                                  }}
                                  className="p-1 text-yellow-600 hover:text-yellow-800"
                                  title="Select provider for this address"
                                >
                                  <Plus className="w-4 h-4" />
                                </button>
                              ) : (
                                <>
                                  <button
                                    onClick={() => handleEditAccount(account)}
                                    className="p-1 text-gray-400 hover:text-blue-600"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleRemoveAccount(account.id)}
                                    className="p-1 text-gray-400 hover:text-red-600"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Address Form Modal */}
      {showAddressForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Add New Address
              </h3>
              <button
                onClick={handleCancelForm}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              {/* Address Fields */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Street Address
                </label>
                <input
                  type="text"
                  value={addressForm.street}
                  onChange={(e) => setAddressForm({...addressForm, street: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="123 Main St"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    value={addressForm.city}
                    onChange={(e) => setAddressForm({...addressForm, city: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="New York"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    State
                  </label>
                  <input
                    type="text"
                    value={addressForm.state}
                    onChange={(e) => setAddressForm({...addressForm, state: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="NY"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ZIP Code
                </label>
                <input
                  type="text"
                  value={addressForm.zipCode}
                  onChange={(e) => setAddressForm({...addressForm, zipCode: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="10001"
                />
              </div>

              {/* Optional Fields */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Account Number (Optional)
                  </label>
                  <input
                    type="text"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="123456789"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Customer Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="John Doe"
                  />
                </div>
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleCancelForm}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAddressAdded}
                disabled={!addressForm.street || !addressForm.city || !addressForm.state || !addressForm.zipCode}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Add Address
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Provider Selection Modal */}
      {showProviderSelection && selectedAddress && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Select Utility Providers
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Choose one or more providers for: {selectedAddress.street}, {selectedAddress.city}, {selectedAddress.state} {selectedAddress.zipCode}
                </p>
              </div>
              <button
                onClick={handleCancelForm}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Account Details Form */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-3">Account Details (Optional)</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Account Number
                  </label>
                  <input
                    type="text"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="123456789"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Customer Name
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="John Doe"
                  />
                </div>
              </div>
            </div>

            {/* Provider Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {availableProviders.map(provider => {
                const isSelected = selectedProviders.some(p => p.id === provider.id);
                
                return (
                  <div
                    key={provider.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-all ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                    onClick={() => handleProviderSelect(provider)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 mb-1">
                          {provider.name}
                        </h3>
                        {provider.description && (
                          <p className="text-sm text-gray-600 mb-2">
                            {provider.description}
                          </p>
                        )}
                        <div className="text-xs text-gray-500">
                          <span className="font-medium">Domains:</span>
                          <div className="mt-1">
                            {provider.domains.map(domain => (
                              <span
                                key={domain}
                                className="inline-block bg-gray-100 px-2 py-1 rounded mr-1 mb-1"
                              >
                                {domain}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="ml-3">
                        {isSelected ? (
                          <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                            <Check className="w-4 h-4 text-white" />
                          </div>
                        ) : (
                          <div className="w-6 h-6 border-2 border-gray-300 rounded-full" />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleCancelForm}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAddAccount}
                disabled={selectedProviders.length === 0}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Add {selectedProviders.length > 0 ? `${selectedProviders.length} Account${selectedProviders.length > 1 ? 's' : ''}` : 'Account'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {selectedAccounts.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Home className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No properties yet</h3>
          <p className="text-gray-600 mb-6">
            Add your first property to get started.
          </p>
          <button
            onClick={handleAddAddress}
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            <Plus className="w-5 h-5" />
            + Add Your First Property
          </button>
        </div>
      )}

      {/* Continue Button */}
      {selectedAccounts.length > 0 && (
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-600 mb-4">
            Ready to search for utility bills from {selectedAccounts.length} account{selectedAccounts.length !== 1 ? 's' : ''}?
          </p>
        </div>
      )}
    </div>
  );
}; 