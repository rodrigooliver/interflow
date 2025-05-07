import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { 
  EmrConsultation, 
  EmrConsultationFilters, 
  MedicalAppointment,
  EmrMedicalRecord,
  EmrMedicalRecordFilters,
  EmrDocumentTemplate,
  EmrDocumentTemplateFilters
} from '../types/medicalRecord';
import { useAuthContext } from '../contexts/AuthContext';

// Chaves de cache para as queries
export const MEDICAL_CACHE_KEYS = {
  consultations: 'emr-consultations',
  medicalAppointments: 'medical-appointments',
  medicalRecords: 'emr-medical-records',
  prescriptions: 'emr-prescriptions',
  certificates: 'emr-certificates',
  templates: 'emr-document-templates',
  attachments: 'emr-attachments',
};

// ==========================================
// HOOKS PARA CONSULTAS MÉDICAS COM APPOINTMENTS
// ==========================================

/**
 * Hook para buscar consultas médicas com suporte a filtros usando a tabela appointments
 */
export const useMedicalAppointments = (filters?: EmrConsultationFilters) => {
  const { currentOrganizationMember } = useAuthContext();
  const organizationId = currentOrganizationMember?.organization_id;

  return useQuery({
    queryKey: [MEDICAL_CACHE_KEYS.medicalAppointments, organizationId, filters],
    queryFn: async () => {
      if (!organizationId) return { data: [], count: 0 };

      let query = supabase
        .from('appointments')
        .select('*, customer:customer_id!inner(*), provider:provider_id(*), schedule:schedule_id(*), service:service_id(*)', { count: 'exact' })
        // .eq('is_medical_appointment', true)
        .eq('organization_id', organizationId);

      // Aplicar filtros se fornecidos
      if (filters) {
        if (filters.customer_id) {
          query = query.eq('customer_id', filters.customer_id);
        }
        if (filters.provider_id) {
          query = query.eq('provider_id', filters.provider_id);
        }
        if (filters.consultation_type) {
          query = query.eq('consultation_type', filters.consultation_type);
        }
        if (filters.status) {
          query = query.eq('status', filters.status);
        } else {
            //Mostrar somente diferente de cancelados
          query = query.neq('status', 'canceled');
        }
        if (filters.date_from) {
          query = query.gte('date', filters.date_from);
        }
        if (filters.date_to) {
          query = query.lte('date', filters.date_to);
        }
        if (filters.search_term) {
        //   query = query.or(`customer.name.ilike.%${filters.search_term}%,chief_complaint.ilike.%${filters.search_term}%,diagnosis.ilike.%${filters.search_term}%`);
            query = query
                // .or(`chief_complaint.ilike.%${filters.search_term}%,diagnosis.ilike.%${filters.search_term}%`)
                // .or(`name.ilike.%${filters.search_term}%`, { referencedTable: 'customer' });
                .filter('customer.name', 'ilike', `%${filters.search_term}%`);
            // query = query.or(`chief_complaint.ilike.%${filters.search_term}%,diagnosis.ilike.%${filters.search_term}%`);
        }
      }

      // Ordenar por data e hora, mais recentes primeiro
      query = query.order('date', { ascending: false }).order('start_time', { ascending: false });

      const { data, error, count } = await query;

      if (error) {
        console.error('Erro ao buscar consultas médicas:', error);
        throw error;
      }

      return { data: data as MedicalAppointment[], count: count || 0 };
    },
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos
  });
};

/**
 * Hook para buscar uma consulta médica específica por ID
 */
export const useMedicalAppointment = (appointmentId?: string) => {
  const { currentOrganizationMember } = useAuthContext();
  const organizationId = currentOrganizationMember?.organization_id;

  return useQuery({
    queryKey: [MEDICAL_CACHE_KEYS.medicalAppointments, appointmentId],
    queryFn: async () => {
      if (!organizationId || !appointmentId) return null;

      const { data, error } = await supabase
        .from('appointments')
        .select('*, customer:customer_id(*), provider:provider_id(*), schedule:schedule_id(*), service:service_id(*), chat:chat_id(*)')
        .eq('id', appointmentId)
        .eq('is_medical_appointment', true)
        .eq('organization_id', organizationId)
        .single();

      if (error) {
        console.error('Erro ao buscar consulta médica:', error);
        throw error;
      }

      return data as MedicalAppointment;
    },
    enabled: !!organizationId && !!appointmentId,
  });
};

/**
 * Hook para criar uma nova consulta médica
 */
export const useCreateMedicalAppointment = () => {
  const queryClient = useQueryClient();
  const { currentOrganizationMember } = useAuthContext();
  const organizationId = currentOrganizationMember?.organization_id;

  return useMutation({
    mutationFn: async (appointment: Omit<MedicalAppointment, 'id' | 'created_at' | 'updated_at' | 'organization_id'>) => {
      if (!organizationId) {
        throw new Error('Organização não definida');
      }

      const { data, error } = await supabase
        .from('appointments')
        .insert({
          ...appointment,
          organization_id: organizationId,
          is_medical_appointment: true,
        })
        .select()
        .single();

      if (error) {
        console.error('Erro ao criar consulta médica:', error);
        throw error;
      }

      return data as MedicalAppointment;
    },
    onSuccess: () => {
      // Invalidar queries para recarregar os dados
      queryClient.invalidateQueries({ queryKey: [MEDICAL_CACHE_KEYS.medicalAppointments] });
    },
  });
};

/**
 * Hook para atualizar uma consulta médica existente
 */
export const useUpdateMedicalAppointment = () => {
  const queryClient = useQueryClient();
  const { currentOrganizationMember } = useAuthContext();
  const organizationId = currentOrganizationMember?.organization_id;

  return useMutation({
    mutationFn: async ({ id, ...appointment }: Partial<MedicalAppointment> & { id: string }) => {
      if (!organizationId) {
        throw new Error('Organização não definida');
      }

      const { data, error } = await supabase
        .from('appointments')
        .update(appointment)
        .eq('id', id)
        .eq('is_medical_appointment', true)
        .eq('organization_id', organizationId)
        .select()
        .single();

      if (error) {
        console.error('Erro ao atualizar consulta médica:', error);
        throw error;
      }

      return data as MedicalAppointment;
    },
    onSuccess: (data) => {
      // Invalidar queries específicas
      queryClient.invalidateQueries({ queryKey: [MEDICAL_CACHE_KEYS.medicalAppointments] });
      queryClient.invalidateQueries({ queryKey: [MEDICAL_CACHE_KEYS.medicalAppointments, data.id] });
    },
  });
};

