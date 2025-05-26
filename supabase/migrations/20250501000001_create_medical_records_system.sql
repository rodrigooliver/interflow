/*
  # Sistema de Prontuários Médicos (Medical Records System)
  
  Este script cria as tabelas necessárias para um sistema completo de 
  prontuários médicos, com possibilidade de integração com agendamento,
  clientes e profissionais de saúde.
  
  Tabelas com prefixo "emr_" (Electronic Medical Records):
  
  1. emr_consultations - Consultas médicas
  2. emr_medical_records - Prontuários médicos 
  3. emr_prescriptions - Prescrições médicas
  4. emr_certificates - Atestados médicos
  5. emr_attachments - Anexos de prontuários
  6. emr_document_templates - Templates para documentos
  7. emr_document_variables - Variáveis para templates de documentos
  
  Todas as tabelas incluem:
  - Vínculo com organization_id
  - RLS policies
  - Criação de índices
  - Soft delete (quando apropriado)
  - Triggers para atualização de timestamp
*/

-- =============================================
-- 1. TABELA DE CONSULTAS (emr_consultations)
-- =============================================
CREATE TABLE IF NOT EXISTS emr_consultations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  appointment_id uuid REFERENCES appointments(id) ON DELETE SET NULL,
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  provider_id uuid NOT NULL REFERENCES profiles(id),
  chat_id uuid REFERENCES chats(id) ON DELETE SET NULL,
  
  consultation_type varchar(50) NOT NULL, -- Tipos: initial, follow_up, emergency, routine, etc.
  status varchar(30) NOT NULL DEFAULT 'scheduled', -- scheduled, in_progress, completed, canceled, no_show
  
  start_time timestamptz,
  end_time timestamptz,
  
  chief_complaint text, -- Queixa principal
  vital_signs jsonb, -- Sinais vitais como temperatura, pressão, etc.
  diagnosis text,
  notes text,
  follow_up_recommendations text,
  
  metadata jsonb,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS emr_consultations_organization_id_idx ON emr_consultations(organization_id);
CREATE INDEX IF NOT EXISTS emr_consultations_customer_id_idx ON emr_consultations(customer_id);
CREATE INDEX IF NOT EXISTS emr_consultations_provider_id_idx ON emr_consultations(provider_id);
CREATE INDEX IF NOT EXISTS emr_consultations_appointment_id_idx ON emr_consultations(appointment_id);
CREATE INDEX IF NOT EXISTS emr_consultations_chat_id_idx ON emr_consultations(chat_id);
CREATE INDEX IF NOT EXISTS emr_consultations_deleted_at_idx ON emr_consultations(deleted_at);

-- ======================================================
-- 2. TABELA DE PRONTUÁRIOS MÉDICOS (emr_medical_records)
-- ======================================================
CREATE TABLE IF NOT EXISTS emr_medical_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  
  record_type varchar(50) NOT NULL, -- Tipos: medical, dental, psychology, nutrition, etc.
  
  -- Informações de saúde
  allergies text[],
  chronic_conditions text[],
  current_medications jsonb,
  family_history text,
  medical_history text,
  
  -- Campos específicos por tipo de prontuário
  specialized_data jsonb,
  
  -- Campos de controle
  is_active boolean NOT NULL DEFAULT true,
  last_updated_by uuid REFERENCES profiles(id),
  metadata jsonb,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS emr_medical_records_organization_id_idx ON emr_medical_records(organization_id);
CREATE INDEX IF NOT EXISTS emr_medical_records_customer_id_idx ON emr_medical_records(customer_id);
CREATE INDEX IF NOT EXISTS emr_medical_records_record_type_idx ON emr_medical_records(record_type);
CREATE INDEX IF NOT EXISTS emr_medical_records_deleted_at_idx ON emr_medical_records(deleted_at);

-- =============================================
-- 3. TABELA DE PRESCRIÇÕES (emr_prescriptions)
-- =============================================
CREATE TABLE IF NOT EXISTS emr_prescriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  consultation_id uuid REFERENCES emr_consultations(id) ON DELETE SET NULL,
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  provider_id uuid NOT NULL REFERENCES profiles(id),
  
  prescription_date date NOT NULL DEFAULT CURRENT_DATE,
  valid_until date,
  
  -- Medicações e tratamentos
  medications jsonb NOT NULL, -- Array com detalhes das medicações: [{name, dosage, frequency, duration, instructions}]
  instructions text,
  notes text,
  
  -- Controle de dispensação
  is_controlled_substance boolean DEFAULT false,
  controlled_substance_type varchar(50),
  
  -- Documento gerado
  document_url text,
  document_generated_at timestamptz,
  
  metadata jsonb,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS emr_prescriptions_organization_id_idx ON emr_prescriptions(organization_id);
CREATE INDEX IF NOT EXISTS emr_prescriptions_customer_id_idx ON emr_prescriptions(customer_id);
CREATE INDEX IF NOT EXISTS emr_prescriptions_provider_id_idx ON emr_prescriptions(provider_id);
CREATE INDEX IF NOT EXISTS emr_prescriptions_consultation_id_idx ON emr_prescriptions(consultation_id);
CREATE INDEX IF NOT EXISTS emr_prescriptions_deleted_at_idx ON emr_prescriptions(deleted_at);

