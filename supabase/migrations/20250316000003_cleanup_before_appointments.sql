-- Script para remover estruturas anteriores antes de recriar tabelas de agendamentos

-- Remover triggers
DROP TRIGGER IF EXISTS update_appointment_reminders_updated_at ON appointment_reminders;
DROP TRIGGER IF EXISTS update_appointments_updated_at ON appointments;

-- Remover funções
DROP FUNCTION IF EXISTS update_appointment_reminders_updated_at();
DROP FUNCTION IF EXISTS update_appointments_updated_at();

-- Remover políticas
DROP POLICY IF EXISTS "Organization members can read appointment_reminders" ON appointment_reminders;
DROP POLICY IF EXISTS "Providers can manage their own appointment_reminders" ON appointment_reminders;
DROP POLICY IF EXISTS "Organization admins and owners can manage appointment_reminders" ON appointment_reminders;

DROP POLICY IF EXISTS "Organization members can read appointments" ON appointments;
DROP POLICY IF EXISTS "Providers can manage their own appointments" ON appointments;
DROP POLICY IF EXISTS "Organization admins and owners can manage appointments" ON appointments;

-- Remover índices
DROP INDEX IF EXISTS appointment_reminders_scheduled_for_idx;
DROP INDEX IF EXISTS appointment_reminders_status_idx;
DROP INDEX IF EXISTS appointment_reminders_appointment_id_idx;

DROP INDEX IF EXISTS appointments_status_idx;
DROP INDEX IF EXISTS appointments_date_idx;
DROP INDEX IF EXISTS appointments_customer_id_idx;
DROP INDEX IF EXISTS appointments_service_id_idx;
DROP INDEX IF EXISTS appointments_provider_id_idx;
DROP INDEX IF EXISTS appointments_schedule_id_idx;

-- Remover tabelas (em ordem para respeitar restrições de chave estrangeira)
DROP TABLE IF EXISTS appointment_reminders;
DROP TABLE IF EXISTS appointments; 