BEGIN;

-- Criamos o tipo enum para message_type
CREATE TYPE message_type AS ENUM (
  'text',
  'image',
  'video',
  'audio',
  'document',
  'sticker',
  'email'
);

-- Adicionamos a coluna type na tabela messages com a constraint NOT NULL
ALTER TABLE messages 
ADD COLUMN type message_type NOT NULL DEFAULT 'text';

-- Atualizamos as mensagens existentes baseado no conteúdo dos attachments
UPDATE messages 
SET type = CASE 
  WHEN attachments IS NOT NULL AND attachments::jsonb @> '[{"type": "image"}]' THEN 'image'::message_type
  WHEN attachments IS NOT NULL AND attachments::jsonb @> '[{"type": "video"}]' THEN 'video'::message_type
  WHEN attachments IS NOT NULL AND attachments::jsonb @> '[{"type": "audio"}]' THEN 'audio'::message_type
  WHEN attachments IS NOT NULL AND attachments::jsonb @> '[{"type": "document"}]' THEN 'document'::message_type
  WHEN attachments IS NOT NULL AND attachments::jsonb @> '[{"type": "sticker"}]' THEN 'sticker'::message_type
  ELSE 'text'::message_type
END;

-- Adicionamos as políticas de segurança para a nova coluna
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  -- Criamos a política se ela não existir
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'messages' 
    AND policyname = 'Messages are viewable by organization members'
  ) THEN
    CREATE POLICY "Messages are viewable by organization members" ON messages
      FOR SELECT
      USING (
        organization_id IN (
          SELECT organization_id 
          FROM organization_members 
          WHERE user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Atualizamos a interface da tabela para incluir o novo tipo
COMMENT ON TABLE messages IS 'Messages table with type support for different message formats';
COMMENT ON COLUMN messages.type IS 'Type of the message (text, image, video, audio, document, sticker, email)';

COMMIT; 