-- =============================================
-- 4. TABELA DE ATESTADOS (emr_certificates)
-- =============================================
CREATE TABLE IF NOT EXISTS emr_certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  consultation_id uuid REFERENCES emr_consultations(id) ON DELETE SET NULL,
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  provider_id uuid NOT NULL REFERENCES profiles(id),
  
  certificate_type varchar(50) NOT NULL, -- Tipos: sick_leave, fitness, medical_condition, etc.
  issue_date date NOT NULL DEFAULT CURRENT_DATE,
  
  start_date date,
  end_date date,
  
  days_of_leave integer,
  reason text,
  recommendations text,
  
  -- Documento gerado
  document_url text,
  document_generated_at timestamptz,
  
  metadata jsonb,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS emr_certificates_organization_id_idx ON emr_certificates(organization_id);
CREATE INDEX IF NOT EXISTS emr_certificates_customer_id_idx ON emr_certificates(customer_id);
CREATE INDEX IF NOT EXISTS emr_certificates_provider_id_idx ON emr_certificates(provider_id);
CREATE INDEX IF NOT EXISTS emr_certificates_consultation_id_idx ON emr_certificates(consultation_id);
CREATE INDEX IF NOT EXISTS emr_certificates_deleted_at_idx ON emr_certificates(deleted_at);

-- =============================================
-- 5. TABELA DE ANEXOS (emr_attachments)
-- =============================================
CREATE TABLE IF NOT EXISTS emr_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  medical_record_id uuid REFERENCES emr_medical_records(id) ON DELETE CASCADE,
  consultation_id uuid REFERENCES emr_consultations(id) ON DELETE SET NULL,
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  file_id uuid REFERENCES files(id) ON DELETE SET NULL,
  
  attachment_type varchar(50) NOT NULL, -- Tipos: lab_result, imaging, report, examination, etc.
  title text NOT NULL,
  description text,
  
  -- Se o arquivo não estiver na tabela files
  file_url text,
  file_name text,
  file_type text,
  file_size bigint,
  
  is_highlighted boolean DEFAULT false,
  
  metadata jsonb,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS emr_attachments_organization_id_idx ON emr_attachments(organization_id);
CREATE INDEX IF NOT EXISTS emr_attachments_customer_id_idx ON emr_attachments(customer_id);
CREATE INDEX IF NOT EXISTS emr_attachments_medical_record_id_idx ON emr_attachments(medical_record_id);
CREATE INDEX IF NOT EXISTS emr_attachments_consultation_id_idx ON emr_attachments(consultation_id);
CREATE INDEX IF NOT EXISTS emr_attachments_file_id_idx ON emr_attachments(file_id);
CREATE INDEX IF NOT EXISTS emr_attachments_deleted_at_idx ON emr_attachments(deleted_at);

-- ========================================================
-- 6. TABELA DE TEMPLATES DE DOCUMENTOS (emr_document_templates)
-- ========================================================
CREATE TABLE IF NOT EXISTS emr_document_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  name text NOT NULL,
  description text,
  
  document_type varchar(50) NOT NULL, -- Tipos: prescription, certificate, letter, report, etc.
  content text NOT NULL, -- Conteúdo do template com placeholders para variáveis (ex: {{customer.name}}, {{provider.name}})
  format varchar(20) NOT NULL DEFAULT 'html', -- Formatos: html, docx, pdf, etc.
  
  is_default boolean DEFAULT false,
  is_active boolean DEFAULT true,
  
  variables_schema jsonb, -- Schema das variáveis suportadas pelo template, para validação e UI
  
  metadata jsonb,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS emr_document_templates_organization_id_idx ON emr_document_templates(organization_id);
CREATE INDEX IF NOT EXISTS emr_document_templates_document_type_idx ON emr_document_templates(document_type);
CREATE INDEX IF NOT EXISTS emr_document_templates_deleted_at_idx ON emr_document_templates(deleted_at);

-- =============================================
-- SEGURANÇA E RLS POLICIES
-- =============================================

-- Habilitar RLS para todas as tabelas
ALTER TABLE emr_consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE emr_medical_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE emr_prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE emr_certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE emr_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE emr_document_templates ENABLE ROW LEVEL SECURITY;

