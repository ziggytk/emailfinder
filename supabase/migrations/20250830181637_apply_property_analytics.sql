-- Create Property Analytics Schema
-- This enables tracking utility usage across different properties for analytics

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Properties table - stores address information
CREATE TABLE IF NOT EXISTS properties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  name TEXT, -- Optional property name (e.g., "Main House", "Rental Property")
  street_address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  zip_code TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'USA',
  property_type TEXT CHECK (property_type IN ('residential', 'commercial', 'industrial', 'mixed_use')),
  square_feet INTEGER, -- For usage per sq ft calculations
  bedrooms INTEGER, -- For residential properties
  year_built INTEGER,
  is_active BOOLEAN DEFAULT true,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure unique addresses per user
  UNIQUE(user_id, street_address, city, state, zip_code)
);

-- Utility providers table - master list of providers
CREATE TABLE IF NOT EXISTS utility_providers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  domains TEXT[] NOT NULL, -- Email domains for identification
  service_types TEXT[] NOT NULL, -- ['electricity', 'gas', 'water', 'sewer', 'trash']
  website_url TEXT,
  phone_number TEXT,
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Property utility accounts - links properties to specific utility accounts
CREATE TABLE IF NOT EXISTS property_utility_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE NOT NULL,
  provider_id UUID REFERENCES utility_providers(id) NOT NULL,
  account_number TEXT,
  customer_name TEXT,
  service_type TEXT NOT NULL CHECK (service_type IN ('electricity', 'gas', 'water', 'sewer', 'trash', 'internet', 'cable')),
  is_active BOOLEAN DEFAULT true,
  
  -- Account metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure unique account per property/provider/service combination
  UNIQUE(property_id, provider_id, service_type, account_number)
);

-- Utility bills table - stores bill data for analytics
CREATE TABLE IF NOT EXISTS utility_bills (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_utility_account_id UUID REFERENCES property_utility_accounts(id) ON DELETE CASCADE NOT NULL,
  pdf_upload_id UUID REFERENCES pdf_uploads(id) ON DELETE SET NULL, -- Link to processed PDF
  
  -- Bill identification
  bill_date DATE NOT NULL,
  due_date DATE,
  bill_number TEXT,
  message_id TEXT, -- Gmail message ID
  
  -- Usage data
  usage_amount DECIMAL(10,2), -- kWh for electricity, therms for gas, etc.
  usage_unit TEXT, -- 'kWh', 'therms', 'gallons', etc.
  usage_start_date DATE,
  usage_end_date DATE,
  
  -- Cost data
  total_amount DECIMAL(10,2) NOT NULL,
  base_charge DECIMAL(10,2),
  usage_charge DECIMAL(10,2),
  taxes DECIMAL(10,2),
  fees DECIMAL(10,2),
  
  -- Rate information
  rate_per_unit DECIMAL(10,6),
  
  -- Bill status
  status TEXT DEFAULT 'processed' CHECK (status IN ('pending', 'processed', 'error')),
  
  -- Processing metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure unique bills per account/date
  UNIQUE(property_utility_account_id, bill_date, bill_number)
);

-- Analytics views and functions

-- Monthly usage summary view
CREATE OR REPLACE VIEW monthly_usage_summary AS
SELECT 
  p.id as property_id,
  p.name as property_name,
  p.street_address,
  p.city,
  p.state,
  p.zip_code,
  p.property_type,
  p.square_feet,
  p.bedrooms,
  up.name as provider_name,
  pua.service_type,
  DATE_TRUNC('month', ub.bill_date) as month,
  COUNT(*) as bill_count,
  SUM(ub.usage_amount) as total_usage,
  ub.usage_unit,
  SUM(ub.total_amount) as total_cost,
  AVG(ub.rate_per_unit) as avg_rate,
  -- Usage per square foot (if available)
  CASE 
    WHEN p.square_feet > 0 THEN SUM(ub.usage_amount) / p.square_feet 
    ELSE NULL 
  END as usage_per_sqft,
  -- Cost per square foot (if available)
  CASE 
    WHEN p.square_feet > 0 THEN SUM(ub.total_amount) / p.square_feet 
    ELSE NULL 
  END as cost_per_sqft
FROM properties p
JOIN property_utility_accounts pua ON p.id = pua.property_id
JOIN utility_providers up ON pua.provider_id = up.id
JOIN utility_bills ub ON pua.id = ub.property_utility_account_id
WHERE p.is_active = true 
  AND pua.is_active = true 
  AND ub.status = 'processed'
GROUP BY p.id, p.name, p.street_address, p.city, p.state, p.zip_code, p.property_type, p.square_feet, p.bedrooms, up.name, pua.service_type, DATE_TRUNC('month', ub.bill_date), ub.usage_unit;

