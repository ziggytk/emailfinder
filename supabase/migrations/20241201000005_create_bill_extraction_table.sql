-- Create Bill Extraction Table
-- This table stores bill data extracted from images using OpenAI

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Bill extraction table
CREATE TABLE bill_extractions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  image_url TEXT NOT NULL,
  owner_name TEXT NOT NULL,
  home_address TEXT NOT NULL,
  account_number TEXT NOT NULL,
  bill_due_date DATE NOT NULL,
  is_auto_pay_enabled BOOLEAN NOT NULL DEFAULT false,
  average_daily_electric_usage DECIMAL(10,2) NOT NULL DEFAULT 0,
  next_billing_date DATE NOT NULL,
  billing_period_start DATE NOT NULL,
  billing_period_end DATE NOT NULL,
  billing_days INTEGER NOT NULL DEFAULT 0,
  total_amount_due DECIMAL(10,2) NOT NULL DEFAULT 0,
  confidence_score DECIMAL(5,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  was_edited BOOLEAN NOT NULL DEFAULT false,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_bill_extractions_user_id ON bill_extractions(user_id);
CREATE INDEX idx_bill_extractions_created_at ON bill_extractions(created_at);
CREATE INDEX idx_bill_extractions_bill_due_date ON bill_extractions(bill_due_date);
CREATE INDEX idx_bill_extractions_total_amount_due ON bill_extractions(total_amount_due);

-- Row Level Security (RLS)
ALTER TABLE bill_extractions ENABLE ROW LEVEL SECURITY;

-- Users can only access their own bill extractions
CREATE POLICY "Users can manage their own bill extractions" ON bill_extractions
  FOR ALL USING (auth.uid() = user_id);

-- Grant permissions to authenticated users
GRANT ALL PRIVILEGES ON bill_extractions TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_bill_extractions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_bill_extractions_updated_at
  BEFORE UPDATE ON bill_extractions
  FOR EACH ROW
  EXECUTE FUNCTION update_bill_extractions_updated_at();
