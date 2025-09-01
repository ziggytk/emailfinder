-- Add utility provider field to bill_extractions table
ALTER TABLE bill_extractions
ADD COLUMN utility_provider TEXT;

-- Add index for utility provider queries
CREATE INDEX IF NOT EXISTS idx_bill_extractions_utility_provider 
ON bill_extractions(utility_provider);

-- Add comment to document the utility provider field
COMMENT ON COLUMN bill_extractions.utility_provider IS 'User-provided utility provider name for the bill';
