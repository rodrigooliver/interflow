/*
  # Create Super Admin

  1. Changes
    - Update the current user's profile to be a super admin
    - Add necessary policies for super admin access

  2. Security
    - Only updates the specific user profile
    - Maintains existing security policies
*/

-- Update the current user's profile to be a super admin
UPDATE profiles 
SET is_superadmin = true 
WHERE id = auth.uid();

-- Add policy for super admins to manage all profiles
CREATE POLICY "Super admins can manage all profiles"
  ON profiles
  TO authenticated
  USING (
    is_superadmin = true
    OR
    id = auth.uid()
  );

-- Add policy for super admins to manage all customers
CREATE POLICY "Super admins can manage all customers"
  ON customers
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_superadmin = true
    )
  );