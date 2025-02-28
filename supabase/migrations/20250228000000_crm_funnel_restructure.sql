-- Migration para reestruturar o sistema de funil de vendas CRM
-- Remove a tabela crm_customer_stages e adiciona stage_id diretamente à tabela customers

-- Verificar se a tabela crm_customer_stages existe antes de prosseguir com a migração
DO $$
DECLARE
    table_exists BOOLEAN;
BEGIN
    -- Verificar se a tabela existe
    SELECT EXISTS (
        SELECT FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = 'crm_customer_stages'
    ) INTO table_exists;

    -- Se a tabela não existir, registrar mensagem e continuar
    IF NOT table_exists THEN
        RAISE NOTICE 'A tabela crm_customer_stages não existe. Continuando com a criação da nova estrutura.';
    END IF;
END
$$;

-- Adicionar coluna stage_id à tabela customers
ALTER TABLE customers
ADD COLUMN IF NOT EXISTS stage_id UUID REFERENCES crm_stages(id) ON DELETE SET NULL;

-- Comentário para a nova coluna
COMMENT ON COLUMN customers.stage_id IS 'Referência ao estágio atual do cliente no funil de vendas';

-- Criar índice para melhorar o desempenho de consultas que filtram por estágio
CREATE INDEX IF NOT EXISTS idx_customers_stage_id ON customers(stage_id);

-- Primeiro, criar uma nova tabela para o histórico de estágios
CREATE TABLE IF NOT EXISTS customer_stage_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  stage_id UUID REFERENCES crm_stages(id) ON DELETE SET NULL,
  notes TEXT,
  moved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE
);

-- Comentário para a nova tabela
COMMENT ON TABLE customer_stage_history IS 'Histórico de movimentação dos clientes entre estágios do funil';

-- Índices para a nova tabela de histórico
CREATE INDEX IF NOT EXISTS idx_customer_stage_history_customer_id ON customer_stage_history(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_stage_history_stage_id ON customer_stage_history(stage_id);
CREATE INDEX IF NOT EXISTS idx_customer_stage_history_organization_id ON customer_stage_history(organization_id);

-- Migrar dados apenas se a tabela crm_customer_stages existir
DO $$
BEGIN
    -- Verificar se a tabela existe
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'crm_customer_stages') THEN
        -- 1. Migrar dados existentes da tabela crm_customer_stages para a nova coluna em customers
        -- Isso pega o estágio mais recente de cada cliente e o define como seu estágio atual
        UPDATE customers c
        SET stage_id = subquery.stage_id
        FROM (
          SELECT 
            customer_id,
            stage_id,
            ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY moved_at DESC) as rn
          FROM 
            crm_customer_stages
        ) subquery
        WHERE 
          c.id = subquery.customer_id
          AND subquery.rn = 1;
          
        -- 2. Migrar o histórico existente para a nova tabela
        INSERT INTO customer_stage_history (customer_id, stage_id, notes, moved_at, created_at, organization_id)
        SELECT 
          cs.customer_id,
          cs.stage_id,
          cs.notes,
          cs.moved_at,
          cs.created_at,
          c.organization_id
        FROM 
          crm_customer_stages cs
        JOIN
          customers c ON cs.customer_id = c.id;
          
        -- 3. Remover a tabela crm_customer_stages após a migração dos dados
        DROP TABLE crm_customer_stages;
    END IF;
END
$$;

-- Criar função de trigger para registrar mudanças de estágio
CREATE OR REPLACE FUNCTION record_customer_stage_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Se o estágio mudou
  IF (OLD.stage_id IS DISTINCT FROM NEW.stage_id) THEN
    -- Inserir um novo registro no histórico
    INSERT INTO customer_stage_history (
      customer_id,
      stage_id,
      organization_id
    ) VALUES (
      NEW.id,
      NEW.stage_id,
      NEW.organization_id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger na tabela customers
DROP TRIGGER IF EXISTS trg_customer_stage_change ON customers;
CREATE TRIGGER trg_customer_stage_change
AFTER UPDATE ON customers
FOR EACH ROW
EXECUTE FUNCTION record_customer_stage_change();

-- Adicionar políticas RLS para a nova tabela
ALTER TABLE customer_stage_history ENABLE ROW LEVEL SECURITY;

-- Política para SELECT
DROP POLICY IF EXISTS "Usuários podem visualizar histórico de estágios da sua organização" ON customer_stage_history;
CREATE POLICY "Usuários podem visualizar histórico de estágios da sua organização"
ON customer_stage_history
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_members.organization_id = customer_stage_history.organization_id
    AND organization_members.user_id = auth.uid()
  )
);

-- Política para INSERT
DROP POLICY IF EXISTS "Usuários podem inserir histórico de estágios para sua organização" ON customer_stage_history;
CREATE POLICY "Usuários podem inserir histórico de estágios para sua organização"
ON customer_stage_history
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_members.organization_id = customer_stage_history.organization_id
    AND organization_members.user_id = auth.uid()
  )
);

-- Política para UPDATE
DROP POLICY IF EXISTS "Usuários podem atualizar histórico de estágios da sua organização" ON customer_stage_history;
CREATE POLICY "Usuários podem atualizar histórico de estágios da sua organização"
ON customer_stage_history
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_members.organization_id = customer_stage_history.organization_id
    AND organization_members.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_members.organization_id = customer_stage_history.organization_id
    AND organization_members.user_id = auth.uid()
  )
);

-- Política para DELETE
DROP POLICY IF EXISTS "Usuários podem deletar histórico de estágios da sua organização" ON customer_stage_history;
CREATE POLICY "Usuários podem deletar histórico de estágios da sua organização"
ON customer_stage_history
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_members.organization_id = customer_stage_history.organization_id
    AND organization_members.user_id = auth.uid()
  )
); 