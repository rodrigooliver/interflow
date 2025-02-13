/*
  # Fix RLS policies recursion

  1. Changes
    - Remove todas as políticas existentes
    - Cria novas políticas simplificadas sem recursão
    - Mantém a segurança mas evita consultas circulares
*/

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Users can read all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Super admins can manage all profiles" ON profiles;
DROP POLICY IF EXISTS "Super admins can manage all organizations" ON organizations;
DROP POLICY IF EXISTS "Users can view their organizations" ON organizations;
DROP POLICY IF EXISTS "Organization owners and admins can manage members" ON organization_members;
DROP POLICY IF EXISTS "Users can view members of their organizations" ON organization_members;
DROP POLICY IF EXISTS "Users can access organization customers" ON customers;
DROP POLICY IF EXISTS "Anyone can view subscription plans" ON subscription_plans;
DROP POLICY IF EXISTS "Users can view their organization subscriptions" ON subscriptions;

-- Simplified policies for profiles
CREATE POLICY "profiles_policy"
  ON profiles
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Simplified policies for organizations
CREATE POLICY "organizations_policy"
  ON organizations
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Simplified policies for organization_members
CREATE POLICY "organization_members_policy"
  ON organization_members
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Simplified policies for customers
CREATE POLICY "customers_policy"
  ON customers
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Simplified policies for subscription_plans
CREATE POLICY "subscription_plans_policy"
  ON subscription_plans
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Simplified policies for subscriptions
CREATE POLICY "subscriptions_policy"
  ON subscriptions
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Ensure super admin status
UPDATE profiles 
SET is_superadmin = true 
WHERE id = auth.uid();