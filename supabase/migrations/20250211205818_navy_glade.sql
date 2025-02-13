/*
  # Fix RLS policies for customer stages

  1. Changes
    - Drop existing restrictive policies
    - Create new policies that properly handle both source and target stages
    - Add organization context to policies
    - Ensure policies work for both updates and inserts

  2. Security
    - Maintain organization isolation
    - Allow users to move customers between stages within same organization
    - Prevent unauthorized access across organizations
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view customer stages" ON crm_customer_stages;
DROP POLICY IF EXISTS "Organization members can manage customer stages" ON crm_customer_stages;

-- Create new policies with proper organization context
CREATE POLICY "Users can view customer stages"
  ON crm_customer_stages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM customers c
      JOIN organization_members om ON c.organization_id = om.organization_id
      WHERE c.id = crm_customer_stages.customer_id
      AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert customer stages"
  ON crm_customer_stages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM customers c
      JOIN organization_members om ON c.organization_id = om.organization_id
      WHERE c.id = customer_id
      AND om.user_id = auth.uid()
    )
    AND
    EXISTS (
      SELECT 1 FROM crm_stages s
      JOIN crm_funnels f ON s.funnel_id = f.id
      JOIN organization_members om ON f.organization_id = om.organization_id
      WHERE s.id = stage_id
      AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update customer stages"
  ON crm_customer_stages
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM customers c
      JOIN organization_members om ON c.organization_id = om.organization_id
      WHERE c.id = customer_id
      AND om.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM crm_stages s
      JOIN crm_funnels f ON s.funnel_id = f.id
      JOIN organization_members om ON f.organization_id = om.organization_id
      WHERE s.id = stage_id
      AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete customer stages"
  ON crm_customer_stages
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM customers c
      JOIN organization_members om ON c.organization_id = om.organization_id
      WHERE c.id = customer_id
      AND om.user_id = auth.uid()
    )
  );