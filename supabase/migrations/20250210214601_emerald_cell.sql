/*
  # Message Shortcuts and Attachments

  1. New Tables
    - `message_shortcuts`
      - `id` (uuid, primary key)
      - `organization_id` (uuid, foreign key to organizations)
      - `title` (text)
      - `content` (text)
      - `attachments` (jsonb array)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `message_shortcuts` table
    - Add policies for organization members to view shortcuts
    - Add policies for organization admins to manage shortcuts

  3. Storage
    - Create storage bucket for attachments
*/

-- Create message shortcuts table
CREATE TABLE message_shortcuts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  attachments JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE message_shortcuts ENABLE ROW LEVEL SECURITY;

-- Create policies for message shortcuts
CREATE POLICY "Organization members can view shortcuts"
  ON message_shortcuts
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = message_shortcuts.organization_id
      AND organization_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Organization admins can manage shortcuts"
  ON message_shortcuts
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = message_shortcuts.organization_id
      AND organization_members.user_id = auth.uid()
      AND organization_members.role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = message_shortcuts.organization_id
      AND organization_members.user_id = auth.uid()
      AND organization_members.role IN ('owner', 'admin')
    )
  );

-- Create storage bucket for attachments
INSERT INTO storage.buckets (id, name, public) 
VALUES ('attachments', 'attachments', true);

-- Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload files"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'attachments' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow authenticated users to read files
CREATE POLICY "Authenticated users can read files"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'attachments');

-- Allow authenticated users to delete their own files
CREATE POLICY "Users can delete their own files"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'attachments' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );