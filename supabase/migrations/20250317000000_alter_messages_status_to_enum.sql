-- Criar o tipo enum
CREATE TYPE message_status AS ENUM (
  'pending',
  'sent',
  'delivered',
  'read',
  'failed',
  'received',
  'deleted',
  'scheduled'
);

-- Primeiro, remover o trigger
DROP TRIGGER IF EXISTS message_status_change ON messages;

-- Remover a constraint antiga de check
ALTER TABLE public.messages 
  DROP CONSTRAINT messages_status_check;

-- Remover o valor default da coluna
ALTER TABLE public.messages 
  ALTER COLUMN status DROP DEFAULT;

-- Alterar a coluna status para usar o novo tipo enum
ALTER TABLE public.messages 
  ALTER COLUMN status TYPE message_status 
  USING status::message_status;

-- Adicionar o valor default novamente com o novo tipo
ALTER TABLE public.messages 
  ALTER COLUMN status SET DEFAULT 'pending'::message_status;

-- Adicionar nova constraint de check para o novo tipo
ALTER TABLE public.messages 
  ADD CONSTRAINT messages_status_check 
  CHECK (status IS NOT NULL);

-- Recriar o trigger com o novo tipo
CREATE TRIGGER message_status_change
  BEFORE UPDATE ON messages
  FOR EACH ROW
  WHEN (old.status IS NULL OR new.status <> old.status)
  EXECUTE FUNCTION update_message_status_logs(); 