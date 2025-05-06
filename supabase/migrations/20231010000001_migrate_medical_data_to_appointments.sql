/*
  # Migração do Sistema de Prontuários Médicos para a tabela appointments
  
  Este script migra os dados do sistema de prontuários médicos da tabela emr_consultations
  para a tabela appointments existente, adicionando as colunas necessárias.
  
  Modificações:
  1. Adicionar colunas médicas à tabela appointments
  2. Transferir dados existentes (se houver) de emr_consultations para appointments
  3. Atualizar referências em outras tabelas (emr_prescriptions, emr_certificates, emr_attachments)
  4. Adicionar índices para as novas colunas
*/

-- 1. Adicionar colunas médicas à tabela appointments
ALTER TABLE appointments
ADD COLUMN IF NOT EXISTS chat_id uuid REFERENCES chats(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS consultation_type varchar(50),
ADD COLUMN IF NOT EXISTS chief_complaint text,
ADD COLUMN IF NOT EXISTS vital_signs jsonb,
ADD COLUMN IF NOT EXISTS diagnosis text,
ADD COLUMN IF NOT EXISTS medical_notes text, -- Separado de 'notes' que já existe
ADD COLUMN IF NOT EXISTS follow_up_recommendations text,
ADD COLUMN IF NOT EXISTS is_medical_appointment boolean DEFAULT false;
ADD COLUMN IF NOT EXISTS organization_id uuid NULL REFERENCES organizations(id) ON DELETE CASCADE;


-- Adicionar índice para identificar rapidamente consultas médicas
CREATE INDEX IF NOT EXISTS appointments_is_medical_appointment_idx ON appointments(is_medical_appointment)
WHERE is_medical_appointment = true;

-- Criar índice para o chat_id
CREATE INDEX IF NOT EXISTS appointments_chat_id_idx ON appointments(chat_id);


-- 3. Atualizar referências em outras tabelas
-- Prescrições médicas
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'emr_prescriptions') THEN
    -- Adicionar coluna appointment_id
    ALTER TABLE emr_prescriptions
    ADD COLUMN IF NOT EXISTS appointment_id uuid REFERENCES appointments(id) ON DELETE SET NULL;
    
    -- Criar índice
    CREATE INDEX IF NOT EXISTS emr_prescriptions_appointment_id_idx ON emr_prescriptions(appointment_id);
    
    -- Atualizar referências
    UPDATE emr_prescriptions p
    SET appointment_id = e.appointment_id
    FROM emr_consultations e
    WHERE p.consultation_id = e.id AND e.appointment_id IS NOT NULL;
    
  END IF;
END
$$;

-- Atestados médicos
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'emr_certificates') THEN
    -- Adicionar coluna appointment_id
    ALTER TABLE emr_certificates
    ADD COLUMN IF NOT EXISTS appointment_id uuid REFERENCES appointments(id) ON DELETE SET NULL;
    
    -- Criar índice
    CREATE INDEX IF NOT EXISTS emr_certificates_appointment_id_idx ON emr_certificates(appointment_id);
    
    -- Atualizar referências
    UPDATE emr_certificates c
    SET appointment_id = e.appointment_id
    FROM emr_consultations e
    WHERE c.consultation_id = e.id AND e.appointment_id IS NOT NULL;
    
  END IF;
END
$$;

-- Anexos
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'emr_attachments') THEN
    -- Adicionar coluna appointment_id
    ALTER TABLE emr_attachments
    ADD COLUMN IF NOT EXISTS appointment_id uuid REFERENCES appointments(id) ON DELETE SET NULL;
    
    -- Criar índice
    CREATE INDEX IF NOT EXISTS emr_attachments_appointment_id_idx ON emr_attachments(appointment_id);
    
    -- Atualizar referências
    UPDATE emr_attachments a
    SET appointment_id = e.appointment_id
    FROM emr_consultations e
    WHERE a.consultation_id = e.id AND e.appointment_id IS NOT NULL;
    
  END IF;
END
$$;

-- 4. Adicionar funções e gatilhos para campos calculados (se necessário)
-- Por exemplo, calcular automaticamente o IMC baseado em altura e peso nos sinais vitais

-- Não removeremos a tabela emr_consultations imediatamente para garantir segurança dos dados
-- Uma migração futura pode remover a tabela após verificação de que todos os dados foram migrados corretamente 