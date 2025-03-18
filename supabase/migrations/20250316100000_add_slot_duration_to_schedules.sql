/*
  # Adiciona configuração de duração de slots para agendas
  
  1. Modificações:
    - Adicionar campo `default_slot_duration` à tabela `schedules`
      - Define a duração padrão dos slots para serviços com atendimento por ordem de chegada
      - Default é 60 minutos (1 hora)
    - Esta configuração será usada para determinar o tamanho das faixas de horário
      ao criar slots para serviços com atendimento por ordem de chegada
*/

-- Adicionar campo de duração padrão de slot à tabela schedules
ALTER TABLE schedules 
ADD COLUMN default_slot_duration INTEGER NOT NULL DEFAULT 60 CHECK (default_slot_duration > 0);

-- Comentário explicativo sobre o campo
COMMENT ON COLUMN schedules.default_slot_duration IS 'Duração padrão em minutos para faixas de horário de serviços com atendimento por ordem de chegada.'; 