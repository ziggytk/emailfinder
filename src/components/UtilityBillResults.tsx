import React, { useState, useMemo } from 'react';
import { UtilityBill, UtilityProvider } from '../types/utility';
import { FileText, Calendar, DollarSign, Hash, Search, Filter } from 'lucide-react';

interface UtilityBillResultsProps {
  bills: UtilityBill[];
  isLoading: boolean;
  onSearchAgain: () => void;
  onBackToSelection: () => void;
}

export const UtilityBillResults: React.FC<UtilityBillResultsProps> = ({
  bills,
  isLoading,
  onSearchAgain,
  onBackToSelection
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProvider, setSelectedProvider] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'provider'>('date');

  // Get unique providers from bills
  const providers = useMemo(() => {
    const uniqueProviders = new Map<string, UtilityProvider>();
    bills.forEach(bill => {
      uniqueProviders.set(bill.provider.id, bill.provider);
    });
    return Array.from(uniqueProviders.values());
  }, [bills]);

  // Filter and sort bills
  const filteredAndSortedBills = useMemo(() => {
    let filtered = bills;

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(bill =>
        bill.subject.toLowerCase().includes(query) ||
        bill.from.name.toLowerCase().includes(query) ||
        bill.from.email.toLowerCase().includes(query) ||
        bill.provider.name.toLowerCase().includes(query) ||
        bill.amount?.includes(query) ||
        bill.billNumber?.toLowerCase().includes(query)
      );
    }

    // Filter by provider
    if (selectedProvider !== 'all') {
      filtered = filtered.filter(bill => bill.provider.id === selectedProvider);
    }

    // Sort bills
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        case 'amount':
          const amountA = parseFloat(a.amount?.replace(/[$,]/g, '') || '0');
          const amountB = parseFloat(b.amount?.replace(/[$,]/g, '') || '0');
          return amountB - amountA;
        case 'provider':
          return a.provider.name.localeCompare(b.provider.name);
        default:
          return 0;
      }
    });

    return filtered;
  }, [bills, searchQuery, selectedProvider, sortBy]);

  const formatAmount = (amount: string | undefined) => {
    if (!amount) return 'N/A';
    const num = parseFloat(amount.replace(/[$,]/g, ''));
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(num);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date);
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Searching for Utility Bills</h2>
          <p className="text-gray-600">This may take a moment as we search through your emails...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Utility Bill Results
            </h1>
            <p className="text-gray-600">
              Found {bills.length} utility bills from {providers.length} provider{providers.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={onBackToSelection}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Change Providers
            </button>
            <button
              onClick={onSearchAgain}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Search Again
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 bg-white border border-gray-200 rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search bills..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Provider Filter */}
          <div>
            <select
              value={selectedProvider}
              onChange={(e) => setSelectedProvider(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Providers</option>
              {providers.map(provider => (
                <option key={provider.id} value={provider.id}>
                  {provider.name}
                </option>
              ))}
            </select>
          </div>

          {/* Sort */}
          <div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'date' | 'amount' | 'provider')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="date">Sort by Date</option>
              <option value="amount">Sort by Amount</option>
              <option value="provider">Sort by Provider</option>
            </select>
          </div>
        </div>
      </div>

      {/* Results */}
      {filteredAndSortedBills.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {bills.length === 0 ? 'No Utility Bills Found' : 'No Bills Match Your Filters'}
          </h3>
          <p className="text-gray-600 mb-4">
            {bills.length === 0 
              ? 'We couldn\'t find any utility bills from the selected providers in your Gmail over the past 6 months.'
              : 'Try adjusting your search or filter criteria.'
            }
          </p>
          <button
            onClick={onBackToSelection}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Select Different Providers
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAndSortedBills.map(bill => (
            <div
              key={bill.id}
              className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {bill.provider.name}
                    </span>
                    {bill.hasPdfAttachment && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <FileText className="w-3 h-3 mr-1" />
                        PDF
                      </span>
                    )}
                  </div>
                  
                  <h3 className="font-semibold text-gray-900 mb-2">
                    {bill.subject}
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      {formatDate(bill.date)}
                    </div>
                    
                    {bill.amount && (
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4" />
                        {formatAmount(bill.amount)}
                      </div>
                    )}
                    
                    {bill.billNumber && (
                      <div className="flex items-center gap-2">
                        <Hash className="w-4 h-4" />
                        Bill #{bill.billNumber}
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-3 text-sm text-gray-500">
                    From: {bill.from.name} &lt;{bill.from.email}&gt;
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Summary */}
      {filteredAndSortedBills.length > 0 && (
        <div className="mt-8 p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600">
            Showing {filteredAndSortedBills.length} of {bills.length} bills
            {selectedProvider !== 'all' && ` from ${providers.find(p => p.id === selectedProvider)?.name}`}
          </p>
        </div>
      )}
    </div>
  );
}; 