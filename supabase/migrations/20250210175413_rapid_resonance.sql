-- Drop existing problematic policies
DROP POLICY IF EXISTS "Authenticated users can read profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Super admins can manage all profiles" ON profiles;



CREATE POLICY "profiles_delete_policy"
  ON profiles
  FOR DELETE
  TO authenticated
  USING (id = auth.uid());

-- Ensure current user is super admin
UPDATE profiles 
SET is_superadmin = true, role = 'admin'
WHERE id = auth.uid();