/*
 * Adiciona função para calcular a variação percentual entre dois períodos
 * 
 * Esta função facilita o cálculo de variações percentuais para métricas como
 * tempo de resposta e contagem de mensagens entre períodos diferentes.
 */

-- Início da transação
BEGIN;

-- Função para calcular a variação percentual
CREATE OR REPLACE FUNCTION calculate_percentage_change(
  org_id UUID,
  metric TEXT,
  current_period TEXT DEFAULT NULL,
  previous_period TEXT DEFAULT NULL,
  current_specific_date DATE DEFAULT NULL,
  previous_specific_date DATE DEFAULT NULL,
  current_specific_month DATE DEFAULT NULL,
  previous_specific_month DATE DEFAULT NULL,
  current_specific_year DATE DEFAULT NULL,
  previous_specific_year DATE DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  current_value INTEGER := 0;
  previous_value INTEGER := 0;
  percentage_change NUMERIC := 0;
  change_type TEXT := 'increase';
  start_date TIMESTAMPTZ;
  end_date TIMESTAMPTZ;
  time_period_param TEXT;
BEGIN
  -- Calcula os valores com base na métrica
  IF metric = 'response_time' THEN
    -- Tempo médio de resposta
    
    -- Valor atual
    IF current_specific_date IS NOT NULL THEN
      -- Dia específico
      time_period_param := NULL;
      SELECT calculate_average_response_time(
        org_id, 
        time_period_param, 
        current_specific_date, 
        NULL, 
        NULL
      ) INTO current_value;
    ELSIF current_specific_month IS NOT NULL THEN
      -- Mês específico
      time_period_param := NULL;
      SELECT calculate_average_response_time(
        org_id, 
        time_period_param, 
        NULL, 
        current_specific_month, 
        NULL
      ) INTO current_value;
    ELSIF current_specific_year IS NOT NULL THEN
      -- Ano específico
      time_period_param := NULL;
      SELECT calculate_average_response_time(
        org_id, 
        time_period_param, 
        NULL, 
        NULL, 
        current_specific_year
      ) INTO current_value;
    ELSE
      -- Período relativo
      SELECT calculate_average_response_time(org_id, current_period) INTO current_value;
    END IF;
    
    -- Valor anterior
    IF previous_specific_date IS NOT NULL THEN
      -- Dia específico anterior
      time_period_param := NULL;
      SELECT calculate_average_response_time(
        org_id, 
        time_period_param, 
        previous_specific_date, 
        NULL, 
        NULL
      ) INTO previous_value;
    ELSIF previous_specific_month IS NOT NULL THEN
      -- Mês específico anterior
      time_period_param := NULL;
      SELECT calculate_average_response_time(
        org_id, 
        time_period_param, 
        NULL, 
        previous_specific_month, 
        NULL
      ) INTO previous_value;
    ELSIF previous_specific_year IS NOT NULL THEN
      -- Ano específico anterior
      time_period_param := NULL;
      SELECT calculate_average_response_time(
        org_id, 
        time_period_param, 
        NULL, 
        NULL, 
        previous_specific_year
      ) INTO previous_value;
    ELSIF previous_period IS NOT NULL THEN
      -- Período relativo específico
      SELECT calculate_average_response_time(org_id, previous_period) INTO previous_value;
    ELSE
      -- Determina automaticamente o período anterior
      IF current_period IS NOT NULL THEN
        -- Baseado no período atual
        IF current_period = 'day' THEN
          SELECT calculate_average_response_time(org_id, 'previous_day') INTO previous_value;
        ELSIF current_period = 'week' THEN
          SELECT calculate_average_response_time(org_id, 'previous_week') INTO previous_value;
        ELSIF current_period = 'month' THEN
          SELECT calculate_average_response_time(org_id, 'previous_month') INTO previous_value;
        ELSIF current_period = 'year' THEN
          SELECT calculate_average_response_time(org_id, 'previous_year') INTO previous_value;
        ELSE
          SELECT calculate_average_response_time(org_id, 'previous_day') INTO previous_value;
        END IF;
      ELSIF current_specific_date IS NOT NULL THEN
        -- Dia anterior ao específico
        time_period_param := NULL;
        SELECT calculate_average_response_time(
          org_id, 
          time_period_param, 
          (current_specific_date - INTERVAL '1 day')::DATE, 
          NULL, 
          NULL
        ) INTO previous_value;
      ELSIF current_specific_month IS NOT NULL THEN
        -- Mês anterior ao específico
        time_period_param := NULL;
        SELECT calculate_average_response_time(
          org_id, 
          time_period_param, 
          NULL, 
          (current_specific_month - INTERVAL '1 month')::DATE, 
          NULL
        ) INTO previous_value;
      ELSIF current_specific_year IS NOT NULL THEN
        -- Ano anterior ao específico
        time_period_param := NULL;
        SELECT calculate_average_response_time(
          org_id, 
          time_period_param, 
          NULL, 
          NULL, 
          (current_specific_year - INTERVAL '1 year')::DATE
        ) INTO previous_value;
      ELSE
        -- Padrão: dia anterior
        SELECT calculate_average_response_time(org_id, 'previous_day') INTO previous_value;
      END IF;
    END IF;
    
  ELSIF metric = 'messages_count' THEN
    -- Contagem de mensagens
    
    -- Valor atual
    IF current_specific_date IS NOT NULL THEN
      -- Dia específico
      SELECT COUNT(*)::INTEGER INTO current_value
      FROM messages m
      WHERE 
        m.organization_id = org_id AND
        m.created_at >= current_specific_date::TIMESTAMPTZ AND
        m.created_at < (current_specific_date + INTERVAL '1 day')::TIMESTAMPTZ;
    ELSIF current_specific_month IS NOT NULL THEN
      -- Mês específico
      SELECT COUNT(*)::INTEGER INTO current_value
      FROM messages m
      WHERE 
        m.organization_id = org_id AND
        m.created_at >= DATE_TRUNC('month', current_specific_month)::TIMESTAMPTZ AND
        m.created_at < (DATE_TRUNC('month', current_specific_month) + INTERVAL '1 month')::TIMESTAMPTZ;
    ELSIF current_specific_year IS NOT NULL THEN
      -- Ano específico
      SELECT COUNT(*)::INTEGER INTO current_value
      FROM messages m
      WHERE 
        m.organization_id = org_id AND
        m.created_at >= DATE_TRUNC('year', current_specific_year)::TIMESTAMPTZ AND
        m.created_at < (DATE_TRUNC('year', current_specific_year) + INTERVAL '1 year')::TIMESTAMPTZ;
    ELSE
      -- Períodos relativos
      IF current_period = 'day' THEN
        start_date := NOW() - INTERVAL '1 day';
      ELSIF current_period = 'week' THEN
        start_date := NOW() - INTERVAL '7 days';
      ELSIF current_period = 'month' THEN
        start_date := NOW() - INTERVAL '30 days';
      ELSIF current_period = 'year' THEN
        start_date := NOW() - INTERVAL '365 days';
      ELSE
        start_date := NOW() - INTERVAL '1 day';
      END IF;
      
      SELECT COUNT(*)::INTEGER INTO current_value
      FROM messages m
      WHERE 
        m.organization_id = org_id AND
        m.created_at >= start_date;
    END IF;
    
    -- Valor anterior
    IF previous_specific_date IS NOT NULL THEN
      -- Dia específico anterior
      SELECT COUNT(*)::INTEGER INTO previous_value
      FROM messages m
      WHERE 
        m.organization_id = org_id AND
        m.created_at >= previous_specific_date::TIMESTAMPTZ AND
        m.created_at < (previous_specific_date + INTERVAL '1 day')::TIMESTAMPTZ;
    ELSIF previous_specific_month IS NOT NULL THEN
      -- Mês específico anterior
      SELECT COUNT(*)::INTEGER INTO previous_value
      FROM messages m
      WHERE 
        m.organization_id = org_id AND
        m.created_at >= DATE_TRUNC('month', previous_specific_month)::TIMESTAMPTZ AND
        m.created_at < (DATE_TRUNC('month', previous_specific_month) + INTERVAL '1 month')::TIMESTAMPTZ;
    ELSIF previous_specific_year IS NOT NULL THEN
      -- Ano específico anterior
      SELECT COUNT(*)::INTEGER INTO previous_value
      FROM messages m
      WHERE 
        m.organization_id = org_id AND
        m.created_at >= DATE_TRUNC('year', previous_specific_year)::TIMESTAMPTZ AND
        m.created_at < (DATE_TRUNC('year', previous_specific_year) + INTERVAL '1 year')::TIMESTAMPTZ;
    ELSIF previous_period IS NOT NULL THEN
      -- Período relativo específico
      IF previous_period = 'previous_day' THEN 
        start_date := NOW() - INTERVAL '2 days';
        end_date := NOW() - INTERVAL '1 day';
      ELSIF previous_period = 'previous_week' THEN 
        start_date := NOW() - INTERVAL '14 days';
        end_date := NOW() - INTERVAL '7 days';
      ELSIF previous_period = 'previous_month' THEN 
        start_date := NOW() - INTERVAL '60 days';
        end_date := NOW() - INTERVAL '30 days';
      ELSIF previous_period = 'previous_year' THEN 
        start_date := NOW() - INTERVAL '730 days';
        end_date := NOW() - INTERVAL '365 days';
      ELSE 
        start_date := NOW() - INTERVAL '2 days';
        end_date := NOW() - INTERVAL '1 day';
      END IF;
      
      SELECT COUNT(*)::INTEGER INTO previous_value
      FROM messages m
      WHERE 
        m.organization_id = org_id AND
        m.created_at >= start_date AND
        m.created_at < end_date;
    ELSE
      -- Determina automaticamente o período anterior
      IF current_period IS NOT NULL THEN
        -- Baseado no período atual
        IF current_period = 'day' THEN 
          start_date := NOW() - INTERVAL '2 days';
          end_date := NOW() - INTERVAL '1 day';
        ELSIF current_period = 'week' THEN 
          start_date := NOW() - INTERVAL '14 days';
          end_date := NOW() - INTERVAL '7 days';
        ELSIF current_period = 'month' THEN 
          start_date := NOW() - INTERVAL '60 days';
          end_date := NOW() - INTERVAL '30 days';
        ELSIF current_period = 'year' THEN 
          start_date := NOW() - INTERVAL '730 days';
          end_date := NOW() - INTERVAL '365 days';
        ELSE 
          start_date := NOW() - INTERVAL '2 days';
          end_date := NOW() - INTERVAL '1 day';
        END IF;
        
        SELECT COUNT(*)::INTEGER INTO previous_value
        FROM messages m
        WHERE 
          m.organization_id = org_id AND
          m.created_at >= start_date AND
          m.created_at < end_date;
      ELSIF current_specific_date IS NOT NULL THEN
        -- Dia anterior ao específico
        SELECT COUNT(*)::INTEGER INTO previous_value
        FROM messages m
        WHERE 
          m.organization_id = org_id AND
          m.created_at >= (current_specific_date - INTERVAL '1 day')::TIMESTAMPTZ AND
          m.created_at < current_specific_date::TIMESTAMPTZ;
      ELSIF current_specific_month IS NOT NULL THEN
        -- Mês anterior ao específico
        SELECT COUNT(*)::INTEGER INTO previous_value
        FROM messages m
        WHERE 
          m.organization_id = org_id AND
          m.created_at >= DATE_TRUNC('month', current_specific_month - INTERVAL '1 month')::TIMESTAMPTZ AND
          m.created_at < DATE_TRUNC('month', current_specific_month)::TIMESTAMPTZ;
      ELSIF current_specific_year IS NOT NULL THEN
        -- Ano anterior ao específico
        SELECT COUNT(*)::INTEGER INTO previous_value
        FROM messages m
        WHERE 
          m.organization_id = org_id AND
          m.created_at >= DATE_TRUNC('year', current_specific_year - INTERVAL '1 year')::TIMESTAMPTZ AND
          m.created_at < DATE_TRUNC('year', current_specific_year)::TIMESTAMPTZ;
      ELSE
        -- Padrão: dia anterior
        start_date := NOW() - INTERVAL '2 days';
        end_date := NOW() - INTERVAL '1 day';
        
        SELECT COUNT(*)::INTEGER INTO previous_value
        FROM messages m
        WHERE 
          m.organization_id = org_id AND
          m.created_at >= start_date AND
          m.created_at < end_date;
      END IF;
    END IF;
  ELSE
    -- Métrica desconhecida
    RETURN jsonb_build_object(
      'value', 0,
      'type', 'unknown',
      'current_value', 0,
      'previous_value', 0
    );
  END IF;

  -- Calcula a variação percentual
  IF previous_value = 0 OR previous_value IS NULL THEN
    -- Se o valor anterior for zero ou nulo, não podemos calcular a variação percentual
    percentage_change := 0;
    change_type := 'increase';
  ELSE
    -- Calcula a variação percentual
    percentage_change := ((current_value - previous_value)::NUMERIC / previous_value::NUMERIC) * 100;
    
    -- Para tempo de resposta, um aumento é negativo (pior) e uma diminuição é positiva (melhor)
    IF metric = 'response_time' THEN
      change_type := CASE WHEN percentage_change >= 0 THEN 'increase' ELSE 'decrease' END;
    ELSE
      change_type := CASE WHEN percentage_change >= 0 THEN 'increase' ELSE 'decrease' END;
    END IF;
  END IF;

  -- Retorna o resultado como JSONB
  RETURN jsonb_build_object(
    'value', ROUND(ABS(percentage_change)),
    'type', change_type,
    'current_value', current_value,
    'previous_value', previous_value
  );
END;
$$ LANGUAGE plpgsql;

-- Adiciona permissões para a função
GRANT EXECUTE ON FUNCTION calculate_percentage_change(UUID, TEXT, TEXT, TEXT, DATE, DATE, DATE, DATE, DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_percentage_change(UUID, TEXT, TEXT, TEXT, DATE, DATE, DATE, DATE, DATE, DATE) TO service_role;

-- Adiciona comentário para documentar a função
COMMENT ON FUNCTION calculate_percentage_change(UUID, TEXT, TEXT, TEXT, DATE, DATE, DATE, DATE, DATE, DATE) IS 
'Calcula a variação percentual entre dois períodos para uma métrica específica.
Suporta períodos relativos (day, week, month, year) e períodos específicos (dia, mês ou ano específico).
Parâmetros:
- org_id: UUID da organização
- metric: Métrica a ser calculada (response_time, messages_count)
- current_period: Período atual relativo (day, week, month, year)
- previous_period: Período anterior relativo (opcional)
- current_specific_date: Data específica atual para comparação
- previous_specific_date: Data específica anterior para comparação
- current_specific_month: Mês específico atual para comparação
- previous_specific_month: Mês específico anterior para comparação
- current_specific_year: Ano específico atual para comparação
- previous_specific_year: Ano específico anterior para comparação
Retorno: JSONB com value (valor absoluto da variação), type (increase/decrease), current_value e previous_value';

-- Finaliza a transação
COMMIT; 