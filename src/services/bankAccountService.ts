/**
 * Bank Account Service
 * Handles secure bank account tokenization and storage via Stripe
 */

const API_BASE_URL = 'http://localhost:3000';

export interface BankAccountRequest {
  propertyId: string;
  accountNumber: string;
  routingNumber: string;
  accountHolderName: string;
  accountHolderType: 'individual' | 'company';
  userId: string;
}

export interface BankAccountDetails {
  id: string;
  propertyId: string;
  bankName: string;
  accountLast4: string;
  accountHolderName: string;
  routingNumber: string;
  createdAt: string;
}

export interface BankAccountResponse {
  success: boolean;
  data?: BankAccountDetails;
  error?: string;
}

export const bankAccountService = {
  /**
   * Create and store a new bank account token
   */
  async createBankAccount(request: BankAccountRequest): Promise<BankAccountResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/stripe/create-bank-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create bank account');
      }

      return response.json();
    } catch (error) {
      console.error('❌ Failed to create bank account:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },

  /**
   * Get bank account details for a property
   */
  async getBankAccount(propertyId: string, userId: string): Promise<BankAccountResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/stripe/bank-details/${propertyId}?userId=${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get bank account');
      }

      return response.json();
    } catch (error) {
      console.error('❌ Failed to get bank account:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },

  /**
   * Delete a bank account token
   */
  async deleteBankAccount(propertyId: string, userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/stripe/bank-token/${propertyId}?userId=${userId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete bank account');
      }

      return { success: true };
    } catch (error) {
      console.error('❌ Failed to delete bank account:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },
};

