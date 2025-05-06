import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { MedicalAppointment } from '../../types/medicalRecord';
import { useCreateMedicalAppointment, useUpdateMedicalAppointment, useMedicalConsultationTypes } from '../../hooks/useMedicalHooks';
import { format } from 'date-fns';
import CustomerSelectModal from '../customers/CustomerSelectModal';
import { User } from 'lucide-react';
import { useAgents, useSchedules, useScheduleServices } from '../../hooks/useQueryes';
import { useAuthContext } from '../../contexts/AuthContext';
import { Customer } from '../../types/database';

// Interface para cliente com informações adicionais
interface CustomerWithDetails {
  id: string;
  name: string;
  avatar_url?: string;
  email?: string;
  phone?: string;
  organization_id: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  [key: string]: unknown; // Para outros campos que possam existir
}

interface MedicalConsultationFormProps {
  consultation: MedicalAppointment | null;
  onClose: () => void;
  customer: Customer | null;
}

const MedicalConsultationForm: React.FC<MedicalConsultationFormProps> = ({ consultation, onClose, customer }) => {
  const { currentOrganizationMember } = useAuthContext();
  const organizationId = currentOrganizationMember?.organization_id;
  const { t } = useTranslation(['common', 'medical', 'customers', 'schedules']);
  const { data: consultationTypes } = useMedicalConsultationTypes();
  const createMedicalAppointment = useCreateMedicalAppointment();
  const updateMedicalAppointment = useUpdateMedicalAppointment();
  const { data: agents } = useAgents(organizationId, ['agent', 'admin', 'owner']);
  const { data: schedules } = useSchedules(organizationId);
  
  const isEditing = !!consultation;
  
  // Estado do formulário com tipagem modificada para evitar problemas com Schedule
  const [formData, setFormData] = useState<Omit<MedicalAppointment, 'schedule_id'> & { 
    schedule_id: string,
    schedule?: { id: string, title: string },
    service_id?: string,
    service?: { id: string, title: string },
  }>({
    id: '', // Campo obrigatório para o TypeScript, mas será ignorado na criação
    customer_id: customer?.id || '',
    provider_id: currentOrganizationMember?.profile_id || '',
    schedule_id: '',
    service_id: '',
    consultation_type: 'initial',
    status: consultation?.status || 'scheduled',
    date: consultation?.date || format(new Date(), 'yyyy-MM-dd'),
    start_time: consultation?.start_time || '',
    end_time: consultation?.end_time || '',
    chief_complaint: '',
    diagnosis: '',
    notes: consultation?.notes || '',
    medical_notes: '',
    follow_up_recommendations: '',
    vital_signs: {},
    is_medical_appointment: true,
    created_at: '', // Campo obrigatório para o TypeScript, mas será ignorado na criação
    updated_at: '', // Campo obrigatório para o TypeScript, mas será ignorado na criação
    has_videoconference: false,
  });


  // Para mensagens de erro e status
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerWithDetails | null>(null);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [selectedScheduleId, setSelectedScheduleId] = useState<string>('');
  const { data: services } = useScheduleServices(selectedScheduleId);
  
  // Carregar dados da consulta quando for edição
  useEffect(() => {
    if (consultation) {
      // Convertemos os tipos para evitar problemas com o tipo Schedule
      setFormData({
        ...consultation,
        schedule_id: typeof consultation.schedule_id === 'string' 
          ? consultation.schedule_id 
          : consultation.schedule_id?.id || '',
        service_id: consultation.service_id || ''
      } as Omit<MedicalAppointment, 'schedule_id'> & { 
        schedule_id: string,
        schedule?: { id: string, title: string },
        service_id?: string,
        service?: { id: string, title: string },
      });

      // Definir o schedule ID para carregar os serviços
      if (consultation.schedule_id) {
        const scheduleId = typeof consultation.schedule_id === 'string' 
          ? consultation.schedule_id 
          : consultation.schedule_id?.id;
        
        setSelectedScheduleId(scheduleId || '');
      }
      
      // Se temos um customer_id, podemos buscar os detalhes do cliente
      if (consultation.customer) {
        // Aqui seria uma chamada para buscar os detalhes do cliente
        // Por enquanto, estamos apenas simulando
        setSelectedCustomer(consultation.customer as unknown as CustomerWithDetails);
      }
    } else if (customer) {
      setSelectedCustomer(customer as unknown as CustomerWithDetails);
    }
  }, [consultation, customer]);

  // Atualizar a lista de serviços quando a agenda mudar
  useEffect(() => {
    if (formData.schedule_id) {
      setSelectedScheduleId(formData.schedule_id);
    }
  }, [formData.schedule_id]);
  
  // Manipular mudanças no formulário
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  // Manipular mudanças em sinais vitais
  const handleVitalSignChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      vital_signs: {
        ...prev.vital_signs,
        [name]: value ? parseFloat(value) : undefined,
      },
    }));
  };
  
  // Função para abrir o modal de seleção de pacientes
  const handleOpenCustomerModal = () => {
    setIsCustomerModalOpen(true);
  };
  
  // Função para lidar com a seleção de um paciente
  const handleSelectCustomer = (customer: CustomerWithDetails) => {
    setSelectedCustomer(customer);
    setFormData(prev => ({ ...prev, customer_id: customer.id }));
    setIsCustomerModalOpen(false);
  };
  
  // Função para criar um novo paciente
  const handleCreateCustomer = () => {
    // Aqui você pode implementar a lógica para abrir o modal de criação de cliente
    // Ou navegar para a página de criação de cliente
    console.log('Criar novo paciente');
    // Exemplo de como você poderia fechar o modal atual:
    setIsCustomerModalOpen(false);
    // E então abrir outro modal, ou navegar para outra página
  };
  
  // Enviar formulário
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    
    try {
      // Remover campos que não devem ser enviados
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { created_at, updated_at, id, schedule, service, ...allData } = formData;
      
      // Selecionar apenas os campos que realmente precisamos enviar
      const fieldsToSubmit = {
        customer_id: allData.customer_id,
        provider_id: allData.provider_id,
        schedule_id: allData.schedule_id,
        service_id: allData.service_id,
        consultation_type: allData.consultation_type,
        status: allData.status,
        date: allData.date,
        start_time: allData.start_time,
        end_time: allData.end_time,
        chief_complaint: allData.chief_complaint,
        vital_signs: allData.vital_signs,
        diagnosis: allData.diagnosis,
        notes: allData.notes,
        medical_notes: allData.medical_notes,
        follow_up_recommendations: allData.follow_up_recommendations,
        has_videoconference: allData.has_videoconference,
        is_medical_appointment: true as const, // Usar literal type para garantir que é 'true'
      };
      
      if (isEditing && consultation) {
        // Atualizar consulta existente
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await updateMedicalAppointment.mutateAsync({
          id: consultation.id,
          ...fieldsToSubmit,
        } as never); // Necessário devido à incompatibilidade entre string e Schedule
      } else {
        // Criar nova consulta
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await createMedicalAppointment.mutateAsync(fieldsToSubmit as any); // Necessário devido à incompatibilidade entre string e Schedule
      }
      
      // Fechar o formulário
      onClose();
    } catch (err: unknown) {
      console.error('Erro ao salvar consulta médica:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage || t('common:errorSaving'));
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-4 text-sm text-red-700 bg-red-100 rounded-lg dark:bg-red-900 dark:text-red-300">
            {error}
          </div>
        )}
        
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Paciente */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('medical:patient')} *
            </label>
            <div className="flex mt-1">
              {selectedCustomer ? (
                <div className="flex items-center w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                  <div className="flex-shrink-0 w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center dark:bg-gray-700">
                    {selectedCustomer.avatar_url ? (
                      <img
                        src={selectedCustomer.avatar_url}
                        alt={selectedCustomer.name}
                        className="rounded-full w-8 h-8 object-cover"
                      />
                    ) : (
                      <User className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    )}
                  </div>
                  <div className="ml-3 flex-grow">
                    <p className="text-sm font-medium">{selectedCustomer.name}</p>
                  </div>
                  <button
                    type="button"
                    className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                    onClick={handleOpenCustomerModal}
                  >
                    {t('common:change')}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="flex items-center justify-center w-full px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-blue-700 dark:hover:bg-blue-600"
                  onClick={handleOpenCustomerModal}
                >
                  {t('medical:selectPatient')}
                </button>
              )}
            </div>
          </div>
          
          {/* Profissional */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('medical:provider')} *
            </label>
            <select
              name="provider_id"
              value={formData.provider_id || ''}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              <option value="">{t('common:select')}</option>
              {agents && agents.length > 0 ? agents?.map(agent => (
                <option key={agent.id} value={agent.id}>
                  {agent.profile?.full_name || agent.profile?.email}
                </option>
              )) : formData.provider_id ? (
                <option value={formData.provider_id}>{formData.provider?.full_name ?? null}</option>
              ) : (
                <option value="">{t('common:noProvidersYet')}</option>
              )}
            </select>
          </div>

          {/* Agenda */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('schedules:schedule')} *
            </label>
            <select
              name="schedule_id"
              value={formData.schedule_id || ''}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              <option value="">{t('common:select')}</option>
              {schedules && schedules.length > 0 ? schedules?.map(schedule => (
                <option key={schedule.id} value={schedule.id}>
                  {schedule.title}
                </option>
              )) : formData.schedule_id && formData.schedule ? (
                <option value={formData.schedule_id}>{formData.schedule.title}</option>
              ) : (
                <option value="">{t('common:noSchedulesYet')}</option>
              )}
            </select>
          </div>

          {/* Serviço */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('schedules:service')}
            </label>
            <select
              name="service_id"
              value={formData.service_id || ''}
              onChange={handleChange}
              className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              <option value="">{t('common:select')}</option>
              {services && services.length > 0 ? services?.map(service => (
                <option key={service.id} value={service.id}>
                  {service.title}
                </option>
              )) : formData.service_id && formData.service ? (
                <option value={formData.service_id}>{formData.service.title}</option>
              ) : (
                <option value="">{t('common:noServicesYet')}</option>
              )}
            </select>
          </div>
          
          {/* Tipo de Consulta */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('medical:consultationType.label')} *
            </label>
            <select
              name="consultation_type"
              value={formData.consultation_type || 'initial'}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              {consultationTypes && consultationTypes.length > 0 ? (
                consultationTypes.map(type => (
                  <option key={type} value={type}>
                    {t(`medical:consultationType.${type}`, { defaultValue: type })}
                  </option>
                ))
              ) : (
                // Tipos padrão caso a consulta ainda não tenha carregado ou falhou
                <>
                  <option value="initial">{t('medical:consultationType.initial', { defaultValue: 'Inicial' })}</option>
                  <option value="follow_up">{t('medical:consultationType.follow_up', { defaultValue: 'Retorno' })}</option>
                  <option value="emergency">{t('medical:consultationType.emergency', { defaultValue: 'Emergência' })}</option>
                  <option value="routine">{t('medical:consultationType.routine', { defaultValue: 'Rotina' })}</option>
                </>
              )}
            </select>
          </div>
          
          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('medical:status.label')} *
            </label>
            <select
              name="status"
              value={formData.status || 'scheduled'}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              <option value="scheduled">{t('medical:status.scheduled')}</option>
              <option value="confirmed">{t('medical:status.confirmed')}</option>
              <option value="completed">{t('medical:status.completed')}</option>
              <option value="canceled">{t('medical:status.canceled')}</option>
              <option value="no_show">{t('medical:status.no_show')}</option>
            </select>
          </div>
          
          {/* Data */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('schedules:date')} *
            </label>
            <input
              type="date"
              name="date"
              value={formData.date || ''}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>
          
          {/* Horário de Início */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('schedules:startTime')} *
            </label>
            <input
              type="time"
              name="start_time"
              value={formData.start_time ? formData.start_time.substring(0, 5) : ''}
              onChange={(e) => {
                const timeStr = e.target.value + ':00';
                setFormData(prev => ({ ...prev, start_time: timeStr }));
              }}
              required
              className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>
          
          {/* Horário de Término */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('schedules:endTime')} *
            </label>
            <input
              type="time"
              name="end_time"
              value={formData.end_time ? formData.end_time.substring(0, 5) : ''}
              onChange={(e) => {
                const timeStr = e.target.value + ':00';
                setFormData(prev => ({ ...prev, end_time: timeStr }));
              }}
              required
              className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>
        </div>
        
        {/* Queixa Principal */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('medical:chiefComplaint')}
          </label>
          <textarea
            name="chief_complaint"
            value={formData.chief_complaint || ''}
            onChange={handleChange}
            rows={3}
            className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
        </div>
        
        {/* Sinais Vitais */}
        <div>
          <h3 className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('medical:vitalSigns')}
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
            <div>
              <label className="block text-xs text-gray-600 dark:text-gray-400">
                {t('medical:temperature')} (°C)
              </label>
              <input
                type="number"
                name="temperature"
                step="0.1"
                value={formData.vital_signs?.temperature || ''}
                onChange={handleVitalSignChange}
                className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 dark:text-gray-400">
                {t('medical:heartRate')} (bpm)
              </label>
              <input
                type="number"
                name="heart_rate"
                value={formData.vital_signs?.heart_rate || ''}
                onChange={handleVitalSignChange}
                className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 dark:text-gray-400">
                {t('medical:bloodPressure')}
              </label>
              <input
                type="text"
                name="blood_pressure"
                value={formData.vital_signs?.blood_pressure || ''}
                onChange={handleChange}
                placeholder="120/80"
                className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
          </div>
        </div>
        
        {/* Diagnóstico */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('medical:diagnosis')}
          </label>
          <textarea
            name="diagnosis"
            value={formData.diagnosis || ''}
            onChange={handleChange}
            rows={3}
            className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
        </div>
        
        {/* Observações Gerais */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('medical:notes')}
          </label>
          <textarea
            name="notes"
            value={formData.notes || ''}
            onChange={handleChange}
            rows={2}
            className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
        </div>
        
        {/* Observações Médicas */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('medical:medicalNotes')}
          </label>
          <textarea
            name="medical_notes"
            value={formData.medical_notes || ''}
            onChange={handleChange}
            rows={3}
            className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
        </div>
        
        {/* Recomendações de Acompanhamento */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('medical:followUpRecommendations')}
          </label>
          <textarea
            name="follow_up_recommendations"
            value={formData.follow_up_recommendations || ''}
            onChange={handleChange}
            rows={3}
            className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
        </div>
        
        {/* Botões de Ação */}
        <div className="flex items-center justify-end space-x-3">
          <button
            type="button"
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md shadow-sm hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"
            onClick={onClose}
            disabled={isSubmitting}
          >
            {t('common:cancel')}
          </button>
          <button
            type="submit"
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50"
            disabled={isSubmitting}
          >
            {isSubmitting 
              ? t('common:saving') 
              : isEditing 
                ? t('common:update') 
                : t('common:save')
            }
          </button>
        </div>
      </form>
      
      {/* Modal de seleção de paciente */}
      <CustomerSelectModal
        isOpen={isCustomerModalOpen}
        onClose={() => setIsCustomerModalOpen(false)}
        onSelectCustomer={handleSelectCustomer}
        onCreateCustomer={handleCreateCustomer}
      />
    </>
  );
};

export default MedicalConsultationForm; 