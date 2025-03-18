/*
  # Atualiza função update_time_slot para considerar configuração de faixas de horário
  
  1. Modificações:
    - Atualizar a função `update_time_slot` para considerar o campo `default_slot_duration` da agenda
    - A função irá arredondar o horário de término para o múltiplo mais próximo da duração de slot configurada
    - Isso garante que as faixas de horário estejam alinhadas com a configuração da agenda
*/

-- Atualizar a função para considerar default_slot_duration
CREATE OR REPLACE FUNCTION update_time_slot()
RETURNS TRIGGER AS $$
DECLARE
  uses_arrival_time BOOLEAN;
  slot_duration INTEGER;
  start_minutes INTEGER;
  end_minutes INTEGER;
  adjusted_end_minutes INTEGER;
  adjusted_end_time TIME;
BEGIN
  -- Verificar se o serviço usa agendamento por faixa de horário
  SELECT 
    s.by_arrival_time,
    COALESCE(sch.default_slot_duration, 60) -- Usar 60 minutos como padrão se não configurado
  INTO 
    uses_arrival_time,
    slot_duration
  FROM schedule_services s
  JOIN schedules sch ON sch.id = s.schedule_id
  WHERE s.id = NEW.service_id;
  
  IF uses_arrival_time THEN
    -- Extrair horas e minutos do horário de início e convertê-los para minutos totais
    start_minutes := 
      EXTRACT(HOUR FROM NEW.start_time) * 60 + 
      EXTRACT(MINUTE FROM NEW.start_time);
    
    -- Extrair horas e minutos do horário de término e convertê-los para minutos totais
    end_minutes := 
      EXTRACT(HOUR FROM NEW.end_time) * 60 + 
      EXTRACT(MINUTE FROM NEW.end_time);
    
    -- Arredondar o horário de término para o múltiplo mais próximo da duração do slot
    adjusted_end_minutes := CEIL(end_minutes::float / slot_duration) * slot_duration;
    
    -- Garantir que o slot tenha pelo menos a duração mínima
    IF adjusted_end_minutes <= start_minutes THEN
      adjusted_end_minutes := start_minutes + slot_duration;
    END IF;
    
    -- Converter minutos ajustados de volta para TIME
    adjusted_end_time := 
      MAKE_TIME(
        adjusted_end_minutes / 60, -- Horas
        adjusted_end_minutes % 60, -- Minutos
        0                         -- Segundos
      );
    
    -- Formatar como faixa de horário (ex: "10:00-11:00") com horário de término ajustado
    NEW.time_slot := NEW.start_time::text || '-' || adjusted_end_time::text;
  ELSE
    -- Usar o horário exato de início para agendamentos normais
    NEW.time_slot := NEW.start_time::text;
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Em caso de erro, manter o comportamento original
    IF uses_arrival_time THEN
      NEW.time_slot := NEW.start_time::text || '-' || NEW.end_time::text;
    ELSE
      NEW.time_slot := NEW.start_time::text;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql; 