-- Primeiro, remover a coluna existente
ALTER TABLE messages DROP COLUMN IF EXISTS sender_id;

-- Adicionar as novas colunas
ALTER TABLE messages 
ADD COLUMN sender_agent_id uuid REFERENCES profiles(id),
ADD COLUMN sender_customer_id uuid REFERENCES customers(id);