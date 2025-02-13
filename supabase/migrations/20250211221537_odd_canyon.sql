-- Add contact columns to chats table
ALTER TABLE chats
  ADD COLUMN whatsapp TEXT,
  ADD COLUMN email TEXT;

-- Create indexes for better search performance
CREATE INDEX IF NOT EXISTS chats_whatsapp_idx ON chats(whatsapp);
CREATE INDEX IF NOT EXISTS chats_email_idx ON chats(email);

-- Update existing chats to use the new columns
UPDATE chats c
SET whatsapp = (
  SELECT whatsapp
  FROM customers cu
  WHERE cu.id = c.customer_id
  AND cu.whatsapp IS NOT NULL
),
email = (
  SELECT email
  FROM customers cu
  WHERE cu.id = c.customer_id
  AND cu.email IS NOT NULL
);