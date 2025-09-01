-- Add approval and rejection fields to bill_extractions table
ALTER TABLE bill_extractions
ADD COLUMN rejection_comment TEXT,
ADD COLUMN associated_property_id TEXT;
