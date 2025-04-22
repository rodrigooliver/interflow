import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ScheduleNotificationSetting, ScheduleNotificationTemplate } from '../../types/database';
import { Clock, AlertTriangle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuthContext } from '../../contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';

interface NotificationTimingFormProps {
  scheduleId: string;
  template: ScheduleNotificationTemplate;
  setting?: ScheduleNotificationSetting;
  onSuccess: () => void;
  onCancel: () => void;
}

interface ApiError {
  response?: {
    data?: {
      error?: string;
    };
  };
  message?: string;
}

// Opções de tempo antes do agendamento - atualizadas para corresponder ao NotificationTemplateForm
const timeBeforeOptions = [
  { value: '10 minutes', label: '10 minutos' },
  { value: '30 minutes', label: '30 minutos' },
  { value: '1 hour', label: '1 hora' },
  { value: '2 hours', label: '2 horas' },
  { value: '3 hours', label: '3 horas' },
  { value: '12 hours', label: '12 horas' },
  { value: '24 hours', label: '24 horas' },
  { value: '2 days', label: '2 dias' },
  { value: '1 week', label: '1 semana' }
];

/**
 * Função para normalizar formatos de tempo inconsistentes
 */
function normalizeTimeFormat(time: string): string {
  // Verificar se é um formato de horário (HH:MM:SS)
  if (/\d{1,2}:\d{2}(:\d{2})?/.test(time)) {
    // Converter para o formato adequado
    const parts = time.split(':');
    const hours = parseInt(parts[0], 10);
    
    if (hours === 24) {
      return '24 hours';
    } else if (hours === 1) {
      return '1 hour';
    } else if (hours > 1 && hours < 24) {
      return `${hours} hours`;
    }
  }
  
  return time;
}

const NotificationTimingForm: React.FC<NotificationTimingFormProps> = ({
  scheduleId,
  template,
  setting,
  onSuccess,
  onCancel
}) => {
  const { t } = useTranslation(['schedules', 'common']);
  const { currentOrganizationMember } = useAuthContext();
  const organizationId = currentOrganizationMember?.organization?.id;
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  
  // Estado do formulário
  const [formData, setFormData] = useState<{
    time_before: string;
    active: boolean;
  }>({
    time_before: '24 hours',
    active: true
  });
  
  // Carregar dados da configuração se estiver editando
  useEffect(() => {
    if (setting) {
      const normalizedTime = normalizeTimeFormat(setting.time_before || '24 hours');
      setFormData({
        time_before: normalizedTime,
        active: setting.active
      });
    }
  }, [setting]);
  
  // Manipular mudanças no formulário
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  // Manipular mudanças em checkboxes
  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: checked }));
  };
  
  // Enviar formulário
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError(null);
    
    try {
      // Validar campos obrigatórios
      if (!formData.time_before) {
        throw new Error(t('schedules:timeBeforeRequired'));
      }
      
      if (!organizationId) {
        throw new Error(t('common:organizationRequired'));
      }
      
      const settingData = {
        schedule_id: scheduleId,
        organization_id: organizationId,
        template_id: template.id,
        time_before: formData.time_before,
        active: formData.active
      };
      
      if (setting) {
        // Atualizar configuração existente via API
        await api.put(
          `/api/${organizationId}/schedules/notifications/settings/${setting.id}`,
          settingData
        );
      } else {
        // Criar nova configuração via API
        await api.post(
          `/api/${organizationId}/schedules/notifications/settings`,
          settingData
        );
      }
      
      // Invalidar caches relacionados para atualizar os dados na UI
      queryClient.invalidateQueries({ queryKey: ['notification-templates', scheduleId] });
      
      toast.success(setting 
        ? t('schedules:notificationTimingUpdatedSuccess') 
        : t('schedules:notificationTimingCreatedSuccess')
      );
      
      onSuccess();
    } catch (error: unknown) {
      console.error('Erro ao salvar configuração de tempo:', error);
      const apiError = error as ApiError;
      const errorMessage = apiError.response?.data?.error || 
                         (apiError.message || t('common:unexpectedError'));
      setFormError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Se o template não for do tipo before_appointment, não permitir configuração de tempo
  if (template.trigger_type !== 'before_appointment') {
    return (
      <div className="p-4 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-md">
        <p className="text-sm text-amber-600 dark:text-amber-400 flex items-center">
          <AlertTriangle className="h-4 w-4 mr-1 flex-shrink-0" />
          {t('schedules:timeBeforeNotApplicable')}
        </p>
        <div className="flex justify-end mt-4">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-900"
          >
            {t('common:back')}
          </button>
        </div>
      </div>
    );
  }
  
  // Verificar se o tempo atual está nas opções padrão
  const isCustomTime = !timeBeforeOptions.some(option => option.value === formData.time_before);
  
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-blue-50 dark:bg-blue-900/30 p-3 rounded-md mb-4">
        <h3 className="text-sm font-medium text-blue-800 dark:text-blue-300 flex items-center">
          <Clock className="h-4 w-4 mr-1" />
          {t('schedules:configureTimingFor')}
        </h3>
        <p className="mt-1 text-sm text-blue-700 dark:text-blue-400">
          {template.name}
        </p>
      </div>
      
      {/* Tempo antes do agendamento */}
      <div>
        <label htmlFor="time_before" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {t('schedules:timeBefore')} *
        </label>
        <select
          id="time_before"
          name="time_before"
          value={formData.time_before}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
          required
        >
          {timeBeforeOptions.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
          {/* Opção personalizada para formatos não padrão */}
          {isCustomTime && (
            <option value={formData.time_before}>{formData.time_before}</option>
          )}
        </select>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {t('schedules:timeBeforeDescription')}
        </p>
      </div>
      
      {/* Status ativo */}
      <div className="flex items-center">
        <input
          type="checkbox"
          id="active"
          name="active"
          checked={formData.active}
          onChange={handleCheckboxChange}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        />
        <label htmlFor="active" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
          {t('schedules:notificationActive')}
        </label>
      </div>
      
      {/* Erro */}
      {formError && (
        <div className="p-2 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-md">
          <p className="text-sm text-red-600 dark:text-red-400 flex items-center">
            <AlertTriangle className="h-4 w-4 mr-1 flex-shrink-0" />
            {formError}
          </p>
        </div>
      )}
      
      {/* Botões de ação */}
      <div className="flex justify-end space-x-2 pt-4 border-t border-gray-200 dark:border-gray-700">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-900"
          disabled={isSubmitting}
        >
          {t('common:cancel')}
        </button>
        <button
          type="submit"
          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <span className="animate-spin h-4 w-4 mr-2 border-t-2 border-b-2 border-white rounded-full" />
              {t('common:saving')}
            </>
          ) : (
            setting ? t('common:save') : t('common:create')
          )}
        </button>
      </div>
    </form>
  );
};

export default NotificationTimingForm; 