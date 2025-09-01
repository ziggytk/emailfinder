import { supabase } from './supabaseClient';
import { BillData } from '../types/bill';

export class BillExtractionService {
  /**
   * Save extracted bill data to the database
   */
  async saveBillExtraction(billData: BillData): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error('User not authenticated');
      }

      // Check for existing entry with same image URL
      // Use a more robust approach to avoid URL encoding issues
      const { data: existingData, error: checkError } = await supabase
        .from('bill_extractions')
        .select('id')
        .eq('user_id', user.id)
        .ilike('image_url', billData.imageUrl.split('?')[0] + '%') // Match base URL without query params
        .limit(1);

      if (checkError) {
        throw checkError;
      }

      const existingRecord = existingData && existingData.length > 0 ? existingData[0] : null;

      if (existingRecord) {
        console.log('⚠️ Bill extraction already exists for this image URL, updating instead');
        // Update existing record instead of creating duplicate
        const { error: updateError } = await supabase
          .from('bill_extractions')
          .update({
            owner_name: billData.ownerName,
            home_address: billData.homeAddress,
            account_number: billData.accountNumber,
            bill_due_date: billData.billDueDate,
            is_auto_pay_enabled: billData.isAutoPayEnabled,
            average_daily_electric_usage: billData.averageDailyElectricUsage,
            next_billing_date: billData.nextBillingDate,
            billing_period_start: billData.billingPeriodStart,
            billing_period_end: billData.billingPeriodEnd,
            billing_days: billData.billingDays,
            total_amount_due: billData.totalAmountDue,
            confidence_score: billData.confidenceScore,
            address_match_score: billData.addressMatchScore,
            matched_property_address: billData.matchedPropertyAddress,
            utility_provider: billData.utilityProvider,
            associated_property_id: billData.associatedPropertyId,
            status: billData.status,
            was_edited: false, // Reset to false since this is a fresh extraction
            updated_at: new Date().toISOString()
          })
          .eq('id', existingRecord.id);

        if (updateError) {
          throw updateError;
        }
      } else {
        // Insert new record
        const { error } = await supabase
          .from('bill_extractions')
          .insert({
            user_id: user.id,
            image_url: billData.imageUrl,
            owner_name: billData.ownerName,
            home_address: billData.homeAddress,
            account_number: billData.accountNumber,
            bill_due_date: billData.billDueDate,
            is_auto_pay_enabled: billData.isAutoPayEnabled,
            average_daily_electric_usage: billData.averageDailyElectricUsage,
            next_billing_date: billData.nextBillingDate,
            billing_period_start: billData.billingPeriodStart,
            billing_period_end: billData.billingPeriodEnd,
            billing_days: billData.billingDays,
            total_amount_due: billData.totalAmountDue,
            confidence_score: billData.confidenceScore,
            address_match_score: billData.addressMatchScore,
            matched_property_address: billData.matchedPropertyAddress,
            utility_provider: billData.utilityProvider,
            associated_property_id: billData.associatedPropertyId,
            status: billData.status,
            was_edited: billData.wasEdited
          });

        if (error) {
          throw error;
        }
      }

      return { success: true };

      return { success: true };
    } catch (error) {
      console.error('Error saving bill extraction:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Get all bill extractions for the current user
   */
  async getBillExtractions(): Promise<{ success: boolean; data?: BillData[]; error?: string }> {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase
        .from('bill_extractions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      // Convert database format to BillData format
      const billData: BillData[] = data.map(row => ({
        id: row.id,
        imageUrl: row.image_url,
        ownerName: row.owner_name,
        homeAddress: row.home_address,
        accountNumber: row.account_number,
        billDueDate: row.bill_due_date,
        isAutoPayEnabled: row.is_auto_pay_enabled,
        averageDailyElectricUsage: row.average_daily_electric_usage,
        nextBillingDate: row.next_billing_date,
        billingPeriodStart: row.billing_period_start,
        billingPeriodEnd: row.billing_period_end,
        billingDays: row.billing_days,
        totalAmountDue: row.total_amount_due,
        confidenceScore: row.confidence_score,
        addressMatchScore: row.address_match_score,
        matchedPropertyAddress: row.matched_property_address,
        utilityProvider: row.utility_provider,
        status: row.status,
        wasEdited: row.was_edited,
        rejectionComment: row.rejection_comment,
        associatedPropertyId: row.associated_property_id,
        paymentStatus: row.payment_status,
        stripePaymentIntentId: row.stripe_payment_intent_id,
        paidAt: row.paid_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));

      return { success: true, data: billData };
    } catch (error) {
      console.error('Error fetching bill extractions:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Delete a bill extraction
   */
  async deleteBillExtraction(billId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error('User not authenticated');
      }

      const { error } = await supabase
        .from('bill_extractions')
        .delete()
        .eq('id', billId)
        .eq('user_id', user.id);

      if (error) {
        throw error;
      }

      return { success: true };
    } catch (error) {
      console.error('Error deleting bill extraction:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Approve a bill extraction
   */
  async approveBillExtraction(billId: string, propertyId?: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error('User not authenticated');
      }

      const updateData: any = { 
        status: 'approved',
        associated_property_id: propertyId,
        updated_at: new Date().toISOString()
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
      console.error('Error approving bill extraction:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Reject a bill extraction
   */
  async rejectBillExtraction(billId: string, comment?: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error('User not authenticated');
      }

      const updateData: any = { 
        status: 'rejected',
        updated_at: new Date().toISOString()
      };

      if (comment) {
        updateData.rejection_comment = comment;
      }

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
      console.error('Error rejecting bill extraction:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Update bill status
   */
  async updateBillStatus(billId: string, status: 'pending' | 'approved' | 'rejected'): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error('User not authenticated');
      }

      const updateData: any = { 
        status: status,
        updated_at: new Date().toISOString()
      };

      // Clear rejection comment if moving away from rejected status
      if (status !== 'rejected') {
        updateData.rejection_comment = null;
      }

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
      console.error('Error updating bill status:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Update bill extraction data
   */
  async updateBillExtraction(billId: string, updatedData: BillData): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error('User not authenticated');
      }

      const { error } = await supabase
        .from('bill_extractions')
        .update({
          owner_name: updatedData.ownerName,
          home_address: updatedData.homeAddress,
          account_number: updatedData.accountNumber,
          bill_due_date: updatedData.billDueDate,
          is_auto_pay_enabled: updatedData.isAutoPayEnabled,
          average_daily_electric_usage: updatedData.averageDailyElectricUsage,
          next_billing_date: updatedData.nextBillingDate,
          billing_period_start: updatedData.billingPeriodStart,
          billing_period_end: updatedData.billingPeriodEnd,
          billing_days: updatedData.billingDays,
          total_amount_due: updatedData.totalAmountDue,
          utility_provider: updatedData.utilityProvider,
          was_edited: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', billId)
        .eq('user_id', user.id);

      if (error) {
        throw error;
      }

      return { success: true };
    } catch (error) {
      console.error('Error updating bill extraction:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Generate a fresh access token for viewing an image
   */
  async generateImageAccessToken(imageUrl: string): Promise<{ success: boolean; url?: string; error?: string }> {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error('User not authenticated');
      }

      // Extract the file path from the Supabase URL
      // The URL format is: https://project.supabase.co/storage/v1/object/public/bucket/path/to/file
      const urlParts = imageUrl.split('/');
      const bucketIndex = urlParts.findIndex(part => part === 'utility-bills');
      
      if (bucketIndex === -1) {
        throw new Error('Invalid storage URL format');
      }
      
      // Get everything after the bucket name as the file path
      const filePath = urlParts.slice(bucketIndex + 1).join('/');
      
      console.log('🔍 Extracting file path from URL:', {
        originalUrl: imageUrl,
        filePath: filePath,
        urlParts: urlParts
      });
      
      // Generate a signed URL that expires in 1 hour
      const { data, error } = await supabase.storage
        .from('utility-bills')
        .createSignedUrl(filePath, 3600); // 1 hour expiry

      if (error) {
        console.error('❌ Supabase storage error:', error);
        throw error;
      }

      console.log('✅ Generated signed URL successfully');
      return { success: true, url: data.signedUrl };
    } catch (error) {
      console.error('Error generating image access token:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Get analytics data for bill extractions
   */
  async getAnalytics(): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase
        .from('bill_extractions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      // Calculate analytics
      const analytics = {
        totalBills: data.length,
        totalAmount: data.reduce((sum, bill) => sum + parseFloat(bill.total_amount_due), 0),
        averageAmount: data.length > 0 ? data.reduce((sum, bill) => sum + parseFloat(bill.total_amount_due), 0) / data.length : 0,
        averageDailyUsage: data.length > 0 ? data.reduce((sum, bill) => sum + parseFloat(bill.average_daily_electric_usage), 0) / data.length : 0,
        autoPayEnabled: data.filter(bill => bill.is_auto_pay_enabled).length,
        autoPayDisabled: data.filter(bill => !bill.is_auto_pay_enabled).length,
        billsByMonth: this.groupBillsByMonth(data)
      };

      return { success: true, data: analytics };
    } catch (error) {
      console.error('Error fetching analytics:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Group bills by month for charting
   */
  private groupBillsByMonth(bills: any[]): any[] {
    const monthlyData: { [key: string]: any } = {};

    bills.forEach(bill => {
      const date = new Date(bill.bill_due_date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {
          month: monthKey,
          count: 0,
          totalAmount: 0,
          totalUsage: 0
        };
      }

      monthlyData[monthKey].count += 1;
      monthlyData[monthKey].totalAmount += parseFloat(bill.total_amount_due);
      monthlyData[monthKey].totalUsage += parseFloat(bill.average_daily_electric_usage);
    });

    return Object.values(monthlyData).sort((a, b) => a.month.localeCompare(b.month));
  }
}

export const billExtractionService = new BillExtractionService();
