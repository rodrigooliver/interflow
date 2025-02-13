/*
  # Add Flow Management Tables

  1. New Tables
    - `flows`
      - `id` (uuid, primary key)
      - `organization_id` (uuid, references organizations)
      - `name` (text)
      - `description` (text)
      - `is_active` (boolean)
      - `folder_path` (text)
      - `nodes` (jsonb)
      - `edges` (jsonb)
      - `variables` (jsonb)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `flows` table
    - Add policies for organization members
*/

-- Create flows table
CREATE TABLE flows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT false,
  folder_path TEXT DEFAULT '/',
  nodes JSONB NOT NULL DEFAULT '[]',
  edges JSONB NOT NULL DEFAULT '[]',
  variables JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE flows ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Organization members can view flows"
  ON flows
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = flows.organization_id
      AND organization_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Organization members can manage flows"
  ON flows
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = flows.organization_id
      AND organization_members.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = flows.organization_id
      AND organization_members.user_id = auth.uid()
    )
  );

-- Create indexes
CREATE INDEX flows_organization_id_idx ON flows(organization_id);
CREATE INDEX flows_folder_path_idx ON flows(folder_path);
CREATE INDEX flows_is_active_idx ON flows(is_active);

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION update_flows_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_flows_updated_at
  BEFORE UPDATE ON flows
  FOR EACH ROW
  EXECUTE FUNCTION update_flows_updated_at();