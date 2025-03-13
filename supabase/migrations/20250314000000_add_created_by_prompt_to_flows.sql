/*
  # Add created_by_prompt column to flows table

  1. New Columns
    - `created_by_prompt` (uuid, foreign key to prompts) - The prompt that created this flow

  2. Changes
    - Add foreign key constraint to prompts table
    - Add index for faster lookups
*/

-- Add new column to flows table
ALTER TABLE flows
  ADD COLUMN IF NOT EXISTS created_by_prompt uuid REFERENCES prompts(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS flows_created_by_prompt_idx ON flows(created_by_prompt);

-- Add comment to explain the purpose of the column
COMMENT ON COLUMN flows.created_by_prompt IS 'Reference to the prompt that was used to create this flow, if applicable'; 