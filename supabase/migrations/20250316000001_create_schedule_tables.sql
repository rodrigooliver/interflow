/*
  # Create schedule system tables - Part 1

  1. New Tables
    - `schedules`
      - `id` (uuid, primary key)
      - `organization_id` (uuid, foreign key to organizations)
      - `title` (text) - Name of the schedule
      - `description` (text) - Description of the schedule
      - `color` (text) - Color for UI representation
      - `status` (text) - Status of the schedule (active, inactive)
      - `type` (text) - Type of schedule (service, meeting)
      - `timezone` (text) - Default timezone for the schedule
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `schedule_providers`
      - `id` (uuid, primary key)
      - `schedule_id` (uuid, foreign key to schedules)
      - `profile_id` (uuid, foreign key to profiles)
      - `status` (text) - Status of the provider (active, inactive)
      - `available_services` (jsonb) - Array of service IDs this provider can perform
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `schedule_availability`
      - `id` (uuid, primary key)
      - `provider_id` (uuid, foreign key to schedule_providers)
      - `day_of_week` (integer) - 0-6 for Sunday-Saturday
      - `start_time` (time)
      - `end_time` (time)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add appropriate policies
*/

-- Create schedules table
CREATE TABLE IF NOT EXISTS schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  color text DEFAULT '#3b82f6', -- default blue
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  type text NOT NULL DEFAULT 'service' CHECK (type IN ('service', 'meeting')),
  timezone text NOT NULL DEFAULT 'UTC',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS schedules_organization_id_idx ON schedules(organization_id);

-- Create schedule_providers table
CREATE TABLE IF NOT EXISTS schedule_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id uuid NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  available_services jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(schedule_id, profile_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS schedule_providers_schedule_id_idx ON schedule_providers(schedule_id);
CREATE INDEX IF NOT EXISTS schedule_providers_profile_id_idx ON schedule_providers(profile_id);

-- Create schedule_availability table
CREATE TABLE IF NOT EXISTS schedule_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES schedule_providers(id) ON DELETE CASCADE,
  day_of_week integer NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time time NOT NULL,
  end_time time NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (start_time < end_time)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS schedule_availability_provider_id_idx ON schedule_availability(provider_id);
CREATE INDEX IF NOT EXISTS schedule_availability_day_of_week_idx ON schedule_availability(day_of_week);

-- Enable RLS
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_availability ENABLE ROW LEVEL SECURITY;

-- Create policies for schedules
CREATE POLICY "Organization admins and owners can manage schedules"
  ON schedules
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = schedules.organization_id
      AND om.user_id = auth.uid()
      AND om.role IN ('admin', 'owner')
    )
  );

CREATE POLICY "Organization members can read schedules"
  ON schedules
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = schedules.organization_id
      AND om.user_id = auth.uid()
    )
  );

-- Create policies for schedule_providers
CREATE POLICY "Organization admins and owners can manage schedule_providers"
  ON schedule_providers
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      JOIN schedules s ON s.id = schedule_providers.schedule_id
      WHERE om.organization_id = s.organization_id
      AND om.user_id = auth.uid()
      AND om.role IN ('admin', 'owner')
    )
  );

CREATE POLICY "Providers can manage their own schedule_providers"
  ON schedule_providers
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = schedule_providers.profile_id
      AND p.id = auth.uid()
    )
  );

CREATE POLICY "Organization members can read schedule_providers"
  ON schedule_providers
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      JOIN schedules s ON s.id = schedule_providers.schedule_id
      WHERE om.organization_id = s.organization_id
      AND om.user_id = auth.uid()
    )
  );

-- Create policies for schedule_availability
CREATE POLICY "Organization admins and owners can manage schedule_availability"
  ON schedule_availability
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      JOIN schedule_providers sp ON sp.id = schedule_availability.provider_id
      JOIN schedules s ON s.id = sp.schedule_id
      WHERE om.organization_id = s.organization_id
      AND om.user_id = auth.uid()
      AND om.role IN ('admin', 'owner')
    )
  );

CREATE POLICY "Providers can manage their own schedule_availability"
  ON schedule_availability
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN schedule_providers sp ON sp.profile_id = p.id
      WHERE sp.id = schedule_availability.provider_id
      AND p.id = auth.uid()
    )
  );

CREATE POLICY "Organization members can read schedule_availability"
  ON schedule_availability
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      JOIN schedule_providers sp ON sp.id = schedule_availability.provider_id
      JOIN schedules s ON s.id = sp.schedule_id
      WHERE om.organization_id = s.organization_id
      AND om.user_id = auth.uid()
    )
  );

-- Create triggers to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_schedules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_schedules_updated_at
  BEFORE UPDATE ON schedules
  FOR EACH ROW
  EXECUTE FUNCTION update_schedules_updated_at();

CREATE OR REPLACE FUNCTION update_schedule_providers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_schedule_providers_updated_at
  BEFORE UPDATE ON schedule_providers
  FOR EACH ROW
  EXECUTE FUNCTION update_schedule_providers_updated_at();

CREATE OR REPLACE FUNCTION update_schedule_availability_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_schedule_availability_updated_at
  BEFORE UPDATE ON schedule_availability
  FOR EACH ROW
  EXECUTE FUNCTION update_schedule_availability_updated_at(); 