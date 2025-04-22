import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, PlusCircle, Trash2 } from 'lucide-react';
import { useAuthContext } from '../../contexts/AuthContext';
import { ScheduleNotificationTemplate } from '../../types/database';
import api from '../../lib/api';
import { useChannels } from '../../hooks/useQueryes';
import { useQueryClient } from '@tanstack/react-query';

interface NotificationTemplateFormProps {
  scheduleId: string;
  template?: ScheduleNotificationTemplate;
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

// Interface local para o formulário, compatível com ScheduleNotificationSetting
interface NotificationSetting {
  id: string;
  template_id: string;
  time_before: string;
  active: boolean;
}

const NotificationTemplateForm: React.FC<NotificationTemplateFormProps> = ({
  scheduleId,
  template,
  onSuccess,
  onCancel
}) => {
  const { t } = useTranslation(['schedules', 'common']);
  const { currentOrganizationMember } = useAuthContext();
  const organizationId = currentOrganizationMember?.organization?.id;
  const queryClient = useQueryClient();
  
  // Consulta para obter canais disponíveis
  const { data: channels, isLoading: isLoadingChannels } = useChannels(organizationId);
  
  // Estado do formulário
  const [formData, setFormData] = useState({
    name: '',
    channel_id: '',
    trigger_type: 'before_appointment',
    content: '',
    subject: '',
    active: true
  });
  
  // Estado de carregamento e erro
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Gerenciar settings localmente (carregados do template)
  const [notificationSettings, setNotificationSettings] = useState<NotificationSetting[]>([]);
  
  // Para múltiplas configurações de tempo
  const [timeSettings, setTimeSettings] = useState<string[]>(['24 hours']);
  console.log('timeSettings', timeSettings);

  // Inicializar settings do template quando disponível
  useEffect(() => {
    if (template?.settings) {
      // Se o template já tem settings (do hook useScheduleTemplates)
      // Converter ScheduleNotificationSetting para NotificationSetting
      const convertedSettings: NotificationSetting[] = template.settings.map(setting => ({
        id: setting.id,
        template_id: setting.template_id,
        time_before: setting.time_before || '24 hours',
        active: setting.active
      }));
      
      setNotificationSettings(convertedSettings);
      
      if (template.trigger_type === 'before_appointment' && template.settings.length > 0) {
        // Extrair os valores de time_before para o state
        const times = template.settings.map((setting: { time_before?: string }) => {
          // Tentar normalizar formatos de tempo inconsistentes
          const time = setting.time_before || '24 hours';
          
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
            } else {
              return time; // Manter o formato original se não puder converter
            }
          }
          
          return time;
        });
        
        setTimeSettings(times);
      }
    } else if (template?.id && organizationId) {
      // Fallback: buscar settings pela API só se não vier com o template
      const fetchSettings = async () => {
        try {
          const response = await api.get(`/api/${organizationId}/schedules/notifications/templates/${template.id}/settings`);
          const settings = response.data.data || [];
          setNotificationSettings(settings);
          
          if (template.trigger_type === 'before_appointment' && settings.length > 0) {
            const times = settings.map((setting: { time_before?: string }) => {
              // Aplicar a mesma lógica de normalização
              const time = setting.time_before || '24 hours';
              
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
                } else {
                  return time; // Manter o formato original se não puder converter
                }
              }
              
              return time;
            });
            
            setTimeSettings(times);
          }
        } catch (error) {
          console.error('Erro ao buscar configurações:', error);
        }
      };
      
