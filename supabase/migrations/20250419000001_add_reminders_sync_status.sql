/*
  # Adiciona controle de sincronização de lembretes para agendamentos
  
  Esta migração adiciona um campo de controle para rastrear o status de sincronização
  dos lembretes em cada agendamento, permitindo um processamento mais eficiente.
  
  Adições:
  1. Coluna reminders_synced_at na tabela appointments para rastrear quando os lembretes foram processados pela última vez
  2. Coluna needs_reminders_sync na tabela appointments (boolean) para marcar agendamentos que precisam de sincronização
  3. Trigger para atualizar needs_reminders_sync quando um template ou configuração é modificada
*/

-- 1. Adicionar coluna para status de sincronização em appointments
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS reminders_synced_at timestamptz,
ADD COLUMN IF NOT EXISTS needs_reminders_sync boolean NOT NULL DEFAULT true;

-- 2. Criar índice para otimizar consultas
CREATE INDEX IF NOT EXISTS idx_appointments_needs_reminders_sync 
ON appointments(needs_reminders_sync)
WHERE needs_reminders_sync = true;

-- 3. Criar trigger para atualizar needs_reminders_sync quando templates são modificados
CREATE OR REPLACE FUNCTION mark_appointments_for_reminders_sync()
RETURNS TRIGGER AS $$
BEGIN
  -- Quando um template é criado/atualizado/excluído, marcar agendamentos da agenda correspondente
  UPDATE appointments
  SET needs_reminders_sync = true
  WHERE schedule_id = COALESCE(
    NEW.schedule_id, -- Para inserções/atualizações
    OLD.schedule_id  -- Para exclusões
  );
  
  RETURN NULL; -- Trigger é AFTER, não precisa retornar nada específico
END;
$$ LANGUAGE plpgsql;

-- 4. Anexar o trigger a schedule_notification_templates e schedule_notification_settings
DROP TRIGGER IF EXISTS trigger_mark_appointments_for_sync_templates ON schedule_notification_templates;
CREATE TRIGGER trigger_mark_appointments_for_sync_templates
AFTER INSERT OR UPDATE OR DELETE ON schedule_notification_templates
FOR EACH ROW
EXECUTE FUNCTION mark_appointments_for_reminders_sync();

DROP TRIGGER IF EXISTS trigger_mark_appointments_for_sync_settings ON schedule_notification_settings;
CREATE TRIGGER trigger_mark_appointments_for_sync_settings
AFTER INSERT OR UPDATE OR DELETE ON schedule_notification_settings
FOR EACH ROW
EXECUTE FUNCTION mark_appointments_for_reminders_sync();

-- 5. Inicialmente, marcar todos os agendamentos futuros como precisando sincronização
UPDATE appointments
SET needs_reminders_sync = true
WHERE date >= CURRENT_DATE
AND status IN ('scheduled', 'confirmed'); 