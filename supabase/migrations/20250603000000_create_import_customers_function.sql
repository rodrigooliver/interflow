-- Função para importar clientes em lote
CREATE OR REPLACE FUNCTION import_customers_batch(
  p_organization_id UUID,
  p_customers JSONB
)
RETURNS TABLE (
  success BOOLEAN,
  customer_id UUID,
  name TEXT,
  error_message TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  customer_data JSONB;
  v_existing_customer_id UUID;
  v_new_customer_id UUID;
  contact_data JSONB;
  field_data JSONB;
  v_field_definition_id UUID;
  field_slug TEXT;
  v_contact_value TEXT;
  v_contact_type contact_type;
  v_customer_found BOOLEAN;
  result_name TEXT;
BEGIN
  -- Iterar sobre cada cliente no array
  FOR customer_data IN SELECT * FROM jsonb_array_elements(p_customers)
  LOOP
    BEGIN
      v_existing_customer_id := NULL;
      v_customer_found := FALSE;
      v_new_customer_id := NULL;
      result_name := customer_data->>'name';
      
      -- Verificar se já existe um cliente com algum dos contatos fornecidos
      IF customer_data->'contacts' IS NOT NULL AND jsonb_typeof(customer_data->'contacts') = 'array' THEN
        FOR contact_data IN SELECT * FROM jsonb_array_elements(customer_data->'contacts')
        LOOP
          v_contact_value := contact_data->>'value';
          v_contact_type := (contact_data->>'type')::contact_type;
          
          -- Buscar cliente existente com este contato
          SELECT c.id INTO v_existing_customer_id
          FROM customers c
          INNER JOIN customer_contacts cc ON c.id = cc.customer_id
          WHERE c.organization_id = p_organization_id
            AND cc.type = v_contact_type
            AND cc.value = v_contact_value
          LIMIT 1;
          
          -- Se encontrou um cliente, sair do loop
          IF v_existing_customer_id IS NOT NULL THEN
            v_customer_found := TRUE;
            EXIT;
          END IF;
        END LOOP;
      END IF;
      
      -- Se encontrou cliente existente, atualizar o nome
      IF v_customer_found THEN
        UPDATE customers 
        SET name = customer_data->>'name'
        WHERE id = v_existing_customer_id;
        
        v_new_customer_id := v_existing_customer_id;
        result_name := (customer_data->>'name') || ' (atualizado)';
      ELSE
        -- Cliente não existe, criar novo
        INSERT INTO customers (
          organization_id,
          name,
          stage_id
        )
        VALUES (
          p_organization_id,
          customer_data->>'name',
          CASE 
            WHEN customer_data->>'stage_id' IS NOT NULL AND customer_data->>'stage_id' != '' 
            THEN (customer_data->>'stage_id')::UUID
            ELSE NULL
          END
        )
        RETURNING id INTO v_new_customer_id;
      END IF;
      
      -- Inserir contatos para o cliente (tanto novos quanto atualizados)
      IF customer_data->'contacts' IS NOT NULL AND jsonb_typeof(customer_data->'contacts') = 'array' THEN
        FOR contact_data IN SELECT * FROM jsonb_array_elements(customer_data->'contacts')
        LOOP
          -- Verificar se o contato já existe
          IF NOT EXISTS (
            SELECT 1 FROM customer_contacts cc 
            WHERE cc.customer_id = v_new_customer_id 
              AND cc.type = (contact_data->>'type')::contact_type
              AND cc.value = contact_data->>'value'
          ) THEN
            -- Inserir contato apenas se não existir
            INSERT INTO customer_contacts (
              customer_id,
              type,
              value,
              label
            )
            VALUES (
              v_new_customer_id,
              (contact_data->>'type')::contact_type,
              contact_data->>'value',
              contact_data->>'label'
            );
          END IF;
        END LOOP;
      END IF;
      
      -- Inserir valores de campos personalizados (versão simplificada)
      IF customer_data->'custom_fields' IS NOT NULL AND jsonb_typeof(customer_data->'custom_fields') = 'object' THEN
        FOR field_slug, field_data IN SELECT * FROM jsonb_each(customer_data->'custom_fields')
        LOOP
          -- Buscar o ID da definição do campo pelo slug
          SELECT cfd.id INTO v_field_definition_id
          FROM custom_fields_definition cfd
          WHERE cfd.organization_id = p_organization_id 
            AND cfd.slug = field_slug;
          
          -- Se encontrou a definição do campo, inserir/atualizar o valor
          IF v_field_definition_id IS NOT NULL THEN
            -- Verificar se já existe um valor para este campo
            IF EXISTS (
              SELECT 1 FROM customer_field_values cfv 
              WHERE cfv.customer_id = v_new_customer_id 
                AND cfv.field_definition_id = v_field_definition_id
            ) THEN
              -- Atualizar valor existente
              UPDATE customer_field_values 
              SET value = field_data#>>'{}'
              WHERE customer_field_values.customer_id = v_new_customer_id 
                AND customer_field_values.field_definition_id = v_field_definition_id;
            ELSE
              -- Inserir novo valor
              INSERT INTO customer_field_values (
                customer_id,
                field_definition_id,
                value
              )
              VALUES (
                v_new_customer_id,
                v_field_definition_id,
                field_data#>>'{}'
              );
            END IF;
          END IF;
        END LOOP;
      END IF;
      
      -- Retornar sucesso
      RETURN QUERY SELECT 
        TRUE::BOOLEAN,
        v_new_customer_id,
        result_name,
        NULL::TEXT;
        
    EXCEPTION WHEN OTHERS THEN
      -- Retornar erro com mais detalhes
      RETURN QUERY SELECT 
        FALSE::BOOLEAN,
        NULL::UUID,
        COALESCE(customer_data->>'name', 'Nome desconhecido'),
        'ERRO: ' || SQLSTATE || ' - ' || SQLERRM;
    END;
  END LOOP;
END;
$$;

-- Conceder permissões para usuários autenticados
GRANT EXECUTE ON FUNCTION import_customers_batch(UUID, JSONB) TO authenticated; 