-- Add was_edited column to bill_extractions table
ALTER TABLE bill_extractions 
ADD COLUMN was_edited BOOLEAN NOT NULL DEFAULT false;
