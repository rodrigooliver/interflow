/*
  # Add organization members function
  
  1. Changes
    - Add stored procedure for fetching organization members with profiles
    - Optimizes member queries by joining with profiles table
  
  2. Security
    - Function runs with security definer to ensure proper access
    - Returns only necessary profile information
*/

-- Create or replace the function for getting organization members
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
  JOIN profiles p ON p.id = om.user_id
  WHERE om.organization_id = org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;