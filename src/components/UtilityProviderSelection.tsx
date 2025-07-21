import React, { useState, useMemo } from 'react';
import { UtilityProvider } from '../types/utility';
import { utilityService } from '../services/utilityService';
import { Search, Check, X } from 'lucide-react';

interface UtilityProviderSelectionProps {
  onProvidersSelected: (providers: UtilityProvider[]) => void;
}

export const UtilityProviderSelection: React.FC<UtilityProviderSelectionProps> = ({ 
  onProvidersSelected 
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProviders, setSelectedProviders] = useState<UtilityProvider[]>([]);
  
  const availableProviders = utilityService.getAvailableProviders();
  
  // Filter providers based on search query
  const filteredProviders = useMemo(() => {
    if (!searchQuery.trim()) return availableProviders;
    
    const query = searchQuery.toLowerCase();
    return availableProviders.filter(provider => 
      provider.name.toLowerCase().includes(query) ||
      provider.description?.toLowerCase().includes(query) ||
      provider.domains.some(domain => domain.toLowerCase().includes(query))
    );
  }, [availableProviders, searchQuery]);

  const handleProviderToggle = (provider: UtilityProvider) => {
    const isSelected = selectedProviders.find(p => p.id === provider.id);
    
    if (isSelected) {
      const updated = selectedProviders.filter(p => p.id !== provider.id);
      setSelectedProviders(updated);
      onProvidersSelected(updated);
    } else {
      const updated = [...selectedProviders, provider];
      setSelectedProviders(updated);
      onProvidersSelected(updated);
    }
  };

  const handleClearSelection = () => {
    setSelectedProviders([]);
    onProvidersSelected([]);
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Select Your Utility Providers
        </h1>
        <p className="text-gray-600">
          Choose the utility companies you want to search for bills from. We'll search your Gmail for PDF attachments from these providers over the past 6 months.
        </p>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search utility providers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Selected Providers Summary */}
      {selectedProviders.length > 0 && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-blue-900">
              Selected Providers ({selectedProviders.length})
            </h3>
            <button
              onClick={handleClearSelection}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              Clear All
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedProviders.map(provider => (
              <span
                key={provider.id}
                className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
              >
                {provider.name}
                <button
                  onClick={() => handleProviderToggle(provider)}
                  className="ml-2 hover:text-blue-600"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Provider Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredProviders.map(provider => {
          const isSelected = selectedProviders.find(p => p.id === provider.id);
          
          return (
            <div
              key={provider.id}
              className={`p-4 border rounded-lg cursor-pointer transition-all ${
                isSelected
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
              onClick={() => handleProviderToggle(provider)}
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

      {/* No Results */}
      {filteredProviders.length === 0 && searchQuery && (
        <div className="text-center py-8">
          <p className="text-gray-500">No utility providers found matching "{searchQuery}"</p>
        </div>
      )}

      {/* Continue Button */}
      {selectedProviders.length > 0 && (
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-600 mb-4">
            Ready to search for utility bills from {selectedProviders.length} provider{selectedProviders.length !== 1 ? 's' : ''}?
          </p>
        </div>
      )}
    </div>
  );
}; 