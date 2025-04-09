-- Adiciona a coluna slug à tabela custom_fields_definition
ALTER TABLE custom_fields_definition ADD COLUMN slug TEXT;

-- Atualiza registros existentes para preencher o slug (usando o name transformado em slug)
-- Remove espaços, caracteres especiais e converte para minúsculas
UPDATE custom_fields_definition 
SET slug = LOWER(REGEXP_REPLACE(TRIM(name), '[^a-zA-Z0-9]', '-', 'g'));

-- Torna a coluna NOT NULL após preencher os dados
ALTER TABLE custom_fields_definition ALTER COLUMN slug SET NOT NULL;

-- Adiciona uma restrição UNIQUE para garantir que não existam slugs repetidos
-- dentro da mesma organização
DROP INDEX IF EXISTS idx_custom_fields_definition_org_slug;
CREATE UNIQUE INDEX idx_custom_fields_definition_org_slug 
ON custom_fields_definition(organization_id, slug);

-- Adiciona um trigger para gerar automaticamente o slug a partir do nome,
-- caso nenhum slug seja fornecido na inserção ou atualização
CREATE OR REPLACE FUNCTION generate_custom_field_slug()
RETURNS TRIGGER AS $$
BEGIN
  -- Se nenhum slug for fornecido, gera um a partir do nome
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := LOWER(REGEXP_REPLACE(TRIM(NEW.name), '[^a-zA-Z0-9]', '-', 'g'));
  END IF;
  
  -- Certifica que o slug está em minúsculas e sem caracteres especiais
  NEW.slug := LOWER(REGEXP_REPLACE(TRIM(NEW.slug), '[^a-zA-Z0-9]', '-', 'g'));
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_generate_custom_field_slug ON custom_fields_definition;
CREATE TRIGGER trigger_generate_custom_field_slug
BEFORE INSERT OR UPDATE ON custom_fields_definition
FOR EACH ROW EXECUTE FUNCTION generate_custom_field_slug(); 