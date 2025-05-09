-- Adiciona múltiplas colunas na tabela files
ALTER TABLE files
ADD COLUMN chat_id UUID REFERENCES chats(id) ON DELETE CASCADE,
ADD COLUMN transaction_id UUID REFERENCES financial_transactions(id) ON DELETE CASCADE,
ADD COLUMN emr_attachment_id UUID REFERENCES emr_attachments(id) ON DELETE CASCADE;

-- Adiciona comentários nas colunas
COMMENT ON COLUMN files.chat_id IS 'ID do chat associado ao arquivo';
COMMENT ON COLUMN files.transaction_id IS 'ID da transação financeira associada ao arquivo';
COMMENT ON COLUMN files.emr_attachment_id IS 'ID do anexo EMR associado ao arquivo';

-- Cria índices para melhorar a performance de consultas
CREATE INDEX files_chat_id_idx ON files(chat_id);
CREATE INDEX files_transaction_id_idx ON files(transaction_id);
CREATE INDEX files_emr_attachment_id_idx ON files(emr_attachment_id); 