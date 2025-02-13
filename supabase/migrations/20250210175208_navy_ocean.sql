-- Drop existing policies
DROP POLICY IF EXISTS "profiles_policy" ON profiles;

-- Create new policies for profiles
CREATE POLICY "Authenticated users can read profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update their own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "Super admins can manage all profiles"
  ON profiles
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p2
      WHERE p2.id = auth.uid()
      AND p2.is_superadmin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p2
      WHERE p2.id = auth.uid()
      AND p2.is_superadmin = true
    )
  );

-- Ensure current user is super admin
UPDATE profiles 
SET is_superadmin = true 
WHERE id = auth.uid();