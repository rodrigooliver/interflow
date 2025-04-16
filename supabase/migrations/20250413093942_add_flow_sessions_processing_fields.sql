-- Adiciona campo is_processing à tabela flow_sessions
-- para implementar o mecanismo de gerenciamento de mensagens durante processamento

-- Adiciona campo is_processing para controlar quando um fluxo está processando mensagens
ALTER TABLE flow_sessions 
ADD COLUMN IF NOT EXISTS is_processing BOOLEAN DEFAULT false;

-- Atualiza as sessões de fluxo existentes para garantir valor padrão
UPDATE flow_sessions 
SET is_processing = false
WHERE is_processing IS NULL;

-- Comentário
COMMENT ON COLUMN flow_sessions.is_processing IS 'Indica se o fluxo está atualmente processando mensagens'; 