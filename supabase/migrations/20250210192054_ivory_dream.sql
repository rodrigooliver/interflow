/*
  # Chat Channels Management

  1. New Tables
    - `chat_channels`
      - `id` (uuid, primary key)
      - `organization_id` (uuid, references organizations)
      - `name` (text)
      - `type` (text) - whatsapp_official, whatsapp_unofficial, instagram, facebook
      - `status` (text) - active, inactive
      - `credentials` (jsonb) - encrypted credentials
      - `settings` (jsonb) - channel specific settings
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `chat_channels` table
    - Add policies for organization admins
*/

-- Create chat channels table
CREATE TABLE chat_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('whatsapp_official', 'whatsapp_unofficial', 'instagram', 'facebook')),
  status TEXT NOT NULL DEFAULT 'inactive' CHECK (status IN ('active', 'inactive')),
  credentials JSONB NOT NULL DEFAULT '{}',
  settings JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE chat_channels ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Organization admins can manage chat channels" ON chat_channels;
DROP POLICY IF EXISTS "Organization members can view chat channels" ON chat_channels;

-- Create policies
CREATE POLICY "Organization admins can manage chat channels"
  ON chat_channels
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = chat_channels.organization_id
      AND organization_members.user_id = auth.uid()
      AND organization_members.role IN ('owner', 'admin')
    )
    OR user_is_superadmin()
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = chat_channels.organization_id
      AND organization_members.user_id = auth.uid()
      AND organization_members.role IN ('owner', 'admin')
    )
    OR user_is_superadmin()
  );

-- Create policy for agents to view channels
CREATE POLICY "Organization members can view chat channels"
  ON chat_channels
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = chat_channels.organization_id
      AND organization_members.user_id = auth.uid()
    )
    OR user_is_superadmin()
  );