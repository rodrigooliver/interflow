/*
 * Adiciona função para buscar mensagens agrupadas por equipe e período
 * 
 * Esta função permite buscar a contagem de mensagens por equipe e período,
 * agrupando os resultados por hora, dia, semana ou mês.
 */

-- Início da transação
BEGIN;

-- Função para buscar mensagens agrupadas por equipe e período
CREATE OR REPLACE FUNCTION get_messages_by_team(
  org_id UUID,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  group_by TEXT DEFAULT 'day'
)
RETURNS TABLE (
  time_period TIMESTAMPTZ,
  team_name TEXT,
  message_count BIGINT
) AS $$
BEGIN
  -- Validar o parâmetro group_by
  IF group_by NOT IN ('hour', 'day', 'week', 'month') THEN
    RAISE EXCEPTION 'Parâmetro group_by inválido. Valores permitidos: hour, day, week, month';
  END IF;

  -- Retornar mensagens agrupadas por período e equipe
  RETURN QUERY
  WITH team_messages AS (
    -- Buscar mensagens com informações de equipe
    SELECT 
      m.created_at,
      COALESCE(st.name, 'Sem equipe') AS team_name
    FROM 
      messages m
    LEFT JOIN 
      chats c ON m.chat_id = c.id
    LEFT JOIN 
      service_teams st ON c.team_id = st.id
    WHERE 
      m.organization_id = org_id AND
      m.created_at BETWEEN start_date AND end_date
  )
  SELECT
    -- Agrupar por período conforme solicitado
    CASE
      WHEN group_by = 'hour' THEN 
        DATE_TRUNC('hour', tm.created_at)
      WHEN group_by = 'day' THEN 
        DATE_TRUNC('day', tm.created_at)
      WHEN group_by = 'week' THEN 
        DATE_TRUNC('week', tm.created_at)
      WHEN group_by = 'month' THEN 
        DATE_TRUNC('month', tm.created_at)
    END AS time_period,
    tm.team_name,
    COUNT(*) AS message_count
  FROM 
    team_messages tm
  GROUP BY 
    time_period, tm.team_name
  ORDER BY 
    time_period, tm.team_name;
END;
$$ LANGUAGE plpgsql;

-- Adiciona permissões para a função
GRANT EXECUTE ON FUNCTION get_messages_by_team(UUID, TIMESTAMPTZ, TIMESTAMPTZ, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_messages_by_team(UUID, TIMESTAMPTZ, TIMESTAMPTZ, TEXT) TO service_role;

-- Adiciona comentário para documentar a função
COMMENT ON FUNCTION get_messages_by_team(UUID, TIMESTAMPTZ, TIMESTAMPTZ, TEXT) IS 
'Busca mensagens agrupadas por equipe e período.
Parâmetros:
- org_id: UUID da organização
- start_date: Data de início do período
- end_date: Data de fim do período
- group_by: Como agrupar os resultados (hour, day, week, month)
Retorno: Tabela com time_period, team_name e message_count';

-- Finaliza a transação
COMMIT; 