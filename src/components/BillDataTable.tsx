import React, { useState, useMemo } from 'react';
import { BillData } from '../types/bill';
import { BillDetailModal } from './BillDetailModal';
import { billExtractionService } from '../services/billExtractionService';

interface BillDataTableProps {
  bills: BillData[];
  onDelete?: (id: string) => void;
  onApprove?: (id: string, propertyId?: string) => void;
  onReject?: (id: string, comment?: string) => void;
  onUnreject?: (id: string) => void;
  onLaunchAgent?: (id: string) => void;
  onDataUpdated?: (updatedBill: BillData) => void;
  propertyAddresses?: string[];
  selectedAccounts?: any[]; // User-provided property accounts
}

export const BillDataTable: React.FC<BillDataTableProps> = ({ bills, onDelete, onApprove, onReject, onUnreject, onLaunchAgent, onDataUpdated, propertyAddresses = [], selectedAccounts = [] }) => {
  const [sortField, setSortField] = useState<keyof BillData>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [filterOwner, setFilterOwner] = useState('');
  const [filterAddress, setFilterAddress] = useState('');
  const [filterAccount, setFilterAccount] = useState('');
  const [filterOfficialAddress, setFilterOfficialAddress] = useState('');
  const [selectedBill, setSelectedBill] = useState<BillData | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const sortedAndFilteredBills = useMemo(() => {
    let filtered = bills.filter(bill => {
      const ownerMatch = bill.ownerName.toLowerCase().includes(filterOwner.toLowerCase());
      const addressMatch = bill.homeAddress.toLowerCase().includes(filterAddress.toLowerCase());
      const accountMatch = bill.accountNumber.toLowerCase().includes(filterAccount.toLowerCase());
      
      // Filter by official address
      const officialAddressMatch = !filterOfficialAddress || 
        (bill.associatedPropertyId && 
         bill.associatedPropertyId.toLowerCase().includes(filterOfficialAddress.toLowerCase()));
      
      return ownerMatch && addressMatch && accountMatch && officialAddressMatch;
    });

    filtered.sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      }

      if (typeof aValue === 'boolean' && typeof bValue === 'boolean') {
        return sortDirection === 'asc' 
          ? (aValue === bValue ? 0 : aValue ? 1 : -1)
          : (aValue === bValue ? 0 : aValue ? -1 : 1);
      }

      return 0;
    });

    return filtered;
  }, [bills, sortField, sortDirection, filterOwner, filterAddress]);

  const handleSort = (field: keyof BillData) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getUserProvidedAddress = (propertyId: string) => {
    if (!propertyId || !selectedAccounts || selectedAccounts.length === 0) {
      return null;
    }

    // Find the account that matches this property ID
    const account = selectedAccounts.find(acc => acc.id === propertyId);
    if (account && account.address) {
      const { street, city, state, zipCode } = account.address;
      return `${street}, ${city}, ${state} ${zipCode}`;
    }

    return null;
  };

  const handleCloseModal = () => {
    setShowDetailModal(false);
    setSelectedBill(null);
  };

  const handleRowClick = (bill: BillData) => {
    setSelectedBill(bill);
    setShowDetailModal(true);
  };

  const handleRowExpand = (billId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(billId)) {
        newSet.delete(billId);
      } else {
        newSet.add(billId);
      }
      return newSet;
    });
  };

  // Check for potential duplicates
  const checkForDuplicates = (bill: BillData): BillData[] => {
    return bills.filter(otherBill => 
      otherBill.id !== bill.id && 
      otherBill.accountNumber === bill.accountNumber &&
      otherBill.totalAmountDue === bill.totalAmountDue &&
      otherBill.billDueDate === bill.billDueDate
    );
  };

  if (bills.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No bill data available. Extract some bills to get started!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Filter by Owner
          </label>
          <input
            type="text"
            value={filterOwner}
            onChange={(e) => setFilterOwner(e.target.value)}
            placeholder="Search by owner name..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Filter by Address
          </label>
          <input
            type="text"
            value={filterAddress}
            onChange={(e) => setFilterAddress(e.target.value)}
            placeholder="Search by address..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Filter by Account
          </label>
          <input
            type="text"
            value={filterAccount}
            onChange={(e) => setFilterAccount(e.target.value)}
            placeholder="Search by account number..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Filter by Official Address
          </label>
          <input
            type="text"
            value={filterOfficialAddress}
            onChange={(e) => setFilterOfficialAddress(e.target.value)}
            placeholder="Search by official address..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-200 rounded-lg">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
              <th 
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('ownerName')}
              >
                Owner Name
                {sortField === 'ownerName' && (
                  <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
              <th 
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('accountNumber')}
              >
                Account #
                {sortField === 'accountNumber' && (
                  <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
              <th 
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('utilityProvider')}
              >
                Utility Provider
                {sortField === 'utilityProvider' && (
                  <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
              <th 
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('homeAddress')}
              >
                Address
                {sortField === 'homeAddress' && (
                  <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
              <th 
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('confidenceScore')}
              >
                Confidence
                {sortField === 'confidenceScore' && (
                  <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
              <th 
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('addressMatchScore')}
              >
                Address Match
                {sortField === 'addressMatchScore' && (
                  <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Official Address
              </th>
              <th 
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('billDueDate')}
              >
                Due Date
                {sortField === 'billDueDate' && (
                  <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
              <th 
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('totalAmountDue')}
              >
                Amount Due
                {sortField === 'totalAmountDue' && (
                  <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
              <th 
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('paymentStatus')}
              >
                Payment Status
                {sortField === 'paymentStatus' && (
                  <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
              <th 
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('averageDailyElectricUsage')}
              >
                Daily Usage (kWh)
                {sortField === 'averageDailyElectricUsage' && (
                  <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
              <th 
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('isAutoPayEnabled')}
              >
                Auto Pay
                {sortField === 'isAutoPayEnabled' && (
                  <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
              <th 
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('createdAt')}
              >
                Extracted
                {sortField === 'createdAt' && (
                  <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Image
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {sortedAndFilteredBills.map((bill) => {
              const duplicates = checkForDuplicates(bill);
              const isExpanded = expandedRows.has(bill.id);
              
              return (
                <React.Fragment key={bill.id}>
                  <tr 
                    className={`hover:bg-gray-50 cursor-pointer ${
                      bill.status === 'rejected' ? 'bg-red-50' :
                      bill.confidenceScore < 95 ? 'bg-yellow-50' : ''
                    } ${
                      duplicates.length > 0 ? 'bg-orange-50' : ''
                    }`}
                    onClick={() => handleRowClick(bill)}
                  >
                <td className="px-4 py-3 text-sm text-gray-900">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={(e) => handleRowExpand(bill.id, e)}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      {isExpanded ? '▼' : '▶'}
                    </button>
                    {duplicates.length > 0 && (
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800">
                        Duplicate
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-900">
                  <div className="flex items-center space-x-2">
                    <span>{bill.ownerName}</span>
                    {bill.status === 'approved' && (
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                        Approved
                      </span>
                    )}
                    {bill.wasEdited && (
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                        Edited
                      </span>
                    )}
                    {bill.status === 'rejected' && (
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                        Rejected
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-900">
                  {bill.accountNumber}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900">
                  {bill.utilityProvider || (
                    <span className="text-gray-400 italic">Not specified</span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900">
                  <div className="max-w-xs truncate" title={bill.homeAddress}>
                    {bill.homeAddress}
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-900">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    bill.confidenceScore >= 95 ? 'bg-green-100 text-green-800' : 
                    bill.confidenceScore >= 70 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {bill.confidenceScore}%
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-900">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    bill.addressMatchScore >= 75 ? 'bg-green-100 text-green-800' : 
                    bill.addressMatchScore >= 50 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {bill.addressMatchScore}%
                  </span>
                  {bill.matchedPropertyAddress && (
                    <div className="text-xs text-gray-500 mt-1 truncate max-w-xs" title={bill.matchedPropertyAddress}>
                      Belongs to: {bill.matchedPropertyAddress}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900">
                  {bill.associatedPropertyId ? (
                    <div className="max-w-xs truncate" title={bill.associatedPropertyId}>
                      {(() => {
                        const userAddress = getUserProvidedAddress(bill.associatedPropertyId);
                        if (userAddress) {
                          return (
                            <div>
                              <span className="text-blue-600 font-medium">
                                {userAddress}
                              </span>
                              <div className="text-xs text-blue-600 mt-1">
                                📍 User Address
                              </div>
                            </div>
                          );
                        }
                        
                        if (bill.associatedPropertyId.startsWith('new-')) {
                          return (
                            <div>
                              <span className="text-green-600 font-medium">
                                {bill.associatedPropertyId.substring(4)}
                              </span>
                              <div className="text-xs text-green-600 mt-1">
                                ✨ New Property
                              </div>
                            </div>
                          );
                        } else if (bill.associatedPropertyId.startsWith('property-')) {
                          return (
                            <div>
                              <span className="text-blue-600 font-medium">
                                Property #{bill.associatedPropertyId.substring(9)}
                              </span>
                              <div className="text-xs text-blue-600 mt-1">
                                📍 Existing Property
                              </div>
                            </div>
                          );
                        } else {
                          return (
                            <span className="text-purple-600 font-medium">
                              {bill.associatedPropertyId}
                            </span>
                          );
                        }
                      })()}
                    </div>
                  ) : bill.status === 'approved' ? (
                    <span className="text-orange-400 italic">Pending assignment</span>
                  ) : (
                    <span className="text-gray-400 italic">Not assigned</span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900">
                  {formatDate(bill.billDueDate)}
                </td>
                <td className="px-4 py-3 text-sm font-medium text-gray-900">
                  {formatCurrency(bill.totalAmountDue)}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    bill.paymentStatus === 'paid' ? 'bg-green-100 text-green-800' :
                    bill.paymentStatus === 'failed' ? 'bg-red-100 text-red-800' :
                    bill.paymentStatus === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {bill.paymentStatus === 'paid' ? 'Paid' :
                     bill.paymentStatus === 'failed' ? 'Failed' :
                     bill.paymentStatus === 'pending' ? 'Pending' :
                     'Unpaid'}
                  </span>
                  {bill.paymentStatus === 'paid' && bill.paidAt && (
                    <div className="text-xs text-gray-500 mt-1">
                      {formatDate(bill.paidAt)}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900">
                  {bill.averageDailyElectricUsage.toFixed(2)}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    bill.isAutoPayEnabled 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {bill.isAutoPayEnabled ? 'Yes' : 'No'}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-900">
                  {formatDate(bill.createdAt)}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900">
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      try {
                        const result = await billExtractionService.generateImageAccessToken(bill.imageUrl);
                        if (result.success && result.url) {
                          window.open(result.url, '_blank', 'noopener,noreferrer');
                        } else {
                          console.error('Failed to generate access token:', result.error);
                          alert('Failed to access image. Please try again.');
                        }
                      } catch (error) {
                        console.error('Error accessing image:', error);
                        alert('Failed to access image. Please try again.');
                      }
                    }}
                    className="text-blue-600 hover:text-blue-800 underline text-xs bg-transparent border-none cursor-pointer"
                  >
                    View Image
                  </button>
                </td>
                  </tr>
                  
                  {/* Expanded row with approve/reject buttons */}
                  {isExpanded && (
                    <tr className="bg-gray-50">
                      <td colSpan={15} className="px-4 py-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <span className="text-sm text-gray-600">Actions:</span>
                            {bill.status === 'rejected' ? (
                              <>
                                {onUnreject && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onUnreject(bill.id);
                                    }}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                                  >
                                    Unreject
                                  </button>
                                )}
                                {onApprove && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onApprove(bill.id);
                                    }}
                                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                                  >
                                    Approve
                                  </button>
                                )}
                              </>
                            ) : (
                              <>
                                {onApprove && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onApprove(bill.id);
                                    }}
                                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                                  >
                                    Approve
                                  </button>
                                )}
                                {onReject && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onReject(bill.id);
                                    }}
                                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                                  >
                                    Reject
                                  </button>
                                )}
                              </>
                            )}
                            {onDelete && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDelete(bill.id);
                                }}
                                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium"
                              >
                                Delete
                              </button>
                            )}
                            {onLaunchAgent && bill.status === 'approved' && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onLaunchAgent(bill.id);
                                }}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                              >
                                Launch Agent
                              </button>
                            )}
                          </div>
                          {duplicates.length > 0 && (
                            <div className="text-sm text-orange-600">
                              <span className="font-medium">Potential Duplicate:</span> Found {duplicates.length} similar entries with same account number, amount, and due date.
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Summary */}
      <div className="text-sm text-gray-600">
        Showing {sortedAndFilteredBills.length} of {bills.length} bills
      </div>

      {/* Bill Detail Modal */}
      <BillDetailModal
        isOpen={showDetailModal}
        onClose={handleCloseModal}
        bill={selectedBill}
        onApprove={onApprove}
        onReject={onReject}
        onDataUpdated={onDataUpdated}
        propertyAddresses={propertyAddresses}
      />
    </div>
  );
};
