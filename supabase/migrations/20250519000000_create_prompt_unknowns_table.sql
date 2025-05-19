/*
  # Criar tabela para armazenar informações desconhecidas pelo agente IA

  1. Nova Tabela
    - `prompt_unknowns`
      - `id` (uuid, chave primária)
      - `prompt_id` (uuid, chave estrangeira para prompts)
      - `chat_id` (uuid, chave estrangeira para chats, opcional)
      - `question` (text) - Pergunta original feita pelo usuário
      - `content` (text) - Conteúdo da informação desconhecida
      - `category` (text, opcional) - Categoria da informação (ex: produto, técnico, processo)
      - `priority` (enum) - Prioridade: 'high', 'medium', 'low'
      - `status` (enum) - Status: 'pending', 'added', 'rejected'
      - `notes` (text, opcional) - Notas ou comentários adicionais
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Segurança
    - Habilitar RLS na tabela `prompt_unknowns`
    - Adicionar políticas para membros da organização gerenciarem informações desconhecidas

  3. Mudanças
    - Adicionar restrição de chave estrangeira para a tabela de prompts
    - Adicionar restrição de chave estrangeira para a tabela de chats
    - Adicionar índice em prompt_id e chat_id para buscas mais rápidas
    - Adicionar gatilho para atualizar o timestamp de updated_at
*/

-- Criar tipo enum para status
CREATE TYPE prompt_unknown_status AS ENUM ('pending', 'added', 'rejected');

-- Criar tipo enum para prioridade
CREATE TYPE prompt_unknown_priority AS ENUM ('high', 'medium', 'low');

-- Criar tabela prompt_unknowns
CREATE TABLE IF NOT EXISTS prompt_unknowns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_id uuid NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,
  chat_id uuid REFERENCES chats(id) ON DELETE SET NULL,
  question text NOT NULL,
  content text NOT NULL,
  category text,
  priority prompt_unknown_priority NOT NULL DEFAULT 'medium',
  status prompt_unknown_status NOT NULL DEFAULT 'pending',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Criar índice para buscas mais rápidas
CREATE INDEX IF NOT EXISTS prompt_unknowns_prompt_id_idx ON prompt_unknowns(prompt_id);
CREATE INDEX IF NOT EXISTS prompt_unknowns_chat_id_idx ON prompt_unknowns(chat_id);
CREATE INDEX IF NOT EXISTS prompt_unknowns_status_idx ON prompt_unknowns(status);
CREATE INDEX IF NOT EXISTS prompt_unknowns_priority_idx ON prompt_unknowns(priority);
CREATE INDEX IF NOT EXISTS prompt_unknowns_category_idx ON prompt_unknowns(category);

-- Habilitar RLS
ALTER TABLE prompt_unknowns ENABLE ROW LEVEL SECURITY;

-- Criar políticas
CREATE POLICY "Membros da organização podem gerenciar informações desconhecidas"
  ON prompt_unknowns
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      JOIN prompts p ON p.organization_id = om.organization_id
      WHERE p.id = prompt_unknowns.prompt_id
      AND om.user_id = auth.uid()
    )
  );

-- Adicionar gatilho para atualizar o timestamp de updated_at
CREATE OR REPLACE FUNCTION update_prompt_unknowns_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_prompt_unknowns_updated_at
  BEFORE UPDATE ON prompt_unknowns
  FOR EACH ROW
  EXECUTE FUNCTION update_prompt_unknowns_updated_at();

-- Adicionar comentários às colunas para documentação
COMMENT ON TABLE prompt_unknowns IS 'Tabela para armazenar informações desconhecidas pelo agente IA';
COMMENT ON COLUMN prompt_unknowns.prompt_id IS 'ID do prompt ao qual a informação desconhecida está vinculada';
COMMENT ON COLUMN prompt_unknowns.chat_id IS 'ID do chat onde a informação desconhecida foi identificada';
COMMENT ON COLUMN prompt_unknowns.question IS 'Pergunta original feita pelo usuário que o modelo não soube responder';
COMMENT ON COLUMN prompt_unknowns.content IS 'Conteúdo da informação que o agente IA não sabe';
COMMENT ON COLUMN prompt_unknowns.category IS 'Categoria da informação (ex: produto, técnico, processo)';
COMMENT ON COLUMN prompt_unknowns.priority IS 'Prioridade para adicionar esta informação ao contexto: high, medium, low';
COMMENT ON COLUMN prompt_unknowns.status IS 'Status da informação: pending, added ou rejected';
COMMENT ON COLUMN prompt_unknowns.notes IS 'Notas ou comentários adicionais sobre a informação'; 