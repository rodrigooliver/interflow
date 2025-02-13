/*
  # Add attachments support to messages

  1. Changes
    - Add attachments column to messages table to store file metadata
    - Add index for better query performance
    - Update existing messages to have empty attachments array

  2. Structure
    The attachments column will store an array of objects with:
    - url: string (public URL of the file)
    - type: string (MIME type)
    - name: string (original filename)
*/

-- Add attachments column to messages table
ALTER TABLE messages
ADD COLUMN attachments JSONB NOT NULL DEFAULT '[]';

-- Create index for better performance when querying attachments
CREATE INDEX messages_attachments_idx ON messages USING GIN (attachments);

-- Update existing messages to have empty attachments array
UPDATE messages 
SET attachments = '[]'
WHERE attachments IS NULL;