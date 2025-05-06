/**
 * MEDICAL RECORDS SYSTEM TYPES
 * Este arquivo contém as interfaces TypeScript para o sistema de prontuários médicos.
 */

import { Chat, Customer, Profile, File, Appointment, Schedule, ScheduleService } from './database';

// ==========================================
// INTERFACES DO SISTEMA DE PRONTUÁRIOS
// ==========================================

/**
 * @deprecated Use MedicalAppointment em vez desta interface.
 * Representa uma consulta médica ou atendimento (modelo antigo)
 * Os novos registros devem usar a tabela appointments com is_medical_appointment = true
 */
export interface EmrConsultation {
  id: string;
  organization_id: string;
  appointment_id?: string;
  customer_id: string;
  provider_id: string;
  chat_id?: string;
  
  consultation_type: 'initial' | 'follow_up' | 'emergency' | 'routine' | string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'canceled' | 'no_show';
  
  start_time?: string;
  end_time?: string;
  
  chief_complaint?: string;
  vital_signs?: {
    temperature?: number;
    heart_rate?: number;
    blood_pressure?: string;
    respiratory_rate?: number;
    oxygen_saturation?: number;
    height?: number;
    weight?: number;
    bmi?: number;
    [key: string]: unknown;
  };
  diagnosis?: string;
  notes?: string;
  follow_up_recommendations?: string;
  
  metadata?: Record<string, unknown>;
  deleted_at?: string;
  created_at: string;
  updated_at: string;
  
  // Campos virtuais para UI
  customer?: Customer;
  provider?: Profile;
  chat?: Chat;
}

/**
 * Representa uma consulta médica usando a tabela appointments
 * Estende a interface Appointment adicionando tipagem específica para campos médicos
 */
export interface MedicalAppointment extends Appointment {
  // Garantir que é uma consulta médica
  is_medical_appointment: true;
  
  // Campos médicos específicos (com tipagem mais estrita)
  consultation_type: 'initial' | 'follow_up' | 'emergency' | 'routine' | string;
  chief_complaint?: string;
  vital_signs?: {
    temperature?: number;
    heart_rate?: number;
    blood_pressure?: string;
    respiratory_rate?: number;
    oxygen_saturation?: number;
    height?: number;
    weight?: number;
    bmi?: number;
    [key: string]: unknown;
  };
  diagnosis?: string;
  medical_notes?: string;
  follow_up_recommendations?: string;
  
  // Sobrescrevendo campos da interface base para permitir objetos de resposta
  schedule?: { id: string; title: string; } | Schedule;
  service?: { id: string; title: string; } | ScheduleService;
}

/**
 * Representa um prontuário médico completo de um paciente
 * Contém histórico médico, alergias, condições crônicas, etc.
 */
export interface EmrMedicalRecord {
  id: string;
  organization_id: string;
  customer_id: string;
  
  record_type: 'medical' | 'dental' | 'psychology' | 'nutrition' | string;
  
  allergies?: string[];
  chronic_conditions?: string[];
  current_medications?: {
    name: string;
    dosage: string;
    frequency: string;
    started_at?: string;
    [key: string]: unknown;
  }[];
  family_history?: string;
  medical_history?: string;
  
  specialized_data?: Record<string, unknown>;
  
  is_active: boolean;
  last_updated_by?: string;
  
  metadata?: Record<string, unknown>;
  deleted_at?: string;
  created_at: string;
  updated_at: string;
  
  // Campos virtuais para UI
  customer?: Customer;
  last_updated_by_profile?: Profile;
}

/**
 * Representa uma prescrição médica
 * Pode ser medicamentos, tratamentos, exames, etc.
 */
export interface EmrPrescription {
  id: string;
  organization_id: string;
  /** @deprecated Use appointment_id em vez deste campo */
  consultation_id?: string;
  /** ID do agendamento (appointments) relacionado a esta prescrição */
  appointment_id?: string;
  customer_id: string;
  provider_id: string;
  
  prescription_date: string;
  valid_until?: string;
  
  medications: {
    name: string;
    dosage: string;
    frequency: string;
    duration?: string;
    instructions?: string;
    quantity?: number;
    is_controlled?: boolean;
    [key: string]: unknown;
  }[];
  
  instructions?: string;
  notes?: string;
  
  is_controlled_substance: boolean;
  controlled_substance_type?: string;
  
  document_url?: string;
  document_generated_at?: string;
  
  metadata?: Record<string, unknown>;
  deleted_at?: string;
  created_at: string;
  updated_at: string;
  
  // Campos virtuais para UI
  customer?: Customer;
  provider?: Profile;
  /** @deprecated Use appointment em vez deste campo */
  consultation?: EmrConsultation;
  /** Agendamento associado a esta prescrição */
  appointment?: MedicalAppointment;
}

