/*
  # Create schedule system tables - Part 2 (Services and Holidays)

  1. New Tables
    - `schedule_services`
      - `id` (uuid, primary key)
      - `schedule_id` (uuid, foreign key to schedules)
      - `title` (text) - Name of the service
      - `description` (text) - Description of the service
      - `price` (numeric) - Price of the service
      - `currency` (text) - Currency code (USD, BRL, etc)
      - `duration` (interval) - Duration of the service
      - `color` (text) - Color for UI representation
      - `status` (text) - Status of the service (active, inactive)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `schedule_holidays`
      - `id` (uuid, primary key)
      - `schedule_id` (uuid, foreign key to schedules)
      - `provider_id` (uuid, foreign key to schedule_providers, nullable)
      - `title` (text) - Name of the holiday
      - `date` (date) - Date of the holiday
      - `all_day` (boolean) - Whether it's an all-day holiday
      - `start_time` (time, nullable) - Start time if not all day
      - `end_time` (time, nullable) - End time if not all day
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add appropriate policies
*/

-- Create schedule_services table
CREATE TABLE IF NOT EXISTS schedule_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id uuid NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  price numeric(10, 2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  duration interval NOT NULL DEFAULT '30 minutes',
  color text DEFAULT '#3b82f6', -- default blue
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS schedule_services_schedule_id_idx ON schedule_services(schedule_id);

-- Create schedule_holidays table
CREATE TABLE IF NOT EXISTS schedule_holidays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id uuid NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
  provider_id uuid REFERENCES schedule_providers(id) ON DELETE CASCADE,
  title text NOT NULL,
  date date NOT NULL,
  all_day boolean NOT NULL DEFAULT true,
  start_time time,
  end_time time,
  recurring boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (all_day = true AND start_time IS NULL AND end_time IS NULL) OR
    (all_day = false AND start_time IS NOT NULL AND end_time IS NOT NULL AND start_time < end_time)
  )
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS schedule_holidays_schedule_id_idx ON schedule_holidays(schedule_id);
CREATE INDEX IF NOT EXISTS schedule_holidays_provider_id_idx ON schedule_holidays(provider_id);
CREATE INDEX IF NOT EXISTS schedule_holidays_date_idx ON schedule_holidays(date);

-- Enable RLS
ALTER TABLE schedule_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_holidays ENABLE ROW LEVEL SECURITY;

-- Create policies for schedule_services
CREATE POLICY "Organization admins and owners can manage schedule_services"
  ON schedule_services
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      JOIN schedules s ON s.id = schedule_services.schedule_id
      WHERE om.organization_id = s.organization_id
      AND om.user_id = auth.uid()
      AND om.role IN ('admin', 'owner')
    )
  );

CREATE POLICY "Organization members can read schedule_services"
  ON schedule_services
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      JOIN schedules s ON s.id = schedule_services.schedule_id
      WHERE om.organization_id = s.organization_id
      AND om.user_id = auth.uid()
    )
  );

-- Create policies for schedule_holidays
CREATE POLICY "Organization admins and owners can manage schedule_holidays"
  ON schedule_holidays
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      JOIN schedules s ON s.id = schedule_holidays.schedule_id
      WHERE om.organization_id = s.organization_id
      AND om.user_id = auth.uid()
      AND om.role IN ('admin', 'owner')
    )
  );

CREATE POLICY "Providers can manage their own schedule_holidays"
  ON schedule_holidays
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN schedule_providers sp ON sp.profile_id = p.id
      WHERE sp.id = schedule_holidays.provider_id
      AND p.id = auth.uid()
    )
  );

CREATE POLICY "Organization members can read schedule_holidays"
  ON schedule_holidays
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      JOIN schedules s ON s.id = schedule_holidays.schedule_id
      WHERE om.organization_id = s.organization_id
      AND om.user_id = auth.uid()
    )
  );

-- Create triggers to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_schedule_services_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_schedule_services_updated_at
  BEFORE UPDATE ON schedule_services
  FOR EACH ROW
  EXECUTE FUNCTION update_schedule_services_updated_at();

CREATE OR REPLACE FUNCTION update_schedule_holidays_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_schedule_holidays_updated_at
  BEFORE UPDATE ON schedule_holidays
  FOR EACH ROW
  EXECUTE FUNCTION update_schedule_holidays_updated_at(); 