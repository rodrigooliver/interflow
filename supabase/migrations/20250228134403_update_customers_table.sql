
-- Atualizar triggers existentes para manter o updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = now();
   RETURN NEW;
END;
$$ language 'plpgsql';

-- Aplicar o trigger nas novas tabelas
CREATE TRIGGER update_customer_contacts_updated_at
BEFORE UPDATE ON customer_contacts
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_custom_fields_definition_updated_at
BEFORE UPDATE ON custom_fields_definition
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_customer_field_values_updated_at
BEFORE UPDATE ON customer_field_values
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column(); 