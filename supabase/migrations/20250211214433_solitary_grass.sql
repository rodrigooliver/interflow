/*
  # Update customers table columns

  1. Changes
    - Rename phone column to whatsapp
    - Add facebook_id and instagram_id columns
    - Add indexes for better performance

  2. Security
    - Maintain existing RLS policies
*/

-- Rename phone column to whatsapp
ALTER TABLE customers 
  RENAME COLUMN phone TO whatsapp;

-- Add social media columns if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'customers' AND column_name = 'facebook_id'
  ) THEN
    ALTER TABLE customers ADD COLUMN facebook_id TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'customers' AND column_name = 'instagram_id'
  ) THEN
    ALTER TABLE customers ADD COLUMN instagram_id TEXT;
  END IF;
END $$;

-- Create indexes for better search performance
CREATE INDEX IF NOT EXISTS customers_whatsapp_idx ON customers(whatsapp);
CREATE INDEX IF NOT EXISTS customers_facebook_id_idx ON customers(facebook_id);
CREATE INDEX IF NOT EXISTS customers_instagram_id_idx ON customers(instagram_id);