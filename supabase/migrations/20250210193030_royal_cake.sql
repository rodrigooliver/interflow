/*
  # Add email channel type

  1. Changes
    - Update check constraint for chat_channels.type to include 'email'
    - Update check constraint for chats.channel to include 'email'
*/

-- Drop existing check constraint
ALTER TABLE chat_channels 
  DROP CONSTRAINT IF EXISTS chat_channels_type_check;

-- Add new check constraint with email type
ALTER TABLE chat_channels 
  ADD CONSTRAINT chat_channels_type_check 
  CHECK (type IN ('whatsapp_official', 'whatsapp_unofficial', 'instagram', 'facebook', 'email'));

-- Update chats table constraint
ALTER TABLE chats 
  DROP CONSTRAINT IF EXISTS chats_channel_check;

ALTER TABLE chats 
  ADD CONSTRAINT chats_channel_check 
  CHECK (channel IN ('whatsapp', 'instagram', 'web', 'email'));