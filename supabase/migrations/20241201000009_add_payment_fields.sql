-- Add payment fields to bill_extractions table
ALTER TABLE bill_extractions
ADD COLUMN payment_status TEXT DEFAULT 'unpaid',
ADD COLUMN stripe_payment_intent_id TEXT,
ADD COLUMN paid_at TIMESTAMP;

-- Add index for payment status queries
CREATE INDEX IF NOT EXISTS idx_bill_extractions_payment_status 
ON bill_extractions(payment_status);

-- Add index for payment intent lookups
CREATE INDEX IF NOT EXISTS idx_bill_extractions_stripe_payment_intent_id 
ON bill_extractions(stripe_payment_intent_id);

-- Add comment to document the payment status values
COMMENT ON COLUMN bill_extractions.payment_status IS 'Payment status: unpaid, paid, failed, pending';
COMMENT ON COLUMN bill_extractions.stripe_payment_intent_id IS 'Stripe payment intent ID for tracking payments';
COMMENT ON COLUMN bill_extractions.paid_at IS 'Timestamp when the bill was paid';
