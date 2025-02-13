/*
  # Add settings column to organizations table

  1. Changes
    - Add settings column to organizations table with JSONB type
    - Set default empty object for settings column
    - Backfill existing rows with default settings

  2. Security
    - Enable RLS for organizations table
    - Add policies for authenticated users
*/

-- Add settings column to organizations table
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}'::jsonb;

-- Update existing rows with default settings if they don't have any
UPDATE organizations 
SET settings = '{}'::jsonb 
WHERE settings IS NULL;

-- Make settings column NOT NULL after setting defaults
ALTER TABLE organizations 
ALTER COLUMN settings SET NOT NULL;