/**
 * Hook para excluir uma consulta médica
 */
export const useDeleteMedicalAppointment = () => {
  const queryClient = useQueryClient();
  const { currentOrganizationMember } = useAuthContext();
  const organizationId = currentOrganizationMember?.organization_id;

  return useMutation({
    mutationFn: async (id: string) => {
      if (!organizationId) {
        throw new Error('Organização não definida');
      }

      // Para consultas médicas, usamos o status 'canceled' em vez de exclusão
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'canceled' })
        .eq('id', id)
        // .eq('is_medical_appointment', true)
        .eq('organization_id', organizationId);

      if (error) {
        console.error('Erro ao cancelar consulta médica:', error);
        throw error;
      }

      return id;
    },
    onSuccess: () => {
      // Invalidar queries para recarregar os dados
      queryClient.invalidateQueries({ queryKey: [MEDICAL_CACHE_KEYS.medicalAppointments] });
    },
  });
};

/**
 * Hook para buscar os tipos de consultas médicas cadastrados
 */
export const useMedicalConsultationTypes = () => {
  const { currentOrganizationMember } = useAuthContext();
  const organizationId = currentOrganizationMember?.organization_id;

  return useQuery({
    queryKey: ['medical-consultation-types', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];

      // Obtém tipos únicos de consultas médicas já cadastradas na tabela appointments
      const { data, error } = await supabase
        .from('appointments')
        .select('consultation_type')
        .eq('organization_id', organizationId)
        .eq('is_medical_appointment', true)
        .not('consultation_type', 'is', null)
        .order('consultation_type');

      if (error) {
        console.error('Erro ao buscar tipos de consultas médicas:', error);
        throw error;
      }

      // Tipos padrão do sistema
      const defaultTypes = ['initial', 'follow_up', 'emergency', 'routine'];
      
      // Combina os tipos padrão com os personalizados
      const customTypes = data
        .filter((item: { consultation_type: string }) => item.consultation_type)
        .map((item: { consultation_type: string }) => item.consultation_type);
      
      const allTypes = [...new Set([...defaultTypes, ...customTypes])];
      
      return allTypes.sort();
    },
    enabled: !!organizationId,
  });
};

// ==========================================
// HOOKS PARA CONSULTAS MÉDICAS (DEPRECIADO)
// ==========================================

/**
 * @deprecated Use useMedicalAppointments em vez deste hook
 * Hook para buscar consultas médicas com suporte a filtros
 */
export const useConsultations = (filters?: EmrConsultationFilters) => {
  const { currentOrganizationMember } = useAuthContext();
  const organizationId = currentOrganizationMember?.organization_id;

  return useQuery({
    queryKey: [MEDICAL_CACHE_KEYS.consultations, organizationId, filters],
    queryFn: async () => {
      if (!organizationId) return { data: [], count: 0 };

      let query = supabase
        .from('emr_consultations')
        .select('*, customer:customer_id(*), provider:provider_id(*)', { count: 'exact' })
        .eq('organization_id', organizationId)
        .is('deleted_at', null);

      // Aplicar filtros se fornecidos
      if (filters) {
        if (filters.customer_id) {
          query = query.eq('customer_id', filters.customer_id);
        }
        if (filters.provider_id) {
          query = query.eq('provider_id', filters.provider_id);
        }
        if (filters.consultation_type) {
          query = query.eq('consultation_type', filters.consultation_type);
        }
        if (filters.status) {
          query = query.eq('status', filters.status);
        }
        if (filters.date_from) {
          query = query.gte('start_time', filters.date_from);
        }
        if (filters.date_to) {
          query = query.lte('start_time', filters.date_to);
        }
        if (filters.search_term) {
          query = query.or(`customer.name.ilike.%${filters.search_term}%,chief_complaint.ilike.%${filters.search_term}%,diagnosis.ilike.%${filters.search_term}%`);
        }
      }

      // Ordenar por data de início, mais recentes primeiro
      query = query.order('start_time', { ascending: false });

      const { data, error, count } = await query;

      if (error) {
        console.error('Erro ao buscar consultas:', error);
        throw error;
      }

      return { data: data as EmrConsultation[], count: count || 0 };
    },
    enabled: !!organizationId,
  });
};

/**
 * Hook para buscar uma consulta específica por ID
 */
export const useConsultation = (consultationId?: string) => {
  const { currentOrganizationMember } = useAuthContext();
  const organizationId = currentOrganizationMember?.organization_id;

  return useQuery({
    queryKey: [MEDICAL_CACHE_KEYS.consultations, consultationId],
    queryFn: async () => {
      if (!organizationId || !consultationId) return null;

      const { data, error } = await supabase
        .from('emr_consultations')
        .select('*, customer:customer_id(*), provider:provider_id(*), chat:chat_id(*)')
        .eq('id', consultationId)
        .eq('organization_id', organizationId)
        .is('deleted_at', null)
        .single();

      if (error) {
        console.error('Erro ao buscar consulta:', error);
        throw error;
      }

      return data as EmrConsultation;
    },
    enabled: !!organizationId && !!consultationId,
  });
};

/**
 * Hook para criar uma nova consulta
 */
export const useCreateConsultation = () => {
  const queryClient = useQueryClient();
  const { currentOrganizationMember } = useAuthContext();
  const organizationId = currentOrganizationMember?.organization_id;

  return useMutation({
    mutationFn: async (consultation: Omit<EmrConsultation, 'id' | 'created_at' | 'updated_at' | 'organization_id'>) => {
      if (!organizationId) {
        throw new Error('Organização não definida');
      }

      const { data, error } = await supabase
        .from('emr_consultations')
        .insert({
          ...consultation,
          organization_id: organizationId,
        })
        .select()
        .single();

      if (error) {
        console.error('Erro ao criar consulta:', error);
        throw error;
      }

      return data as EmrConsultation;
    },
    onSuccess: () => {
      // Invalidar queries para recarregar os dados
      queryClient.invalidateQueries({ queryKey: [MEDICAL_CACHE_KEYS.consultations] });
    },
  });
};

