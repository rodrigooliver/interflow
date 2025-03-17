/*
  # Enhanced Chat System - Fix Policy Conflicts

  1. Changes
    - Add missing columns and tables if they don't exist
    - Drop existing policies before recreating them
    - Add helper functions for metrics
*/

-- Drop existing policies if they exist
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Organization members can view collaborators" ON chat_collaborators;
  DROP POLICY IF EXISTS "Organization members can manage collaborators" ON chat_collaborators;
EXCEPTION
  WHEN undefined_table THEN NULL;
END $$;

-- Add new columns to chats table if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chats' AND column_name = 'ticket_number') THEN
    ALTER TABLE chats
      ADD COLUMN ticket_number BIGINT,
      ADD COLUMN arrival_time TIMESTAMPTZ DEFAULT now(),
      ADD COLUMN start_time TIMESTAMPTZ,
      ADD COLUMN end_time TIMESTAMPTZ,
      ADD COLUMN team_id UUID REFERENCES service_teams(id),
      ADD COLUMN channel_id UUID REFERENCES chat_channels(id);
  END IF;
END $$;

-- Create sequence for ticket numbers if it doesn't exist
CREATE SEQUENCE IF NOT EXISTS chat_ticket_seq;

-- Create or replace function to generate ticket numbers
CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.ticket_number IS NULL THEN
    NEW.ticket_number := nextval('chat_ticket_seq');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_ticket_number') THEN
    CREATE TRIGGER set_ticket_number
      BEFORE INSERT ON chats
      FOR EACH ROW
      EXECUTE FUNCTION generate_ticket_number();
  END IF;
END $$;

-- Create chat collaborators table if it doesn't exist
CREATE TABLE IF NOT EXISTS chat_collaborators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  joined_at TIMESTAMPTZ DEFAULT now(),
  left_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE chat_collaborators ENABLE ROW LEVEL SECURITY;

-- Create indices for performance if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'chats_ticket_number_idx') THEN
    CREATE INDEX chats_ticket_number_idx ON chats(ticket_number);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'chats_arrival_time_idx') THEN
    CREATE INDEX chats_arrival_time_idx ON chats(arrival_time);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'chats_channel_id_idx') THEN
    CREATE INDEX chats_channel_id_idx ON chats(channel_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'chats_team_id_idx') THEN
    CREATE INDEX chats_team_id_idx ON chats(team_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'chat_collaborators_chat_id_idx') THEN
    CREATE INDEX chat_collaborators_chat_id_idx ON chat_collaborators(chat_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'chat_collaborators_user_id_idx') THEN
    CREATE INDEX chat_collaborators_user_id_idx ON chat_collaborators(user_id);
  END IF;
END $$;

-- Add RLS policies for chat_collaborators
CREATE POLICY "Organization members can view collaborators"
  ON chat_collaborators
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = chat_collaborators.organization_id
      AND organization_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Organization members can manage collaborators"
  ON chat_collaborators
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = chat_collaborators.organization_id
      AND organization_members.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = chat_collaborators.organization_id
      AND organization_members.user_id = auth.uid()
    )
  );

-- Create helper functions for chat metrics
CREATE OR REPLACE FUNCTION calculate_wait_time(p_chat_id UUID)
RETURNS INTERVAL AS $$
BEGIN
  RETURN (
    SELECT
      COALESCE(start_time, CURRENT_TIMESTAMP) - arrival_time
    FROM chats
    WHERE id = p_chat_id
  );
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION calculate_service_time(p_chat_id UUID)
RETURNS INTERVAL AS $$
BEGIN
  RETURN (
    SELECT
      COALESCE(end_time, CURRENT_TIMESTAMP) - start_time
    FROM chats
    WHERE id = p_chat_id
    AND start_time IS NOT NULL
  );
END;
$$ LANGUAGE plpgsql;