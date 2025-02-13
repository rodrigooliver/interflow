/*
  # Create files table and update integrations

  1. New Tables
    - `files`
      - `id` (uuid, primary key)
      - `organization_id` (uuid, foreign key to organizations)
      - `name` (text) - Original file name
      - `size` (bigint) - File size in bytes
      - `public_url` (text) - Public URL for accessing the file
      - `message_id` (uuid, foreign key to messages, nullable) - Reference if file was sent in chat
      - `mime_type` (text) - MIME type of the file
      - `created_at` (timestamptz)
      - `deleted_at` (timestamptz, nullable) - Soft delete support

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
  message_id uuid REFERENCES messages(id) ON DELETE SET NULL,
  mime_type text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- Create indexes
CREATE INDEX IF NOT EXISTS files_organization_id_idx ON files(organization_id);
CREATE INDEX IF NOT EXISTS files_message_id_idx ON files(message_id);
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

-- Create function to update organization storage usage
CREATE OR REPLACE FUNCTION update_organization_storage_usage()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE organizations
    SET storage_used = storage_used + NEW.size
    WHERE id = NEW.organization_id;
  ELSIF TG_OP = 'DELETE' OR NEW.deleted_at IS NOT NULL THEN
    UPDATE organizations
    SET storage_used = storage_used - OLD.size
    WHERE id = OLD.organization_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for storage usage updates
CREATE TRIGGER update_storage_usage
  AFTER INSERT OR UPDATE OF deleted_at OR DELETE ON files
  FOR EACH ROW
  EXECUTE FUNCTION update_organization_storage_usage();