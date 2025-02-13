/*
  # Fix foreign key relationships and add helper functions

  1. Changes
    - Add foreign key relationship between organization_members and profiles
    - Update get_organization_members function to use proper joins
    - Add function to get available users for team member selection

  2. Security
    - Functions are marked as SECURITY DEFINER to ensure proper access control
*/

-- Drop existing function if exists
DROP FUNCTION IF EXISTS get_organization_members;
DROP FUNCTION IF EXISTS get_available_users;

-- Create function to get organization members with profiles
CREATE OR REPLACE FUNCTION get_organization_members(org_id uuid)
RETURNS TABLE (
  id uuid,
  organization_id uuid,
  user_id uuid,
  role text,
  created_at timestamptz,
  profile jsonb
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    om.id,
    om.organization_id,
    om.user_id,
    om.role,
    om.created_at,
    jsonb_build_object(
      'id', p.id,
      'email', p.email,
      'full_name', p.full_name,
      'avatar_url', p.avatar_url,
      'role', p.role,
      'is_superadmin', p.is_superadmin
    ) as profile
  FROM organization_members om
  JOIN auth.users u ON u.id = om.user_id
  JOIN profiles p ON p.id = u.id
  WHERE om.organization_id = org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get available users for team member selection
CREATE OR REPLACE FUNCTION get_available_users(org_id uuid)
RETURNS TABLE (
  id uuid,
  email text,
  full_name text,
  avatar_url text,
  role text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.email,
    p.full_name,
    p.avatar_url,
    p.role
  FROM profiles p
  JOIN organization_members om ON om.user_id = p.id
  WHERE om.organization_id = org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;