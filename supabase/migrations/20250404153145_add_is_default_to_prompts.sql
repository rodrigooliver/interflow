/*
  # Add is_default column to prompts table

  1. New Columns
    - `is_default` (boolean) - Indicates if the prompt is a default template

  2. Changes
    - Add is_default column with default value false
    - Add a comment explaining its purpose
*/

-- Add is_default column to prompts table
ALTER TABLE prompts
  ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT false;

-- Add comment to explain the purpose of the column
COMMENT ON COLUMN prompts.is_default IS 'Indicates if the prompt is a default template that should be available to all organizations';

-- Create index for faster lookups of default prompts
CREATE INDEX IF NOT EXISTS prompts_is_default_idx ON prompts(is_default); 