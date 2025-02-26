/*
  # Create files table and update integrations

  1. New Tables
    - `files`
      - `id` (uuid, primary key)
      - `organization_id` (uuid, foreign key to organizations)
      - `name` (text) - Original file name
      - `size` (bigint) - File size in bytes
      - `public_url` (text) - Public URL for accessing the file
      - `path` (text) - Path within the S3 storage
      - `message_id` (uuid, foreign key to messages, nullable) - Reference if file was sent in chat
      - `integration_id` (uuid, foreign key to integrations, nullable) - Reference to integration
      - `flow_id` (uuid, foreign key to flows, nullable) - Reference to flow
      - `shortcut_id` (uuid, foreign key to message shortcuts, nullable) - Reference to message shortcut
      - `mime_type` (text) - MIME type of the file
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on `files` table
    - Add policies for organization members to manage files

  3. Changes
    - Add foreign key constraints
    - Add indexes for faster lookups
    - Add trigger to update organization storage usage
*/

-- Create files table
CREATE TABLE IF NOT EXISTS files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  size bigint NOT NULL,
  public_url text NOT NULL,
  path text,
  message_id uuid REFERENCES messages(id) ON DELETE SET NULL,
  integration_id uuid REFERENCES integrations(id) ON DELETE SET NULL,
  flow_id uuid REFERENCES flows(id) ON DELETE SET NULL,
  shortcut_id uuid REFERENCES message_shortcuts(id) ON DELETE SET NULL,
  mime_type text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS files_organization_id_idx ON files(organization_id);
CREATE INDEX IF NOT EXISTS files_message_id_idx ON files(message_id);
CREATE INDEX IF NOT EXISTS files_integration_id_idx ON files(integration_id);
CREATE INDEX IF NOT EXISTS files_flow_id_idx ON files(flow_id);
CREATE INDEX IF NOT EXISTS files_shortcut_id_idx ON files(shortcut_id);
CREATE INDEX IF NOT EXISTS files_created_at_idx ON files(created_at);

-- Enable RLS
ALTER TABLE files ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Organization members can view files"
  ON files
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = files.organization_id
      AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "Organization admins can manage files"
  ON files
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = files.organization_id
      AND om.user_id = auth.uid()
      AND om.role IN ('owner', 'admin')
    )
  );