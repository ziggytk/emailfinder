-- ============================================
-- Create property_bank_accounts table
-- ============================================
-- Run this SQL in your Supabase SQL Editor
-- Go to: https://supabase.com/dashboard → Your Project → SQL Editor
-- ============================================

-- Create the table
CREATE TABLE IF NOT EXISTS public.property_bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,  -- Using TEXT instead of UUID for flexibility
  property_id TEXT NOT NULL,  -- Using TEXT to match your current property IDs
  
  -- Stripe token info
  stripe_token_id TEXT NOT NULL,
  
  -- Metadata for display
  bank_name TEXT,
  account_last4 TEXT,
  account_holder_name TEXT,
  routing_number TEXT,
  
  -- Encrypted full account number
  encrypted_account_number TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one bank account per property
  UNIQUE(property_id)
);

-- Enable RLS (Row Level Security)
ALTER TABLE public.property_bank_accounts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own bank accounts" ON public.property_bank_accounts;
DROP POLICY IF EXISTS "Users can insert own bank accounts" ON public.property_bank_accounts;
DROP POLICY IF EXISTS "Users can update own bank accounts" ON public.property_bank_accounts;
DROP POLICY IF EXISTS "Users can delete own bank accounts" ON public.property_bank_accounts;
DROP POLICY IF EXISTS "Service role can manage all" ON public.property_bank_accounts;

-- Policy: Users can view their own bank accounts
CREATE POLICY "Users can view own bank accounts"
  ON public.property_bank_accounts
  FOR SELECT
  USING (true);  -- For now, allow all reads (tighten this later with proper auth)

-- Policy: Anyone can insert (for development - tighten in production)
CREATE POLICY "Users can insert own bank accounts"
  ON public.property_bank_accounts
  FOR INSERT
  WITH CHECK (true);

-- Policy: Anyone can update (for development - tighten in production)
CREATE POLICY "Users can update own bank accounts"
  ON public.property_bank_accounts
  FOR UPDATE
  USING (true);

-- Policy: Anyone can delete (for development - tighten in production)
CREATE POLICY "Users can delete own bank accounts"
  ON public.property_bank_accounts
  FOR DELETE
  USING (true);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_property_bank_accounts_user_id ON public.property_bank_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_property_bank_accounts_property_id ON public.property_bank_accounts(property_id);

-- ============================================
-- ✅ DONE! Your table is ready to use.
-- ============================================

SELECT 'property_bank_accounts table created successfully!' AS status;

