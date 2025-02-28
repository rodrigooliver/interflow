-- Criação da tabela customer_tags para associar clientes a tags
CREATE TABLE IF NOT EXISTS customer_tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Garantir que não haja duplicatas de associação cliente-tag
  UNIQUE(customer_id, tag_id)
);

-- Adicionar índices para melhorar a performance das consultas
CREATE INDEX IF NOT EXISTS idx_customer_tags_customer_id ON customer_tags(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_tags_tag_id ON customer_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_customer_tags_organization_id ON customer_tags(organization_id);

-- Adicionar políticas RLS (Row Level Security)
ALTER TABLE customer_tags ENABLE ROW LEVEL SECURITY;

-- Política para permitir que usuários vejam apenas tags de suas organizações
CREATE POLICY customer_tags_select_policy ON customer_tags
  FOR SELECT USING (organization_id IN (
    SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
  ));

-- Política para permitir que usuários insiram tags apenas em suas organizações
CREATE POLICY customer_tags_insert_policy ON customer_tags
  FOR INSERT WITH CHECK (organization_id IN (
    SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
  ));

-- Política para permitir que usuários atualizem tags apenas em suas organizações
CREATE POLICY customer_tags_update_policy ON customer_tags
  FOR UPDATE USING (organization_id IN (
    SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
  ));

-- Política para permitir que usuários excluam tags apenas em suas organizações
CREATE POLICY customer_tags_delete_policy ON customer_tags
  FOR DELETE USING (organization_id IN (
    SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
  ));

-- Adicionar função para buscar tags de um cliente
CREATE OR REPLACE FUNCTION get_customer_tags(customer_id UUID)
RETURNS SETOF tags AS $$
BEGIN
  RETURN QUERY
  SELECT t.*
  FROM tags t
  JOIN customer_tags ct ON t.id = ct.tag_id
  WHERE ct.customer_id = $1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 