-- =====================================================
-- MIGRATION: Adicionar colunas de contato principal
-- =====================================================
-- Esta migration adiciona duas funcionalidades:
-- 1. is_primary: contato principal geral do cliente (apenas 1 por cliente)
-- 2. is_primary_for_type: contato principal por tipo (1 email, 1 whatsapp, etc.)
-- 
-- COMPORTAMENTO AUTOMÁTICO:
-- - Primeiro contato do cliente → is_primary = TRUE automaticamente
-- - Primeiro contato de um tipo → is_primary_for_type = TRUE automaticamente

-- =====================================================
-- PARTE 1: ADICIONAR COLUNAS
-- =====================================================

ALTER TABLE customer_contacts 
ADD COLUMN is_primary BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN is_primary_for_type BOOLEAN NOT NULL DEFAULT FALSE;

-- =====================================================
-- PARTE 2: CRIAR ÍNDICES
-- =====================================================

CREATE INDEX idx_customer_contacts_is_primary ON customer_contacts(customer_id, is_primary) WHERE is_primary = TRUE;
CREATE INDEX idx_customer_contacts_primary_for_type ON customer_contacts(customer_id, type, is_primary_for_type) WHERE is_primary_for_type = TRUE;

-- =====================================================
-- PARTE 3: MIGRAR DADOS EXISTENTES
-- =====================================================

DO $$
DECLARE
    customer_record RECORD;
    customer_type_record RECORD;
    oldest_contact_id UUID;
BEGIN
    -- Contatos principais gerais (mais antigo de cada cliente)
    FOR customer_record IN SELECT DISTINCT customer_id FROM customer_contacts LOOP
        SELECT id INTO oldest_contact_id
        FROM customer_contacts
        WHERE customer_id = customer_record.customer_id
        ORDER BY created_at ASC, id ASC LIMIT 1;
        
        UPDATE customer_contacts SET is_primary = TRUE WHERE id = oldest_contact_id;
    END LOOP;
    
    -- Contatos principais por tipo (mais antigo de cada tipo por cliente)
    FOR customer_type_record IN SELECT DISTINCT customer_id, type FROM customer_contacts LOOP
        SELECT id INTO oldest_contact_id
        FROM customer_contacts
        WHERE customer_id = customer_type_record.customer_id 
        AND type = customer_type_record.type
        ORDER BY created_at ASC, id ASC LIMIT 1;
        
        UPDATE customer_contacts SET is_primary_for_type = TRUE WHERE id = oldest_contact_id;
    END LOOP;
    
    RAISE NOTICE 'Dados migrados com sucesso!';
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- PARTE 4: CONSTRAINTS DE UNICIDADE
-- =====================================================

-- Constraint para garantir apenas um contato principal geral por cliente (apenas quando is_primary = TRUE)
CREATE UNIQUE INDEX unique_primary_contact_per_customer 
ON customer_contacts (customer_id) 
WHERE is_primary = TRUE;

-- Constraint para garantir apenas um contato principal por tipo por cliente (apenas quando is_primary_for_type = TRUE)
CREATE UNIQUE INDEX unique_primary_contact_per_customer_type 
ON customer_contacts (customer_id, type) 
WHERE is_primary_for_type = TRUE;

-- =====================================================
-- PARTE 5: FUNÇÕES AUXILIARES
-- =====================================================

