-- Drop existing problematic policies
DROP POLICY IF EXISTS "Authenticated users can read profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Super admins can manage all profiles" ON profiles;

-- Create simplified policies
CREATE POLICY "profiles_select_policy"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "profiles_insert_policy"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "profiles_update_policy"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_delete_policy"
  ON profiles
  FOR DELETE
  TO authenticated
  USING (id = auth.uid());

-- Ensure current user is super admin
UPDATE profiles 
SET is_superadmin = true, role = 'admin'
WHERE id = auth.uid();