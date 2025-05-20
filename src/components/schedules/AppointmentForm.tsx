import React, { useState, useEffect, lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { AppointmentFormData } from '../../types/schedules'; 
import { Appointment } from '../../types/database';
import { useAuthContext } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { 
  Calendar, 
  Clock, 
  User, 
  Calendar as CalendarIcon, 
  MessageSquare, 
  AlertTriangle, 
  CheckCircle2, 
  Scissors, 
  Users,
  Loader2,
  X
} from 'lucide-react';
import { format } from 'date-fns';
import { useScheduleProviders, useScheduleServices, useSchedules } from '../../hooks/useQueryes';

// Lazy load o modal de seleção de cliente
const CustomerSelectModal = lazy(() => import('../customers/CustomerSelectModal'));

interface AppointmentFormProps {
  appointment?: Appointment;
  scheduleId?: string; // Opcional
  initialDate?: Date;
  initialEndDate?: Date;
  initialCustomerId?: string; // Para pré-selecionar cliente
  onSuccess: (appointment: Appointment) => void;
  onCancel: () => void;
}

const AppointmentForm: React.FC<AppointmentFormProps> = ({ 
  appointment, 
  scheduleId,
  initialDate,
  initialEndDate,
  initialCustomerId,
  onSuccess, 
  onCancel 
}) => {
  const { t } = useTranslation(['schedules', 'common']);
  const { currentOrganizationMember } = useAuthContext();
  const organizationId = currentOrganizationMember?.organization?.id;
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Buscar agendas disponíveis
  const { data: schedules } = useSchedules(organizationId);
  
  // Estado do formulário
  const [formData, setFormData] = useState<AppointmentFormData>({
    schedule_id: scheduleId || '',
    provider_id: appointment?.provider_id || '',
    service_id: appointment?.service_id || '',
    customer_id: appointment?.customer_id || initialCustomerId || '',
    status: appointment?.status || 'scheduled',
    date: appointment?.date || (initialDate ? format(initialDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')),
    start_time: appointment?.start_time || (initialDate ? format(initialDate, 'HH:mm:ss') : '09:00:00'),
    end_time: appointment?.end_time || (initialEndDate ? format(initialEndDate, 'HH:mm:ss') : '10:00:00'),
    time_slot: appointment?.time_slot || '',
    notes: appointment?.notes || '',
    create_videoconference: appointment?.has_videoconference || false,
    send_reminders: true,
    reminder_types: ['email'],
  });
  
  // Buscar dados específicos da agenda selecionada
  const { data: providers } = useScheduleProviders(formData.schedule_id);
  const { data: services } = useScheduleServices(formData.schedule_id);
  
  // Estado para controlar a animação de destaque do campo de horário de término
  const [highlightEndTime, setHighlightEndTime] = useState(false);
  
  // Estado para armazenar informações do serviço selecionado
  const [selectedServiceInfo, setSelectedServiceInfo] = useState<{
    by_arrival_time: boolean;
    capacity: number;
  } | null>(null);
  
  // Estado para validação de formulário
  const [showValidationErrors, setShowValidationErrors] = useState(false);
  
  // Novo estado para cliente selecionado e modal
  const [selectedCustomer, setSelectedCustomer] = useState<{id: string; name: string; profile_picture?: string} | null>(null);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  
  // Funções para o modal de cliente
  const handleOpenCustomerModal = () => {
    setIsCustomerModalOpen(true);
  };
  
  const handleSelectCustomer = (customer: {id: string; name: string; profile_picture?: string}) => {
    setSelectedCustomer(customer);
    setFormData(prev => ({
      ...prev,
      customer_id: customer.id
    }));
    setIsCustomerModalOpen(false);
  };
  
  // Carregar o cliente se o initialCustomerId for fornecido
  useEffect(() => {
    if ((initialCustomerId || formData.customer_id) && !selectedCustomer) {
      // Buscar informações do cliente
      const fetchCustomer = async () => {
        try {
          const customerId = initialCustomerId || formData.customer_id;
          if (!customerId) return;
          
          const { data, error } = await supabase
            .from('customers')
            .select('id, name, profile_picture')
            .eq('id', customerId)
            .single();
          
          if (error) throw error;
          
          if (data) {
            setSelectedCustomer({
              id: data.id,
              name: data.name,
              profile_picture: data.profile_picture
            });
          }
        } catch (error) {
          console.error('Erro ao buscar cliente:', error);
        }
      };
      
      fetchCustomer();
    }
  }, [initialCustomerId, formData.customer_id, selectedCustomer]);

  // Função para lidar com a mudança da agenda
  const handleScheduleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newScheduleId = e.target.value;
    setFormData(prev => ({ 
      ...prev, 
      schedule_id: newScheduleId,
      // Resetar valores que dependem da agenda
      provider_id: '',
      service_id: ''
    }));
  };

  // Efeito para atualizar o horário de término quando o serviço ou hora de início mudar
  useEffect(() => {
    if (formData.service_id && formData.start_time) {
      const selectedService = services?.find(s => s.id === formData.service_id);
      if (selectedService) {
        // Atualizar informações do serviço selecionado
        setSelectedServiceInfo({
          by_arrival_time: selectedService.by_arrival_time || false,
          capacity: selectedService.capacity || 1
        });
        
        // Converter o formato de duração HH:MM:SS para minutos
        let durationInMinutes = 0;
        
        // Verificar se está no formato HH:MM:SS
        const timeFormatMatch = selectedService.duration.match(/(\d{2}):(\d{2}):(\d{2})/);
        if (timeFormatMatch) {
          const hours = parseInt(timeFormatMatch[1]);
          const minutes = parseInt(timeFormatMatch[2]);
          durationInMinutes = hours * 60 + minutes;
        } else {
          // Verificar se é em minutos
          const minutesMatch = selectedService.duration.match(/(\d+)\s*min/i);
          if (minutesMatch) {
            durationInMinutes = parseInt(minutesMatch[1]);
          } else {
            // Verificar se é em horas
            const hoursMatch = selectedService.duration.match(/(\d+)\s*h/i);
            if (hoursMatch) {
              durationInMinutes = parseInt(hoursMatch[1]) * 60;
            } else {
              // Tentar extrair apenas o número
              const numberMatch = selectedService.duration.match(/^(\d+)/);
              if (numberMatch) {
                durationInMinutes = parseInt(numberMatch[1]);
              }
            }
          }
        }
        
        if (durationInMinutes > 0) {
          // Converter o horário de início para um objeto Date
          const [hours, minutes, seconds] = formData.start_time.split(':').map(Number);
          const startDate = new Date();
          startDate.setHours(hours || 0, minutes || 0, seconds || 0);
          
          // Adicionar a duração do serviço para obter o horário de término
          const endDate = new Date(startDate.getTime() + durationInMinutes * 60000);
          const endHours = endDate.getHours().toString().padStart(2, '0');
          const endMinutes = endDate.getMinutes().toString().padStart(2, '0');
          const endTime = `${endHours}:${endMinutes}:00`;
          
          // Atualizar o horário de término e ativar o destaque
          if (endTime !== formData.end_time) {
            setFormData(prev => ({ 
              ...prev, 
              end_time: endTime,
              // Atualizar time_slot se for por ordem de chegada
              time_slot: selectedService.by_arrival_time 
                ? `${formData.start_time.substring(0, 5)}-${endTime.substring(0, 5)}`
                : formData.start_time.substring(0, 5)
            }));
            setHighlightEndTime(true);
            
            // Desativar o destaque após 1.5 segundos
            setTimeout(() => {
              setHighlightEndTime(false);
            }, 1500);
          }
        }
      }
    }
  }, [formData.service_id, formData.start_time, services]);
  
  // Função para lidar com a seleção de serviço
  const handleServiceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const serviceId = e.target.value;
    setFormData(prev => ({ ...prev, service_id: serviceId }));
  };

  // Manipular mudanças nos campos
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Enviar formulário
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    // Validação de campos obrigatórios
    if (!formData.schedule_id) {
      setError(t('schedules:selectScheduleError'));
      setIsLoading(false);
      setShowValidationErrors(true);
      return;
    }

    if (!formData.provider_id) {
      setError(t('schedules:selectProviderError', 'Selecione um profissional'));
      setIsLoading(false);
      setShowValidationErrors(true);
      return;
    }

    if (!formData.service_id) {
      setError(t('schedules:selectServiceError', 'Selecione um serviço'));
      setIsLoading(false);
      setShowValidationErrors(true);
      return;
    }

    try {
      const appointmentData = {
        schedule_id: formData.schedule_id,
        provider_id: formData.provider_id,
        service_id: formData.service_id || null,
        customer_id: formData.customer_id || null,
        status: formData.status,
        date: formData.date,
        start_time: formData.start_time,
        end_time: formData.end_time,
        time_slot: formData.time_slot || null,
        notes: formData.notes || null,
        has_videoconference: false, // Removido temporariamente
        organization_id: organizationId,
      };

      if (appointment?.id) {
        // Atualizar agendamento existente
        const { data, error } = await supabase
          .from('appointments')
          .update(appointmentData)
          .eq('id', appointment.id)
          .select('*')
          .single();

        if (error) throw error;
        
        // Configurar lembretes se necessário (comentado temporariamente)
        /*
        if (formData.send_reminders && formData.reminder_types?.length) {
          // Aqui iríamos criar ou atualizar os lembretes
          console.log('Configurar lembretes:', {
            appointment_id: data.id,
            types: formData.reminder_types
          });
        }
        */
        
        setSuccess(t('schedules:appointmentUpdatedSuccess'));
        setTimeout(() => {
          onSuccess(data as Appointment);
        }, 1000);
      } else {
        // Criar novo agendamento
        const { data, error } = await supabase
          .from('appointments')
          .insert(appointmentData)
          .select('*')
          .single();

        if (error) throw error;
        
        // Configurar lembretes se necessário (comentado temporariamente)
        /*
        if (formData.send_reminders && formData.reminder_types?.length) {
          // Aqui iríamos criar os lembretes
          console.log('Configurar lembretes:', {
            appointment_id: data.id,
            types: formData.reminder_types
          });
        }
        */
        
        setSuccess(t('schedules:appointmentCreatedSuccess'));
        setTimeout(() => {
          onSuccess(data as Appointment);
        }, 1000);
      }
    } catch (error) {
      console.error('Erro ao salvar agendamento:', error);
      setError(typeof error === 'object' && error !== null && 'message' in error 
        ? (error as Error).message 
        : t('common:unknownError'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 max-w-2xl mx-auto">
      {/* <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3 sm:mb-4 flex items-center">
        <CalendarIcon className="h-5 w-5 mr-2 text-blue-600 dark:text-blue-400" />
        {appointment ? t('schedules:editAppointment') : t('schedules:newAppointment')}
      </h2> */}
      
      {/* Feedback de mensagens */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-300 dark:border-red-800 rounded-md text-red-700 dark:text-red-400">
          <div className="flex items-center mb-1">
            <AlertTriangle className="h-4 w-4 mr-2" />
            <span className="font-medium">{t('common:error')}</span>
          </div>
          <p className="text-sm">{error}</p>
        </div>
      )}
      
      {success && (
        <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/30 border border-green-300 dark:border-green-800 rounded-md text-green-700 dark:text-green-400">
          <div className="flex items-center mb-1">
            <CheckCircle2 className="h-4 w-4 mr-2" />
            <span className="font-medium">{t('common:success')}</span>
          </div>
          <p className="text-sm">{success}</p>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Coluna Esquerda */}
          <div className="space-y-4">
            {/* Seleção de Agenda - mostrar apenas quando for um novo agendamento */}
            {!appointment && (
              <div>
                <label htmlFor="schedule_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center">
                  <CalendarIcon className="h-4 w-4 mr-1.5 text-blue-600 dark:text-blue-400" />
                  {t('schedules:schedule')} <span className="text-red-500 ml-1">*</span>
                </label>
                <div className="relative">
                  <select
                    id="schedule_id"
                    name="schedule_id"
                    value={formData.schedule_id}
                    onChange={handleScheduleChange}
                    required
                    className={`w-full p-2.5 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                      showValidationErrors && !formData.schedule_id
                        ? 'border-red-300 dark:border-red-600'
                        : 'border-gray-300 dark:border-gray-600'
                    }`}
                  >
                    <option value="" disabled>{t('schedules:selectSchedule')}</option>
                    {schedules?.map(schedule => (
                      <option key={schedule.id} value={schedule.id}>
                        {schedule.title}
                      </option>
                    ))}
                  </select>
                  {showValidationErrors && !formData.schedule_id && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                      {t('schedules:selectScheduleError', 'Selecione uma agenda')}
                    </p>
                  )}
                </div>
              </div>
            )}
            
            {/* Seleção de Profissional */}
            <div>
              <label htmlFor="provider_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center">
                <User className="h-4 w-4 mr-1.5 text-blue-600 dark:text-blue-400" />
                {t('schedules:provider')} <span className="text-red-500 ml-1">*</span>
              </label>
              <div className="relative">
                <select
                  id="provider_id"
                  name="provider_id"
                  value={formData.provider_id}
                  onChange={handleChange}
                  required
                  disabled={!formData.schedule_id}
                  className={`w-full p-2.5 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${
                    showValidationErrors && !formData.provider_id
                      ? 'border-red-300 dark:border-red-600'
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                >
                  <option value="" disabled>{t('schedules:selectProvider')}</option>
                  {providers?.map(provider => (
                    <option key={provider.id} value={provider.profile_id}>
                      {provider.name}
                    </option>
                  ))}
                </select>
                {showValidationErrors && !formData.provider_id && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {t('schedules:selectProviderError', 'Selecione um profissional')}
                  </p>
                )}
              </div>
            </div>
            
            {/* Seleção de Serviço */}
            <div>
              <label htmlFor="service_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center">
                <Scissors className="h-4 w-4 mr-1.5 text-blue-600 dark:text-blue-400" />
                {t('schedules:service')} <span className="text-red-500 ml-1">*</span>
              </label>
              <select
                id="service_id"
                name="service_id"
                value={formData.service_id}
                onChange={handleServiceChange}
                required
                className={`w-full p-2.5 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                  showValidationErrors && !formData.service_id
                    ? 'border-red-300 dark:border-red-600'
                    : 'border-gray-300 dark:border-gray-600'
                }`}
              >
                <option value="">{t('schedules:selectService')}</option>
                {services?.map(service => (
                  <option key={service.id} value={service.id}>
                    {service.title} - {service.duration}
                  </option>
                ))}
              </select>
              {showValidationErrors && !formData.service_id && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                  {t('schedules:selectServiceError', 'Selecione um serviço')}
                </p>
              )}
            </div>
            
            {/* Seleção de Cliente */}
            <div>
              <label htmlFor="customer_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center">
                <User className="h-4 w-4 mr-1.5 text-blue-600 dark:text-blue-400" />
                {t('schedules:customer')}
              </label>
              <div className="mt-1">
                {selectedCustomer ? (
                  <div className="flex items-center w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                    <div className="flex-shrink-0 w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center dark:bg-gray-700">
                      {selectedCustomer.profile_picture ? (
                        <img
                          src={selectedCustomer.profile_picture}
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
                      className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                      onClick={() => {
                        setSelectedCustomer(null);
                        setFormData(prev => ({...prev, customer_id: ''}));
                      }}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="flex items-center justify-center w-full px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"
                    onClick={handleOpenCustomerModal}
                  >
                    <User className="w-4 h-4 mr-2" />
                    {t('schedules:selectCustomer')}
                  </button>
                )}
              </div>
            </div>
            
            {/* Observações */}
            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center">
                <MessageSquare className="h-4 w-4 mr-1.5 text-blue-600 dark:text-blue-400" />
                {t('schedules:notes')}
              </label>
              <textarea 
                id="notes"
                name="notes"
                value={formData.notes || ''}
                onChange={handleChange}
                rows={3}
                className="w-full p-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none"
                placeholder={t('schedules:notesPlaceholder')}
              />
            </div>
          </div>
          
          {/* Coluna Direita */}
          <div className="space-y-4">
            {/* Status do Agendamento */}
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, status: 'scheduled' }))}
                  className={`flex items-center justify-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    formData.status === 'scheduled'
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                      : 'bg-white text-gray-700 hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  {t('schedules:statusScheduled')}
                </button>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, status: 'confirmed' }))}
                  className={`flex items-center justify-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    formData.status === 'confirmed'
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-white text-gray-700 hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  {t('schedules:statusConfirmed')}
                </button>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, status: 'completed' }))}
                  className={`flex items-center justify-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    formData.status === 'completed'
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-white text-gray-700 hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  {t('schedules:statusCompleted')}
                </button>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, status: 'canceled' }))}
                  className={`flex items-center justify-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    formData.status === 'canceled'
                      ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                      : 'bg-white text-gray-700 hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  {t('schedules:statusCanceled')}
                </button>
              </div>
            </div>
            
            {/* Data e Horário */}
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
              
              {/* Data do Agendamento */}
              <div className="mb-3">
                <label htmlFor="date" className="block text-xs text-gray-600 dark:text-gray-400 mb-1 flex items-center">
                  <Calendar className="h-3 w-3 mr-1" />
                  {t('schedules:date')} <span className="text-red-500 ml-1">*</span>
                </label>
                <input 
                  id="date"
                  type="date" 
                  name="date"
                  value={formData.date}
                  onChange={handleChange}
                  required
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
              </div>
              
              {/* Horários */}
              <div className="grid grid-cols-2 gap-3">
                {/* Horário de Início */}
                <div>
                  <label htmlFor="start_time" className="block text-xs text-gray-600 dark:text-gray-400 mb-1 flex items-center">
                    <Clock className="h-3 w-3 mr-1" />
                    {t('schedules:startTime')} <span className="text-red-500 ml-1">*</span>
                  </label>
                  <input 
                    id="start_time"
                    type="time" 
                    name="start_time"
                    value={formData.start_time.substring(0, 5)}
                    onChange={handleChange}
                    required
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  />
                </div>
                
                {/* Horário de Término */}
                <div>
                  <label htmlFor="end_time" className="block text-xs text-gray-600 dark:text-gray-400 mb-1 flex items-center">
                    <Clock className="h-3 w-3 mr-1" />
                    {t('schedules:endTime')} <span className="text-red-500 ml-1">*</span>
                  </label>
                  <input 
                    id="end_time"
                    type="time" 
                    name="end_time"
                    value={formData.end_time.substring(0, 5)}
                    onChange={handleChange}
                    required
                    className={`w-full p-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                      highlightEndTime 
                        ? 'animate-highlight border-blue-400 dark:border-blue-600' 
                        : 'border-gray-300 dark:border-gray-600'
                    }`}
                  />
                </div>
              </div>
            </div>
            
            {/* Alerta de atendimento por ordem de chegada */}
            {selectedServiceInfo?.by_arrival_time && (
              <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-100 dark:border-blue-800">
                <h3 className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-2 flex items-center">
                  <Users className="h-4 w-4 mr-1.5" />
                  {t('schedules:arrivalTimeServiceAlert')}
                </h3>
                <p className="text-sm text-blue-700 dark:text-blue-400">
                  {t('schedules:arrivalTimeServiceDescription', { 
                    timeSlot: formData.time_slot, 
                    capacity: selectedServiceInfo.capacity 
                  })}
                </p>
              </div>
            )}
          </div>
        </div>
        
        {/* Botões de Ação */}
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-4 pt-5 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="mt-3 sm:mt-0 w-full sm:w-auto px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-gray-400 transition-colors"
          >
            {t('common:cancel')}
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors shadow-sm flex items-center justify-center"
          >
            {isLoading ? (
              <>
                <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" />
                {appointment?.id ? t('common:saving') : t('common:creating')}
              </>
            ) : (
              appointment?.id ? t('common:save') : t('common:create')
            )}
          </button>
        </div>
      </form>
      
      {/* Modal de seleção de cliente */}
      {isCustomerModalOpen && (
        <Suspense fallback={
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 flex justify-center items-center">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
          </div>
        }>
          <CustomerSelectModal
            isOpen={isCustomerModalOpen}
            onClose={() => setIsCustomerModalOpen(false)}
            onSelectCustomer={handleSelectCustomer}
          />
        </Suspense>
      )}
    </div>
  );
};

export default AppointmentForm; 