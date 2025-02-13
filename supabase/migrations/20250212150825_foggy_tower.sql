/*
  # Flow Sessions Management

  1. New Tables
    - `flow_sessions`
      - Tracks active bot sessions
      - Stores variables and message history
      - Manages timeouts and debouncing
    
  2. Changes
    - Add `session_id` to messages table
    - Add indexes for performance
    
  3. Security
    - Enable RLS
    - Add policies for organization access
*/

-- Create flow_sessions table
CREATE TABLE flow_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  bot_id UUID NOT NULL REFERENCES flows(id),
  chat_id UUID NOT NULL REFERENCES chats(id),
  customer_id UUID NOT NULL REFERENCES customers(id),
  current_node_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'inactive', 'timeout')),
  variables JSONB NOT NULL DEFAULT '{}',
  message_history JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  last_interaction TIMESTAMPTZ DEFAULT now(),
  timeout_at TIMESTAMPTZ,
  debounce_timestamp TIMESTAMPTZ,
  UNIQUE(chat_id, bot_id)
);

-- Add session_id to messages
ALTER TABLE messages 
ADD COLUMN session_id UUID REFERENCES flow_sessions(id);

-- Create indexes
CREATE INDEX flow_sessions_bot_id_idx ON flow_sessions(bot_id);
CREATE INDEX flow_sessions_chat_id_idx ON flow_sessions(chat_id);
CREATE INDEX flow_sessions_customer_id_idx ON flow_sessions(customer_id);
CREATE INDEX flow_sessions_status_idx ON flow_sessions(status);
CREATE INDEX flow_sessions_timeout_idx ON flow_sessions(timeout_at);
CREATE INDEX messages_session_id_idx ON messages(session_id);

-- Enable RLS
ALTER TABLE flow_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Organization members can view flow sessions"
  ON flow_sessions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = flow_sessions.organization_id
      AND organization_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Organization members can manage flow sessions"
  ON flow_sessions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = flow_sessions.organization_id
      AND organization_members.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = flow_sessions.organization_id
      AND organization_members.user_id = auth.uid()
    )
  );

-- Create helper functions
CREATE OR REPLACE FUNCTION update_flow_session_interaction()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE flow_sessions
  SET last_interaction = now()
  WHERE id = NEW.session_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update last_interaction
CREATE TRIGGER update_flow_session_last_interaction
  AFTER INSERT ON messages
  FOR EACH ROW
  WHEN (NEW.session_id IS NOT NULL)
  EXECUTE FUNCTION update_flow_session_interaction();