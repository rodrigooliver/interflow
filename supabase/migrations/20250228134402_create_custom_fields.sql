-- Tabela para definição de campos personalizados
CREATE TABLE custom_fields_definition (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('text', 'number', 'date', 'boolean', 'select', 'multiselect')),
  is_searchable BOOLEAN NOT NULL DEFAULT false,
  is_required BOOLEAN NOT NULL DEFAULT false,
  options JSONB, -- Para campos do tipo select/multiselect
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (organization_id, name)
);

-- Índices
CREATE INDEX idx_custom_fields_definition_organization_id ON custom_fields_definition(organization_id);

-- Tabela para valores dos campos personalizados
CREATE TABLE customer_field_values (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  field_definition_id UUID NOT NULL REFERENCES custom_fields_definition(id) ON DELETE CASCADE,
  value TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (customer_id, field_definition_id)
);

-- Índices para busca
CREATE INDEX idx_customer_field_values_customer_id ON customer_field_values(customer_id);
CREATE INDEX idx_customer_field_values_field_definition_id ON customer_field_values(field_definition_id);
CREATE INDEX idx_customer_field_values_value ON customer_field_values(value);

-- Políticas RLS para custom_fields_definition
ALTER TABLE custom_fields_definition ENABLE ROW LEVEL SECURITY;

-- Política para SELECT
DROP POLICY IF EXISTS "Usuários podem ver definições de campos da sua organização" ON custom_fields_definition;
CREATE POLICY "Usuários podem ver definições de campos da sua organização"
ON custom_fields_definition
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_members.organization_id = custom_fields_definition.organization_id
    AND organization_members.user_id = auth.uid()
  )
);

-- Política para INSERT
DROP POLICY IF EXISTS "Usuários podem inserir definições de campos na sua organização" ON custom_fields_definition;
CREATE POLICY "Usuários podem inserir definições de campos na sua organização"
ON custom_fields_definition
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_members.organization_id = custom_fields_definition.organization_id
    AND organization_members.user_id = auth.uid()
  )
);

-- Política para UPDATE
DROP POLICY IF EXISTS "Usuários podem atualizar definições de campos da sua organização" ON custom_fields_definition;
CREATE POLICY "Usuários podem atualizar definições de campos da sua organização"
ON custom_fields_definition
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_members.organization_id = custom_fields_definition.organization_id
    AND organization_members.user_id = auth.uid()
  )
);

-- Política para DELETE
DROP POLICY IF EXISTS "Usuários podem deletar definições de campos da sua organização" ON custom_fields_definition;
CREATE POLICY "Usuários podem deletar definições de campos da sua organização"
ON custom_fields_definition
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_members.organization_id = custom_fields_definition.organization_id
    AND organization_members.user_id = auth.uid()
  )
);

-- Políticas RLS para customer_field_values
ALTER TABLE customer_field_values ENABLE ROW LEVEL SECURITY;

-- Política para SELECT
DROP POLICY IF EXISTS "Usuários podem ver valores de campos de clientes da sua organização" ON customer_field_values;
CREATE POLICY "Usuários podem ver valores de campos de clientes da sua organização"
ON customer_field_values
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM customers c
    JOIN organization_members om ON c.organization_id = om.organization_id
    WHERE c.id = customer_field_values.customer_id
    AND om.user_id = auth.uid()
  )
);

-- Política para INSERT
DROP POLICY IF EXISTS "Usuários podem inserir valores de campos para clientes da sua organização" ON customer_field_values;
CREATE POLICY "Usuários podem inserir valores de campos para clientes da sua organização"
ON customer_field_values
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM customers c
    JOIN organization_members om ON c.organization_id = om.organization_id
    WHERE c.id = customer_field_values.customer_id
    AND om.user_id = auth.uid()
  )
);

-- Política para UPDATE
DROP POLICY IF EXISTS "Usuários podem atualizar valores de campos de clientes da sua organização" ON customer_field_values;
CREATE POLICY "Usuários podem atualizar valores de campos de clientes da sua organização"
ON customer_field_values
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM customers c
    JOIN organization_members om ON c.organization_id = om.organization_id
    WHERE c.id = customer_field_values.customer_id
    AND om.user_id = auth.uid()
  )
);

-- Política para DELETE
DROP POLICY IF EXISTS "Usuários podem deletar valores de campos de clientes da sua organização" ON customer_field_values;
CREATE POLICY "Usuários podem deletar valores de campos de clientes da sua organização"
ON customer_field_values
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM customers c
    JOIN organization_members om ON c.organization_id = om.organization_id
    WHERE c.id = customer_field_values.customer_id
    AND om.user_id = auth.uid()
  )
); 