-- Add address matching fields to bill_extractions table
ALTER TABLE bill_extractions
ADD COLUMN address_match_score DECIMAL(5,2) NOT NULL DEFAULT 0,
ADD COLUMN matched_property_address TEXT;
