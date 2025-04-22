/*
  # Adiciona campo time_before_minutes para otimização de notificações
  
  Esta migração adiciona um campo time_before_minutes à tabela schedule_notification_settings
  para armazenar o tempo antes do agendamento em minutos, em vez de usar apenas o formato de string.
  Isso facilita o processamento de notificações pelo sistema de cron jobs.
  
  A migração também modifica a tabela appointment_reminders:
  - Adiciona coluna setting_id para rastrear qual configuração gerou o lembrete
  - Substitui a coluna type por channel_id que faz referência à tabela chat_channels
  
  A migração:
  1. Adiciona a coluna time_before_minutes como INTEGER
  2. Preenche a coluna para dados existentes com base na string time_before
  3. Define a coluna como NOT NULL com valor padrão 0
  4. Adiciona um índice para melhorar a performance das consultas
  5. Atualiza a estrutura da tabela appointment_reminders
*/

-- Adicionar coluna time_before_minutes
ALTER TABLE schedule_notification_settings ADD COLUMN IF NOT EXISTS time_before_minutes INTEGER;

-- Preencher a coluna com base nos dados existentes
UPDATE schedule_notification_settings
SET time_before_minutes = CASE
    WHEN time_before::text LIKE '%minute%' THEN (regexp_replace(time_before::text, '[^0-9]', '', 'g'))::INTEGER
    WHEN time_before::text LIKE '%hour%' THEN (regexp_replace(time_before::text, '[^0-9]', '', 'g'))::INTEGER * 60
    WHEN time_before::text LIKE '%day%' THEN (regexp_replace(time_before::text, '[^0-9]', '', 'g'))::INTEGER * 24 * 60
    WHEN time_before::text LIKE '%week%' THEN (regexp_replace(time_before::text, '[^0-9]', '', 'g'))::INTEGER * 7 * 24 * 60
    ELSE 0
END;

-- Definir valor padrão e NOT NULL para novos registros
ALTER TABLE schedule_notification_settings 
ALTER COLUMN time_before_minutes SET NOT NULL,
ALTER COLUMN time_before_minutes SET DEFAULT 0;

-- Adicionar índice para facilitar buscas
CREATE INDEX IF NOT EXISTS idx_schedule_notification_settings_time_before_minutes 
ON schedule_notification_settings(time_before_minutes);

-- Modificações na tabela appointment_reminders
-- 1. Adicionar coluna setting_id
ALTER TABLE appointment_reminders ADD COLUMN IF NOT EXISTS setting_id uuid REFERENCES schedule_notification_settings(id) ON DELETE SET NULL;

-- 2. Adicionar coluna channel_id como referência para chat_channels
ALTER TABLE appointment_reminders ADD COLUMN IF NOT EXISTS channel_id uuid REFERENCES chat_channels(id) ON DELETE SET NULL;

-- 3. Remover a coluna 'type'
ALTER TABLE appointment_reminders DROP COLUMN IF EXISTS type;

-- 4. Atualizar a constraint de status para usar o novo formato
ALTER TABLE appointment_reminders DROP CONSTRAINT IF EXISTS appointment_reminders_status_check;
ALTER TABLE appointment_reminders ADD CONSTRAINT appointment_reminders_status_check CHECK (status IN ('pending', 'sent', 'failed', 'canceled'));

-- 5. Criar índice para a nova coluna channel_id
CREATE INDEX IF NOT EXISTS idx_appointment_reminders_channel_id 
ON appointment_reminders(channel_id); 