/*
  # Add Service Teams Management

  1. New Tables
    - `service_teams`
      - `id` (uuid, primary key)
      - `organization_id` (uuid, references organizations)
      - `name` (text)
      - `description` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `service_team_members`
      - `id` (uuid, primary key)
      - `team_id` (uuid, references service_teams)
      - `user_id` (uuid, references profiles)
      - `role` (text: 'leader' or 'member')
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Add policies for organization members to manage their teams
*/

-- Create service teams table
CREATE TABLE service_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create service team members table
CREATE TABLE service_team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES service_teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id),
  role TEXT NOT NULL CHECK (role IN ('leader', 'member')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(team_id, user_id)
);

-- Enable RLS
ALTER TABLE service_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_team_members ENABLE ROW LEVEL SECURITY;

-- Policies for service_teams
CREATE POLICY "Users can view their organization teams"
  ON service_teams
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = service_teams.organization_id
      AND organization_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage organization teams"
  ON service_teams
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = service_teams.organization_id
      AND organization_members.user_id = auth.uid()
      AND organization_members.role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = service_teams.organization_id
      AND organization_members.user_id = auth.uid()
      AND organization_members.role IN ('owner', 'admin')
    )
  );

-- Policies for service_team_members
CREATE POLICY "Users can view team members"
  ON service_team_members
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM service_teams st
      JOIN organization_members om ON st.organization_id = om.organization_id
      WHERE st.id = service_team_members.team_id
      AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage team members"
  ON service_team_members
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM service_teams st
      JOIN organization_members om ON st.organization_id = om.organization_id
      WHERE st.id = service_team_members.team_id
      AND om.user_id = auth.uid()
      AND om.role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM service_teams st
      JOIN organization_members om ON st.organization_id = om.organization_id
      WHERE st.id = service_team_members.team_id
      AND om.user_id = auth.uid()
      AND om.role IN ('owner', 'admin')
    )
  );

-- Helper function to get team members with profiles
CREATE OR REPLACE FUNCTION get_service_team_members(team_id_param uuid)
RETURNS TABLE (
  id uuid,
  team_id uuid,
  user_id uuid,
  role text,
  created_at timestamptz,
  profile jsonb
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    stm.id,
    stm.team_id,
    stm.user_id,
    stm.role,
    stm.created_at,
    jsonb_build_object(
      'id', p.id,
      'email', p.email,
      'full_name', p.full_name,
      'avatar_url', p.avatar_url,
      'role', p.role
    ) as profile
  FROM service_team_members stm
  JOIN profiles p ON p.id = stm.user_id
  WHERE stm.team_id = team_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;