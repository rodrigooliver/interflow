/*
  # Create schedule system tables - Part 3 (Appointments)

  1. New Tables
    - `appointments`
      - `id` (uuid, primary key)
      - `schedule_id` (uuid, foreign key to schedules)
      - `provider_id` (uuid, foreign key to profiles)
      - `service_id` (uuid, foreign key to schedule_services)
      - `customer_id` (uuid, foreign key to customers)
      - `chat_id` (uuid, foreign key to chats)
      - `status` (text) - Status of the appointment (scheduled, confirmed, completed, canceled, no_show)
      - `date` (date) - Date of the appointment
      - `start_time` (time) - Start time of the appointment
      - `end_time` (time) - End time of the appointment
      - `has_videoconference` (boolean) - Indicates whether the appointment has a video conference
      - `notes` (text) - Notes about the appointment
      - `metadata` (jsonb) - Additional data about the appointment
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `appointment_reminders`
      - `id` (uuid, primary key)
      - `appointment_id` (uuid, foreign key to appointments)
      - `type` (text) - Type of reminder (email, sms, whatsapp)
      - `status` (text) - Status of reminder (pending, sent, failed)
      - `scheduled_for` (timestamptz) - When the reminder is scheduled to be sent
      - `sent_at` (timestamptz) - When the reminder was actually sent
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add appropriate policies
*/

-- Create appointments table
CREATE TABLE IF NOT EXISTS appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id uuid NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
  provider_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  service_id uuid REFERENCES schedule_services(id) ON DELETE SET NULL,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  chat_id uuid REFERENCES chats(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'completed', 'canceled', 'no_show')),
  date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  has_videoconference boolean NOT NULL DEFAULT false,
  notes text,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (start_time < end_time)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS appointments_schedule_id_idx ON appointments(schedule_id);
CREATE INDEX IF NOT EXISTS appointments_provider_id_idx ON appointments(provider_id);
CREATE INDEX IF NOT EXISTS appointments_service_id_idx ON appointments(service_id);
CREATE INDEX IF NOT EXISTS appointments_customer_id_idx ON appointments(customer_id);
CREATE INDEX IF NOT EXISTS appointments_chat_id_idx ON appointments(chat_id);
CREATE INDEX IF NOT EXISTS appointments_date_idx ON appointments(date);
CREATE INDEX IF NOT EXISTS appointments_status_idx ON appointments(status);

-- Create appointment_reminders table
CREATE TABLE IF NOT EXISTS appointment_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('email', 'sms', 'whatsapp')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  scheduled_for timestamptz NOT NULL,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS appointment_reminders_appointment_id_idx ON appointment_reminders(appointment_id);
CREATE INDEX IF NOT EXISTS appointment_reminders_status_idx ON appointment_reminders(status);
CREATE INDEX IF NOT EXISTS appointment_reminders_scheduled_for_idx ON appointment_reminders(scheduled_for);

-- Enable RLS
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_reminders ENABLE ROW LEVEL SECURITY;

-- Create policies for appointments
CREATE POLICY "Organization admins and owners can manage appointments"
  ON appointments
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      JOIN schedules s ON s.id = appointments.schedule_id
      WHERE om.organization_id = s.organization_id
      AND om.user_id = auth.uid()
      AND om.role IN ('admin', 'owner')
    )
  );

CREATE POLICY "Providers can manage their own appointments"
  ON appointments
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = appointments.provider_id
      AND p.id = auth.uid()
    )
  );

CREATE POLICY "Organization members can read appointments"
  ON appointments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      JOIN schedules s ON s.id = appointments.schedule_id
      WHERE om.organization_id = s.organization_id
      AND om.user_id = auth.uid()
    )
  );

-- Create policies for appointment_reminders
CREATE POLICY "Organization admins and owners can manage appointment_reminders"
  ON appointment_reminders
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      JOIN appointments a ON a.id = appointment_reminders.appointment_id
      JOIN schedules s ON s.id = a.schedule_id
      WHERE om.organization_id = s.organization_id
      AND om.user_id = auth.uid()
      AND om.role IN ('admin', 'owner')
    )
  );

CREATE POLICY "Providers can manage their own appointment_reminders"
  ON appointment_reminders
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN appointments a ON a.provider_id = p.id
      WHERE a.id = appointment_reminders.appointment_id
      AND p.id = auth.uid()
    )
  );

CREATE POLICY "Organization members can read appointment_reminders"
  ON appointment_reminders
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      JOIN appointments a ON a.id = appointment_reminders.appointment_id
      JOIN schedules s ON s.id = a.schedule_id
      WHERE om.organization_id = s.organization_id
      AND om.user_id = auth.uid()
    )
  );

-- Create triggers to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_appointments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_appointments_updated_at
  BEFORE UPDATE ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION update_appointments_updated_at();

CREATE OR REPLACE FUNCTION update_appointment_reminders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_appointment_reminders_updated_at
  BEFORE UPDATE ON appointment_reminders
  FOR EACH ROW
  EXECUTE FUNCTION update_appointment_reminders_updated_at(); 