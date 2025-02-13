/*
  # Add status columns to chat_channels table

  1. Changes
    - Add `is_connected` boolean column with default false
    - Add `is_tested` boolean column with default false
    - Add indexes for performance

  2. Notes
    - These columns track channel connection and testing status
    - Default to false for safety
    - Added indexes since these will be frequently queried
*/

-- Add is_connected column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'chat_channels' AND column_name = 'is_connected'
  ) THEN
    ALTER TABLE chat_channels ADD COLUMN is_connected boolean DEFAULT false;
    CREATE INDEX idx_chat_channels_is_connected ON chat_channels(is_connected);
  END IF;
END $$;

-- Add is_tested column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'chat_channels' AND column_name = 'is_tested'
  ) THEN
    ALTER TABLE chat_channels ADD COLUMN is_tested boolean DEFAULT false;
    CREATE INDEX idx_chat_channels_is_tested ON chat_channels(is_tested);
  END IF;
END $$;