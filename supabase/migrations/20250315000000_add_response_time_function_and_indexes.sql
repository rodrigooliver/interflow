/*
 * Adiciona função para calcular o tempo médio de resposta e índices de performance
 * 
 * Esta migração:
 * 1. Cria uma função para calcular o tempo médio entre mensagens de clientes e respostas de agentes
 * 2. Adiciona índices para otimizar a performance das consultas relacionadas
 */

-- Início da transação para garantir que tudo seja aplicado ou nada seja aplicado
BEGIN;

-- Parte 1: Função para calcular o tempo médio de resposta
CREATE OR REPLACE FUNCTION calculate_average_response_time(
  org_id UUID, 
  time_period TEXT DEFAULT 'day',
  specific_date DATE DEFAULT NULL,
  specific_month DATE DEFAULT NULL,
  specific_year DATE DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
  avg_response_time INTEGER;
  start_time TIMESTAMPTZ;
  end_time TIMESTAMPTZ := NOW();
BEGIN
  -- Define o intervalo de tempo com base no período solicitado ou datas específicas
  IF specific_date IS NOT NULL THEN
    -- Dia específico (00:00:00 até 23:59:59)
    start_time := specific_date::TIMESTAMPTZ;
    end_time := (specific_date + INTERVAL '1 day')::TIMESTAMPTZ;
  ELSIF specific_month IS NOT NULL THEN
    -- Mês específico (primeiro dia do mês até o último dia)
    start_time := DATE_TRUNC('month', specific_month)::TIMESTAMPTZ;
    end_time := (DATE_TRUNC('month', specific_month) + INTERVAL '1 month')::TIMESTAMPTZ;
  ELSIF specific_year IS NOT NULL THEN
    -- Ano específico (1º de janeiro até 31 de dezembro)
    start_time := DATE_TRUNC('year', specific_year)::TIMESTAMPTZ;
    end_time := (DATE_TRUNC('year', specific_year) + INTERVAL '1 year')::TIMESTAMPTZ;
  ELSE
    -- Períodos relativos
    CASE time_period
      -- Períodos atuais
      WHEN 'day' THEN
        start_time := end_time - INTERVAL '1 day';
      WHEN 'week' THEN
        start_time := end_time - INTERVAL '7 days';
      WHEN 'month' THEN
        start_time := end_time - INTERVAL '30 days';
      WHEN 'year' THEN
        start_time := end_time - INTERVAL '365 days';
      
      -- Períodos anteriores
      WHEN 'previous_day' THEN
        end_time := NOW() - INTERVAL '1 day';
        start_time := end_time - INTERVAL '1 day';
      WHEN 'previous_week' THEN
        end_time := NOW() - INTERVAL '7 days';
        start_time := end_time - INTERVAL '7 days';
      WHEN 'previous_month' THEN
        end_time := NOW() - INTERVAL '30 days';
        start_time := end_time - INTERVAL '30 days';
      WHEN 'previous_year' THEN
        end_time := NOW() - INTERVAL '365 days';
        start_time := end_time - INTERVAL '365 days';
      
      -- Padrão
      ELSE
        start_time := end_time - INTERVAL '1 day';
    END CASE;
  END IF;

  -- Calcula o tempo médio de resposta em segundos para o intervalo especificado
  WITH message_pairs AS (
    SELECT 
      customer_msg.id AS customer_msg_id,
      customer_msg.chat_id,
      customer_msg.created_at AS customer_msg_time,
      (
        SELECT MIN(agent_msg.created_at)
        FROM messages agent_msg
        WHERE 
          agent_msg.chat_id = customer_msg.chat_id AND
          agent_msg.sender_type = 'agent' AND
          agent_msg.created_at > customer_msg.created_at AND
          -- Garante que não há mensagens de cliente entre a mensagem do cliente e a resposta do agente
          NOT EXISTS (
            SELECT 1 
            FROM messages intermediate_msg
            WHERE 
              intermediate_msg.chat_id = customer_msg.chat_id AND
              intermediate_msg.sender_type = 'customer' AND
              intermediate_msg.created_at > customer_msg.created_at AND
              intermediate_msg.created_at < agent_msg.created_at
          )
      ) AS first_agent_response_time
    FROM messages customer_msg
    WHERE 
      customer_msg.organization_id = org_id AND
      customer_msg.sender_type = 'customer' AND
      customer_msg.created_at >= start_time AND
      customer_msg.created_at < end_time
  )
  SELECT COALESCE(
    EXTRACT(EPOCH FROM AVG(
      first_agent_response_time - customer_msg_time
    ))::INTEGER,
    0
  ) INTO avg_response_time
  FROM message_pairs
  WHERE first_agent_response_time IS NOT NULL;

  RETURN avg_response_time;
END;
$$ LANGUAGE plpgsql;

-- Adiciona permissões para a função
GRANT EXECUTE ON FUNCTION calculate_average_response_time(UUID, TEXT, DATE, DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_average_response_time(UUID, TEXT, DATE, DATE, DATE) TO service_role;

-- Adiciona comentário para documentar a função
COMMENT ON FUNCTION calculate_average_response_time(UUID, TEXT, DATE, DATE, DATE) IS 
'Calcula o tempo médio entre uma mensagem de cliente e a primeira resposta de um agente.
Considera apenas mensagens que receberam resposta e ignora mensagens onde houve outras mensagens de cliente antes da resposta do agente.
Suporta períodos relativos (day, week, month, year, previous_day, previous_week, previous_month, previous_year) e períodos específicos.
Parâmetros:
- org_id: UUID da organização
- time_period: Período de tempo para o cálculo (day, week, month, year, previous_day, previous_week, previous_month, previous_year)
- specific_date: Data específica para análise de um único dia
- specific_month: Data para análise de um mês específico (será considerado apenas o mês/ano)
- specific_year: Data para análise de um ano específico (será considerado apenas o ano)
Retorno: Tempo médio em segundos';

-- Parte 2: Índices para otimizar a performance das consultas

-- Índice composto para consultas que filtram por organização, tipo de remetente e data
CREATE INDEX IF NOT EXISTS idx_messages_org_sender_created 
ON messages(organization_id, sender_type, created_at);

-- Índice para consultas que filtram por chat_id e ordenam por created_at
CREATE INDEX IF NOT EXISTS idx_messages_chat_created 
ON messages(chat_id, created_at);

-- Índice para consultas que filtram por tipo de remetente
CREATE INDEX IF NOT EXISTS idx_messages_sender_type
ON messages(sender_type);

-- Índice para consultas que filtram por chat_id e tipo de remetente
CREATE INDEX IF NOT EXISTS idx_messages_chat_sender
ON messages(chat_id, sender_type, created_at);

-- Comentários para documentar os índices
COMMENT ON INDEX idx_messages_org_sender_created IS 'Otimiza consultas que filtram mensagens por organização, tipo de remetente e data de criação';
COMMENT ON INDEX idx_messages_chat_created IS 'Otimiza consultas que agrupam mensagens por chat e ordenam por data de criação';
COMMENT ON INDEX idx_messages_sender_type IS 'Otimiza consultas que filtram mensagens por tipo de remetente';
COMMENT ON INDEX idx_messages_chat_sender IS 'Otimiza consultas que filtram mensagens por chat e tipo de remetente, ordenadas por data';

-- Finaliza a transação
COMMIT; 