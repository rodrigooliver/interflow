/*
  # Create referrals and tracking tables

  1. New Tables
    - `referrals`
      - `id` (uuid, primary key)
      - `organization_id` (uuid, foreign key to organizations)
      - `user_id` (uuid, foreign key to profiles) - Quem indicou
      - `code` (text) - Unique referral code
      - `status` (enum) - Status of the referral (active, inactive)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      
    - `tracking_pixels`
      - `id` (uuid, primary key)
      - `organization_id` (uuid, foreign key to organizations)
      - `referral_id` (uuid, foreign key to referrals) - Vinculado ao código de indicação
      - `type` (enum) - Type of tracking pixel (facebook, google, etc.)
      - `pixel_id` (text) - ID of the tracking pixel
      - `configuration` (jsonb) - Configuration of the tracking pixel
      - `status` (enum) - Status of the tracking pixel (active, inactive)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Add policies for organization members to manage referrals and tracking pixels

  3. Changes
    - Add foreign key constraints
    - Add indexes for faster lookups
    - Add triggers to update updated_at
*/

-- Create status enum types
CREATE TYPE referral_status AS ENUM ('active', 'inactive');
CREATE TYPE tracking_pixel_status AS ENUM ('active', 'inactive');
CREATE TYPE tracking_pixel_type AS ENUM ('facebook', 'google', 'custom');

-- Create referrals table
CREATE TABLE public.referrals (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  user_id uuid NOT NULL,
  code text NOT NULL,
  status referral_status NOT NULL DEFAULT 'active',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  
  CONSTRAINT referrals_pkey PRIMARY KEY (id),
  CONSTRAINT referrals_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES organizations (id) ON DELETE CASCADE,
  CONSTRAINT referrals_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles (id) ON DELETE CASCADE,
  CONSTRAINT referrals_code_key UNIQUE (code)
) TABLESPACE pg_default;

-- Create tracking_pixels table
CREATE TABLE public.tracking_pixels (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  referral_id uuid NOT NULL,
  type tracking_pixel_type NOT NULL,
  pixel_id text NOT NULL,
  configuration jsonb NOT NULL DEFAULT '{}'::jsonb,
  status tracking_pixel_status NOT NULL DEFAULT 'active',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  
  CONSTRAINT tracking_pixels_pkey PRIMARY KEY (id),
  CONSTRAINT tracking_pixels_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES organizations (id) ON DELETE CASCADE,
  CONSTRAINT tracking_pixels_referral_id_fkey FOREIGN KEY (referral_id) REFERENCES referrals (id) ON DELETE CASCADE
) TABLESPACE pg_default;

-- Create indexes
CREATE INDEX IF NOT EXISTS referrals_organization_id_idx ON public.referrals USING btree (organization_id) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS referrals_user_id_idx ON public.referrals USING btree (user_id) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS referrals_code_idx ON public.referrals USING btree (code) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS tracking_pixels_organization_id_idx ON public.tracking_pixels USING btree (organization_id) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS tracking_pixels_referral_id_idx ON public.tracking_pixels USING btree (referral_id) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS tracking_pixels_type_idx ON public.tracking_pixels USING btree (type) TABLESPACE pg_default;

-- Enable RLS
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracking_pixels ENABLE ROW LEVEL SECURITY;

-- Create policies for referrals
CREATE POLICY "Organization members can view referrals"
  ON public.referrals
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = referrals.organization_id
      AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "Organization admins can manage referrals"
  ON public.referrals
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = referrals.organization_id
      AND om.user_id = auth.uid()
      AND om.role IN ('owner', 'admin')
    )
  );

-- Create policies for tracking_pixels
CREATE POLICY "Organization members can view tracking pixels"
  ON public.tracking_pixels
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = tracking_pixels.organization_id
      AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "Organization admins can manage tracking pixels"
  ON public.tracking_pixels
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = tracking_pixels.organization_id
      AND om.user_id = auth.uid()
      AND om.role IN ('owner', 'admin')
    )
  );

-- Create triggers for updated_at
CREATE OR REPLACE FUNCTION update_referrals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_referrals_updated_at
BEFORE UPDATE ON public.referrals
FOR EACH ROW
EXECUTE FUNCTION update_referrals_updated_at();

CREATE OR REPLACE FUNCTION update_tracking_pixels_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_tracking_pixels_updated_at
BEFORE UPDATE ON public.tracking_pixels
FOR EACH ROW
EXECUTE FUNCTION update_tracking_pixels_updated_at(); 



-- Adicionar colunas em customers
ALTER TABLE public.customers ADD COLUMN referrer_id uuid REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE public.customers ADD COLUMN seller_id uuid REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE public.customers ADD COLUMN support_id uuid REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE public.customers ADD COLUMN manager_id uuid REFERENCES profiles(id) ON DELETE SET NULL;

-- Adicionar colunas em organizations
ALTER TABLE public.organizations ADD COLUMN referrer_id uuid REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE public.organizations ADD COLUMN seller_id uuid REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE public.organizations ADD COLUMN support_id uuid REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE public.organizations ADD COLUMN manager_id uuid REFERENCES profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS customers_referrer_id_idx ON public.customers USING btree (referrer_id) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS customers_seller_id_idx ON public.customers USING btree (seller_id) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS customers_support_id_idx ON public.customers USING btree (support_id) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS customers_manager_id_idx ON public.customers USING btree (manager_id) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS organizations_referrer_id_idx ON public.organizations USING btree (referrer_id) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS organizations_seller_id_idx ON public.organizations USING btree (seller_id) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS organizations_support_id_idx ON public.organizations USING btree (support_id) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS organizations_manager_id_idx ON public.organizations USING btree (manager_id) TABLESPACE pg_default;