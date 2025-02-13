/*
  # Fix RLS policies for customer stages with proper organization context

  1. Changes
    - Drop existing policies
    - Create new policies with proper organization context
    - Add explicit policies for each operation type
    - Ensure proper access control for both source and target stages

  2. Security
    - Maintain organization isolation
    - Allow users to move customers between stages within same organization
    - Prevent unauthorized access across organizations
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view customer stages" ON crm_customer_stages;
DROP POLICY IF EXISTS "Users can insert customer stages" ON crm_customer_stages;
DROP POLICY IF EXISTS "Users can update customer stages" ON crm_customer_stages;
DROP POLICY IF EXISTS "Users can delete customer stages" ON crm_customer_stages;

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
      JOIN crm_stages s ON s.id = stage_id
      JOIN crm_funnels f ON s.funnel_id = f.id
      WHERE c.id = customer_id
      AND om.user_id = auth.uid()
      AND f.organization_id = om.organization_id
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
      SELECT 1 FROM customers c
      JOIN organization_members om ON c.organization_id = om.organization_id
      JOIN crm_stages s ON s.id = stage_id
      JOIN crm_funnels f ON s.funnel_id = f.id
      WHERE c.id = customer_id
      AND om.user_id = auth.uid()
      AND f.organization_id = om.organization_id
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