/**
 * Hook para atualizar uma consulta existente
 */
export const useUpdateConsultation = () => {
  const queryClient = useQueryClient();
  const { currentOrganizationMember } = useAuthContext();
  const organizationId = currentOrganizationMember?.organization_id;

  return useMutation({
    mutationFn: async ({ id, ...consultation }: Partial<EmrConsultation> & { id: string }) => {
      if (!organizationId) {
        throw new Error('Organização não definida');
      }

      const { data, error } = await supabase
        .from('emr_consultations')
        .update(consultation)
        .eq('id', id)
        .eq('organization_id', organizationId)
        .select()
        .single();

      if (error) {
        console.error('Erro ao atualizar consulta:', error);
        throw error;
      }

      return data as EmrConsultation;
    },
    onSuccess: (data) => {
      // Invalidar queries específicas
      queryClient.invalidateQueries({ queryKey: [MEDICAL_CACHE_KEYS.consultations] });
      queryClient.invalidateQueries({ queryKey: [MEDICAL_CACHE_KEYS.consultations, data.id] });
    },
  });
};

/**
 * Hook para excluir uma consulta (soft delete)
 */
export const useDeleteConsultation = () => {
  const queryClient = useQueryClient();
  const { currentOrganizationMember } = useAuthContext();
  const organizationId = currentOrganizationMember?.organization_id;

  return useMutation({
    mutationFn: async (id: string) => {
      if (!organizationId) {
        throw new Error('Organização não definida');
      }

      const { error } = await supabase
        .from('emr_consultations')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
        .eq('organization_id', organizationId);

      if (error) {
        console.error('Erro ao excluir consulta:', error);
        throw error;
      }

      return id;
    },
    onSuccess: () => {
      // Invalidar queries para recarregar os dados
      queryClient.invalidateQueries({ queryKey: [MEDICAL_CACHE_KEYS.consultations] });
    },
  });
};

// ==========================================
// HOOKS PARA TIPOS DE CONSULTAS
// ==========================================

/**
 * Hook para buscar os tipos de consultas cadastrados
 */
export const useConsultationTypes = () => {
  const { currentOrganizationMember } = useAuthContext();
  const organizationId = currentOrganizationMember?.organization_id;

  return useQuery({
    queryKey: ['consultation-types', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];

      // Obtém tipos únicos de consultas já cadastradas
      const { data, error } = await supabase
        .from('emr_consultations')
        .select('consultation_type')
        .eq('organization_id', organizationId)
        .is('deleted_at', null)
        .order('consultation_type');

      if (error) {
        console.error('Erro ao buscar tipos de consultas:', error);
        throw error;
      }

      // Tipos padrão do sistema
      const defaultTypes = ['initial', 'follow_up', 'emergency', 'routine'];
      
      // Combina os tipos padrão com os personalizados
      const customTypes = data
        .filter((item: { consultation_type: string }) => item.consultation_type)
        .map((item: { consultation_type: string }) => item.consultation_type);
      
      const allTypes = [...new Set([...defaultTypes, ...customTypes])];
      
      return allTypes.sort();
    },
    enabled: !!organizationId,
  });
};

// ==========================================
// HOOKS PARA PRONTUÁRIOS MÉDICOS
// ==========================================

/**
 * Hook para buscar prontuários médicos com suporte a filtros
 */
export const useMedicalRecords = (filters?: EmrMedicalRecordFilters) => {
  const { currentOrganizationMember } = useAuthContext();
  const organizationId = currentOrganizationMember?.organization_id;

  return useQuery({
    queryKey: [MEDICAL_CACHE_KEYS.medicalRecords, organizationId, filters],
    queryFn: async () => {
      if (!organizationId) return { data: [], count: 0 };

      let query = supabase
        .from('emr_medical_records')
        .select('*, customer:customer_id(*), last_updated_by_profile:last_updated_by(*)', { count: 'exact' })
        .eq('organization_id', organizationId)
        .is('deleted_at', null);
      
      // Adicionar filtros se existirem
      if (filters?.customer_id) {
        query = query.eq('customer_id', filters.customer_id);
      }
      
      if (filters?.record_type) {
        query = query.eq('record_type', filters.record_type);
      }
      
      if (filters?.is_active !== undefined) {
        query = query.eq('is_active', filters.is_active);
      }
      
      if (filters?.search_term) {
        // Busca em campos relacionados usando operador ILIKE
        query = query.or(`customer.name.ilike.%${filters.search_term}%, medical_history.ilike.%${filters.search_term}%`);
      }

      const { data, error, count } = await query;

      if (error) {
        console.error('Erro ao buscar prontuários médicos:', error);
        throw error;
      }

      return { data: data as EmrMedicalRecord[], count: count || 0 };
    },
    enabled: !!organizationId,
  });
};

/**
 * Hook para buscar um prontuário médico específico por ID
 */
export const useMedicalRecord = (medicalRecordId?: string) => {
  const { currentOrganizationMember } = useAuthContext();
  const organizationId = currentOrganizationMember?.organization_id;

  return useQuery({
    queryKey: [MEDICAL_CACHE_KEYS.medicalRecords, medicalRecordId],
    queryFn: async () => {
      if (!organizationId || !medicalRecordId) return null;

      const { data, error } = await supabase
        .from('emr_medical_records')
        .select('*, customer:customer_id(*), last_updated_by_profile:last_updated_by(*)')
        .eq('id', medicalRecordId)
        .eq('organization_id', organizationId)
        .is('deleted_at', null)
        .single();

      if (error) {
        console.error('Erro ao buscar prontuário médico:', error);
        throw error;
      }

      return data as EmrMedicalRecord;
    },
    enabled: !!organizationId && !!medicalRecordId,
  });
};

/**
 * Hook para criar um novo prontuário médico
 */
