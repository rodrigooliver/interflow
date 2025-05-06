import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { AppointmentFormData } from '../../types/schedules'; 
import { Appointment } from '../../types/database';
import { useAuthContext } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Calendar, Clock, User, Calendar as CalendarIcon, MessageSquare, Video, Bell, AlertTriangle, CheckCircle2, Scissors, Users } from 'lucide-react';
import { format } from 'date-fns';
import { useScheduleProviders, useScheduleServices, useCustomers } from '../../hooks/useQueryes';

interface AppointmentFormProps {
  appointment?: Appointment;
  scheduleId: string;
  initialDate?: Date;
  initialEndDate?: Date;
  onSuccess: (appointment: Appointment) => void;
  onCancel: () => void;
}

const AppointmentForm: React.FC<AppointmentFormProps> = ({ 
  appointment, 
  scheduleId,
  initialDate,
  initialEndDate,
  onSuccess, 
  onCancel 
}) => {
  const { t } = useTranslation(['schedules', 'common']);
  const { currentOrganizationMember } = useAuthContext();
  const organizationId = currentOrganizationMember?.organization?.id;
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Buscar dados necessários
  const { data: providers } = useScheduleProviders(scheduleId);
  const { data: services } = useScheduleServices(scheduleId);
  const { data: customers } = useCustomers(organizationId);
  
  // Estado do formulário
  const [formData, setFormData] = useState<AppointmentFormData>({
    schedule_id: scheduleId,
    provider_id: appointment?.provider_id || '',
    service_id: appointment?.service_id || '',
    customer_id: appointment?.customer_id || '',
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
  
  // Estado para controlar a animação de destaque do campo de horário de término
  const [highlightEndTime, setHighlightEndTime] = useState(false);
  
  // Estado para armazenar informações do serviço selecionado
  const [selectedServiceInfo, setSelectedServiceInfo] = useState<{
    by_arrival_time: boolean;
    capacity: number;
  } | null>(null);

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
        
        console.log(`Duração do serviço: ${selectedService.duration}, calculado: ${durationInMinutes} minutos`);
        
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
          
          console.log(`Calculando horário de término: serviço com duração de ${durationInMinutes} minutos, início ${formData.start_time}, término ${endTime}`);
          
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
    
    if (serviceId && formData.start_time) {
      const selectedService = services?.find(s => s.id === serviceId);
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
  };

  // Manipular mudanças nos campos
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Manipular mudanças em checkboxes
  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: checked }));
  };

  // Manipular mudanças nos tipos de lembretes
  const handleReminderTypeChange = (type: 'email' | 'sms' | 'whatsapp', checked: boolean) => {
    setFormData(prev => {
      const currentTypes = prev.reminder_types || [];
      if (checked && !currentTypes.includes(type)) {
        return { ...prev, reminder_types: [...currentTypes, type] };
      } else if (!checked && currentTypes.includes(type)) {
        return { ...prev, reminder_types: currentTypes.filter(t => t !== type) };
      }
      return prev;
    });
  };

  // Enviar formulário
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

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
        has_videoconference: formData.create_videoconference || false,
        organization_id: organizationId,
      };

      console.log('appointmentData', appointmentData);

      if (appointment?.id) {
        // Atualizar agendamento existente
        const { data, error } = await supabase
          .from('appointments')
          .update(appointmentData)
          .eq('id', appointment.id)
          .select('*')
          .single();

        if (error) throw error;
        
        // Configurar lembretes se necessário
        if (formData.send_reminders && formData.reminder_types?.length) {
          // Aqui iríamos criar ou atualizar os lembretes
          // Implementação simplificada: apenas registramos os lembretes
          console.log('Configurar lembretes:', {
            appointment_id: data.id,
            types: formData.reminder_types
          });
        }
        
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
        
        // Configurar lembretes se necessário
        if (formData.send_reminders && formData.reminder_types?.length) {
          // Aqui iríamos criar os lembretes
          // Implementação simplificada: apenas registramos os lembretes
          console.log('Configurar lembretes:', {
            appointment_id: data.id,
            types: formData.reminder_types
          });
        }
        
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
    <div className="bg-white dark:bg-gray-800 p-1 sm:p-1 md:p-2 rounded-lg shadow-md max-w-2xl mx-auto">
      {/* <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3 sm:mb-4 flex items-center">
        <CalendarIcon className="h-5 w-5 mr-2 text-blue-600 dark:text-blue-400" />
        {appointment ? t('schedules:editAppointment') : t('schedules:newAppointment')}
      </h2> */}
      
      {/* Feedback de mensagens */}
      {error && (
        <div className="mb-3 sm:mb-4 p-3 sm:p-4 bg-red-50 dark:bg-red-900/30 border border-red-300 dark:border-red-800 rounded-md text-red-700 dark:text-red-400">
          <div className="flex items-center mb-1">
            <AlertTriangle className="h-5 w-5 mr-2" />
            <span className="font-medium">{t('common:error')}</span>
          </div>
          <p className="text-sm">{error}</p>
        </div>
      )}
      
      {success && (
        <div className="mb-3 sm:mb-4 p-3 sm:p-4 bg-green-50 dark:bg-green-900/30 border border-green-300 dark:border-green-800 rounded-md text-green-700 dark:text-green-400">
          <div className="flex items-center mb-1">
            <CheckCircle2 className="h-5 w-5 mr-2" />
            <span className="font-medium">{t('common:success')}</span>
          </div>
          <p className="text-sm">{success}</p>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          {/* Seleção de Profissional */}
          <div>
            <label htmlFor="provider_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center">
              <User className="h-4 w-4 mr-1.5 text-blue-600 dark:text-blue-400" />
              {t('schedules:provider')} *
            </label>
            <div className="relative">
              <select
                id="provider_id"
                name="provider_id"
                value={formData.provider_id}
                onChange={handleChange}
                required
                className="w-full p-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none transition-colors pr-10 text-base sm:text-sm"
              >
                <option value="" disabled>{t('schedules:selectProvider')}</option>
                {providers?.map(provider => (
                  <option key={provider.id} value={provider.profile_id}>
                    {provider.name}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700 dark:text-gray-300">
                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                  <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                </svg>
              </div>
            </div>
          </div>
          
          {/* Seleção de Serviço */}
          <div>
            <label htmlFor="service_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center">
              <Scissors className="h-4 w-4 mr-1.5 text-blue-600 dark:text-blue-400" />
              {t('schedules:service')} *
            </label>
            <select
              id="service_id"
              name="service_id"
              value={formData.service_id}
              onChange={handleServiceChange}
              required
              className="w-full p-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-base sm:text-sm"
            >
              <option value="">{t('schedules:selectService')}</option>
              {services?.map(service => (
                <option key={service.id} value={service.id}>
                  {service.title} - {service.duration}
                </option>
              ))}
            </select>
          </div>
          
          {/* Seleção de Cliente */}
          <div>
            <label htmlFor="customer_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center">
              <User className="h-4 w-4 mr-1.5 text-blue-600 dark:text-blue-400" />
              {t('schedules:customer')}
            </label>
            <div className="relative">
              <select
                id="customer_id"
                name="customer_id"
                value={formData.customer_id || ''}
                onChange={handleChange}
                className="w-full p-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none transition-colors pr-10 text-base sm:text-sm"
              >
                <option value="">{t('schedules:selectCustomer')}</option>
                {customers?.map(customer => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700 dark:text-gray-300">
                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                  <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                </svg>
              </div>
            </div>
          </div>
          
          {/* Status do Agendamento */}
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center">
              <CalendarIcon className="h-4 w-4 mr-1.5 text-blue-600 dark:text-blue-400" />
              {t('schedules:status')} *
            </label>
            <div className="relative">
              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleChange}
                required
                className="w-full p-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none transition-colors pr-10 text-base sm:text-sm"
              >
                <option value="scheduled">{t('schedules:statusScheduled')}</option>
                <option value="confirmed">{t('schedules:statusConfirmed')}</option>
                <option value="completed">{t('schedules:statusCompleted')}</option>
                <option value="canceled">{t('schedules:statusCanceled')}</option>
                <option value="no_show">{t('schedules:statusNoShow')}</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700 dark:text-gray-300">
                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                  <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                </svg>
              </div>
            </div>
          </div>
          
          {/* Data do Agendamento */}
          <div>
            <label htmlFor="date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center">
              <Calendar className="h-4 w-4 mr-1.5 text-blue-600 dark:text-blue-400" />
              {t('schedules:date')} *
            </label>
            <input 
              id="date"
              type="date" 
              name="date"
              value={formData.date}
              onChange={handleChange}
              required
              className="w-full p-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-base sm:text-sm"
            />
          </div>
          
          {/* Horário de Início */}
          <div>
            <label htmlFor="start_time" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center">
              <Clock className="h-4 w-4 mr-1.5 text-blue-600 dark:text-blue-400" />
              {t('schedules:startTime')} *
            </label>
            <input 
              id="start_time"
              type="time" 
              name="start_time"
              value={formData.start_time.substring(0, 5)}
              onChange={handleChange}
              required
              className="w-full p-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-base sm:text-sm"
            />
          </div>
          
          {/* Horário de Término */}
          <div>
            <label htmlFor="end_time" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center">
              <Clock className="h-4 w-4 mr-1.5 text-blue-600 dark:text-blue-400" />
              {t('schedules:endTime')} *
            </label>
            <input 
              id="end_time"
              type="time" 
              name="end_time"
              value={formData.end_time.substring(0, 5)}
              onChange={handleChange}
              required
              className={`w-full p-2.5 border rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-base sm:text-sm ${
                highlightEndTime 
                  ? 'animate-highlight border-blue-400 dark:border-blue-600' 
                  : 'border-gray-300 dark:border-gray-700'
              }`}
            />
          </div>
          
          {/* Observações */}
          <div className="sm:col-span-2">
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
              className="w-full p-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none text-base sm:text-sm"
              placeholder={t('schedules:notesPlaceholder')}
            />
          </div>
          
          {/* Alerta de atendimento por ordem de chegada */}
          {selectedServiceInfo?.by_arrival_time && (
            <div className="sm:col-span-2 bg-blue-50 dark:bg-blue-900/20 p-3 sm:p-4 rounded-lg border border-blue-100 dark:border-blue-800 mb-4">
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
              <p className="text-xs text-blue-600 dark:text-blue-500 mt-2">
                {t('schedules:arrivalTimeServiceNote')}
              </p>
            </div>
          )}
          
          {/* Videoconferência */}
          <div className="flex items-start sm:col-span-2">
            <div className="flex items-center h-5">
              <input 
                type="checkbox" 
                id="create_videoconference" 
                name="create_videoconference"
                checked={formData.create_videoconference}
                onChange={handleCheckboxChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
              />
            </div>
            <div className="ml-3">
              <label htmlFor="create_videoconference" className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer flex items-center">
                <Video className="h-4 w-4 mr-1.5 text-blue-600 dark:text-blue-400" />
                {t('schedules:createVideoconference')}
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {t('schedules:createVideoconferenceDescription')}
              </p>
            </div>
          </div>
          
          {/* Lembretes */}
          <div className="sm:col-span-2">
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 sm:p-4 border border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-3 flex items-center">
                <Bell className="h-4 w-4 mr-1.5 text-blue-600 dark:text-blue-400" />
                {t('schedules:reminders')}
              </h3>
              
              <div className="flex items-start mb-3">
                <div className="flex items-center h-5">
                  <input 
                    type="checkbox" 
                    id="send_reminders" 
                    name="send_reminders"
                    checked={formData.send_reminders}
                    onChange={handleCheckboxChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
                  />
                </div>
                <div className="ml-3">
                  <label htmlFor="send_reminders" className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                    {t('schedules:sendReminders')}
                  </label>
                </div>
              </div>
              
              {formData.send_reminders && (
                <div className="pl-7 space-y-2">
                  <div className="flex items-center">
                    <input 
                      type="checkbox" 
                      id="reminder_email" 
                      checked={formData.reminder_types?.includes('email') || false}
                      onChange={(e) => handleReminderTypeChange('email', e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
                    />
                    <label htmlFor="reminder_email" className="ml-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                      {t('schedules:reminderEmail')}
                    </label>
                  </div>
                  
                  <div className="flex items-center">
                    <input 
                      type="checkbox" 
                      id="reminder_sms" 
                      checked={formData.reminder_types?.includes('sms') || false}
                      onChange={(e) => handleReminderTypeChange('sms', e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
                    />
                    <label htmlFor="reminder_sms" className="ml-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                      {t('schedules:reminderSMS')}
                    </label>
                  </div>
                  
                  <div className="flex items-center">
                    <input 
                      type="checkbox" 
                      id="reminder_whatsapp" 
                      checked={formData.reminder_types?.includes('whatsapp') || false}
                      onChange={(e) => handleReminderTypeChange('whatsapp', e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
                    />
                    <label htmlFor="reminder_whatsapp" className="ml-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                      {t('schedules:reminderWhatsApp')}
                    </label>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-4 pt-4 sm:pt-5">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="mt-3 sm:mt-0 w-full sm:w-auto px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 dark:focus:ring-offset-gray-900 transition-colors"
          >
            {t('common:cancel')}
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 transition-colors shadow-sm flex items-center justify-center"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {appointment?.id ? t('common:saving') : t('common:creating')}
              </>
            ) : (
              <>
                {appointment?.id ? t('common:save') : t('common:create')}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AppointmentForm; 