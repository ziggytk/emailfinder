import { supabase } from './supabaseClient';

export interface PaymentIntentRequest {
  amount: number; // Amount in cents
  billId: string;
  description: string;
}

export interface PaymentIntentResponse {
  clientSecret: string;
  error?: string;
}

export class StripeService {
  static async createPaymentIntent(request: PaymentIntentRequest): Promise<PaymentIntentResponse> {
    try {
      // For now, we'll simulate the payment intent creation
      // In a real implementation, this would call your Supabase Edge Function
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Generate a mock client secret for development
      // In production, this would be a real Stripe client secret
      const mockClientSecret = `pi_mock_${Date.now()}_secret_${Math.random().toString(36).substr(2, 9)}`;
      
      console.log('🔧 Mock payment intent created:', {
        amount: request.amount,
        billId: request.billId,
        description: request.description,
        clientSecret: mockClientSecret
      });
      
      return {
        clientSecret: mockClientSecret,
      };
    } catch (error) {
      console.error('Error creating payment intent:', error);
      return {
        clientSecret: '',
        error: error instanceof Error ? error.message : 'Failed to create payment intent',
      };
    }
  }

  static async updateBillPaymentStatus(
    billId: string, 
    paymentIntentId: string, 
    status: 'paid' | 'failed' | 'pending'
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        throw new Error('User not authenticated');
      }

      const updateData = {
        payment_status: status,
        stripe_payment_intent_id: paymentIntentId,
        paid_at: status === 'paid' ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('bill_extractions')
        .update(updateData)
        .eq('id', billId)
        .eq('user_id', user.id);

      if (error) {
        throw error;
      }

      return { success: true };
    } catch (error) {
      console.error('Error updating bill payment status:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update payment status',
      };
    }
  }

  static async getPaymentHistory(billId: string): Promise<any[]> {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase
        .from('bill_extractions')
        .select('payment_status, stripe_payment_intent_id, paid_at')
        .eq('id', billId)
        .eq('user_id', user.id)
        .single();

      if (error) {
        throw error;
      }

      return data ? [data] : [];
    } catch (error) {
      console.error('Error getting payment history:', error);
      return [];
    }
  }
}
