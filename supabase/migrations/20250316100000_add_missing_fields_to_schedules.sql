/*
  # Adicionar campos faltantes à tabela schedules

  Adicionando os campos:
  - `is_public` (boolean) - Para indicar se a agenda é pública e visível para clientes
  - `requires_confirmation` (boolean) - Para indicar se agendamentos precisam de confirmação
*/

-- Adicionar as colunas faltantes à tabela schedules
ALTER TABLE schedules 
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS requires_confirmation BOOLEAN NOT NULL DEFAULT FALSE;

-- Comentários para documentação
COMMENT ON COLUMN schedules.is_public IS 'Indica se a agenda é pública e visível para clientes';
COMMENT ON COLUMN schedules.requires_confirmation IS 'Indica se agendamentos precisam de confirmação manual'; 