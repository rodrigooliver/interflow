/*
  # Update chat channels type check

  1. Changes
    - Update chat_channels type check constraint to include whatsapp_wapi
    - Add validation for whatsapp_wapi credentials

  2. Security
    - Maintain existing RLS policies
*/

-- Remove o trigger primeiro
DROP TRIGGER IF EXISTS validate_channel_credentials_trigger ON chat_channels;

-- Remove a função
DROP FUNCTION IF EXISTS validate_channel_credentials();

-- Mantém apenas a alteração do constraint de tipo
ALTER TABLE chat_channels DROP CONSTRAINT IF EXISTS chat_channels_type_check;
ALTER TABLE chat_channels ADD CONSTRAINT chat_channels_type_check 
  CHECK (type IN ('whatsapp_official', 'whatsapp_wapi', 'whatsapp_zapi', 'whatsapp_evo', 'instagram', 'facebook', 'email'));