-- Drop existing policies
DROP POLICY IF EXISTS "Users can view customer stages" ON crm_customer_stages;
DROP POLICY IF EXISTS "Organization members can manage customer stages" ON crm_customer_stages;

-- Create updated policies for crm_customer_stages
CREATE POLICY "Users can view customer stages"
  ON crm_customer_stages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM crm_stages s
      JOIN crm_funnels f ON s.funnel_id = f.id
      JOIN organization_members om ON f.organization_id = om.organization_id
      WHERE s.id = crm_customer_stages.stage_id
      AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "Organization members can manage customer stages"
  ON crm_customer_stages
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM crm_stages s
      JOIN crm_funnels f ON s.funnel_id = f.id
      JOIN organization_members om ON f.organization_id = om.organization_id
      WHERE s.id = crm_customer_stages.stage_id
      AND om.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM crm_stages s
      JOIN crm_funnels f ON s.funnel_id = f.id
      JOIN organization_members om ON f.organization_id = om.organization_id
      WHERE s.id = crm_customer_stages.stage_id
      AND om.user_id = auth.uid()
    )
  );