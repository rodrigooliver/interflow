/*
  # Adiciona colunas em várias tabelas
  
  1. Modificações:
    - Adicionar campo `is_default` à tabela `service_teams`
      - Indica se a equipe é a padrão para novos atendimentos
      - Default é false
    - Adicionar constraint para garantir apenas uma equipe padrão por organização
    - Adicionar campo `is_spam` à tabela `customers`
      - Indica se o cliente é considerado spam
      - Default é false
    - Adicionar campo `sale_price` à tabela `customers`
      - Preço de venda do cliente
    - Adicionar campos na tabela `chats`:
      - `is_fixed`: chat fixado
      - `unread_count`: contagem de mensagens não lidas
      - `is_archived`: chat arquivado
    - Adicionar campo `total_count` à tabela `crm_stages`
      - Contagem total de clientes no estágio
    - Adicionar campo `total_count` à tabela `tags`
      - Contagem total de clientes com a tag
    - Adicionar campo `nickname` à tabela `profiles`
      - Apelido ou como gosta de ser chamado
*/

-- Adicionar campo is_default à tabela service_teams
ALTER TABLE service_teams 
ADD COLUMN is_default BOOLEAN NOT NULL DEFAULT false;

-- Criar índice para busca por is_default
CREATE INDEX IF NOT EXISTS service_teams_is_default_idx ON service_teams(is_default);

-- Criar função para garantir apenas uma equipe padrão por organização
CREATE OR REPLACE FUNCTION ensure_single_default_team()
RETURNS TRIGGER AS $$
BEGIN
  -- Se a nova equipe está sendo marcada como padrão
  IF NEW.is_default = true THEN
    -- Desmarcar outras equipes da mesma organização como padrão
    UPDATE service_teams
    SET is_default = false
    WHERE organization_id = NEW.organization_id
    AND id != NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger para garantir apenas uma equipe padrão por organização
CREATE TRIGGER ensure_single_default_team_trigger
BEFORE INSERT OR UPDATE ON service_teams
FOR EACH ROW
EXECUTE FUNCTION ensure_single_default_team();

-- Adicionar campos à tabela customers
ALTER TABLE customers
ADD COLUMN is_spam BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN sale_price DECIMAL(10,2);

-- Criar índices para customers
CREATE INDEX IF NOT EXISTS customers_is_spam_idx ON customers(is_spam);
CREATE INDEX IF NOT EXISTS customers_sale_price_idx ON customers(sale_price);

-- Adicionar campos à tabela chats
ALTER TABLE chats
ADD COLUMN is_fixed BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN unread_count INTEGER NOT NULL DEFAULT 0,
ADD COLUMN is_archived BOOLEAN NOT NULL DEFAULT false;

-- Criar índices para chats
CREATE INDEX IF NOT EXISTS chats_is_fixed_idx ON chats(is_fixed);
CREATE INDEX IF NOT EXISTS chats_unread_count_idx ON chats(unread_count);
CREATE INDEX IF NOT EXISTS chats_is_archived_idx ON chats(is_archived);

-- Adicionar campo à tabela crm_stages
ALTER TABLE crm_stages
ADD COLUMN total_count INTEGER NOT NULL DEFAULT 0;

-- Criar índice para crm_stages
CREATE INDEX IF NOT EXISTS crm_stages_total_count_idx ON crm_stages(total_count);

-- Adicionar campo à tabela tags
ALTER TABLE tags
ADD COLUMN total_count INTEGER NOT NULL DEFAULT 0;

-- Criar índice para tags
CREATE INDEX IF NOT EXISTS tags_total_count_idx ON tags(total_count);

-- Adicionar campo à tabela profiles
ALTER TABLE profiles
ADD COLUMN nickname TEXT;

-- Criar índice para profiles
CREATE INDEX IF NOT EXISTS profiles_nickname_idx ON profiles(nickname);

-- Comentários explicativos sobre as mudanças
COMMENT ON COLUMN service_teams.is_default IS 'Indica se a equipe é a padrão para novos atendimentos na organização.';
COMMENT ON COLUMN customers.is_spam IS 'Indica se o cliente é considerado spam.';
COMMENT ON COLUMN customers.sale_price IS 'Preço de venda do cliente.';
COMMENT ON COLUMN chats.is_fixed IS 'Indica se o chat está fixado.';
COMMENT ON COLUMN chats.unread_count IS 'Contagem de mensagens não lidas no chat.';
COMMENT ON COLUMN chats.is_archived IS 'Indica se o chat está arquivado.';
COMMENT ON COLUMN crm_stages.total_count IS 'Contagem total de clientes no estágio do funil.';
COMMENT ON COLUMN tags.total_count IS 'Contagem total de clientes com a tag.';
COMMENT ON COLUMN profiles.nickname IS 'Apelido ou como gosta de ser chamado.'; 