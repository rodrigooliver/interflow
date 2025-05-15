-- Add partner roles columns to profiles table
ALTER TABLE profiles
ADD COLUMN is_seller boolean DEFAULT false,
ADD COLUMN is_support boolean DEFAULT false,
ADD COLUMN stripe_account_id text,
ADD COLUMN stripe_account_approved boolean DEFAULT false;

-- Add comment to the columns
COMMENT ON COLUMN profiles.is_seller IS 'Indicates if the user is a seller partner';
COMMENT ON COLUMN profiles.is_support IS 'Indicates if the user is a support partner';
COMMENT ON COLUMN profiles.stripe_account_id IS 'Stripe Connect account ID for partners';
COMMENT ON COLUMN profiles.stripe_account_approved IS 'Indicates if the Stripe Connect account has been approved'; 