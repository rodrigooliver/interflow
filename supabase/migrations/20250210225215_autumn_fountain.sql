/*
  # Chat System Enhancement

  1. Changes
    - Add ticket_number to chats table
    - Add timestamps for tracking (arrival, start, end)
    - Add team assignment
    - Add chat collaborators
    - Add indices for performance

  2. New Tables
    - chat_collaborators: Tracks additional agents helping with a chat
    
  3. Modified Tables
    - chats: Added ticket number and timing fields
*/

-- Add new columns to chats table
ALTER TABLE chats
  ADD COLUMN ticket_number BIGINT,
  ADD COLUMN arrival_time TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN start_time TIMESTAMPTZ,
  ADD COLUMN end_time TIMESTAMPTZ,
  ADD COLUMN team_id UUID REFERENCES service_teams(id),
  ADD COLUMN channel_id UUID REFERENCES chat_channels(id);

-- Create sequence for ticket numbers
CREATE SEQUENCE IF NOT EXISTS chat_ticket_seq;

-- Create function to generate ticket numbers
CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.ticket_number IS NULL THEN
    NEW.ticket_number := nextval('chat_ticket_seq');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-generate ticket numbers
CREATE TRIGGER set_ticket_number
  BEFORE INSERT ON chats
  FOR EACH ROW
  EXECUTE FUNCTION generate_ticket_number();

-- Create chat collaborators table
CREATE TABLE chat_collaborators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  joined_at TIMESTAMPTZ DEFAULT now(),
  left_at TIMESTAMPTZ,
  UNIQUE(chat_id, user_id, organization_id)
);

-- Enable RLS
ALTER TABLE chat_collaborators ENABLE ROW LEVEL SECURITY;

-- Create indices for performance
CREATE INDEX chats_ticket_number_idx ON chats(ticket_number);
CREATE INDEX chats_arrival_time_idx ON chats(arrival_time);
CREATE INDEX chats_channel_id_idx ON chats(channel_id);
CREATE INDEX chats_team_id_idx ON chats(team_id);
CREATE INDEX chat_collaborators_chat_id_idx ON chat_collaborators(chat_id);
CREATE INDEX chat_collaborators_user_id_idx ON chat_collaborators(user_id);

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