export const useCreateMedicalRecord = () => {
  const queryClient = useQueryClient();
  const { currentOrganizationMember } = useAuthContext();
  const organizationId = currentOrganizationMember?.organization_id;
  const userId = currentOrganizationMember?.user_id;

  return useMutation({
    mutationFn: async (medicalRecord: Omit<EmrMedicalRecord, 'id' | 'created_at' | 'updated_at' | 'organization_id' | 'last_updated_by'>) => {
      if (!organizationId) {
        throw new Error('Organização não definida');
      }

      // Selecionar apenas os campos que devem ser enviados para a API
      const recordData = {
        customer_id: medicalRecord.customer_id,
        record_type: medicalRecord.record_type,
        allergies: medicalRecord.allergies,
        chronic_conditions: medicalRecord.chronic_conditions,
        current_medications: medicalRecord.current_medications,
        family_history: medicalRecord.family_history,
        medical_history: medicalRecord.medical_history,
        specialized_data: medicalRecord.specialized_data,
        is_active: medicalRecord.is_active,
      };

      const { data, error } = await supabase
        .from('emr_medical_records')
        .insert({
          ...recordData,
          organization_id: organizationId,
          last_updated_by: userId,
        })
        .select()
        .single();

      if (error) {
        console.error('Erro ao criar prontuário médico:', error);
        throw error;
      }

      return data as EmrMedicalRecord;
    },
    onSuccess: () => {
      // Invalidar queries para recarregar os dados
      queryClient.invalidateQueries({ queryKey: [MEDICAL_CACHE_KEYS.medicalRecords] });
    },
  });
};

/**
 * Hook para atualizar um prontuário médico existente
 */
export const useUpdateMedicalRecord = () => {
  const queryClient = useQueryClient();
  const { currentOrganizationMember } = useAuthContext();
  const organizationId = currentOrganizationMember?.organization_id;
  const userId = currentOrganizationMember?.user_id;

  return useMutation({
    mutationFn: async ({ id, ...medicalRecord }: Partial<EmrMedicalRecord> & { id: string }) => {
      if (!organizationId) {
        throw new Error('Organização não definida');
      }

      // Selecionar apenas os campos que devem ser enviados para a API
      const recordData = {
        customer_id: medicalRecord.customer_id,
        record_type: medicalRecord.record_type,
        allergies: medicalRecord.allergies,
        chronic_conditions: medicalRecord.chronic_conditions,
        current_medications: medicalRecord.current_medications,
        family_history: medicalRecord.family_history,
        medical_history: medicalRecord.medical_history,
        specialized_data: medicalRecord.specialized_data,
        is_active: medicalRecord.is_active,
      };

      const { data, error } = await supabase
        .from('emr_medical_records')
        .update({
          ...recordData,
          last_updated_by: userId,
        })
        .eq('id', id)
        .eq('organization_id', organizationId)
        .select()
        .single();

      if (error) {
        console.error('Erro ao atualizar prontuário médico:', error);
        throw error;
      }

      return data as EmrMedicalRecord;
    },
    onSuccess: (data) => {
      // Invalidar queries específicas
      queryClient.invalidateQueries({ queryKey: [MEDICAL_CACHE_KEYS.medicalRecords] });
      queryClient.invalidateQueries({ queryKey: [MEDICAL_CACHE_KEYS.medicalRecords, data.id] });
    },
  });
};

/**
 * Hook para excluir um prontuário médico (soft delete)
 */
export const useDeleteMedicalRecord = () => {
  const queryClient = useQueryClient();
  const { currentOrganizationMember } = useAuthContext();
  const organizationId = currentOrganizationMember?.organization_id;

  return useMutation({
    mutationFn: async (id: string) => {
      if (!organizationId) {
        throw new Error('Organização não definida');
      }

      const { error } = await supabase
        .from('emr_medical_records')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
        .eq('organization_id', organizationId);

      if (error) {
        console.error('Erro ao excluir prontuário médico:', error);
        throw error;
      }

      return id;
    },
    onSuccess: () => {
      // Invalidar queries para recarregar os dados
      queryClient.invalidateQueries({ queryKey: [MEDICAL_CACHE_KEYS.medicalRecords] });
    },
  });
};

/**
 * Hook para buscar tipos de prontuários médicos disponíveis
 */
export const useMedicalRecordTypes = () => {
  return useQuery({
    queryKey: ['medical-record-types'],
    queryFn: async () => {
      // Como os tipos são estáticos, podemos retorná-los diretamente
      // Estes tipos podem vir da API no futuro
      return [
        'medical',
        'dental',
        'psychology',
        'nutrition'
      ];
    },
    staleTime: Infinity, // Não expira já que os dados são estáticos
  });
};

// ==========================================
// HOOKS PARA PRESCRIÇÕES MÉDICAS
// ==========================================

/**
 * Hook para buscar prescrições médicas com suporte a filtros
 */
export const usePrescriptions = (filters?: { 
  customer_id?: string; 
  provider_id?: string; 
  appointment_id?: string;
  search_term?: string;
  date_from?: string;
  date_to?: string;
}) => {
  const { currentOrganizationMember } = useAuthContext();
  const organizationId = currentOrganizationMember?.organization_id;

  return useQuery({
    queryKey: [MEDICAL_CACHE_KEYS.prescriptions, organizationId, filters],
    queryFn: async () => {
      if (!organizationId) return { data: [], count: 0 };

      let query = supabase
        .from('emr_prescriptions')
        .select('*, customer:customer_id(*), provider:provider_id(*), appointment:appointment_id(*)', { count: 'exact' })
        .eq('organization_id', organizationId)
        .is('deleted_at', null);
      
      // Adicionar filtros se existirem
      if (filters?.customer_id) {
        query = query.eq('customer_id', filters.customer_id);
      }
      
      if (filters?.provider_id) {
        query = query.eq('provider_id', filters.provider_id);
      }
      
      if (filters?.appointment_id) {
        query = query.eq('appointment_id', filters.appointment_id);
      }
      
      if (filters?.date_from) {
        query = query.gte('prescription_date', filters.date_from);
      }
      
      if (filters?.date_to) {
        query = query.lte('prescription_date', filters.date_to);
      }
      
      if (filters?.search_term) {
        // Busca em campos relacionados usando operador ILIKE
        query = query.or(`customer.name.ilike.%${filters.search_term}%, instructions.ilike.%${filters.search_term}%`);
      }

      // Ordenar por data, mais recentes primeiro
      query = query.order('prescription_date', { ascending: false });

      const { data, error, count } = await query;

      if (error) {
        console.error('Erro ao buscar prescrições médicas:', error);
        throw error;
      }

      return { data, count: count || 0 };
    },
    enabled: !!organizationId,
  });
};

