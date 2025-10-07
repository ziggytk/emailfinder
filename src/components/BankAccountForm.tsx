import React, { useState } from 'react';

interface BankAccountFormProps {
  propertyId: string;
  userId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export const BankAccountForm: React.FC<BankAccountFormProps> = ({
  propertyId,
  userId,
  onSuccess,
  onCancel,
}) => {
  const [formData, setFormData] = useState({
    accountNumber: '',
    routingNumber: '',
    accountHolderName: '',
    accountHolderType: 'individual' as 'individual' | 'company',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Import bank account service
      const { bankAccountService } = await import('../services/bankAccountService');

      // Validate inputs
      if (formData.routingNumber.length !== 9) {
        throw new Error('Routing number must be 9 digits');
      }

      if (formData.accountNumber.length < 4) {
        throw new Error('Account number must be at least 4 digits');
      }

      // Create bank account token
      const result = await bankAccountService.createBankAccount({
        propertyId,
        userId,
        ...formData,
      });

      if (result.success) {
        alert('✅ Bank account added successfully!');
        onSuccess();
      } else {
        throw new Error(result.error || 'Failed to add bank account');
      }
    } catch (err) {
      console.error('❌ Error adding bank account:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Account Holder Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Account Holder Name *
        </label>
        <input
          type="text"
          required
          value={formData.accountHolderName}
          onChange={(e) =>
            setFormData({ ...formData, accountHolderName: e.target.value })
          }
          placeholder="John Doe"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Routing Number */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Routing Number * (9 digits)
        </label>
        <input
          type="text"
          required
          value={formData.routingNumber}
          onChange={(e) =>
            setFormData({
              ...formData,
              routingNumber: e.target.value.replace(/\D/g, '').slice(0, 9),
            })
          }
          placeholder="110000000"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p className="text-xs text-gray-500 mt-1">
          Found at the bottom of your check
        </p>
      </div>

      {/* Account Number */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Account Number *
        </label>
        <input
          type="text"
          required
          value={formData.accountNumber}
          onChange={(e) =>
            setFormData({
              ...formData,
              accountNumber: e.target.value.replace(/\D/g, ''),
            })
          }
          placeholder="000123456789"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p className="text-xs text-gray-500 mt-1">
          Found at the bottom of your check
        </p>
      </div>

      {/* Account Type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Account Type *
        </label>
        <select
          value={formData.accountHolderType}
          onChange={(e) =>
            setFormData({
              ...formData,
              accountHolderType: e.target.value as 'individual' | 'company',
            })
          }
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="individual">Individual</option>
          <option value="company">Company</option>
        </select>
      </div>

      {/* Security Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
        <div className="flex items-start">
          <svg
            className="w-5 h-5 text-blue-600 mt-0.5 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
          <div>
            <p className="text-sm font-medium text-blue-900">
              🔒 Secure Payment Processing
            </p>
            <p className="text-xs text-blue-700 mt-1">
              Your bank account details are securely encrypted and stored by
              Stripe. We never store your full account number.
            </p>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3 text-sm text-red-700">
          ❌ {error}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-end space-x-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Adding...' : 'Add Bank Account'}
        </button>
      </div>
    </form>
  );
};

