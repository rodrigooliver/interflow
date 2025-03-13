/*
  # Update prompts table with additional fields

  1. New Columns
    - `integration_id` (uuid, foreign key to integrations) - The integration to use for this prompt
    - `model` (text) - The model to use (e.g., gpt-4, gpt-3.5-turbo)
    - `temperature` (float) - The temperature setting for the model
    - `tools` (jsonb) - JSON array of tools/functions available to the model
    - `destinations` (jsonb) - JSON object of destinations for detected intents
    - `config` (jsonb) - Additional configuration options

  2. Changes
    - Add foreign key constraint to integrations table
    - Add default values for new columns
*/

-- Add new columns to prompts table
ALTER TABLE prompts
  ADD COLUMN IF NOT EXISTS integration_id uuid REFERENCES integrations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS model text DEFAULT 'gpt-3.5-turbo',
  ADD COLUMN IF NOT EXISTS temperature float DEFAULT 0.7,
  ADD COLUMN IF NOT EXISTS tools jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS destinations jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS config jsonb DEFAULT '{}'::jsonb;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS prompts_integration_id_idx ON prompts(integration_id);

-- Add comment to explain the structure of the tools column
COMMENT ON COLUMN prompts.tools IS 'JSON array of tools/functions available to the model. Example: [{"name": "search_database", "description": "Search the database for information", "parameters": {...}}]';

-- Add comment to explain the structure of the destinations column
COMMENT ON COLUMN prompts.destinations IS 'JSON object mapping detected intents to destinations. Example: {"create_ticket": {"type": "flow", "id": "uuid-of-flow"}, "search_knowledge": {"type": "function", "name": "search_kb"}}';

-- Add comment to explain the structure of the config column
COMMENT ON COLUMN prompts.config IS 'Additional configuration options for the prompt. Example: {"max_tokens": 1000, "stream": true}'; 