/**
 * Hook para buscar uma prescrição médica específica por ID
 */
export const usePrescription = (prescriptionId?: string) => {
  const { currentOrganizationMember } = useAuthContext();
  const organizationId = currentOrganizationMember?.organization_id;

  return useQuery({
    queryKey: [MEDICAL_CACHE_KEYS.prescriptions, prescriptionId],
    queryFn: async () => {
      if (!organizationId || !prescriptionId) return null;

      const { data, error } = await supabase
        .from('emr_prescriptions')
        .select('*, customer:customer_id(*), provider:provider_id(*), appointment:appointment_id(*)')
        .eq('id', prescriptionId)
        .eq('organization_id', organizationId)
        .is('deleted_at', null)
        .single();

      if (error) {
        console.error('Erro ao buscar prescrição médica:', error);
        throw error;
      }

      return data;
    },
    enabled: !!organizationId && !!prescriptionId,
  });
};

/**
 * Hook para criar uma nova prescrição médica
 */
export const useCreatePrescription = () => {
  const queryClient = useQueryClient();
  const { currentOrganizationMember } = useAuthContext();
  const organizationId = currentOrganizationMember?.organization_id;

  return useMutation({
    mutationFn: async (prescription: { 
      customer_id: string;
      provider_id: string;
      appointment_id?: string;
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
      }[];
      instructions?: string;
      notes?: string;
      is_controlled_substance: boolean;
      controlled_substance_type?: string;
      document_url?: string;
      document_generated_at?: string;
    }) => {
      if (!organizationId) {
        throw new Error('Organização não definida');
      }

      const { data, error } = await supabase
        .from('emr_prescriptions')
        .insert({
          ...prescription,
          organization_id: organizationId,
        })
        .select()
        .single();

      if (error) {
        console.error('Erro ao criar prescrição médica:', error);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      // Invalidar queries para recarregar os dados
      queryClient.invalidateQueries({ queryKey: [MEDICAL_CACHE_KEYS.prescriptions] });
    },
  });
};

/**
 * Hook para atualizar uma prescrição médica existente
 */
export const useUpdatePrescription = () => {
  const queryClient = useQueryClient();
  const { currentOrganizationMember } = useAuthContext();
  const organizationId = currentOrganizationMember?.organization_id;

  return useMutation({
    mutationFn: async ({ id, ...prescription }: { 
      id: string;
      customer_id?: string;
      provider_id?: string;
      appointment_id?: string;
      prescription_date?: string;
      valid_until?: string;
      medications?: {
        name: string;
        dosage: string;
        frequency: string;
        duration?: string;
        instructions?: string;
        quantity?: number;
        is_controlled?: boolean;
      }[];
      instructions?: string;
      notes?: string;
      is_controlled_substance?: boolean;
      controlled_substance_type?: string;
      document_url?: string;
      document_generated_at?: string;
    }) => {
      if (!organizationId) {
        throw new Error('Organização não definida');
      }

      // Remover campos relacionados para evitar erros na API
      const { ...prescriptionData } = prescription as Record<string, unknown>;

      const { data, error } = await supabase
        .from('emr_prescriptions')
        .update(prescriptionData)
        .eq('id', id)
        .eq('organization_id', organizationId)
        .select()
        .single();

      if (error) {
        console.error('Erro ao atualizar prescrição médica:', error);
        throw error;
      }

      return data;
    },
    onSuccess: (data) => {
      // Invalidar queries específicas
      queryClient.invalidateQueries({ queryKey: [MEDICAL_CACHE_KEYS.prescriptions] });
      queryClient.invalidateQueries({ queryKey: [MEDICAL_CACHE_KEYS.prescriptions, data.id] });
    },
  });
};

/**
 * Hook para excluir uma prescrição médica (soft delete)
 */
export const useDeletePrescription = () => {
  const queryClient = useQueryClient();
  const { currentOrganizationMember } = useAuthContext();
  const organizationId = currentOrganizationMember?.organization_id;

  return useMutation({
    mutationFn: async (id: string) => {
      if (!organizationId) {
        throw new Error('Organização não definida');
      }

      const { error } = await supabase
        .from('emr_prescriptions')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
        .eq('organization_id', organizationId);

      if (error) {
        console.error('Erro ao excluir prescrição médica:', error);
        throw error;
      }

      return id;
    },
    onSuccess: () => {
      // Invalidar queries para recarregar os dados
      queryClient.invalidateQueries({ queryKey: [MEDICAL_CACHE_KEYS.prescriptions] });
    },
  });
};

// ==========================================
// HOOKS PARA ATESTADOS MÉDICOS
// ==========================================

/**
 * Hook para buscar atestados médicos com suporte a filtros
 */
export const useCertificates = (filters?: { 
  customer_id?: string; 
  provider_id?: string; 
  appointment_id?: string;
  certificate_type?: string;
  search_term?: string;
  date_from?: string;
  date_to?: string;
}) => {
  const { currentOrganizationMember } = useAuthContext();
  const organizationId = currentOrganizationMember?.organization_id;

  return useQuery({
    queryKey: [MEDICAL_CACHE_KEYS.certificates, organizationId, filters],
    queryFn: async () => {
      if (!organizationId) return { data: [], count: 0 };

      let query = supabase
        .from('emr_certificates')
        .select('*, customer:customer_id(*), provider:provider_id(*), appointment:appointment_id(*)', { count: 'exact' })
        .eq('organization_id', organizationId)
        .is('deleted_at', null);
      
      // Adicionar filtros se existirem
      if (filters?.customer_id) {
        query = query.eq('customer_id', filters.customer_id);
      }
      
      if (filters?.provider_id) {
        query = query.eq('provider_id', filters.provider_id);
      }
      
      if (filters?.appointment_id) {
        query = query.eq('appointment_id', filters.appointment_id);
      }

      if (filters?.certificate_type) {
        query = query.eq('certificate_type', filters.certificate_type);
      }
      
      if (filters?.date_from) {
        query = query.gte('issue_date', filters.date_from);
      }
      
      if (filters?.date_to) {
        query = query.lte('issue_date', filters.date_to);
      }
      
      if (filters?.search_term) {
        // Busca em campos relacionados usando operador ILIKE
        query = query.or(`customer.name.ilike.%${filters.search_term}%, reason.ilike.%${filters.search_term}%`);
      }

      // Ordenar por data, mais recentes primeiro
      query = query.order('issue_date', { ascending: false });

      const { data, error, count } = await query;

      if (error) {
        console.error('Erro ao buscar atestados médicos:', error);
        throw error;
      }

      return { data, count: count || 0 };
    },
    enabled: !!organizationId,
  });
};

