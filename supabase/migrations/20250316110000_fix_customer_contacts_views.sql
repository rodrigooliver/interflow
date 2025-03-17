/*
  # Corrigir problemas com os contatos dos clientes
  
  Este script visa corrigir problemas relacionados às consultas que tentam
  acessar uma coluna 'phone' diretamente na tabela 'customers', quando na verdade
  os dados de contato estão armazenados na tabela 'customers_contacts'.
  
  Se houver visualizações ou funções que dependam disso, elas devem ser recriadas.
*/

-- Função auxiliar para obter o telefone principal de um cliente
CREATE OR REPLACE FUNCTION get_customer_phone(customer_id UUID)
RETURNS TEXT AS $$
DECLARE
  phone_value TEXT;
BEGIN
  -- Tentar encontrar um contato do tipo 'phone' primeiro
  SELECT value INTO phone_value
  FROM customers_contacts
  WHERE customer_id = $1 AND type = 'phone'
  LIMIT 1;
  
  -- Se não encontrar, tentar um contato do tipo 'whatsapp'
  IF phone_value IS NULL THEN
    SELECT value INTO phone_value
    FROM customers_contacts
    WHERE customer_id = $1 AND type = 'whatsapp'
    LIMIT 1;
  END IF;
  
  RETURN phone_value;
END;
$$ LANGUAGE plpgsql;

-- Comentários para documentação
COMMENT ON FUNCTION get_customer_phone IS 'Retorna o número de telefone principal de um cliente, buscando primeiro em contatos do tipo phone e depois em whatsapp';

-- Se existirem visualizações que usam phone diretamente, seria necessário recriá-las aqui
-- DROP VIEW IF EXISTS customers_view;
-- CREATE VIEW customers_view AS... 