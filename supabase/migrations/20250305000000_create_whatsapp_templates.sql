-- Criação da tabela de templates do WhatsApp Official
CREATE TABLE IF NOT EXISTS whatsapp_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  channel_id UUID NOT NULL REFERENCES chat_channels(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  language_code VARCHAR(10) NOT NULL DEFAULT 'pt_BR',
  category VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
  components JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Campos adicionais para controle
  template_id VARCHAR(255),
  rejection_reason TEXT,
  last_sync_at TIMESTAMPTZ,
  
  -- Índices para melhorar a performance
  UNIQUE(channel_id, name, language_code)
);

-- Criar índice para organization_id
CREATE INDEX idx_whatsapp_templates_organization_id ON whatsapp_templates(organization_id);

-- Função para preencher automaticamente o organization_id com base no channel_id
CREATE OR REPLACE FUNCTION set_whatsapp_templates_organization_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.organization_id IS NULL THEN
    SELECT organization_id INTO NEW.organization_id
    FROM chat_channels
    WHERE id = NEW.channel_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para preencher automaticamente o organization_id
CREATE TRIGGER set_whatsapp_templates_organization_id
BEFORE INSERT ON whatsapp_templates
FOR EACH ROW
EXECUTE FUNCTION set_whatsapp_templates_organization_id();

-- Função para verificar a consistência entre organization_id e channel_id
CREATE OR REPLACE FUNCTION check_whatsapp_templates_organization_consistency()
RETURNS TRIGGER AS $$
DECLARE
  channel_org_id UUID;
BEGIN
  -- Obter o organization_id do canal
  SELECT organization_id INTO channel_org_id
  FROM chat_channels
  WHERE id = NEW.channel_id;
  
  -- Verificar se o organization_id corresponde
  IF NEW.organization_id != channel_org_id THEN
    RAISE EXCEPTION 'organization_id must match the organization_id of the channel';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para verificar a consistência entre organization_id e channel_id
CREATE TRIGGER check_whatsapp_templates_organization_consistency
BEFORE INSERT OR UPDATE ON whatsapp_templates
FOR EACH ROW
EXECUTE FUNCTION check_whatsapp_templates_organization_consistency();

-- Função para atualizar o campo updated_at automaticamente
CREATE OR REPLACE FUNCTION update_whatsapp_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar o campo updated_at
CREATE TRIGGER update_whatsapp_templates_updated_at
BEFORE UPDATE ON whatsapp_templates
FOR EACH ROW
EXECUTE FUNCTION update_whatsapp_templates_updated_at();

-- Permissões RLS
ALTER TABLE whatsapp_templates ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Usuários autenticados podem visualizar templates de suas organizações" ON whatsapp_templates
  FOR SELECT
  USING (
    whatsapp_templates.organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Usuários autenticados podem inserir templates em suas organizações" ON whatsapp_templates
  FOR INSERT
  WITH CHECK (
    whatsapp_templates.organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Usuários autenticados podem atualizar templates de suas organizações" ON whatsapp_templates
  FOR UPDATE
  USING (
    whatsapp_templates.organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Usuários autenticados podem excluir templates de suas organizações" ON whatsapp_templates
  FOR DELETE
  USING (
    whatsapp_templates.organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

-- Comentários na tabela
COMMENT ON TABLE whatsapp_templates IS 'Armazena os templates do WhatsApp Official API';
COMMENT ON COLUMN whatsapp_templates.id IS 'ID único do template';
COMMENT ON COLUMN whatsapp_templates.organization_id IS 'ID da organização à qual o template pertence';
COMMENT ON COLUMN whatsapp_templates.channel_id IS 'ID do canal do WhatsApp ao qual o template pertence';
COMMENT ON COLUMN whatsapp_templates.name IS 'Nome do template';
COMMENT ON COLUMN whatsapp_templates.language_code IS 'Código do idioma do template (ex: pt_BR)';
COMMENT ON COLUMN whatsapp_templates.category IS 'Categoria do template (ex: MARKETING, UTILITY)';
COMMENT ON COLUMN whatsapp_templates.status IS 'Status do template (ex: PENDING, APPROVED, REJECTED)';
COMMENT ON COLUMN whatsapp_templates.components IS 'Componentes do template em formato JSON';
COMMENT ON COLUMN whatsapp_templates.template_id IS 'ID do template na API do WhatsApp';
COMMENT ON COLUMN whatsapp_templates.rejection_reason IS 'Motivo da rejeição, se aplicável';
COMMENT ON COLUMN whatsapp_templates.last_sync_at IS 'Data da última sincronização com a API do WhatsApp'; 


-- Adiciona a coluna external_id à tabela chat_channels
ALTER TABLE chat_channels
ADD COLUMN external_id VARCHAR(255);

-- Adiciona um comentário explicativo à coluna
COMMENT ON COLUMN chat_channels.external_id IS 'ID externo do canal (por exemplo, ID do WhatsApp Business)';

-- Cria um índice para melhorar a performance de consultas que usam external_id
CREATE INDEX idx_chat_channels_external_id ON chat_channels(external_id);