/**
 * Hook para buscar um atestado médico específico por ID
 */
export const useCertificate = (certificateId?: string) => {
  const { currentOrganizationMember } = useAuthContext();
  const organizationId = currentOrganizationMember?.organization_id;

  return useQuery({
    queryKey: [MEDICAL_CACHE_KEYS.certificates, certificateId],
    queryFn: async () => {
      if (!organizationId || !certificateId) return null;

      const { data, error } = await supabase
        .from('emr_certificates')
        .select('*, customer:customer_id(*), provider:provider_id(*), appointment:appointment_id(*)')
        .eq('id', certificateId)
        .eq('organization_id', organizationId)
        .is('deleted_at', null)
        .single();

      if (error) {
        console.error('Erro ao buscar atestado médico:', error);
        throw error;
      }

      return data;
    },
    enabled: !!organizationId && !!certificateId,
  });
};

/**
 * Hook para criar um novo atestado médico
 */
export const useCreateCertificate = () => {
  const queryClient = useQueryClient();
  const { currentOrganizationMember } = useAuthContext();
  const organizationId = currentOrganizationMember?.organization_id;

  return useMutation({
    mutationFn: async (certificate: { 
      customer_id: string;
      provider_id: string;
      appointment_id?: string;
      certificate_type: string;
      issue_date: string;
      start_date?: string;
      end_date?: string;
      days_of_leave?: number;
      reason?: string;
      recommendations?: string;
      document_url?: string;
      document_generated_at?: string;
    }) => {
      if (!organizationId) {
        throw new Error('Organização não definida');
      }

      const { data, error } = await supabase
        .from('emr_certificates')
        .insert({
          ...certificate,
          organization_id: organizationId,
        })
        .select()
        .single();

      if (error) {
        console.error('Erro ao criar atestado médico:', error);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      // Invalidar queries para recarregar os dados
      queryClient.invalidateQueries({ queryKey: [MEDICAL_CACHE_KEYS.certificates] });
    },
  });
};

/**
 * Hook para atualizar um atestado médico existente
 */
export const useUpdateCertificate = () => {
  const queryClient = useQueryClient();
  const { currentOrganizationMember } = useAuthContext();
  const organizationId = currentOrganizationMember?.organization_id;

  return useMutation({
    mutationFn: async ({ id, ...certificate }: { 
      id: string;
      customer_id?: string;
      provider_id?: string;
      appointment_id?: string;
      certificate_type?: string;
      issue_date?: string;
      start_date?: string;
      end_date?: string;
      days_of_leave?: number;
      reason?: string;
      recommendations?: string;
      document_url?: string;
      document_generated_at?: string;
    }) => {
      if (!organizationId) {
        throw new Error('Organização não definida');
      }

      // Remover campos relacionados para evitar erros na API
      const { ...certificateData } = certificate as Record<string, unknown>;

      const { data, error } = await supabase
        .from('emr_certificates')
        .update(certificateData)
        .eq('id', id)
        .eq('organization_id', organizationId)
        .select()
        .single();

      if (error) {
        console.error('Erro ao atualizar atestado médico:', error);
        throw error;
      }

      return data;
    },
    onSuccess: (data) => {
      // Invalidar queries específicas
      queryClient.invalidateQueries({ queryKey: [MEDICAL_CACHE_KEYS.certificates] });
      queryClient.invalidateQueries({ queryKey: [MEDICAL_CACHE_KEYS.certificates, data.id] });
    },
  });
};

/**
 * Hook para excluir um atestado médico (soft delete)
 */
export const useDeleteCertificate = () => {
  const queryClient = useQueryClient();
  const { currentOrganizationMember } = useAuthContext();
  const organizationId = currentOrganizationMember?.organization_id;

  return useMutation({
    mutationFn: async (id: string) => {
      if (!organizationId) {
        throw new Error('Organização não definida');
      }

      const { error } = await supabase
        .from('emr_certificates')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
        .eq('organization_id', organizationId);

      if (error) {
        console.error('Erro ao excluir atestado médico:', error);
        throw error;
      }

      return id;
    },
    onSuccess: () => {
      // Invalidar queries para recarregar os dados
      queryClient.invalidateQueries({ queryKey: [MEDICAL_CACHE_KEYS.certificates] });
    },
  });
};

/**
 * Hook para buscar os tipos de atestados médicos cadastrados
 */
export const useCertificateTypes = () => {
  const { currentOrganizationMember } = useAuthContext();
  const organizationId = currentOrganizationMember?.organization_id;

  return useQuery({
    queryKey: ['certificate-types', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];

      // Tipos padrão de atestados médicos
      const defaultTypes = [
        'sick_leave',     // Atestado de afastamento por doença
        'fitness',        // Atestado de aptidão física
        'medical_condition', // Atestado de condição médica
        'return_to_work', // Atestado de retorno ao trabalho
        'maternity_leave', // Licença maternidade
        'paternity_leave', // Licença paternidade
        'school_absence', // Atestado para ausência escolar
        'medical_procedure', // Procedimento médico
        'medical_examination', // Exame médico
        'sports_clearance', // Liberação para esportes
        'other'           // Outros
      ];

      // Buscar tipos já usados no sistema (se houver)
      const { data, error } = await supabase
        .from('emr_certificates')
        .select('certificate_type')
        .eq('organization_id', organizationId)
        .is('deleted_at', null);

      if (error) {
        console.error('Erro ao buscar tipos de atestados:', error);
        throw error;
      }

      // Combinar tipos padrão com tipos usados no sistema
      const usedTypes = data?.map(item => item.certificate_type) || [];
      const allTypes = [...new Set([...defaultTypes, ...usedTypes])];
      
      return allTypes.sort();
    },
    enabled: !!organizationId,
    staleTime: 10 * 60 * 1000, // 10 minutos
  });
};

