/*
  # Adicionar coluna updated_at à tabela flow_sessions

  1. Mudanças
    - Adicionar coluna updated_at
    - Criar trigger para atualizar updated_at automaticamente
*/

-- Adicionar coluna updated_at
ALTER TABLE flow_sessions
ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now();

-- Atualizar registros existentes
UPDATE flow_sessions SET updated_at = created_at WHERE updated_at IS NULL;
