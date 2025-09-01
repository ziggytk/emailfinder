import React, { useState } from 'react';
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { BillData } from '../types/bill';
import { StripeService } from '../services/stripeService';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  bill: BillData | null;
  onPaymentSuccess: (billId: string, paymentIntentId: string) => void;
}

const CARD_ELEMENT_OPTIONS = {
  style: {
    base: {
      fontSize: '16px',
      color: '#424770',
      '::placeholder': {
        color: '#aab7c4',
      },
    },
    invalid: {
      color: '#9e2146',
    },
  },
};

const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  bill,
  onPaymentSuccess,
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !bill) return null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Create payment intent using our service
      const { clientSecret, error: serverError } = await StripeService.createPaymentIntent({
        amount: Math.round(parseFloat(bill.totalAmountDue) * 100), // Convert to cents
        billId: bill.id,
        description: `Utility Bill - ${bill.ownerName} - ${bill.homeAddress}`,
      });

      if (serverError) {
        throw new Error(serverError);
      }

      // Check if this is a mock payment (for development)
      if (clientSecret.startsWith('pi_mock_')) {
        // Simulate payment processing delay
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Mock successful payment
        const mockPaymentIntentId = `pi_mock_${Date.now()}`;
        onPaymentSuccess(bill.id, mockPaymentIntentId);
        onClose();
        return;
      }

      // Real Stripe payment flow
      const { error: paymentError, paymentIntent } = await stripe.confirmCardPayment(
        clientSecret,
        {
          payment_method: {
            card: elements.getElement(CardElement)!,
            billing_details: {
              name: bill.ownerName,
              address: {
                line1: bill.homeAddress,
              },
            },
          },
        }
      );

      if (paymentError) {
        throw new Error(paymentError.message);
      }

      if (paymentIntent?.status === 'succeeded') {
        onPaymentSuccess(bill.id, paymentIntent.id);
        onClose();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment failed');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Pay Bill</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
            disabled={isProcessing}
          >
            ✕
          </button>
        </div>

        <div className="mb-4">
          <div className="bg-gray-50 p-3 rounded mb-4">
            <h3 className="font-medium text-gray-900">Bill Details</h3>
            <p className="text-sm text-gray-600">{bill.ownerName}</p>
            <p className="text-sm text-gray-600">{bill.homeAddress}</p>
            <p className="text-lg font-semibold text-green-600">
              ${bill.totalAmountDue}
            </p>
          </div>
          
          {/* Development Mode Notice */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">
                  Development Mode
                </h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <p>This is a mock payment for testing. No real charges will be made.</p>
                  <p className="mt-1">Use any card number to test the payment flow.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Card Information
            </label>
            <div className="border border-gray-300 rounded-md p-3">
              <CardElement options={CARD_ELEMENT_OPTIONS} />
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              disabled={isProcessing}
            >
              Cancel
            </button>
                          <button
                type="submit"
                disabled={!stripe || isProcessing}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? 'Processing...' : `Test Payment $${bill.totalAmountDue}`}
              </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PaymentModal;
