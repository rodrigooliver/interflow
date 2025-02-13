/*
  # Flow Sessions Management Update

  1. Changes
    - Safely add session_id to messages table if not exists
    - Create missing indexes
    - Add RLS policies
    - Add helper functions and triggers
    
  2. Security
    - Add policies for organization access
*/

-- Add session_id to messages if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'messages' AND column_name = 'session_id'
  ) THEN
    ALTER TABLE messages 
    ADD COLUMN session_id UUID REFERENCES flow_sessions(id);
  END IF;
END $$;

-- Create indexes if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'flow_sessions_bot_id_idx') THEN
    CREATE INDEX flow_sessions_bot_id_idx ON flow_sessions(bot_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'flow_sessions_chat_id_idx') THEN
    CREATE INDEX flow_sessions_chat_id_idx ON flow_sessions(chat_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'flow_sessions_customer_id_idx') THEN
    CREATE INDEX flow_sessions_customer_id_idx ON flow_sessions(customer_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'flow_sessions_status_idx') THEN
    CREATE INDEX flow_sessions_status_idx ON flow_sessions(status);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'flow_sessions_timeout_idx') THEN
    CREATE INDEX flow_sessions_timeout_idx ON flow_sessions(timeout_at);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'messages_session_id_idx') THEN
    CREATE INDEX messages_session_id_idx ON messages(session_id);
  END IF;
END $$;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Organization members can view flow sessions" ON flow_sessions;
DROP POLICY IF EXISTS "Organization members can manage flow sessions" ON flow_sessions;

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

-- Drop existing function and trigger if they exist
DROP TRIGGER IF EXISTS update_flow_session_last_interaction ON messages;
DROP FUNCTION IF EXISTS update_flow_session_interaction();

-- Create helper function
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