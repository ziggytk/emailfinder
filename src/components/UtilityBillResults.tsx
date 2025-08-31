import React, { useState, useMemo } from 'react';
import { UtilityBill, UtilityProvider } from '../types/utility';
import { FileText, Calendar, DollarSign, Hash, Search, Filter } from 'lucide-react';

interface UtilityBillResultsProps {
  bills: UtilityBill[];
  isLoading: boolean;
  onSearchAgain: () => void;
  onBackToSelection: () => void;
  onExtractAllBills?: () => void;
  isExtracting?: boolean;
}

export const UtilityBillResults: React.FC<UtilityBillResultsProps> = ({
  bills,
  isLoading,
  onSearchAgain,
  onBackToSelection,
  onExtractAllBills,
  isExtracting
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
    <div className="w-full">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 mb-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-3">
              Utility Bill Results
            </h1>
            <div className="space-y-2">
              <p className="text-gray-600 text-lg">
                Found {bills.length} utility bills from {providers.length} provider{providers.length !== 1 ? 's' : ''}
              </p>
              {bills.some(bill => bill.pdfProcessingStatus === 'completed' && bill.imageUrls && bill.imageUrls.length > 0) && (
                <p className="text-purple-600 font-medium">
                  🖼️ {bills.filter(bill => bill.pdfProcessingStatus === 'completed' && bill.imageUrls && bill.imageUrls.length > 0).length} bills have processed images available
                </p>
              )}
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={onBackToSelection}
              className="px-6 py-3 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors font-medium"
            >
              Change Providers
            </button>
            {onExtractAllBills && bills.some(bill => bill.pdfProcessingStatus === 'completed' && bill.imageUrls && bill.imageUrls.length > 0) && (
              <button
                onClick={onExtractAllBills}
                disabled={isExtracting}
                className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-semibold shadow-lg hover:shadow-xl"
              >
                {isExtracting ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Extracting...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <span>Extract All Bills</span>
                  </div>
                )}
              </button>
            )}
            <button
              onClick={onSearchAgain}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl"
            >
              Search Again
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Filter & Search</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search bills..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Provider Filter */}
          <div>
            <select
              value={selectedProvider}
              onChange={(e) => setSelectedProvider(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-12 text-center">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <FileText className="w-10 h-10 text-gray-400" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-3">
            {bills.length === 0 ? 'No Utility Bills Found' : 'No Bills Match Your Filters'}
          </h3>
          <p className="text-gray-600 mb-6 text-lg">
            {bills.length === 0 
              ? 'We couldn\'t find any utility bills from the selected providers in your Gmail over the past 6 months.'
              : 'Try adjusting your search or filter criteria.'
            }
          </p>
          <button
            onClick={onBackToSelection}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl"
          >
            Select Different Providers
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredAndSortedBills.map(bill => (
            <div
              key={bill.id}
              className="bg-white border border-gray-200 rounded-2xl p-8 hover:shadow-lg transition-all duration-200"
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
                    {bill.pdfProcessingStatus === 'completed' && bill.imageUrls && bill.imageUrls.length > 0 && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                        🖼️ {bill.imageUrls.length} Image{bill.imageUrls.length !== 1 ? 's' : ''}
                      </span>
                    )}
                    {bill.pdfProcessingStatus === 'processing' && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        ⏳ Processing...
                      </span>
                    )}
                    {bill.pdfProcessingStatus === 'failed' && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        ❌ Failed
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
                  
                  {/* Display processing status */}
                  {bill.pdfProcessingStatus === 'processing' && (
                    <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-600"></div>
                        <span className="text-sm text-yellow-800">Processing PDF and generating images...</span>
                      </div>
                    </div>
                  )}
                  
                  {/* Display image URLs if available */}
                  {bill.pdfProcessingStatus === 'completed' && bill.imageUrls && bill.imageUrls.length > 0 && (
                    <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Raw Bill Images:</h4>
                      <div className="flex flex-wrap gap-2">
                        {bill.imageUrls.map((url, index) => (
                          <a
                            key={index}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center px-3 py-1 rounded-md text-xs font-medium bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-colors"
                          >
                            [{index + 1}]
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Display processing error if any */}
                  {bill.processingError && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <h4 className="text-sm font-medium text-red-900 mb-1">Processing Error:</h4>
                      <p className="text-xs text-red-700">{bill.processingError}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Summary */}
      {filteredAndSortedBills.length > 0 && (
        <div className="mt-8 bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <p className="text-gray-600 font-medium">
              Showing {filteredAndSortedBills.length} of {bills.length} bills
              {selectedProvider !== 'all' && ` from ${providers.find(p => p.id === selectedProvider)?.name}`}
            </p>
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
              <span>Results loaded</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}; 