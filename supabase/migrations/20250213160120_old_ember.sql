/*
  # Create files table and update storage tracking

  1. New Tables
    - `files`
      - `id` (uuid, primary key)
      - `organization_id` (uuid, foreign key to organizations)
      - `name` (text) - Original file name
      - `size` (bigint) - File size in bytes
      - `mime_type` (text) - File MIME type
      - `public_url` (text) - Public URL for the file
      - `message_id` (uuid, nullable) - Reference to message if file was sent in chat
      - `deleted_at` (timestamptz, nullable) - Soft delete timestamp
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `files` table
    - Add policies for organization members

  3. Changes
    - Add foreign key constraints
    - Add indexes for common queries
*/

-- Create files table
CREATE TABLE IF NOT EXISTS files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  size bigint NOT NULL,
  mime_type text NOT NULL,
  public_url text NOT NULL,
  message_id uuid REFERENCES messages(id) ON DELETE SET NULL,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS files_organization_id_idx ON files(organization_id);
CREATE INDEX IF NOT EXISTS files_message_id_idx ON files(message_id);
CREATE INDEX IF NOT EXISTS files_deleted_at_idx ON files(deleted_at);

-- Enable RLS
ALTER TABLE files ENABLE ROW LEVEL SECURITY;

-- Create policies
DO $$ BEGIN
  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS "Organization members can view files" ON files;
  DROP POLICY IF EXISTS "Organization admins can manage files" ON files;

  -- Create new policies
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
    FOR ALL
    USING (
      EXISTS (
        SELECT 1 FROM organization_members om
        WHERE om.organization_id = files.organization_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin')
      )
    );
END $$;

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_files_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_files_updated_at ON files;
CREATE TRIGGER update_files_updated_at
  BEFORE UPDATE ON files
  FOR EACH ROW
  EXECUTE FUNCTION update_files_updated_at();