      fetchSettings();
    }
  }, [template, organizationId]);
  
  // Preencher o formulário com dados do template se estiver editando
  useEffect(() => {
    if (template) {
      setFormData(prev => ({
        ...prev,
        name: template.name || '',
        channel_id: template.channel_id || '',
        trigger_type: template.trigger_type || 'before_appointment',
        content: template.content || '',
        subject: template.subject || '',
        active: template.active !== undefined ? template.active : true
      }));
    }
  }, [template]);
  
  // Verificar se o canal selecionado é do tipo email
  const isEmailChannel = () => {
    if (!formData.channel_id || !channels) return false;
    const selectedChannel = channels.find(channel => channel.id === formData.channel_id);
    return selectedChannel?.type === 'email';
  };
  
  // Manipular mudanças no formulário
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  // Manipular mudanças em checkboxes
  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: checked }));
  };

  // Manipular mudança em tempo específico
  const handleTimeChange = (index: number, value: string) => {
    const newTimes = [...timeSettings];
    
    // Verificar se já existe esse horário em outra posição
    const existingIndex = newTimes.findIndex((time, i) => time === value && i !== index);
    if (existingIndex !== -1) {
      // Mostrar erro temporário
      setError(t('schedules:duplicateTimesNotAllowed', 'Não é permitido escolher o mesmo horário mais de uma vez'));
      // Não permitir a alteração
      return;
    }
    
    // Limpar erro se estava mostrando erro de duplicação
    if (error === t('schedules:duplicateTimesNotAllowed', 'Não é permitido escolher o mesmo horário mais de uma vez')) {
      setError(null);
    }
    
    newTimes[index] = value;
    setTimeSettings(newTimes);
  };

  // Adicionar nova configuração de tempo
  const addTimeConfig = () => {
    // Escolher um horário que ainda não esteja na lista
    const allTimeOptions = ["10 minutes", "30 minutes", "1 hour", "2 hours", "3 hours", "12 hours", "24 hours", "2 days", "1 week"];
    const availableOptions = allTimeOptions.filter(option => !timeSettings.includes(option));
    
    // Se todos os horários já estiverem na lista, mostrar um erro
    if (availableOptions.length === 0) {
      setError(t('schedules:allTimesUsed', 'Todos os horários disponíveis já estão sendo utilizados'));
      return;
    }
    
    // Escolher o primeiro horário disponível
    setTimeSettings([...timeSettings, availableOptions[0]]);
  };

  // Remover configuração de tempo
  const removeTimeConfig = (index: number) => {
    // Não permitir remover se for a única configuração
    if (timeSettings.length <= 1) return;
    
    const newTimes = [...timeSettings];
    newTimes.splice(index, 1);
    setTimeSettings(newTimes);
  };
  
  // Enviar o formulário
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!organizationId) return;
    
    // Validar campos obrigatórios
    if (!formData.name || !formData.trigger_type || !formData.content) {
      setError(t('common:requiredFields'));
      return;
    }
    
    // Validar assunto para canais de email
    if (isEmailChannel() && !formData.subject) {
      setError(t('schedules:emailSubjectRequired'));
      return;
    }

    // Validar timeSettings para notificações do tipo before_appointment
    if (formData.trigger_type === 'before_appointment' && timeSettings.length === 0) {
      setError(t('schedules:timeBeforeRequired'));
      return;
    }
    
    // Verificar se há horários duplicados
    if (formData.trigger_type === 'before_appointment') {
      const uniqueTimes = new Set(timeSettings);
      if (uniqueTimes.size !== timeSettings.length) {
        setError(t('schedules:duplicateTimesNotAllowed', 'Não é permitido escolher o mesmo horário mais de uma vez'));
        return;
      }
    }
    
    setSaving(true);
    setError(null);
    
    try {
      // Preparar os dados para o template
      const templateData = {
        name: formData.name,
        channel_id: formData.channel_id,
        trigger_type: formData.trigger_type,
        content: formData.content,
        subject: formData.subject,
        active: formData.active,
        time_settings: formData.trigger_type === 'before_appointment' ? timeSettings : []
      };

      if (template) {
        // Atualizar template existente
        await api.put(`/api/${organizationId}/schedules/notifications/templates/${template.id}`, {
          ...templateData,
          // Para template existente, enviar também o ID das settings existentes para o backend
          // distinguir entre criar, atualizar e excluir
          existing_settings: notificationSettings.map(setting => ({
            id: setting.id,
            time_before: setting.time_before
          }))
        });
      } else {
        // Criar novo template
        await api.post(`/api/${organizationId}/schedules/notifications/templates`, {
          schedule_id: scheduleId,
          organization_id: organizationId,
          ...templateData
        });
      }
      
      // Invalidar caches relacionados
      queryClient.invalidateQueries({ queryKey: ['notification-templates', scheduleId] });
      
      onSuccess();
    } catch (error: unknown) {
      const apiError = error as ApiError;
      console.error('Erro ao salvar template:', error);
      setError(apiError.response?.data?.error || apiError.message || t('common:errorSaving'));
    } finally {
      setSaving(false);
    }
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 p-4 rounded-md">
          {error}
        </div>
      )}
      
      {/* Nome do template */}
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {t('schedules:templateName')} *
        </label>
        <input
          type="text"
          id="name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          required
          className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
          placeholder={t('schedules:templateNamePlaceholder')}
        />
      </div>
      
      {/* Canal de notificação */}
      <div>
        <label htmlFor="channel_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {t('schedules:notificationChannel')}
        </label>
        <select
          id="channel_id"
          name="channel_id"
          value={formData.channel_id}
          onChange={handleChange}
          className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
        >
          <option value="">{t('schedules:selectChannel')}</option>
          {isLoadingChannels ? (
            <option disabled>{t('common:loading')}</option>
          ) : (
            channels?.map(channel => (
              <option key={channel.id} value={channel.id}>
                {channel.name} ({channel.type})
              </option>
            ))
          )}
        </select>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          {t('schedules:channelHelp')}
        </p>
      </div>
      
      {/* Tipo de gatilho */}
      <div>
        <label htmlFor="trigger_type" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {t('schedules:triggerType')} *
        </label>
        <select
          id="trigger_type"
          name="trigger_type"
          value={formData.trigger_type}
          onChange={handleChange}
          required
          className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
        >
          <option value="before_appointment">{t('schedules:triggerBeforeAppointment')}</option>
          <option value="on_confirmation">{t('schedules:triggerOnConfirmation')}</option>
          <option value="on_cancellation">{t('schedules:triggerOnCancellation')}</option>
          <option value="after_appointment">{t('schedules:triggerAfterAppointment')}</option>
          <option value="on_reschedule">{t('schedules:triggerOnReschedule')}</option>
          <option value="on_no_show">{t('schedules:triggerOnNoShow')}</option>
        </select>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          {t('schedules:triggerHelp')}
        </p>
      </div>

      {/* Configurações de tempo para before_appointment */}
      {formData.trigger_type === 'before_appointment' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('schedules:notificationTimes')} *
            </h3>
            <button
              type="button"
              onClick={addTimeConfig}
              className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
            >
              <PlusCircle className="h-4 w-4 mr-1" />
              {t('schedules:addTime')}
            </button>
          </div>
          
          {timeSettings.map((time, index) => (
            <div key={index} className="flex items-center space-x-2">
              <select
                value={time}
                onChange={(e) => handleTimeChange(index, e.target.value)}
                required
                className="flex-1 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="10 minutes">10 {t('schedules:minutes')}</option>
                <option value="30 minutes">30 {t('schedules:minutes')}</option>
                <option value="1 hour">1 {t('schedules:hour')}</option>
                <option value="2 hours">2 {t('schedules:hours')}</option>
                <option value="3 hours">3 {t('schedules:hours')}</option>
                <option value="12 hours">12 {t('schedules:hours')}</option>
                <option value="24 hours">24 {t('schedules:hours')}</option>
                <option value="2 days">2 {t('schedules:days')}</option>
                <option value="1 week">1 {t('schedules:week')}</option>
                {/* Adicionado opção personalizada para valores que não correspondem às opções padrão */}
                {!["10 minutes", "30 minutes", "1 hour", "2 hours", "3 hours", "12 hours", "24 hours", "2 days", "1 week"].includes(time) && (
                  <option value={time}>{time}</option>
                )}
              </select>
              {timeSettings.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeTimeConfig(index)}
                  className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
          
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {t('schedules:multipleTimesHelp')}
          </p>
        </div>
      )}
      
      {/* Assunto (apenas para email) */}
      {isEmailChannel() && (
        <div>
          <label htmlFor="subject" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('schedules:emailSubject')} *
          </label>
          <input
            type="text"
            id="subject"
            name="subject"
            value={formData.subject}
            onChange={handleChange}
            required={isEmailChannel()}
            className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
            placeholder={t('schedules:emailSubjectPlaceholder')}
          />
        </div>
      )}
      
      {/* Conteúdo da notificação */}
      <div>
        <label htmlFor="content" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {t('schedules:notificationContent')} *
        </label>
        <textarea
          id="content"
          name="content"
          value={formData.content}
          onChange={handleChange}
          required
          rows={6}
          className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
          placeholder={t('schedules:contentPlaceholder')}
        />
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          {t('schedules:variablesHelp')}:
          <br />
          <code>{'{{name}}, {{provider}}, {{service}}, {{schedule}}, {{date}}, {{hour}}, {{start_time}}, {{end_time}}, {{organization}}'}</code>
        </p>
      </div>
      
      {/* Ativo */}
      <div className="flex items-center">
        <input
          type="checkbox"
          id="active"
          name="active"
          checked={formData.active}
          onChange={handleCheckboxChange}
          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:focus:ring-blue-400"
        />
        <label htmlFor="active" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
          {t('schedules:templateActive')}
        </label>
      </div>
      
      {/* Botões */}
      <div className="flex justify-end space-x-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          {t('common:cancel')}
        </button>
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {t('common:saving')}
            </>
          ) : (
            t('common:save')
          )}
        </button>
      </div>
    </form>
  );
};

export default NotificationTemplateForm; 