

-- Criar tabela de api_keys
CREATE TABLE api_keys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  last_used_at TIMESTAMPTZ,
  permissions JSONB DEFAULT '[]'::jsonb,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Índices
CREATE INDEX idx_api_keys_org_id ON api_keys(organization_id);
CREATE INDEX idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX idx_api_keys_profile_id ON api_keys(profile_id);
CREATE INDEX idx_api_keys_created_by ON api_keys(created_by);

-- RLS policies
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- Política para leitura - usuários podem ver suas próprias chaves e admins podem ver todas
CREATE POLICY "Usuários podem ver suas próprias chaves"
ON api_keys FOR SELECT
USING (
  profile_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_members.organization_id = api_keys.organization_id
    AND organization_members.user_id = auth.uid()
    AND organization_members.role IN ('owner', 'admin')
  )
);

-- Política para inserção - usuários podem criar suas próprias chaves e admins podem criar para outros
CREATE POLICY "Permitir inserção para usuários e admins"
ON api_keys FOR INSERT
WITH CHECK (
  (profile_id = auth.uid()) OR
  EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_members.organization_id = api_keys.organization_id
    AND organization_members.user_id = auth.uid()
    AND organization_members.role IN ('owner', 'admin')
  )
);

-- Política para atualização - usuários podem atualizar suas próprias chaves e admins podem atualizar todas
CREATE POLICY "Permitir atualização para proprietários e admins"
ON api_keys FOR UPDATE
USING (
  profile_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_members.organization_id = api_keys.organization_id
    AND organization_members.user_id = auth.uid()
    AND organization_members.role IN ('owner', 'admin')
  )
);

-- Política para deleção - usuários podem deletar suas próprias chaves e admins podem deletar todas
CREATE POLICY "Permitir deleção para proprietários e admins"
ON api_keys FOR DELETE
USING (
  profile_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_members.organization_id = api_keys.organization_id
    AND organization_members.user_id = auth.uid()
    AND organization_members.role IN ('owner', 'admin')
  )
);

-- Criar função para atualizar updated_at se ainda não existir
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para atualizar updated_at
CREATE TRIGGER update_api_keys_updated_at
  BEFORE UPDATE ON api_keys
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();