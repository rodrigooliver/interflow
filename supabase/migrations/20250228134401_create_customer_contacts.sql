-- Criar tipo enum para tipos de contato
CREATE TYPE contact_type AS ENUM (
  'email', 
  'whatsapp', 
  'phone', 
  'instagram', 
  'instagramId', 
  'facebook', 
  'facebookId', 
  'telegram',
  'other'
);

-- Tabela para armazenar múltiplos contatos por cliente
CREATE TABLE customer_contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  type contact_type NOT NULL,
  value TEXT NOT NULL,
  label TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Índices para melhorar performance de busca
CREATE INDEX idx_customer_contacts_customer_id ON customer_contacts(customer_id);
CREATE INDEX idx_customer_contacts_type ON customer_contacts(type);
CREATE INDEX idx_customer_contacts_value ON customer_contacts(value);

-- Políticas RLS para segurança
ALTER TABLE customer_contacts ENABLE ROW LEVEL SECURITY;

-- Política para SELECT
DROP POLICY IF EXISTS "Usuários podem ver contatos de clientes da sua organização" ON customer_contacts;
CREATE POLICY "Usuários podem ver contatos de clientes da sua organização"
ON customer_contacts
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM customers c
    JOIN organization_members om ON c.organization_id = om.organization_id
    WHERE c.id = customer_contacts.customer_id
    AND om.user_id = auth.uid()
  )
);

-- Política para INSERT
DROP POLICY IF EXISTS "Usuários podem inserir contatos para clientes da sua organização" ON customer_contacts;
CREATE POLICY "Usuários autenticados podem inserir contatos para qualquer cliente"
ON customer_contacts
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
);

-- Política para UPDATE
DROP POLICY IF EXISTS "Usuários podem atualizar contatos de clientes da sua organização" ON customer_contacts;
CREATE POLICY "Usuários podem atualizar contatos de clientes da sua organização"
ON customer_contacts
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM customers c
    JOIN organization_members om ON c.organization_id = om.organization_id
    WHERE c.id = customer_contacts.customer_id
    AND om.user_id = auth.uid()
  )
);

-- Política para DELETE
DROP POLICY IF EXISTS "Usuários podem deletar contatos de clientes da sua organização" ON customer_contacts;
CREATE POLICY "Usuários podem deletar contatos de clientes da sua organização"
ON customer_contacts
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM customers c
    JOIN organization_members om ON c.organization_id = om.organization_id
    WHERE c.id = customer_contacts.customer_id
    AND om.user_id = auth.uid()
  )
);

-- Migrar contatos existentes para a nova estrutura
DO $$
DECLARE
    customer_record RECORD;
BEGIN
    -- Processar cada cliente
    FOR customer_record IN SELECT id, organization_id, email, whatsapp FROM customers
    LOOP
        -- Migrar email se não for nulo
        IF customer_record.email IS NOT NULL AND customer_record.email != '' THEN
            INSERT INTO customer_contacts (
                customer_id,
                type,
                value,
                label,
                created_at,
                updated_at
            )
            VALUES (
                customer_record.id,
                'email',
                customer_record.email,
                'Email principal',
                NOW(),
                NOW()
            )
            ON CONFLICT DO NOTHING; -- Evitar duplicação se já migrado
        END IF;

        -- Migrar whatsapp se não for nulo
        IF customer_record.whatsapp IS NOT NULL AND customer_record.whatsapp != '' THEN
            INSERT INTO customer_contacts (
                customer_id,
                type,
                value,
                label,
                created_at,
                updated_at
            )
            VALUES (
                customer_record.id,
                'whatsapp',
                customer_record.whatsapp,
                'WhatsApp principal',
                NOW(),
                NOW()
            )
            ON CONFLICT DO NOTHING; -- Evitar duplicação se já migrado
        END IF;
        
        -- Migrar facebook_id se existir (verificando se a coluna existe)
        BEGIN
            IF EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'customers' AND column_name = 'facebook_id'
            ) THEN
                EXECUTE '
                    DO $inner$
                    BEGIN
                        IF EXISTS (SELECT 1 FROM customers WHERE id = $1 AND facebook_id IS NOT NULL AND facebook_id != '''') THEN
                            INSERT INTO customer_contacts (
                                customer_id,
                                type,
                                value,
                                label,
                                created_at,
                                updated_at
                            )
                            VALUES (
                                $1,
                                ''facebookId'',
                                (SELECT facebook_id FROM customers WHERE id = $1),
                                ''Facebook ID'',
                                NOW(),
                                NOW()
                            )
                            ON CONFLICT DO NOTHING;
                        END IF;
                    END $inner$;
                ' USING customer_record.id;
            END IF;
        EXCEPTION WHEN OTHERS THEN
            -- Ignorar erros se a coluna não existir
            RAISE NOTICE 'Coluna facebook_id não encontrada ou outro erro: %', SQLERRM;
        END;
        
        -- Migrar instagram_id se existir (verificando se a coluna existe)
        BEGIN
            IF EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'customers' AND column_name = 'instagram_id'
            ) THEN
                EXECUTE '
                    DO $inner$
                    BEGIN
                        IF EXISTS (SELECT 1 FROM customers WHERE id = $1 AND instagram_id IS NOT NULL AND instagram_id != '''') THEN
                            INSERT INTO customer_contacts (
                                customer_id,
                                type,
                                value,
                                label,
                                created_at,
                                updated_at
                            )
                            VALUES (
                                $1,
                                ''instagramId'',
                                (SELECT instagram_id FROM customers WHERE id = $1),
                                ''Instagram ID'',
                                NOW(),
                                NOW()
                            )
                            ON CONFLICT DO NOTHING;
                        END IF;
                    END $inner$;
                ' USING customer_record.id;
            END IF;
        EXCEPTION WHEN OTHERS THEN
            -- Ignorar erros se a coluna não existir
            RAISE NOTICE 'Coluna instagram_id não encontrada ou outro erro: %', SQLERRM;
        END;
    END LOOP;
    
    RAISE NOTICE 'Migração de contatos concluída com sucesso!';
END;
$$ LANGUAGE plpgsql;

-- Opcionalmente, podemos adicionar uma migração para remover as colunas antigas
-- após confirmar que todos os dados foram migrados corretamente
-- ALTER TABLE customers DROP COLUMN IF EXISTS email;
-- ALTER TABLE customers DROP COLUMN IF EXISTS whatsapp;
-- ALTER TABLE customers DROP COLUMN IF EXISTS facebook_id;
-- ALTER TABLE customers DROP COLUMN IF EXISTS instagram_id; 