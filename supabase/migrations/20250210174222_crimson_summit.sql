/*
  # Update super admin status

  1. Changes
    - Updates the current user's profile to be a super admin
    - Adds RLS policies for super admin access
*/

-- Update the current user's profile to be a super admin
UPDATE profiles 
SET is_superadmin = true 
WHERE id = auth.uid();

-- Ensure super admins can manage all data
CREATE POLICY "Super admins can manage all data"
  ON profiles
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_superadmin = true
    )
  );

-- Add policy for super admins to view all organizations
CREATE POLICY "Super admins can view all organizations"
  ON organizations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_superadmin = true
    )
  );