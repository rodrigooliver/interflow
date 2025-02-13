/*
  # Create prompts table

  1. New Tables
    - `prompts`
      - `id` (uuid, primary key)
      - `organization_id` (uuid, foreign key to organizations)
      - `title` (text) - Title of the prompt
      - `content` (text) - The actual prompt content
      - `description` (text, optional) - Optional description
      - `tags` (text[], optional) - Array of tags
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `prompts` table
    - Add policies for organization members to manage prompts

  3. Changes
    - Add foreign key constraint to organizations table
    - Add index on organization_id for faster lookups
*/

-- Create prompts table
CREATE TABLE IF NOT EXISTS prompts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text NOT NULL,
  description text,
  tags text[],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS prompts_organization_id_idx ON prompts(organization_id);

-- Enable RLS
ALTER TABLE prompts ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Organization members can manage prompts"
  ON prompts
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = prompts.organization_id
      AND om.user_id = auth.uid()
    )
  );

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_prompts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_prompts_updated_at
  BEFORE UPDATE ON prompts
  FOR EACH ROW
  EXECUTE FUNCTION update_prompts_updated_at();