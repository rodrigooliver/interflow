/*
  # Adiciona capacidade de atendimento aos serviços
  
  1. Modificações:
    - Adicionar campo `capacity` à tabela `schedule_services`
      - Define quantos clientes podem ser atendidos simultaneamente no mesmo slot
      - Default é 1 (comportamento tradicional)
    - Adicionar campo `by_arrival_time` à tabela `schedule_services`
      - Indica se o serviço opera por ordem de chegada em faixas de horário
      - Se true, os agendamentos são organizados por faixas de horário, não horários específicos
*/

-- Adicionar campo de capacidade à tabela schedule_services
ALTER TABLE schedule_services 
ADD COLUMN capacity INTEGER NOT NULL DEFAULT 1 CHECK (capacity > 0);

-- Adicionar flag para indicar serviços que operam por ordem de chegada
ALTER TABLE schedule_services
ADD COLUMN by_arrival_time BOOLEAN NOT NULL DEFAULT false;

-- Adicionar campo para identificar faixa de horário em appointments
ALTER TABLE appointments
ADD COLUMN time_slot TEXT;

-- Criar índice para busca por time_slot
CREATE INDEX IF NOT EXISTS appointments_time_slot_idx ON appointments(time_slot);

-- Criar função para atualizar o time_slot automaticamente
CREATE OR REPLACE FUNCTION update_time_slot()
RETURNS TRIGGER AS $$
BEGIN
  -- Verificar se o serviço usa agendamento por faixa de horário
  DECLARE
    uses_arrival_time BOOLEAN;
  BEGIN
    SELECT by_arrival_time INTO uses_arrival_time
    FROM schedule_services
    WHERE id = NEW.service_id;
    
    IF uses_arrival_time THEN
      -- Formatar como faixa de horário (ex: "10:00-11:00")
      NEW.time_slot = NEW.start_time::text || '-' || NEW.end_time::text;
    ELSE
      -- Usar o horário exato de início
      NEW.time_slot = NEW.start_time::text;
    END IF;
    
    RETURN NEW;
  END;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar time_slot em novos agendamentos
CREATE TRIGGER set_time_slot
BEFORE INSERT OR UPDATE ON appointments
FOR EACH ROW
EXECUTE FUNCTION update_time_slot();

-- Atualizar os agendamentos existentes
UPDATE appointments a
SET time_slot = (
  CASE 
    WHEN (
      SELECT by_arrival_time 
      FROM schedule_services 
      WHERE id = a.service_id
    ) THEN 
      start_time::text || '-' || end_time::text
    ELSE 
      start_time::text
  END
)
WHERE service_id IS NOT NULL;

-- Comentário explicativo sobre a mudança
COMMENT ON COLUMN schedule_services.capacity IS 'Número máximo de clientes que podem ser atendidos simultaneamente.';
COMMENT ON COLUMN schedule_services.by_arrival_time IS 'Se true, o serviço opera por ordem de chegada em faixas de horário.';
COMMENT ON COLUMN appointments.time_slot IS 'Faixa de horário do agendamento, usado para agrupar agendamentos por ordem de chegada.'; 