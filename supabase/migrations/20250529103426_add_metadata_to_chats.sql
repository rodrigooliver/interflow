/*
  # Add metadata column to chats table

  1. Changes
    - Add metadata JSONB column to chats table
    - Default value is empty JSON object
    - Column is nullable to maintain compatibility

  2. Purpose
    - Allow storing flexible metadata for chats
    - Support custom attributes and integrations
    - Maintain backwards compatibility
*/

-- Add metadata column to chats table
ALTER TABLE chats 
ADD COLUMN metadata JSONB DEFAULT '{}';

-- Add comment for documentation
COMMENT ON COLUMN chats.metadata IS 'Flexible JSON metadata for storing custom chat attributes, integration data, and additional properties';

-- Create index for efficient JSON queries (optional but recommended)
CREATE INDEX IF NOT EXISTS idx_chats_metadata_gin ON chats USING GIN (metadata); 