// ==========================================
// HOOKS PARA TEMPLATES DE DOCUMENTOS
// ==========================================

/**
 * Hook para buscar templates de documentos com suporte a filtros
 */
export const useDocumentTemplates = (filters?: EmrDocumentTemplateFilters) => {
  const { currentOrganizationMember } = useAuthContext();
  const organizationId = currentOrganizationMember?.organization_id;

  return useQuery({
    queryKey: [MEDICAL_CACHE_KEYS.templates, organizationId, filters],
    queryFn: async () => {
      if (!organizationId) return { data: [], count: 0 };

      let query = supabase
        .from('emr_document_templates')
        .select('*', { count: 'exact' })
        .eq('organization_id', organizationId)
        .is('deleted_at', null);
      
      // Adicionar filtros se existirem
      if (filters?.document_type) {
        query = query.eq('document_type', filters.document_type);
      }
      
      if (filters?.is_active !== undefined) {
        query = query.eq('is_active', filters.is_active);
      }
      
      if (filters?.search_term) {
        query = query.or(`name.ilike.%${filters.search_term}%,description.ilike.%${filters.search_term}%`);
      }

      const { data, error, count } = await query;

      if (error) {
        console.error('Erro ao buscar templates de documentos:', error);
        throw error;
      }

      return { data: data as EmrDocumentTemplate[], count: count || 0 };
    },
    enabled: !!organizationId,
  });
};

/**
 * Hook para buscar um template de documento específico por ID
 */
export const useDocumentTemplate = (templateId?: string) => {
  const { currentOrganizationMember } = useAuthContext();
  const organizationId = currentOrganizationMember?.organization_id;

  return useQuery({
    queryKey: [MEDICAL_CACHE_KEYS.templates, templateId],
    queryFn: async () => {
      if (!organizationId || !templateId) return null;

      const { data, error } = await supabase
        .from('emr_document_templates')
        .select('*')
        .eq('id', templateId)
        .eq('organization_id', organizationId)
        .is('deleted_at', null)
        .single();

      if (error) {
        console.error('Erro ao buscar template de documento:', error);
        throw error;
      }

      return data as EmrDocumentTemplate;
    },
    enabled: !!organizationId && !!templateId,
  });
};

/**
 * Hook para criar um novo template de documento
 */
export const useCreateDocumentTemplate = () => {
  const queryClient = useQueryClient();
  const { currentOrganizationMember } = useAuthContext();
  const organizationId = currentOrganizationMember?.organization_id;

  return useMutation({
    mutationFn: async (template: Omit<EmrDocumentTemplate, 'id' | 'created_at' | 'updated_at' | 'organization_id'>) => {
      if (!organizationId) {
        throw new Error('Organização não definida');
      }

      const { data, error } = await supabase
        .from('emr_document_templates')
        .insert({
          ...template,
          organization_id: organizationId,
        })
        .select()
        .single();

      if (error) {
        console.error('Erro ao criar template de documento:', error);
        throw error;
      }

      return data as EmrDocumentTemplate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [MEDICAL_CACHE_KEYS.templates] });
    },
  });
};

/**
 * Hook para atualizar um template de documento existente
 */
export const useUpdateDocumentTemplate = () => {
  const queryClient = useQueryClient();
  const { currentOrganizationMember } = useAuthContext();
  const organizationId = currentOrganizationMember?.organization_id;

  return useMutation({
    mutationFn: async ({ id, ...template }: Partial<EmrDocumentTemplate> & { id: string }) => {
      if (!organizationId) {
        throw new Error('Organização não definida');
      }

      const { data, error } = await supabase
        .from('emr_document_templates')
        .update(template)
        .eq('id', id)
        .eq('organization_id', organizationId)
        .select()
        .single();

      if (error) {
        console.error('Erro ao atualizar template de documento:', error);
        throw error;
      }

      return data as EmrDocumentTemplate;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [MEDICAL_CACHE_KEYS.templates] });
      queryClient.invalidateQueries({ queryKey: [MEDICAL_CACHE_KEYS.templates, data.id] });
    },
  });
};

/**
 * Hook para excluir um template de documento (soft delete)
 */
export const useDeleteDocumentTemplate = () => {
  const queryClient = useQueryClient();
  const { currentOrganizationMember } = useAuthContext();
  const organizationId = currentOrganizationMember?.organization_id;

  return useMutation({
    mutationFn: async (id: string) => {
      if (!organizationId) {
        throw new Error('Organização não definida');
      }

      const { error } = await supabase
        .from('emr_document_templates')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
        .eq('organization_id', organizationId);

      if (error) {
        console.error('Erro ao excluir template de documento:', error);
        throw error;
      }

      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [MEDICAL_CACHE_KEYS.templates] });
    },
  });
};

/**
 * Hook para buscar tipos de documentos disponíveis
 */
export const useDocumentTypes = () => {
  return useQuery({
    queryKey: ['document-types'],
    queryFn: async () => {
      return [
        'prescription',
        'certificate',
        'letter',
        'report'
      ];
    },
    staleTime: Infinity, // Não expira já que os dados são estáticos
  });
};

// ==========================================
// HOOKS PARA ANEXOS MÉDICOS
// ==========================================

/**
 * Hook para buscar anexos médicos com suporte a filtros
 */