-- Definir contato como principal geral
CREATE OR REPLACE FUNCTION set_primary_contact(contact_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE customer_uuid UUID; contact_exists BOOLEAN := FALSE;
BEGIN
    SELECT customer_id INTO customer_uuid FROM customer_contacts WHERE id = contact_id;
    IF customer_uuid IS NULL THEN RAISE EXCEPTION 'Contato com ID % não encontrado', contact_id; END IF;
    
    UPDATE customer_contacts SET is_primary = FALSE WHERE customer_id = customer_uuid AND is_primary = TRUE;
    UPDATE customer_contacts SET is_primary = TRUE WHERE id = contact_id;
    
    SELECT EXISTS(SELECT 1 FROM customer_contacts WHERE id = contact_id AND is_primary = TRUE) INTO contact_exists;
    RETURN contact_exists;
END; $$;

-- Obter contato principal geral
CREATE OR REPLACE FUNCTION get_primary_contact(customer_uuid UUID)
RETURNS TABLE (id UUID, type contact_type, value TEXT, label TEXT, created_at TIMESTAMP WITH TIME ZONE, updated_at TIMESTAMP WITH TIME ZONE)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    RETURN QUERY SELECT cc.id, cc.type, cc.value, cc.label, cc.created_at, cc.updated_at
    FROM customer_contacts cc WHERE cc.customer_id = customer_uuid AND cc.is_primary = TRUE;
END; $$;

-- Definir contato como principal para seu tipo
CREATE OR REPLACE FUNCTION set_primary_contact_for_type(contact_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE customer_uuid UUID; contact_type_val contact_type; contact_exists BOOLEAN := FALSE;
BEGIN
    SELECT customer_id, type INTO customer_uuid, contact_type_val FROM customer_contacts WHERE id = contact_id;
    IF customer_uuid IS NULL THEN RAISE EXCEPTION 'Contato com ID % não encontrado', contact_id; END IF;
    
    UPDATE customer_contacts SET is_primary_for_type = FALSE 
    WHERE customer_id = customer_uuid AND type = contact_type_val AND is_primary_for_type = TRUE;
    UPDATE customer_contacts SET is_primary_for_type = TRUE WHERE id = contact_id;
    
    SELECT EXISTS(SELECT 1 FROM customer_contacts WHERE id = contact_id AND is_primary_for_type = TRUE) INTO contact_exists;
    RETURN contact_exists;
END; $$;

-- Obter contato principal de um tipo específico
CREATE OR REPLACE FUNCTION get_primary_contact_for_type(customer_uuid UUID, contact_type_param contact_type)
RETURNS TABLE (id UUID, type contact_type, value TEXT, label TEXT, created_at TIMESTAMP WITH TIME ZONE, updated_at TIMESTAMP WITH TIME ZONE)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    RETURN QUERY SELECT cc.id, cc.type, cc.value, cc.label, cc.created_at, cc.updated_at
    FROM customer_contacts cc WHERE cc.customer_id = customer_uuid AND cc.type = contact_type_param AND cc.is_primary_for_type = TRUE;
END; $$;

-- Obter todos os contatos principais por tipo
CREATE OR REPLACE FUNCTION get_all_primary_contacts_by_type(customer_uuid UUID)
RETURNS TABLE (id UUID, type contact_type, value TEXT, label TEXT, created_at TIMESTAMP WITH TIME ZONE, updated_at TIMESTAMP WITH TIME ZONE, is_primary BOOLEAN, is_primary_for_type BOOLEAN)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    RETURN QUERY SELECT cc.id, cc.type, cc.value, cc.label, cc.created_at, cc.updated_at, cc.is_primary, cc.is_primary_for_type
    FROM customer_contacts cc WHERE cc.customer_id = customer_uuid AND cc.is_primary_for_type = TRUE ORDER BY cc.type, cc.created_at;
END; $$;

-- =====================================================
-- PARTE 6: TRIGGERS PARA AUTOMAÇÃO
-- =====================================================

-- Trigger para definir automaticamente contatos principais ao inserir
CREATE OR REPLACE FUNCTION ensure_primary_contact()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE contact_count INTEGER; contact_count_for_type INTEGER;
BEGIN
    -- Contar contatos do cliente
    SELECT COUNT(*) INTO contact_count FROM customer_contacts WHERE customer_id = NEW.customer_id;
    SELECT COUNT(*) INTO contact_count_for_type FROM customer_contacts WHERE customer_id = NEW.customer_id AND type = NEW.type;
    
    -- AUTOMÁTICO: Se é o primeiro contato do cliente → principal geral
    IF contact_count = 1 THEN NEW.is_primary = TRUE;
    -- Se marcando como principal geral → remover outros
    ELSIF NEW.is_primary = TRUE THEN
        UPDATE customer_contacts SET is_primary = FALSE 
        WHERE customer_id = NEW.customer_id AND id != NEW.id AND is_primary = TRUE;
    END IF;
    
    -- AUTOMÁTICO: Se é o primeiro contato deste tipo → principal do tipo
    IF contact_count_for_type = 1 THEN NEW.is_primary_for_type = TRUE;
    -- Se marcando como principal do tipo → remover outros do mesmo tipo
    ELSIF NEW.is_primary_for_type = TRUE THEN
        UPDATE customer_contacts SET is_primary_for_type = FALSE 
        WHERE customer_id = NEW.customer_id AND type = NEW.type AND id != NEW.id AND is_primary_for_type = TRUE;
    END IF;
    
    RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trigger_ensure_primary_contact ON customer_contacts;
CREATE TRIGGER trigger_ensure_primary_contact BEFORE INSERT ON customer_contacts FOR EACH ROW EXECUTE FUNCTION ensure_primary_contact();

-- Trigger para manter integridade ao atualizar
CREATE OR REPLACE FUNCTION validate_primary_contact_update()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE primary_count INTEGER; primary_for_type_count INTEGER;
BEGIN
    -- Lógica para contato principal geral
    IF OLD.is_primary = TRUE AND NEW.is_primary = FALSE THEN
        SELECT COUNT(*) INTO primary_count FROM customer_contacts 
        WHERE customer_id = NEW.customer_id AND is_primary = TRUE AND id != NEW.id;
        
        -- Se não há outros principais → definir o mais antigo
        IF primary_count = 0 THEN
            UPDATE customer_contacts SET is_primary = TRUE WHERE customer_id = NEW.customer_id AND id = (
                SELECT id FROM customer_contacts WHERE customer_id = NEW.customer_id AND id != NEW.id
                ORDER BY created_at ASC, id ASC LIMIT 1
            );
        END IF;
    ELSIF OLD.is_primary = FALSE AND NEW.is_primary = TRUE THEN
        UPDATE customer_contacts SET is_primary = FALSE 
        WHERE customer_id = NEW.customer_id AND id != NEW.id AND is_primary = TRUE;
    END IF;
    
    -- Lógica para contato principal por tipo
    IF OLD.is_primary_for_type = TRUE AND NEW.is_primary_for_type = FALSE THEN
        SELECT COUNT(*) INTO primary_for_type_count FROM customer_contacts 
        WHERE customer_id = NEW.customer_id AND type = NEW.type AND is_primary_for_type = TRUE AND id != NEW.id;
        
        -- Se não há outros principais do tipo → definir o mais antigo
        IF primary_for_type_count = 0 THEN
            UPDATE customer_contacts SET is_primary_for_type = TRUE WHERE customer_id = NEW.customer_id AND type = NEW.type AND id = (
                SELECT id FROM customer_contacts WHERE customer_id = NEW.customer_id AND type = NEW.type AND id != NEW.id
                ORDER BY created_at ASC, id ASC LIMIT 1
            );
        END IF;
    ELSIF OLD.is_primary_for_type = FALSE AND NEW.is_primary_for_type = TRUE THEN
        UPDATE customer_contacts SET is_primary_for_type = FALSE 
        WHERE customer_id = NEW.customer_id AND type = NEW.type AND id != NEW.id AND is_primary_for_type = TRUE;
    END IF;
    
    RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trigger_validate_primary_contact_update ON customer_contacts;
CREATE TRIGGER trigger_validate_primary_contact_update BEFORE UPDATE ON customer_contacts FOR EACH ROW EXECUTE FUNCTION validate_primary_contact_update();

-- =====================================================
-- DOCUMENTAÇÃO
-- =====================================================

COMMENT ON COLUMN customer_contacts.is_primary IS 'Contato principal geral do cliente (apenas um por cliente) - definido automaticamente para o primeiro contato';
COMMENT ON COLUMN customer_contacts.is_primary_for_type IS 'Contato principal por tipo (um email principal, um whatsapp principal, etc.) - definido automaticamente para o primeiro de cada tipo';

COMMENT ON FUNCTION set_primary_contact(UUID) IS 'Define um contato específico como principal geral';
COMMENT ON FUNCTION get_primary_contact(UUID) IS 'Retorna o contato principal geral de um cliente';
COMMENT ON FUNCTION set_primary_contact_for_type(UUID) IS 'Define um contato específico como principal para seu tipo';
COMMENT ON FUNCTION get_primary_contact_for_type(UUID, contact_type) IS 'Retorna o contato principal de um tipo específico';
COMMENT ON FUNCTION get_all_primary_contacts_by_type(UUID) IS 'Retorna todos os contatos principais por tipo de um cliente';

-- =====================================================
-- VALIDAÇÃO FINAL
-- =====================================================

DO $$
DECLARE customer_count INTEGER; primary_count INTEGER; type_combinations INTEGER; primary_type_count INTEGER;
BEGIN
    SELECT COUNT(DISTINCT customer_id) INTO customer_count FROM customer_contacts;
    SELECT COUNT(*) INTO primary_count FROM customer_contacts WHERE is_primary = TRUE;
    SELECT COUNT(*) INTO type_combinations FROM (SELECT DISTINCT customer_id, type FROM customer_contacts) as t;
    SELECT COUNT(*) INTO primary_type_count FROM customer_contacts WHERE is_primary_for_type = TRUE;
    
    RAISE NOTICE 'VALIDAÇÃO: % clientes, % principais gerais, % combinações tipo, % principais por tipo', 
                 customer_count, primary_count, type_combinations, primary_type_count;
    
    IF customer_count = primary_count AND type_combinations = primary_type_count THEN
        RAISE NOTICE '✓ MIGRATION APLICADA COM SUCESSO!';
    ELSE
        RAISE WARNING '⚠ Possível inconsistência detectada';
    END IF;
END; $$ LANGUAGE plpgsql; 