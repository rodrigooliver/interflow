/*
  # Adiciona sistema de notificações personalizadas para agendamentos
  
  1. Novas Tabelas:
    - `schedule_notification_templates` - Templates de notificações por agenda
      - `id` (uuid, primary key)
      - `schedule_id` (uuid, foreign key to schedules)
      - `organization_id` (uuid, foreign key to organizations)
      - `name` (text) - Nome do template
      - `channel_id` (uuid, foreign key to chat_channels, nullable) - Canal de envio (email, whatsapp, etc)
      - `trigger_type` (notification_trigger_type) - Quando a notificação deve ser enviada (before_appointment, on_confirmation, etc)
      - `content` (text) - Conteúdo do template com variáveis
      - `subject` (text) - Assunto (somente para email)
      - `active` (boolean) - Se o template está ativo
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      
    - `schedule_notification_settings` - Configurações de quando enviar as notificações
      - `id` (uuid, primary key)
      - `schedule_id` (uuid, foreign key to schedules)
      - `organization_id` (uuid, foreign key to organizations)
      - `template_id` (uuid, foreign key to schedule_notification_templates)
      - `time_before` (interval) - Tempo antes do agendamento para enviar (para trigger_type='before_appointment')
      - `active` (boolean) - Se a configuração está ativa
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Segurança
    - Habilitar RLS em todas as tabelas
    - Adicionar políticas adequadas
*/

-- Criar enum para tipo de gatilho de notificação
CREATE TYPE notification_trigger_type AS ENUM (
  'before_appointment', 
  'on_confirmation', 
  'on_cancellation', 
  'after_appointment', 
  'on_reschedule', 
  'on_no_show'
);

-- Create schedule_notification_templates table
CREATE TABLE IF NOT EXISTS schedule_notification_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id uuid NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  channel_id uuid REFERENCES chat_channels(id) ON DELETE SET NULL,
  trigger_type notification_trigger_type NOT NULL,
  content text NOT NULL,
  subject text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS schedule_notification_templates_schedule_id_idx 
  ON schedule_notification_templates(schedule_id);
CREATE INDEX IF NOT EXISTS schedule_notification_templates_organization_id_idx 
  ON schedule_notification_templates(organization_id);
CREATE INDEX IF NOT EXISTS schedule_notification_templates_channel_id_idx 
  ON schedule_notification_templates(channel_id);
CREATE INDEX IF NOT EXISTS schedule_notification_templates_trigger_type_idx 
  ON schedule_notification_templates(trigger_type);
CREATE INDEX IF NOT EXISTS schedule_notification_templates_active_idx 
  ON schedule_notification_templates(active);

-- Create schedule_notification_settings table
CREATE TABLE IF NOT EXISTS schedule_notification_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id uuid NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  template_id uuid NOT NULL REFERENCES schedule_notification_templates(id) ON DELETE CASCADE,
  time_before interval,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS schedule_notification_settings_schedule_id_idx 
  ON schedule_notification_settings(schedule_id);
CREATE INDEX IF NOT EXISTS schedule_notification_settings_organization_id_idx 
  ON schedule_notification_settings(organization_id);
CREATE INDEX IF NOT EXISTS schedule_notification_settings_template_id_idx 
  ON schedule_notification_settings(template_id);
CREATE INDEX IF NOT EXISTS schedule_notification_settings_active_idx 
  ON schedule_notification_settings(active);

-- Enable RLS
ALTER TABLE schedule_notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_notification_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for schedule_notification_templates
CREATE POLICY "Organization admins and owners can manage schedule_notification_templates"
  ON schedule_notification_templates
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = schedule_notification_templates.organization_id
      AND om.user_id = auth.uid()
      AND om.role IN ('admin', 'owner')
    )
  );

CREATE POLICY "Organization members can read schedule_notification_templates"
  ON schedule_notification_templates
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = schedule_notification_templates.organization_id
      AND om.user_id = auth.uid()
    )
  );

-- Create policies for schedule_notification_settings
CREATE POLICY "Organization admins and owners can manage schedule_notification_settings"
  ON schedule_notification_settings
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = schedule_notification_settings.organization_id
      AND om.user_id = auth.uid()
      AND om.role IN ('admin', 'owner')
    )
  );

CREATE POLICY "Organization members can read schedule_notification_settings"
  ON schedule_notification_settings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = schedule_notification_settings.organization_id
      AND om.user_id = auth.uid()
    )
  );

-- Create triggers to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_schedule_notification_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_schedule_notification_templates_updated_at
  BEFORE UPDATE ON schedule_notification_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_schedule_notification_templates_updated_at();

CREATE OR REPLACE FUNCTION update_schedule_notification_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_schedule_notification_settings_updated_at
  BEFORE UPDATE ON schedule_notification_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_schedule_notification_settings_updated_at();

-- Adicionar coluna para template personalizado em appointment_reminders
ALTER TABLE appointment_reminders
ADD COLUMN template_id uuid REFERENCES schedule_notification_templates(id) ON DELETE SET NULL; 