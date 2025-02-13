/*
  # Fix RLS Policies

  1. Changes
    - Drop existing policies
    - Create new policies for organizations
    - Create new policies for organization members
    - Create new policies for customers
    - Create new policies for subscription plans
    - Create new policies for subscriptions

  2. Security
    - Enable RLS on all tables
    - Add policies for proper access control
    - Fix recursive policy issues
*/

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Super admins can manage all organizations" ON organizations;
DROP POLICY IF EXISTS "Users can view their organizations" ON organizations;
DROP POLICY IF EXISTS "Organization owners and admins can manage members" ON organization_members;
DROP POLICY IF EXISTS "Users can view members of their organizations" ON organization_members;
DROP POLICY IF EXISTS "Users can access organization customers" ON customers;
DROP POLICY IF EXISTS "Anyone can view subscription plans" ON subscription_plans;
DROP POLICY IF EXISTS "Users can view their organization subscriptions" ON subscriptions;

-- Ensure RLS is enabled
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;

-- Create new policies for organizations
CREATE POLICY "Super admins can manage all organizations"
  ON organizations
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_superadmin = true
  ));

CREATE POLICY "Users can view their organizations"
  ON organizations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = organizations.id
      AND organization_members.user_id = auth.uid()
    )
  );

-- Policies for organization members
CREATE POLICY "Organization owners and admins can manage members"
  ON organization_members
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = organization_members.organization_id
      AND om.user_id = auth.uid()
      AND om.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Users can view members of their organizations"
  ON organization_members
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = organization_members.organization_id
      AND om.user_id = auth.uid()
    )
  );

-- Policies for customers
CREATE POLICY "Users can access organization customers"
  ON customers
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT user_id 
      FROM organization_members 
      WHERE organization_id = customers.organization_id
    )
  );

-- Policies for subscription plans
CREATE POLICY "Anyone can view subscription plans"
  ON subscription_plans
  FOR SELECT
  TO authenticated
  USING (true);

-- Policies for subscriptions
CREATE POLICY "Users can view their organization subscriptions"
  ON subscriptions
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT user_id 
      FROM organization_members 
      WHERE organization_id = subscriptions.organization_id
    )
  );