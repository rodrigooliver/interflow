-- Adicionar colunas de máscara à tabela custom_fields_definition
ALTER TABLE custom_fields_definition
ADD COLUMN mask_type TEXT CHECK (mask_type IN ('cpf', 'cnpj', 'phone', 'cep', 'rg', 'custom')),
ADD COLUMN custom_mask TEXT,
ADD COLUMN description TEXT;

-- Adicionar comentários explicativos
COMMENT ON COLUMN custom_fields_definition.mask_type IS 'Tipo de máscara para formatação do campo (cpf, cnpj, phone, cep, rg, custom)';
COMMENT ON COLUMN custom_fields_definition.custom_mask IS 'Máscara customizada no formato regex (ex: (\\d{3})\\.(\\d{3})\\.(\\d{3})-(\\d{2}))';
COMMENT ON COLUMN custom_fields_definition.description IS 'Descrição do campo personalizado';