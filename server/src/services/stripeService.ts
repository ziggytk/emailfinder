import Stripe from 'stripe';

// Lazy-initialize Stripe (only when first used, after dotenv.config())
let stripe: Stripe | null = null;

function getStripeClient(): Stripe {
  if (!stripe) {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    
    if (!stripeSecretKey) {
      throw new Error('STRIPE_SECRET_KEY is not configured in environment variables');
    }
    
    stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16' // Use supported API version
    });
  }
  
  return stripe;
}

export interface BankAccountTokenRequest {
  accountNumber: string;
  routingNumber: string;
  accountHolderName: string;
  accountHolderType: 'individual' | 'company';
}

export interface BankAccountDetails {
  last4: string;
  bankName: string;
  accountHolderName: string;
  routingNumber: string;
  accountNumber?: string; // Full account number (only available from token)
}

export class StripeService {
  /**
   * Create a bank account token for secure storage
   */
  static async createBankAccountToken(
    request: BankAccountTokenRequest
  ): Promise<{ tokenId: string; last4: string; bankName: string }> {
    try {
      console.log('🏦 Creating Stripe bank account token...');

      // Create a token for the bank account
      const client = getStripeClient();
      const token = await client.tokens.create({
        bank_account: {
          country: 'US',
          currency: 'usd',
          account_holder_name: request.accountHolderName,
          account_holder_type: request.accountHolderType,
          routing_number: request.routingNumber,
          account_number: request.accountNumber,
        },
      });

      console.log('✅ Bank account token created:', token.id);

      return {
        tokenId: token.id,
        last4: token.bank_account?.last4 || '',
        bankName: token.bank_account?.bank_name || 'Unknown Bank',
      };
    } catch (error) {
      console.error('❌ Failed to create bank account token:', error);
      throw new Error(
        `Failed to tokenize bank account: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get bank account details from a token (for verification)
   * Note: Stripe tokens expire after use, so we'll store metadata separately
   */
  static async getBankAccountDetails(tokenId: string): Promise<BankAccountDetails> {
    try {
      console.log('🔍 Retrieving bank account details for token:', tokenId);

      const client = getStripeClient();
      const token = await client.tokens.retrieve(tokenId);

      if (!token.bank_account) {
        throw new Error('Token does not contain bank account information');
      }

      return {
        last4: token.bank_account.last4,
        bankName: token.bank_account.bank_name || 'Unknown Bank',
        accountHolderName: token.bank_account.account_holder_name || '',
        routingNumber: token.bank_account.routing_number || '',
      };
    } catch (error) {
      console.error('❌ Failed to retrieve bank account details:', error);
      throw new Error(
        `Failed to get bank account details: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get bank account details from Supabase for payment processing
   * Returns the FULL account number from the database (NOT from Stripe token)
   */
  static async getBankAccountDetailsFromDB(propertyId: string): Promise<BankAccountDetails & { accountNumber: string } | null> {
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_KEY;

      if (!supabaseUrl || !supabaseServiceKey) {
        throw new Error('Supabase configuration missing');
      }

      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      // Query the property_bank_accounts table
      const { data, error } = await supabase
        .from('property_bank_accounts')
        .select('*')
        .eq('property_id', propertyId)
        .single();

      if (error || !data) {
        console.log('⚠️ No bank account found for property:', propertyId);
        return null;
      }

      // Decrypt the account number
      let accountNumber = '';
      if (data.encrypted_account_number) {
        try {
          const { decrypt } = await import('../utils/encryption');
          const encryptionKey = process.env.ENCRYPTION_KEY || 'default-key-CHANGE-IN-PRODUCTION';
          accountNumber = decrypt(data.encrypted_account_number, encryptionKey);
          console.log(`✅ Decrypted account number: ***${accountNumber.slice(-4)}`);
        } catch (error) {
          console.error('❌ Failed to decrypt account number:', error);
        }
      }

      return {
        last4: data.account_last4,
        bankName: data.bank_name || 'Unknown Bank',
        accountHolderName: data.account_holder_name,
        routingNumber: data.routing_number,
        accountNumber
      };
    } catch (error) {
      console.error('❌ Failed to get bank account from database:', error);
      return null;
    }
  }

  /**
   * Validate routing number
   */
  static isValidRoutingNumber(routingNumber: string): boolean {
    // Must be exactly 9 digits
    if (!/^\d{9}$/.test(routingNumber)) {
      return false;
    }

    // Checksum validation (ABA routing number algorithm)
    const digits = routingNumber.split('').map(Number);
    const checksum =
      3 * (digits[0] + digits[3] + digits[6]) +
      7 * (digits[1] + digits[4] + digits[7]) +
      (digits[2] + digits[5] + digits[8]);

    return checksum % 10 === 0;
  }

  /**
   * Validate account number (basic check)
   */
  static isValidAccountNumber(accountNumber: string): boolean {
    // Must be between 4 and 17 digits
    return /^\d{4,17}$/.test(accountNumber);
  }
}

export default StripeService;

