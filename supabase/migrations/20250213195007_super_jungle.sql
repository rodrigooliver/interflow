/*
  # Update chat channels type check

  1. Changes
    - Update chat_channels type check constraint to include whatsapp_wapi
    - Add validation for whatsapp_wapi credentials

  2. Security
    - Maintain existing RLS policies
*/

-- Update chat_channels type check constraint
ALTER TABLE chat_channels DROP CONSTRAINT IF EXISTS chat_channels_type_check;
ALTER TABLE chat_channels ADD CONSTRAINT chat_channels_type_check 
  CHECK (type IN ('whatsapp_official', 'whatsapp_wapi', 'whatsapp_zapi', 'whatsapp_evo', 'instagram', 'facebook', 'email'));

-- Add validation for whatsapp_wapi credentials
CREATE OR REPLACE FUNCTION validate_channel_credentials()
RETURNS TRIGGER AS $$
BEGIN
  CASE NEW.type
    WHEN 'email' THEN
      IF NOT (
        NEW.credentials ? 'host' AND
        NEW.credentials ? 'port' AND
        NEW.credentials ? 'username' AND
        NEW.credentials ? 'password' AND
        NEW.credentials ? 'fromName'
      ) THEN
        RAISE EXCEPTION 'Invalid email channel credentials';
      END IF;
    WHEN 'whatsapp_wapi' THEN
      IF NOT (
        NEW.credentials ? 'apiHost' AND
        NEW.credentials ? 'apiConnectionKey' AND
        NEW.credentials ? 'apiToken'
      ) THEN
        RAISE EXCEPTION 'Invalid WhatsApp WApi channel credentials';
      END IF;
  END CASE;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS validate_channel_credentials_trigger ON chat_channels;

-- Create trigger for credential validation
CREATE TRIGGER validate_channel_credentials_trigger
  BEFORE INSERT OR UPDATE ON chat_channels
  FOR EACH ROW
  EXECUTE FUNCTION validate_channel_credentials();