export const useAttachments = (filters?: { 
  customer_id?: string; 
  medical_record_id?: string; 
  appointment_id?: string;
  consultation_id?: string;
  attachment_type?: string;
  is_highlighted?: boolean;
  search_term?: string;
}) => {
  const { currentOrganizationMember } = useAuthContext();
  const organizationId = currentOrganizationMember?.organization_id;

  return useQuery({
    queryKey: [MEDICAL_CACHE_KEYS.attachments, organizationId, filters],
    queryFn: async () => {
      if (!organizationId) return { data: [], count: 0 };

      let query = supabase
        .from('emr_attachments')
        .select('*, customer:customer_id(*), medical_record:medical_record_id(*), appointment:appointment_id(*)', { count: 'exact' })
        .eq('organization_id', organizationId)
        .is('deleted_at', null);
      
      // Adicionar filtros se existirem
      if (filters?.customer_id) {
        query = query.eq('customer_id', filters.customer_id);
      }
      
      if (filters?.medical_record_id) {
        query = query.eq('medical_record_id', filters.medical_record_id);
      }
      
      if (filters?.appointment_id) {
        query = query.eq('appointment_id', filters.appointment_id);
      }
      
      if (filters?.consultation_id) {
        query = query.eq('consultation_id', filters.consultation_id);
      }
      
      if (filters?.attachment_type) {
        query = query.eq('attachment_type', filters.attachment_type);
      }
      
      if (filters?.is_highlighted !== undefined) {
        query = query.eq('is_highlighted', filters.is_highlighted);
      }
      
      if (filters?.search_term) {
        query = query.or(`title.ilike.%${filters.search_term}%, description.ilike.%${filters.search_term}%, file_name.ilike.%${filters.search_term}%`);
      }

      // Ordenar por data de criação, mais recentes primeiro
      query = query.order('created_at', { ascending: false });

      const { data, error, count } = await query;

      if (error) {
        console.error('Erro ao buscar anexos médicos:', error);
        throw error;
      }

      return { data, count: count || 0 };
    },
    enabled: !!organizationId,
  });
};

/**
 * Hook para buscar um anexo médico específico por ID
 */
export const useAttachment = (attachmentId?: string) => {
  const { currentOrganizationMember } = useAuthContext();
  const organizationId = currentOrganizationMember?.organization_id;

  return useQuery({
    queryKey: [MEDICAL_CACHE_KEYS.attachments, attachmentId],
    queryFn: async () => {
      if (!organizationId || !attachmentId) return null;

      const { data, error } = await supabase
        .from('emr_attachments')
        .select('*, customer:customer_id(*), medical_record:medical_record_id(*), appointment:appointment_id(*)')
        .eq('id', attachmentId)
        .eq('organization_id', organizationId)
        .is('deleted_at', null)
        .single();

      if (error) {
        console.error('Erro ao buscar anexo médico:', error);
        throw error;
      }

      return data;
    },
    enabled: !!organizationId && !!attachmentId,
  });
};

/**
 * Hook para criar um novo anexo médico
 */
export const useCreateAttachment = () => {
  const queryClient = useQueryClient();
  const { currentOrganizationMember } = useAuthContext();
  const organizationId = currentOrganizationMember?.organization_id;

  return useMutation({
    mutationFn: async (attachment: { 
      customer_id: string;
      medical_record_id?: string;
      appointment_id?: string;
      consultation_id?: string;
      file_id?: string;
      attachment_type: string;
      title: string;
      description?: string;
      file_url?: string;
      file_name?: string;
      file_type?: string;
      file_size?: number;
      is_highlighted?: boolean;
      metadata?: Record<string, unknown>;
    }) => {
      if (!organizationId) {
        throw new Error('Organização não definida');
      }

      const { data, error } = await supabase
        .from('emr_attachments')
        .insert({
          ...attachment,
          organization_id: organizationId,
        })
        .select()
        .single();

      if (error) {
        console.error('Erro ao criar anexo médico:', error);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      // Invalidar queries para recarregar os dados
      queryClient.invalidateQueries({ queryKey: [MEDICAL_CACHE_KEYS.attachments] });
    },
  });
};

/**
 * Hook para atualizar um anexo médico existente
 */
export const useUpdateAttachment = () => {
  const queryClient = useQueryClient();
  const { currentOrganizationMember } = useAuthContext();
  const organizationId = currentOrganizationMember?.organization_id;

  return useMutation({
    mutationFn: async ({ id, ...attachment }: { 
      id: string;
      customer_id?: string;
      medical_record_id?: string;
      appointment_id?: string;
      consultation_id?: string;
      file_id?: string;
      attachment_type?: string;
      title?: string;
      description?: string;
      file_url?: string;
      file_name?: string;
      file_type?: string;
      file_size?: number;
      is_highlighted?: boolean;
      metadata?: Record<string, unknown>;
    }) => {
      if (!organizationId) {
        throw new Error('Organização não definida');
      }

      // Remover campos relacionados para evitar erros na API
      const { ...attachmentData } = attachment as Record<string, unknown>;

      const { data, error } = await supabase
        .from('emr_attachments')
        .update(attachmentData)
        .eq('id', id)
        .eq('organization_id', organizationId)
        .select()
        .single();

      if (error) {
        console.error('Erro ao atualizar anexo médico:', error);
        throw error;
      }

      return data;
    },
    onSuccess: (data) => {
      // Invalidar queries específicas
      queryClient.invalidateQueries({ queryKey: [MEDICAL_CACHE_KEYS.attachments] });
      queryClient.invalidateQueries({ queryKey: [MEDICAL_CACHE_KEYS.attachments, data.id] });
    },
  });
};

/**
 * Hook para excluir um anexo médico (soft delete)
 */
export const useDeleteAttachment = () => {
  const queryClient = useQueryClient();
  const { currentOrganizationMember } = useAuthContext();
  const organizationId = currentOrganizationMember?.organization_id;

  return useMutation({
    mutationFn: async (id: string) => {
      if (!organizationId) {
        throw new Error('Organização não definida');
      }

      const { error } = await supabase
        .from('emr_attachments')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
        .eq('organization_id', organizationId);

      if (error) {
        console.error('Erro ao excluir anexo médico:', error);
        throw error;
      }

      return id;
    },
    onSuccess: () => {
      // Invalidar queries para recarregar os dados
      queryClient.invalidateQueries({ queryKey: [MEDICAL_CACHE_KEYS.attachments] });
    },
  });
};

/**
 * Hook para buscar tipos de anexos médicos disponíveis
 */
export const useAttachmentTypes = () => {
  return useQuery({
    queryKey: ['attachment-types'],
    queryFn: async () => {
      return [
        'lab_result',   // Resultado de exame laboratorial
        'imaging',      // Imagem (raio-x, tomografia, etc)
        'report',       // Relatório médico
        'examination',  // Exame geral
        'prescription', // Prescrição médica
        'certificate',  // Atestado
        'other'         // Outros
      ];
    },
    staleTime: Infinity, // Não expira já que os dados são estáticos
  });
};

// Outros hooks para os demais recursos seriam implementados de forma similar 