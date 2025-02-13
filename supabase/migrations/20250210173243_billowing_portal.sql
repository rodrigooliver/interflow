/*
  # Add SaaS structure

  1. New Tables
    - `organizations`
      - Basic organization info
      - Subscription and billing details
    - `subscriptions`
      - Subscription plans and status
    - `organization_members`
      - Links users to organizations with roles
    - Update `profiles` with organization access

  2. Security
    - Enable RLS on all new tables
    - Add policies for different access levels
*/

-- Create organizations table
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create subscription plans table
CREATE TABLE subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  features JSONB NOT NULL DEFAULT '{}',
  max_users INTEGER NOT NULL DEFAULT 1,
  max_customers INTEGER NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create subscriptions table
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  plan_id UUID NOT NULL REFERENCES subscription_plans(id),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'past_due', 'trialing')),
  current_period_start TIMESTAMPTZ NOT NULL,
  current_period_end TIMESTAMPTZ NOT NULL,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create organization members table
CREATE TABLE organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'agent')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, user_id)
);

-- Add organization_id to existing tables
ALTER TABLE customers ADD COLUMN organization_id UUID REFERENCES organizations(id);
ALTER TABLE chats ADD COLUMN organization_id UUID REFERENCES organizations(id);
ALTER TABLE messages ADD COLUMN organization_id UUID REFERENCES organizations(id);

-- Update profiles table
ALTER TABLE profiles ADD COLUMN is_superadmin BOOLEAN DEFAULT false;

-- Enable RLS
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;

-- Policies for organizations
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

-- Update existing policies for organization scope
DROP POLICY IF EXISTS "Agents can read all customers" ON customers;
CREATE POLICY "Users can access organization customers"
  ON customers
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = customers.organization_id
      AND organization_members.user_id = auth.uid()
    )
  );

-- Insert default subscription plans
INSERT INTO subscription_plans (name, description, price, features, max_users, max_customers) VALUES
  ('Starter', 'Perfect for small businesses', 49.90, '{"chat_channels": ["web"], "max_concurrent_chats": 10}', 2, 100),
  ('Professional', 'For growing teams', 99.90, '{"chat_channels": ["web", "whatsapp"], "max_concurrent_chats": 50}', 5, 500),
  ('Enterprise', 'For large organizations', 199.90, '{"chat_channels": ["web", "whatsapp", "instagram"], "max_concurrent_chats": 100}', 15, 2000);