-- Create property_bank_accounts table to store Stripe bank account tokens
CREATE TABLE IF NOT EXISTS property_bank_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  
  -- Stripe token info (stored securely, not the actual account number)
  stripe_token_id TEXT NOT NULL,
  
  -- Metadata for display purposes (safe to store)
  bank_name TEXT,
  account_last4 TEXT,
  account_holder_name TEXT,
  routing_number TEXT,
  
  -- Encrypted full account number for payment processing
  encrypted_account_number TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one bank account per property
  UNIQUE(property_id)
);

-- Enable RLS
ALTER TABLE property_bank_accounts ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own bank accounts
CREATE POLICY "Users can view own bank accounts"
  ON property_bank_accounts
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own bank accounts
CREATE POLICY "Users can insert own bank accounts"
  ON property_bank_accounts
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own bank accounts
CREATE POLICY "Users can update own bank accounts"
  ON property_bank_accounts
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy: Users can delete their own bank accounts
CREATE POLICY "Users can delete own bank accounts"
  ON property_bank_accounts
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_property_bank_accounts_user_id ON property_bank_accounts(user_id);
CREATE INDEX idx_property_bank_accounts_property_id ON property_bank_accounts(property_id);

-- Add updated_at trigger
CREATE TRIGGER update_property_bank_accounts_updated_at
  BEFORE UPDATE ON property_bank_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

