BEGIN;

-- Primeiro criamos o tipo enum
CREATE TYPE chat_status AS ENUM ('pending', 'in_progress', 'closed', 'await_closing');

-- Removemos a constraint existente
ALTER TABLE chats DROP CONSTRAINT chats_status_check;

-- Convertemos a coluna status para o novo tipo enum
ALTER TABLE chats 
  ALTER COLUMN status TYPE chat_status 
  USING status::chat_status;

COMMIT;