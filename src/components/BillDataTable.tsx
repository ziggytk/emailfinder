import React, { useState, useMemo } from 'react';
import { BillData } from '../types/bill';
import { BillDetailModal } from './BillDetailModal';
import { billExtractionService } from '../services/billExtractionService';

interface BillDataTableProps {
  bills: BillData[];
  onDelete?: (id: string) => void;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
  onDataUpdated?: (updatedBill: BillData) => void;
}

export const BillDataTable: React.FC<BillDataTableProps> = ({ bills, onDelete, onApprove, onReject, onDataUpdated }) => {
  const [sortField, setSortField] = useState<keyof BillData>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [filterOwner, setFilterOwner] = useState('');
  const [filterAddress, setFilterAddress] = useState('');
  const [filterAccount, setFilterAccount] = useState('');
  const [selectedBill, setSelectedBill] = useState<BillData | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const sortedAndFilteredBills = useMemo(() => {
    let filtered = bills.filter(bill => {
      const ownerMatch = bill.ownerName.toLowerCase().includes(filterOwner.toLowerCase());
      const addressMatch = bill.homeAddress.toLowerCase().includes(filterAddress.toLowerCase());
      const accountMatch = bill.accountNumber.toLowerCase().includes(filterAccount.toLowerCase());
      return ownerMatch && addressMatch && accountMatch;
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                    {bill.wasEdited && (
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                        Edited
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-900">
                  {bill.accountNumber}
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
                  {formatDate(bill.billDueDate)}
                </td>
                <td className="px-4 py-3 text-sm font-medium text-gray-900">
                  {formatCurrency(bill.totalAmountDue)}
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
                      <td colSpan={12} className="px-4 py-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <span className="text-sm text-gray-600">Actions:</span>
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
      />
    </div>
  );
};
