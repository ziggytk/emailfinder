import React, { useState } from 'react';
import { BankAccountForm } from './BankAccountForm';
import { BankAccountManager } from './BankAccountManager';

interface PaymentMethodsModalProps {
  isOpen: boolean;
  onClose: () => void;
  propertyId: string;
  userId: string;
  propertyAddress: string;
}

export const PaymentMethodsModal: React.FC<PaymentMethodsModalProps> = ({
  isOpen,
  onClose,
  propertyId,
  userId,
  propertyAddress,
}) => {
  const [showAddForm, setShowAddForm] = useState(false);

  if (!isOpen) return null;

  const handleSuccess = () => {
    setShowAddForm(false);
    // Force refresh by re-rendering the manager
  };

  const handleAddNew = () => {
    setShowAddForm(true);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Payment Methods
              </h2>
              <p className="text-sm text-gray-500 mt-1">{propertyAddress}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-4">
            {showAddForm ? (
              <div>
                <div className="mb-4">
                  <h3 className="text-lg font-medium text-gray-900 mb-1">
                    Add Bank Account
                  </h3>
                  <p className="text-sm text-gray-500">
                    Securely add your bank account for automatic bill payments
                  </p>
                </div>
                <BankAccountForm
                  propertyId={propertyId}
                  userId={userId}
                  onSuccess={handleSuccess}
                  onCancel={() => setShowAddForm(false)}
                />
              </div>
            ) : (
              <div>
                <div className="mb-4">
                  <h3 className="text-lg font-medium text-gray-900 mb-1">
                    Bank Accounts
                  </h3>
                  <p className="text-sm text-gray-500">
                    Manage bank accounts for automatic bill payments
                  </p>
                </div>
                <BankAccountManager
                  key={`${propertyId}-${showAddForm}`} // Force re-render on form close
                  propertyId={propertyId}
                  userId={userId}
                  onAddNew={handleAddNew}
                />
              </div>
            )}
          </div>

          {/* Footer */}
          {!showAddForm && (
            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-start space-x-2">
                  <svg
                    className="w-5 h-5 text-green-600 mt-0.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                    />
                  </svg>
                  <div>
                    <p className="text-xs font-medium text-gray-900">
                      Secured by Stripe
                    </p>
                    <p className="text-xs text-gray-500">
                      Your payment information is encrypted and secure
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