-- Property comparison view
CREATE OR REPLACE VIEW property_comparison AS
SELECT 
  p1.id as property_id,
  p1.name as property_name,
  p1.street_address,
  p1.city,
  p1.state,
  p1.property_type,
  p1.square_feet,
  p1.bedrooms,
  pua.service_type,
  DATE_TRUNC('month', ub.bill_date) as month,
  SUM(ub.usage_amount) as monthly_usage,
  SUM(ub.total_amount) as monthly_cost,
  -- Calculate usage per square foot for comparison
  CASE 
    WHEN p1.square_feet > 0 THEN SUM(ub.usage_amount) / p1.square_feet 
    ELSE NULL 
  END as usage_per_sqft,
  -- Calculate cost per square foot for comparison
  CASE 
    WHEN p1.square_feet > 0 THEN SUM(ub.total_amount) / p1.square_feet 
    ELSE NULL 
  END as cost_per_sqft,
  -- Calculate usage per bedroom for residential properties
  CASE 
    WHEN p1.bedrooms > 0 AND p1.property_type = 'residential' THEN SUM(ub.usage_amount) / p1.bedrooms 
    ELSE NULL 
  END as usage_per_bedroom
FROM properties p1
JOIN property_utility_accounts pua ON p1.id = pua.property_id
JOIN utility_bills ub ON pua.id = ub.property_utility_account_id
WHERE p1.is_active = true 
  AND pua.is_active = true 
  AND ub.status = 'processed'
GROUP BY p1.id, p1.name, p1.street_address, p1.city, p1.state, p1.property_type, p1.square_feet, p1.bedrooms, pua.service_type, DATE_TRUNC('month', ub.bill_date);

-- Function to get property analytics
CREATE OR REPLACE FUNCTION get_property_analytics(
  p_property_id UUID DEFAULT NULL,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL,
  p_service_type TEXT DEFAULT NULL
) RETURNS TABLE (
  property_id UUID,
  property_name TEXT,
  service_type TEXT,
  total_bills INTEGER,
  total_usage DECIMAL,
  total_cost DECIMAL,
  avg_monthly_usage DECIMAL,
  avg_monthly_cost DECIMAL,
  usage_per_sqft DECIMAL,
  cost_per_sqft DECIMAL,
  usage_trend TEXT -- 'increasing', 'decreasing', 'stable'
) AS $$
BEGIN
  RETURN QUERY
  WITH monthly_data AS (
    SELECT 
      p.id,
      p.name,
      pua.service_type,
      DATE_TRUNC('month', ub.bill_date) as month,
      SUM(ub.usage_amount) as monthly_usage,
      SUM(ub.total_amount) as monthly_cost,
      p.square_feet
    FROM properties p
    JOIN property_utility_accounts pua ON p.id = pua.property_id
    JOIN utility_bills ub ON pua.id = ub.property_utility_account_id
    WHERE (p_property_id IS NULL OR p.id = p_property_id)
      AND (p_start_date IS NULL OR ub.bill_date >= p_start_date)
      AND (p_end_date IS NULL OR ub.bill_date <= p_end_date)
      AND (p_service_type IS NULL OR pua.service_type = p_service_type)
      AND p.is_active = true 
      AND pua.is_active = true 
      AND ub.status = 'processed'
    GROUP BY p.id, p.name, pua.service_type, DATE_TRUNC('month', ub.bill_date), p.square_feet
  ),
  trend_analysis AS (
    SELECT 
      id,
      name,
      service_type,
      COUNT(*) as total_bills,
      SUM(monthly_usage) as total_usage,
      SUM(monthly_cost) as total_cost,
      AVG(monthly_usage) as avg_monthly_usage,
      AVG(monthly_cost) as avg_monthly_cost,
      CASE 
        WHEN square_feet > 0 THEN SUM(monthly_usage) / square_feet 
        ELSE NULL 
      END as usage_per_sqft,
      CASE 
        WHEN square_feet > 0 THEN SUM(monthly_cost) / square_feet 
        ELSE NULL 
      END as cost_per_sqft,
      -- Simple trend analysis based on last 3 months
      CASE 
        WHEN COUNT(*) >= 3 THEN
          CASE 
            WHEN AVG(monthly_usage) > LAG(AVG(monthly_usage), 1) OVER (PARTITION BY id, service_type ORDER BY month) THEN 'increasing'
            WHEN AVG(monthly_usage) < LAG(AVG(monthly_usage), 1) OVER (PARTITION BY id, service_type ORDER BY month) THEN 'decreasing'
            ELSE 'stable'
          END
        ELSE 'insufficient_data'
      END as usage_trend
    FROM monthly_data
    GROUP BY id, name, service_type, square_feet
  )
  SELECT 
    id::UUID,
    name,
    service_type,
    total_bills,
    total_usage,
    total_cost,
    avg_monthly_usage,
    avg_monthly_cost,
    usage_per_sqft,
    cost_per_sqft,
    usage_trend
  FROM trend_analysis;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_properties_user_id ON properties(user_id);
CREATE INDEX IF NOT EXISTS idx_properties_location ON properties(city, state, zip_code);
CREATE INDEX IF NOT EXISTS idx_property_utility_accounts_property_id ON property_utility_accounts(property_id);
CREATE INDEX IF NOT EXISTS idx_property_utility_accounts_provider_id ON property_utility_accounts(provider_id);
CREATE INDEX IF NOT EXISTS idx_utility_bills_account_id ON utility_bills(property_utility_account_id);
CREATE INDEX IF NOT EXISTS idx_utility_bills_bill_date ON utility_bills(bill_date);
CREATE INDEX IF NOT EXISTS idx_utility_bills_usage_dates ON utility_bills(usage_start_date, usage_end_date);
CREATE INDEX IF NOT EXISTS idx_utility_bills_amount ON utility_bills(total_amount);

