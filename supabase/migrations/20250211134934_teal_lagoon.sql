/*
  # Add CRM Kanban Features

  1. New Tables
    - `crm_funnels` - Stores sales funnels
      - `id` (uuid, primary key)
      - `organization_id` (uuid, references organizations)
      - `name` (text) - Funnel name
      - `description` (text) - Optional description
      - `is_active` (boolean) - Whether funnel is active
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `crm_stages` - Stores stages within funnels
      - `id` (uuid, primary key)
      - `funnel_id` (uuid, references crm_funnels)
      - `name` (text) - Stage name
      - `description` (text) - Optional description
      - `color` (text) - Color for visual identification
      - `position` (integer) - Order in funnel
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `crm_customer_stages` - Tracks customer positions in funnels
      - `id` (uuid, primary key)
      - `customer_id` (uuid, references customers)
      - `stage_id` (uuid, references crm_stages)
      - `notes` (text) - Optional notes
      - `moved_at` (timestamptz) - When customer was moved to this stage
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for organization access
*/

-- Create crm_funnels table
CREATE TABLE crm_funnels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create crm_stages table
CREATE TABLE crm_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  funnel_id UUID NOT NULL REFERENCES crm_funnels(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT NOT NULL,
  position INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create crm_customer_stages table
CREATE TABLE crm_customer_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id),
  stage_id UUID NOT NULL REFERENCES crm_stages(id),
  notes TEXT,
  moved_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(customer_id, stage_id)
);

-- Enable RLS
ALTER TABLE crm_funnels ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_customer_stages ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX crm_funnels_organization_id_idx ON crm_funnels(organization_id);
CREATE INDEX crm_stages_funnel_id_idx ON crm_stages(funnel_id);
CREATE INDEX crm_stages_position_idx ON crm_stages(position);
CREATE INDEX crm_customer_stages_customer_id_idx ON crm_customer_stages(customer_id);
CREATE INDEX crm_customer_stages_stage_id_idx ON crm_customer_stages(stage_id);

-- Create policies
CREATE POLICY "Users can view their organization funnels"
  ON crm_funnels
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = crm_funnels.organization_id
      AND organization_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Organization members can manage funnels"
  ON crm_funnels
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = crm_funnels.organization_id
      AND organization_members.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = crm_funnels.organization_id
      AND organization_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view funnel stages"
  ON crm_stages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM crm_funnels f
      JOIN organization_members om ON f.organization_id = om.organization_id
      WHERE f.id = crm_stages.funnel_id
      AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "Organization members can manage stages"
  ON crm_stages
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM crm_funnels f
      JOIN organization_members om ON f.organization_id = om.organization_id
      WHERE f.id = crm_stages.funnel_id
      AND om.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM crm_funnels f
      JOIN organization_members om ON f.organization_id = om.organization_id
      WHERE f.id = crm_stages.funnel_id
      AND om.user_id = auth.uid()
    )
  );

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

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_crm_funnels_updated_at
  BEFORE UPDATE ON crm_funnels
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_crm_stages_updated_at
  BEFORE UPDATE ON crm_stages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();