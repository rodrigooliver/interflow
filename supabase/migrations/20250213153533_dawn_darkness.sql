/*
  # Create integrations table

  1. New Tables
    - `integrations`
      - `id` (uuid, primary key)
      - `organization_id` (uuid, foreign key to organizations)
      - `type` (text) - Type of integration (openai, aws_s3)
      - `credentials` (jsonb) - Encrypted credentials for the integration
      - `status` (text) - Status of the integration (active, inactive)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `integrations` table
    - Add policies for organization admins and owners to manage integrations
    - Add policy for organization members to read integrations

  3. Changes
    - Add foreign key constraint to organizations table
    - Add index on organization_id and type for faster lookups
*/

-- Create integrations table
CREATE TABLE IF NOT EXISTS integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('openai', 'aws_s3')),
  credentials jsonb NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS integrations_organization_id_type_idx ON integrations(organization_id, type);

-- Enable RLS
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Organization admins and owners can manage integrations"
  ON integrations
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = integrations.organization_id
      AND om.user_id = auth.uid()
      AND om.role IN ('admin', 'owner')
    )
  );

CREATE POLICY "Organization members can read integrations"
  ON integrations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = integrations.organization_id
      AND om.user_id = auth.uid()
    )
  );

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_integrations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_integrations_updated_at
  BEFORE UPDATE ON integrations
  FOR EACH ROW
  EXECUTE FUNCTION update_integrations_updated_at();