/**
 * Representa um atestado médico
 * Pode ser para afastamento, aptidão, etc.
 */
export interface EmrCertificate {
  id: string;
  organization_id: string;
  /** @deprecated Use appointment_id em vez deste campo */
  consultation_id?: string;
  /** ID do agendamento (appointments) relacionado a este atestado */
  appointment_id?: string;
  customer_id: string;
  provider_id: string;
  
  certificate_type: 'sick_leave' | 'fitness' | 'medical_condition' | string;
  issue_date: string;
  
  start_date?: string;
  end_date?: string;
  
  days_of_leave?: number;
  reason?: string;
  recommendations?: string;
  
  document_url?: string;
  document_generated_at?: string;
  
  metadata?: Record<string, unknown>;
  deleted_at?: string;
  created_at: string;
  updated_at: string;
  
  // Campos virtuais para UI
  customer?: Customer;
  provider?: Profile;
  /** @deprecated Use appointment em vez deste campo */
  consultation?: EmrConsultation;
  /** Agendamento associado a este atestado */
  appointment?: MedicalAppointment;
}

/**
 * Representa um anexo do prontuário
 * Pode ser exame, imagem, relatório, etc.
 */
export interface EmrAttachment {
  id: string;
  organization_id: string;
  medical_record_id?: string;
  /** @deprecated Use appointment_id em vez deste campo */
  consultation_id?: string;
  /** ID do agendamento (appointments) relacionado a este anexo */
  appointment_id?: string;
  customer_id: string;
  file_id?: string;
  
  attachment_type: 'lab_result' | 'imaging' | 'report' | 'examination' | string;
  title: string;
  description?: string;
  
  file_url?: string;
  file_name?: string;
  file_type?: string;
  file_size?: number;
  
  is_highlighted: boolean;
  
  metadata?: Record<string, unknown>;
  deleted_at?: string;
  created_at: string;
  updated_at: string;
  
  // Campos virtuais para UI
  customer?: Customer;
  medical_record?: EmrMedicalRecord;
  /** @deprecated Use appointment em vez deste campo */
  consultation?: EmrConsultation;
  /** Agendamento associado a este anexo */
  appointment?: MedicalAppointment;
  file?: File;
}

/**
 * Representa um template de documento
 * Usado para gerar prescrições, atestados, etc.
 */
export interface EmrDocumentTemplate {
  id: string;
  name: string;
  description: string;
  content: string;
  format: string;
  document_type: string;
  is_default: boolean;
  is_active: boolean;
  variables_schema: {
    properties: Record<string, unknown>;
  };
  organization_id?: string;
  created_at?: string;
  updated_at?: string;
}

// ==========================================
// TIPOS PARA FUNÇÕES E REQUISIÇÕES
// ==========================================

/**
 * Filtros para busca de consultas
 */
export interface EmrConsultationFilters {
  customer_id?: string;
  provider_id?: string;
  consultation_type?: string;
  status?: string;
  date_from?: string;
  date_to?: string;
  search_term?: string;
}

/**
 * Filtros para busca de prontuários
 */
export interface EmrMedicalRecordFilters {
  customer_id?: string;
  record_type?: string;
  is_active?: boolean;
  search_term?: string;
}

/**
 * Filtros para busca de prescrições
 */
export interface EmrPrescriptionFilters {
  customer_id?: string;
  provider_id?: string;
  consultation_id?: string;
  date_from?: string;
  date_to?: string;
  is_controlled_substance?: boolean;
  search_term?: string;
}

/**
 * Filtros para busca de atestados
 */
export interface EmrCertificateFilters {
  customer_id?: string;
  provider_id?: string;
  consultation_id?: string;
  certificate_type?: string;
  date_from?: string;
  date_to?: string;
  search_term?: string;
}

/**
 * Filtros para busca de anexos
 */
export interface EmrAttachmentFilters {
  customer_id?: string;
  medical_record_id?: string;
  consultation_id?: string;
  attachment_type?: string;
  search_term?: string;
}

/**
 * Filtros para busca de templates de documentos
 */
export interface EmrDocumentTemplateFilters {
  document_type?: string;
  is_active?: boolean;
  search_term?: string;
}

/**
 * Dados para geração de documentos
 */
export interface EmrDocumentGenerationData {
  template_id: string;
  custom_variables?: Record<string, unknown>;
  customer_id: string;
  provider_id: string;
  consultation_id?: string;
  format?: 'pdf' | 'docx' | 'html';
  save_to_database?: boolean;
  document_type?: 'prescription' | 'certificate' | 'letter' | 'report' | string;
} 