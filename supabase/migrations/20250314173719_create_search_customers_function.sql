-- Criar função para buscar clientes e seus contatos
CREATE OR REPLACE FUNCTION public.search_customers(
  p_organization_id UUID,
  p_search_query TEXT,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0,
  p_funnel_id UUID DEFAULT NULL,
  p_stage_id UUID DEFAULT NULL,
  p_tag_ids UUID[] DEFAULT NULL,
  p_sort_column TEXT DEFAULT 'name',
  p_sort_direction TEXT DEFAULT 'asc',
  p_cache_buster TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP -- Parâmetro para evitar cache
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  organization_id UUID,
  stage_id UUID,
  created_at TIMESTAMPTZ,
  contacts JSONB,
  tags JSONB,
  field_values JSONB,
  crm_stages JSONB,
  total_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_count BIGINT;
  v_sort_column TEXT := p_sort_column;
  v_sort_direction TEXT := p_sort_direction;
BEGIN
  -- Validar parâmetros de ordenação
  IF v_sort_column NOT IN ('name', 'created_at') THEN
    v_sort_column := 'name';
  END IF;
  
  IF v_sort_direction NOT IN ('asc', 'desc') THEN
    v_sort_direction := 'asc';
  END IF;

  -- O parâmetro p_cache_buster não é utilizado nas consultas, apenas para evitar cache

  -- Obter o total de resultados
  WITH filtered_customers AS (
    SELECT 
      c.id, 
      c.name,
      c.organization_id,
      c.stage_id,
      c.created_at
    FROM 
      public.customers c
    WHERE 
      c.organization_id = p_organization_id
      AND (
        p_search_query IS NULL 
        OR p_search_query = '' 
        OR c.name ILIKE '%' || p_search_query || '%'
        OR EXISTS (
          SELECT 1 
          FROM public.customer_contacts cc 
          WHERE cc.customer_id = c.id AND cc.value ILIKE '%' || p_search_query || '%'
        )
      )
      AND (p_stage_id IS NULL OR c.stage_id = p_stage_id)
      AND (
        p_funnel_id IS NULL 
        OR EXISTS (
          SELECT 1 
          FROM public.crm_stages cs 
          WHERE cs.id = c.stage_id AND cs.funnel_id = p_funnel_id
        )
      )
      AND (
        p_tag_ids IS NULL 
        OR p_tag_ids = '{}'::UUID[] 
        OR EXISTS (
          SELECT 1 
          FROM public.customer_tags ct 
          WHERE ct.customer_id = c.id AND ct.tag_id = ANY(p_tag_ids)
        )
      )
  )
  SELECT COUNT(*) INTO v_total_count FROM filtered_customers;
  
  -- Retornar os resultados completos
  RETURN QUERY
  WITH filtered_customers AS (
    SELECT 
      c.id, 
      c.name,
      c.organization_id,
      c.stage_id,
      c.created_at
    FROM 
      public.customers c
    WHERE 
      c.organization_id = p_organization_id
      AND (
        p_search_query IS NULL 
        OR p_search_query = '' 
        OR c.name ILIKE '%' || p_search_query || '%'
        OR EXISTS (
          SELECT 1 
          FROM public.customer_contacts cc 
          WHERE cc.customer_id = c.id AND cc.value ILIKE '%' || p_search_query || '%'
        )
      )
      AND (p_stage_id IS NULL OR c.stage_id = p_stage_id)
      AND (
        p_funnel_id IS NULL 
        OR EXISTS (
          SELECT 1 
          FROM public.crm_stages cs 
          WHERE cs.id = c.stage_id AND cs.funnel_id = p_funnel_id
        )
      )
      AND (
        p_tag_ids IS NULL 
        OR p_tag_ids = '{}'::UUID[] 
        OR EXISTS (
          SELECT 1 
          FROM public.customer_tags ct 
          WHERE ct.customer_id = c.id AND ct.tag_id = ANY(p_tag_ids)
        )
      )
  ),
  -- Aplicar ordenação e paginação
  paginated_customers AS (
    SELECT * FROM filtered_customers fc
    ORDER BY 
      CASE WHEN v_sort_column = 'name' AND v_sort_direction = 'asc' THEN fc.name END ASC,
      CASE WHEN v_sort_column = 'name' AND v_sort_direction = 'desc' THEN fc.name END DESC,
      CASE WHEN v_sort_column = 'created_at' AND v_sort_direction = 'asc' THEN fc.created_at END ASC,
      CASE WHEN v_sort_column = 'created_at' AND v_sort_direction = 'desc' THEN fc.created_at END DESC
    LIMIT p_limit
    OFFSET p_offset
  ),
  -- Buscar contatos para os clientes filtrados
  contact_data AS (
    SELECT 
      cc.customer_id,
      jsonb_agg(
        jsonb_build_object(
          'id', cc.id,
          'customer_id', cc.customer_id,
          'type', cc.type,
          'value', cc.value,
          'created_at', cc.created_at,
          'updated_at', cc.updated_at
        )
      ) AS contacts
    FROM 
      public.customer_contacts cc
    JOIN 
      paginated_customers pc ON cc.customer_id = pc.id
    GROUP BY 
      cc.customer_id
  ),
  -- Buscar tags para os clientes filtrados
  tag_data AS (
    SELECT 
      ct.customer_id,
      jsonb_agg(
        jsonb_build_object(
          'id', t.id,
          'name', t.name,
          'color', t.color
        )
      ) AS tags
    FROM 
      public.customer_tags ct
    JOIN 
      public.tags t ON ct.tag_id = t.id
    JOIN 
      paginated_customers pc ON ct.customer_id = pc.id
    GROUP BY 
      ct.customer_id
  ),
  -- Buscar valores de campos personalizados
  field_value_data AS (
    SELECT 
      cfv.customer_id,
      jsonb_object_agg(
        cfv.field_definition_id,
        cfv.value
      ) AS field_values
    FROM 
      public.customer_field_values cfv
    JOIN 
      paginated_customers pc ON cfv.customer_id = pc.id
    GROUP BY 
      cfv.customer_id
  ),
  -- Buscar informações de estágio e funil
  stage_data AS (
    SELECT 
      pc.id AS customer_id,
      jsonb_build_object(
        'id', cs.id,
        'name', cs.name,
        'color', cs.color,
        'position', cs.position,
        'funnel_id', cs.funnel_id,
        'created_at', cs.created_at,
        'crm_funnels', CASE WHEN cf.id IS NOT NULL THEN
          jsonb_build_object(
            'id', cf.id,
            'name', cf.name,
            'description', cf.description,
            'created_at', cf.created_at
          )
        ELSE NULL END
      ) AS crm_stages
    FROM 
      paginated_customers pc
    LEFT JOIN 
      public.crm_stages cs ON pc.stage_id = cs.id
    LEFT JOIN 
      public.crm_funnels cf ON cs.funnel_id = cf.id
  ),
  -- Resultados finais
  final_results AS (
    SELECT 
      pc.id,
      pc.name,
      pc.organization_id,
      pc.stage_id,
      pc.created_at,
      COALESCE(cd.contacts, '[]'::jsonb) AS contacts,
      COALESCE(td.tags, '[]'::jsonb) AS tags,
      COALESCE(fvd.field_values, '{}'::jsonb) AS field_values,
      COALESCE(sd.crm_stages, NULL) AS crm_stages,
      v_total_count AS total_count
    FROM 
      paginated_customers pc
    LEFT JOIN 
      contact_data cd ON pc.id = cd.customer_id
    LEFT JOIN 
      tag_data td ON pc.id = td.customer_id
    LEFT JOIN 
      field_value_data fvd ON pc.id = fvd.customer_id
    LEFT JOIN 
      stage_data sd ON pc.id = sd.customer_id
  )
  SELECT * FROM final_results;
END;
$$;

-- Conceder permissões para a função
GRANT EXECUTE ON FUNCTION public.search_customers(UUID, TEXT, INTEGER, INTEGER, UUID, UUID, UUID[], TEXT, TEXT, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_customers(UUID, TEXT, INTEGER, INTEGER, UUID, UUID, UUID[], TEXT, TEXT, TIMESTAMPTZ) TO service_role;

-- Comentário para documentação
COMMENT ON FUNCTION public.search_customers IS 'Busca clientes e seus contatos, tags, campos personalizados e estágios de CRM com base em vários critérios de pesquisa. Suporta paginação, ordenação e filtragem por funil, estágio e tags.'; 