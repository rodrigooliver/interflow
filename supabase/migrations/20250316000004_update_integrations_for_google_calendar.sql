/*
  # Update Integrations for Google Calendar/Meet

  1. Changes
    - Update integrations to support Google Calendar type
    - Add function to validate Google Calendar credentials
*/

-- Update the type check constraint to include google_calendar
ALTER TABLE integrations
DROP CONSTRAINT IF EXISTS integrations_type_check;

ALTER TABLE integrations
ADD CONSTRAINT integrations_type_check 
CHECK (type IN ('openai', 'aws_s3', 'google_calendar'));

-- Create a separate table for Google Calendar configuration for schedule providers
CREATE TABLE IF NOT EXISTS schedule_provider_calendar_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES schedule_providers(id) ON DELETE CASCADE,
  integration_id uuid NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
  calendar_id text,
  sync_enabled boolean NOT NULL DEFAULT true,
  auto_create_meet boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(provider_id, integration_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS schedule_provider_calendar_config_provider_id_idx 
ON schedule_provider_calendar_config(provider_id);

CREATE INDEX IF NOT EXISTS schedule_provider_calendar_config_integration_id_idx 
ON schedule_provider_calendar_config(integration_id);

-- Enable RLS
ALTER TABLE schedule_provider_calendar_config ENABLE ROW LEVEL SECURITY;

-- Create policies for schedule_provider_calendar_config
CREATE POLICY "Organization admins and owners can manage schedule_provider_calendar_config"
  ON schedule_provider_calendar_config
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      JOIN schedule_providers sp ON sp.id = schedule_provider_calendar_config.provider_id
      JOIN schedules s ON s.id = sp.schedule_id
      JOIN integrations i ON i.id = schedule_provider_calendar_config.integration_id
      WHERE om.organization_id = s.organization_id
      AND om.organization_id = i.organization_id
      AND om.user_id = auth.uid()
      AND om.role IN ('admin', 'owner')
    )
  );

CREATE POLICY "Providers can manage their own schedule_provider_calendar_config"
  ON schedule_provider_calendar_config
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN schedule_providers sp ON sp.profile_id = p.id
      WHERE sp.id = schedule_provider_calendar_config.provider_id
      AND p.id = auth.uid()
    )
  );

CREATE POLICY "Organization members can read schedule_provider_calendar_config"
  ON schedule_provider_calendar_config
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      JOIN schedule_providers sp ON sp.id = schedule_provider_calendar_config.provider_id
      JOIN schedules s ON s.id = sp.schedule_id
      JOIN integrations i ON i.id = schedule_provider_calendar_config.integration_id
      WHERE om.organization_id = s.organization_id
      AND om.organization_id = i.organization_id
      AND om.user_id = auth.uid()
    )
  );

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_schedule_provider_calendar_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_schedule_provider_calendar_config_updated_at
  BEFORE UPDATE ON schedule_provider_calendar_config
  FOR EACH ROW
  EXECUTE FUNCTION update_schedule_provider_calendar_config_updated_at();

-- Add support for tracking Google Calendar events in appointments
ALTER TABLE appointments 
ADD COLUMN calendar_event_id text,
ADD COLUMN calendar_event_link text;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS appointments_calendar_event_id_idx ON appointments(calendar_event_id);

-- Add videoconference related fields to appointments
ALTER TABLE appointments
ADD COLUMN has_videoconference boolean NOT NULL DEFAULT false,
ADD COLUMN videoconference_link text,
ADD COLUMN videoconference_provider text CHECK (videoconference_provider IN ('google_meet', 'zoom', 'teams', 'other')); 