-- Criar políticas para todas as tabelas
DO $$ BEGIN
  -- Políticas para emr_consultations
  CREATE POLICY "Organization members can view consultations"
    ON emr_consultations
    FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM organization_members om
        WHERE om.organization_id = emr_consultations.organization_id
        AND om.user_id = auth.uid()
      )
    );

  CREATE POLICY "Organization members can insert/update consultations"
    ON emr_consultations
    FOR ALL
    USING (
      EXISTS (
        SELECT 1 FROM organization_members om
        WHERE om.organization_id = emr_consultations.organization_id
        AND om.user_id = auth.uid()
      )
    );

  -- Políticas para emr_medical_records
  CREATE POLICY "Organization members can view medical records"
    ON emr_medical_records
    FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM organization_members om
        WHERE om.organization_id = emr_medical_records.organization_id
        AND om.user_id = auth.uid()
      )
    );

  CREATE POLICY "Organization members can insert/update medical records"
    ON emr_medical_records
    FOR ALL
    USING (
      EXISTS (
        SELECT 1 FROM organization_members om
        WHERE om.organization_id = emr_medical_records.organization_id
        AND om.user_id = auth.uid()
      )
    );

  -- Políticas para emr_prescriptions
  CREATE POLICY "Organization members can view prescriptions"
    ON emr_prescriptions
    FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM organization_members om
        WHERE om.organization_id = emr_prescriptions.organization_id
        AND om.user_id = auth.uid()
      )
    );

  CREATE POLICY "Organization members can insert/update prescriptions"
    ON emr_prescriptions
    FOR ALL
    USING (
      EXISTS (
        SELECT 1 FROM organization_members om
        WHERE om.organization_id = emr_prescriptions.organization_id
        AND om.user_id = auth.uid()
      )
    );

  -- Políticas para emr_certificates
  CREATE POLICY "Organization members can view certificates"
    ON emr_certificates
    FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM organization_members om
        WHERE om.organization_id = emr_certificates.organization_id
        AND om.user_id = auth.uid()
      )
    );

  CREATE POLICY "Organization members can insert/update certificates"
    ON emr_certificates
    FOR ALL
    USING (
      EXISTS (
        SELECT 1 FROM organization_members om
        WHERE om.organization_id = emr_certificates.organization_id
        AND om.user_id = auth.uid()
      )
    );
    
  -- Políticas para emr_attachments
  CREATE POLICY "Organization members can view attachments"
    ON emr_attachments
    FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM organization_members om
        WHERE om.organization_id = emr_attachments.organization_id
        AND om.user_id = auth.uid()
      )
    );

  CREATE POLICY "Organization members can insert/update attachments"
    ON emr_attachments
    FOR ALL
    USING (
      EXISTS (
        SELECT 1 FROM organization_members om
        WHERE om.organization_id = emr_attachments.organization_id
        AND om.user_id = auth.uid()
      )
    );

  -- Políticas para emr_document_templates
  CREATE POLICY "Organization members can view document templates"
    ON emr_document_templates
    FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM organization_members om
        WHERE om.organization_id = emr_document_templates.organization_id
        AND om.user_id = auth.uid()
      )
    );

  CREATE POLICY "Organization members can insert/update document templates"
    ON emr_document_templates
    FOR ALL
    USING (
      EXISTS (
        SELECT 1 FROM organization_members om
        WHERE om.organization_id = emr_document_templates.organization_id
        AND om.user_id = auth.uid()
      )
    );
END $$;

-- =============================================
-- TRIGGERS PARA ATUALIZAÇÃO DE TIMESTAMPS
-- =============================================

-- Trigger para emr_consultations
CREATE OR REPLACE FUNCTION update_emr_consultations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_emr_consultations_updated_at
  BEFORE UPDATE ON emr_consultations
  FOR EACH ROW
  EXECUTE FUNCTION update_emr_consultations_updated_at();

-- Trigger para emr_medical_records
CREATE OR REPLACE FUNCTION update_emr_medical_records_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_emr_medical_records_updated_at
  BEFORE UPDATE ON emr_medical_records
  FOR EACH ROW
  EXECUTE FUNCTION update_emr_medical_records_updated_at();

-- Trigger para emr_prescriptions
CREATE OR REPLACE FUNCTION update_emr_prescriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_emr_prescriptions_updated_at
  BEFORE UPDATE ON emr_prescriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_emr_prescriptions_updated_at();

-- Trigger para emr_certificates
CREATE OR REPLACE FUNCTION update_emr_certificates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_emr_certificates_updated_at
  BEFORE UPDATE ON emr_certificates
  FOR EACH ROW
  EXECUTE FUNCTION update_emr_certificates_updated_at();

-- Trigger para emr_attachments
CREATE OR REPLACE FUNCTION update_emr_attachments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_emr_attachments_updated_at
  BEFORE UPDATE ON emr_attachments
  FOR EACH ROW
  EXECUTE FUNCTION update_emr_attachments_updated_at();

-- Trigger para emr_document_templates
CREATE OR REPLACE FUNCTION update_emr_document_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_emr_document_templates_updated_at
  BEFORE UPDATE ON emr_document_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_emr_document_templates_updated_at(); 


  -- Adiciona a coluna blood_pressure à tabela emr_consultations
ALTER TABLE emr_consultations ADD COLUMN IF NOT EXISTS blood_pressure varchar(20);

-- Adiciona um comentário à coluna blood_pressure
COMMENT ON COLUMN emr_consultations.blood_pressure IS 'Pressão arterial do paciente, normalmente registrada no formato sistólica/diastólica, ex: 120/80';

-- Cria um índice para pesquisas por pressão arterial
CREATE INDEX IF NOT EXISTS emr_consultations_blood_pressure_idx ON emr_consultations(blood_pressure); 