-- Row Level Security (RLS) policies
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE utility_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_utility_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE utility_bills ENABLE ROW LEVEL SECURITY;

-- Users can only access their own properties
DROP POLICY IF EXISTS "Users can only access their own properties" ON properties;
CREATE POLICY "Users can only access their own properties" ON properties
  FOR ALL USING (auth.uid() = user_id);

-- Utility providers are read-only for all authenticated users
DROP POLICY IF EXISTS "Users can read utility providers" ON utility_providers;
CREATE POLICY "Users can read utility providers" ON utility_providers
  FOR SELECT USING (auth.role() = 'authenticated');

-- Users can only access utility accounts for their own properties
DROP POLICY IF EXISTS "Users can only access their own utility accounts" ON property_utility_accounts;
CREATE POLICY "Users can only access their own utility accounts" ON property_utility_accounts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM properties 
      WHERE properties.id = property_utility_accounts.property_id 
      AND properties.user_id = auth.uid()
    )
  );

-- Users can only access bills for their own utility accounts
DROP POLICY IF EXISTS "Users can only access their own utility bills" ON utility_bills;
CREATE POLICY "Users can only access their own utility bills" ON utility_bills
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM property_utility_accounts pua
      JOIN properties p ON p.id = pua.property_id
      WHERE pua.id = utility_bills.property_utility_account_id 
      AND p.user_id = auth.uid()
    )
  );

-- Functions for data management

-- Function to add a new property
CREATE OR REPLACE FUNCTION add_property(
  p_name TEXT,
  p_street_address TEXT,
  p_city TEXT,
  p_state TEXT,
  p_zip_code TEXT,
  p_country TEXT DEFAULT 'USA',
  p_property_type TEXT DEFAULT NULL,
  p_square_feet INTEGER DEFAULT NULL,
  p_bedrooms INTEGER DEFAULT NULL,
  p_year_built INTEGER DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  property_id UUID;
BEGIN
  INSERT INTO properties (
    user_id, name, street_address, city, state, zip_code, country,
    property_type, square_feet, bedrooms, year_built
  ) VALUES (
    auth.uid(), p_name, p_street_address, p_city, p_state, p_zip_code, p_country,
    p_property_type, p_square_feet, p_bedrooms, p_year_built
  ) RETURNING id INTO property_id;
  
  -- Log the property creation
  PERFORM log_audit_event('property_created', 'property', property_id::TEXT);
  
  RETURN property_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to add a utility account to a property
CREATE OR REPLACE FUNCTION add_utility_account(
  p_property_id UUID,
  p_provider_name TEXT,
  p_service_type TEXT,
  p_account_number TEXT DEFAULT NULL,
  p_customer_name TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  provider_id UUID;
  account_id UUID;
BEGIN
  -- Get or create provider
  SELECT id INTO provider_id FROM utility_providers WHERE name = p_provider_name;
  
  IF provider_id IS NULL THEN
    INSERT INTO utility_providers (name, service_types, domains)
    VALUES (p_provider_name, ARRAY[p_service_type], ARRAY['unknown'])
    RETURNING id INTO provider_id;
  END IF;
  
  -- Add utility account
  INSERT INTO property_utility_accounts (
    property_id, provider_id, account_number, customer_name, service_type
  ) VALUES (
    p_property_id, provider_id, p_account_number, p_customer_name, p_service_type
  ) RETURNING id INTO account_id;
  
  -- Log the account creation
  PERFORM log_audit_event('utility_account_created', 'property_utility_account', account_id::TEXT);
  
  RETURN account_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to record a utility bill
CREATE OR REPLACE FUNCTION record_utility_bill(
  p_property_utility_account_id UUID,
  p_bill_date DATE,
  p_total_amount DECIMAL,
  p_usage_amount DECIMAL DEFAULT NULL,
  p_usage_unit TEXT DEFAULT NULL,
  p_usage_start_date DATE DEFAULT NULL,
  p_usage_end_date DATE DEFAULT NULL,
  p_bill_number TEXT DEFAULT NULL,
  p_message_id TEXT DEFAULT NULL,
  p_pdf_upload_id UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  bill_id UUID;
BEGIN
  INSERT INTO utility_bills (
    property_utility_account_id, bill_date, total_amount, usage_amount, usage_unit,
    usage_start_date, usage_end_date, bill_number, message_id, pdf_upload_id
  ) VALUES (
    p_property_utility_account_id, p_bill_date, p_total_amount, p_usage_amount, p_usage_unit,
    p_usage_start_date, p_usage_end_date, p_bill_number, p_message_id, p_pdf_upload_id
  ) RETURNING id INTO bill_id;
  
  -- Log the bill recording
  PERFORM log_audit_event('utility_bill_recorded', 'utility_bill', bill_id::TEXT);
  
  RETURN bill_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
