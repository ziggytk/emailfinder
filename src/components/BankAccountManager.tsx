import React, { useState, useEffect } from 'react';
import { BankAccountDetails } from '../services/bankAccountService';

interface BankAccountManagerProps {
  propertyId: string;
  userId: string;
  onAddNew: () => void;
}

export const BankAccountManager: React.FC<BankAccountManagerProps> = ({
  propertyId,
  userId,
  onAddNew,
}) => {
  const [bankAccount, setBankAccount] = useState<BankAccountDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load bank account on mount
  useEffect(() => {
    loadBankAccount();
  }, [propertyId]);

  const loadBankAccount = async () => {
    setLoading(true);
    setError(null);

    try {
      const { bankAccountService } = await import('../services/bankAccountService');
      const result = await bankAccountService.getBankAccount(propertyId, userId);

      if (result.success && result.data) {
        setBankAccount(result.data);
      } else {
        setBankAccount(null);
      }
    } catch (err) {
      console.error('❌ Failed to load bank account:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to remove this bank account?')) {
      return;
    }

    try {
      const { bankAccountService } = await import('../services/bankAccountService');
      const result = await bankAccountService.deleteBankAccount(propertyId, userId);

      if (result.success) {
        alert('✅ Bank account removed successfully!');
        setBankAccount(null);
      } else {
        throw new Error(result.error || 'Failed to delete bank account');
      }
    } catch (err) {
      console.error('❌ Failed to delete bank account:', err);
      alert(`Failed to delete: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-sm text-gray-500 mt-2">Loading bank account...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4 text-sm text-red-700">
        ❌ {error}
      </div>
    );
  }

  if (!bankAccount) {
    return (
      <div className="text-center py-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
          <svg
            className="w-8 h-8 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          No Bank Account Added
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          Add a bank account to enable automatic bill payments for this property.
        </p>
        <button
          onClick={onAddNew}
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
        >
          <svg
            className="w-5 h-5 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          Add Bank Account
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg
                className="w-6 h-6 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                />
              </svg>
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <h4 className="text-sm font-medium text-gray-900">
                {bankAccount.bankName || 'Bank Account'}
              </h4>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                ✓ Verified
              </span>
            </div>

            <div className="mt-1 space-y-1">
              <p className="text-sm text-gray-600">
                Account ending in <span className="font-mono">•••• {bankAccount.accountLast4}</span>
              </p>
              <p className="text-sm text-gray-600">
                Routing: <span className="font-mono">{bankAccount.routingNumber}</span>
              </p>
              <p className="text-sm text-gray-600">
                Name: {bankAccount.accountHolderName}
              </p>
              <p className="text-xs text-gray-500">
                Added on {new Date(bankAccount.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={handleDelete}
          className="flex-shrink-0 text-red-600 hover:text-red-800"
          title="Remove bank account"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
        </button>
      </div>
    </div>
  );
};

