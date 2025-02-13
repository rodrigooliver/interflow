/*
  # Add message status tracking

  1. New Columns
    - `status` - Message delivery status (pending, sent, delivered, read, failed)
    - `status_logs` - JSON array to store status change history with timestamps
    - `error_message` - Text field to store error details if status is 'failed'

  2. Changes
    - Add check constraint for valid status values
    - Add default value for status
    - Add index on status column for better query performance
*/

-- Add new columns
ALTER TABLE messages
  ADD COLUMN status TEXT NOT NULL DEFAULT 'pending' 
    CHECK (status IN ('pending', 'sent', 'delivered', 'read', 'failed')),
  ADD COLUMN status_logs JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN error_message TEXT;

-- Create index for status column
CREATE INDEX messages_status_idx ON messages(status);

-- Create function to update status logs
CREATE OR REPLACE FUNCTION update_message_status_logs()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS NULL OR NEW.status != OLD.status THEN
    NEW.status_logs = OLD.status_logs || jsonb_build_object(
      'status', NEW.status,
      'timestamp', CURRENT_TIMESTAMP,
      'previous_status', OLD.status
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update status logs
CREATE TRIGGER message_status_change
  BEFORE UPDATE ON messages
  FOR EACH ROW
  WHEN (OLD.status IS NULL OR NEW.status != OLD.status)
  EXECUTE FUNCTION update_message_status_logs();

-- Update existing messages to 'sent' status
UPDATE messages SET status = 'sent' WHERE status = 'pending';