/*
  # Fix RLS policies for customer stages

  1. Changes
    - Drop existing policies
    - Create new simplified policies that allow:
      - Viewing customer stages within organization
      - Adding customers to stages within organization
      - Updating customer stages (including reordering)
      - Removing customers from stages
    
  2. Security
    - Maintain organization isolation
    - Allow reordering within same stage
    - Prevent unauthorized access across organizations
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view customer stages" ON crm_customer_stages;
DROP POLICY IF EXISTS "Users can insert customer stages" ON crm_customer_stages;
DROP POLICY IF EXISTS "Users can update customer stages" ON crm_customer_stages;
DROP POLICY IF EXISTS "Users can delete customer stages" ON crm_customer_stages;

-- Create new simplified policies
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

CREATE POLICY "Users can manage customer stages"
  ON crm_customer_stages
  FOR ALL
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
      WHERE c.id = customer_id
      AND om.user_id = auth.uid()
    )
  );