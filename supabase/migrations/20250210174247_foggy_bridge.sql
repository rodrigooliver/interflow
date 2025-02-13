/*
  # Fix RLS policies for profiles

  1. Changes
    - Simplifica as políticas RLS para evitar recursão infinita
    - Atualiza o super admin
    - Corrige as políticas de acesso
*/

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Super admins can manage all data" ON profiles;
DROP POLICY IF EXISTS "Super admins can manage all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Agents can read all profiles" ON profiles;

-- Create simplified policies for profiles
CREATE POLICY "Users can read all profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Super admins can manage all profiles"
  ON profiles
  FOR ALL
  TO authenticated
  USING (
    (SELECT is_superadmin FROM profiles WHERE id = auth.uid())
    OR id = auth.uid()
  );

-- Update super admin status
UPDATE profiles 
SET is_superadmin = true 
WHERE id = auth.uid();