import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Bell, 
  Plus, 
  Trash2, 
  PencilLine, 
  Clock, 
  Loader2, 
  CheckCircle2, 
  AlertTriangle,
  RefreshCw,
  Calendar
} from 'lucide-react';
import { useAuthContext } from '../../contexts/AuthContext';
import { ScheduleNotificationTemplate, ScheduleNotificationSetting } from '../../types/database';
import api from '../../lib/api';
import NotificationTemplateForm from './NotificationTemplateForm';
import NotificationTimingForm from './NotificationTimingForm';
import { useScheduleTemplates } from '../../hooks/useQueryes';
import { Modal } from '../ui/Modal';
import { useQueryClient } from '@tanstack/react-query';

interface NotificationManagerProps {
  scheduleId: string;
}

interface ApiError {
  response?: {
    data?: {
      error?: string;
    };
  };
  message?: string;
}

const NotificationManager: React.FC<NotificationManagerProps> = ({ scheduleId }) => {
  const { t } = useTranslation(['schedules', 'common']);
  const { currentOrganizationMember } = useAuthContext();
  const organizationId = currentOrganizationMember?.organization?.id;
  const queryClient = useQueryClient();

  // Usar o hook para carregar templates e suas configurações
  const { data: templates = [], isLoading, error: fetchError, refetch: refetchTemplates } = useScheduleTemplates(scheduleId);
  
  // Estados para exibição de mensagens
  const [error, setError] = useState<string | null>(fetchError ? String(fetchError) : null);
  const [success, setSuccess] = useState<string | null>(null);

  // Estados para edição
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [showTimingForm, setShowTimingForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ScheduleNotificationTemplate | null>(null);
  const [editingSetting, setEditingSetting] = useState<ScheduleNotificationSetting | null>(null);

  // Estados para exclusão
  const [deletingTemplateId, setDeletingTemplateId] = useState<string | null>(null);
  const [deletingSettingId, setDeletingSettingId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Função para criar um novo template
  const handleCreateTemplate = () => {
    setEditingTemplate(null);
    setShowTemplateForm(true);
  };

  // Função para editar um template
  const handleEditTemplate = (template: ScheduleNotificationTemplate) => {
    setEditingTemplate(template);
    setShowTemplateForm(true);
  };

  // Função para confirmar exclusão de um template
  const handleConfirmDeleteTemplate = (id: string) => {
    setDeletingTemplateId(id);
    setShowDeleteConfirm(true);
  };

  // Função para invalidar os caches relevantes
  const invalidateRelatedCaches = () => {
    // Invalidar cache de templates de notificação
    queryClient.invalidateQueries({ queryKey: ['notification-templates', scheduleId] });
  };

  // Função para excluir um template
  const handleDeleteTemplate = async () => {
    if (!organizationId || !deletingTemplateId) return;
    
    setDeleting(true);
    
    try {
      await api.delete(`/api/${organizationId}/schedules/notifications/templates/${deletingTemplateId}`);
      
      // Invalidar caches
      invalidateRelatedCaches();
      
      // Atualizar os dados
      refetchTemplates();
      
      setSuccess(t('schedules:templateDeletedSuccess'));
      setTimeout(() => setSuccess(null), 3000);
    } catch (error: unknown) {
      const apiError = error as ApiError;
      console.error('Erro ao excluir template:', error);
      setError(apiError.response?.data?.error || apiError.message || 'Erro ao excluir template');
      setTimeout(() => setError(null), 5000);
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
      setDeletingTemplateId(null);
    }
  };

  // Função para adicionar configuração de tempo
  const handleAddTiming = (template: ScheduleNotificationTemplate) => {
    setEditingSetting(null);
    setEditingTemplate(template);
    setShowTimingForm(true);
  };

  // Função para editar configuração de tempo
  const handleEditTiming = (setting: ScheduleNotificationSetting, template: ScheduleNotificationTemplate) => {
    setEditingSetting(setting);
    setEditingTemplate(template);
    setShowTimingForm(true);
  };

  // Função para confirmar exclusão de configuração
  const handleConfirmDeleteTiming = (id: string) => {
    setDeletingSettingId(id);
    setShowDeleteConfirm(true);
  };

  // Função para excluir configuração
  const handleDeleteTiming = async () => {
    if (!organizationId || !deletingSettingId) return;
    
    setDeleting(true);
    
    try {
      await api.delete(`/api/${organizationId}/schedules/notifications/settings/${deletingSettingId}`);
      
      // Invalidar caches
      invalidateRelatedCaches();
      
      // Atualizar os dados
      refetchTemplates();
      
      setSuccess(t('schedules:settingDeletedSuccess'));
      setTimeout(() => setSuccess(null), 3000);
    } catch (error: unknown) {
      const apiError = error as ApiError;
      console.error('Erro ao excluir configuração:', error);
      setError(apiError.response?.data?.error || apiError.message || 'Erro ao excluir configuração');
      setTimeout(() => setError(null), 5000);
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
      setDeletingSettingId(null);
    }
  };

  // Função para lidar com o sucesso do formulário de template
  const handleTemplateFormSuccess = () => {
    setShowTemplateForm(false);
    // Invalidar caches
    refetchTemplates();
    setSuccess(t('schedules:templateSavedSuccess'));
    setTimeout(() => setSuccess(null), 3000);
  };

  // Função para lidar com o sucesso do formulário de configuração
  const handleTimingFormSuccess = () => {
    setShowTimingForm(false);
    // Invalidar caches
    refetchTemplates();
    setSuccess(t('schedules:settingSavedSuccess'));
    setTimeout(() => setSuccess(null), 3000);
  };

  // Função para obter o nome do tipo de gatilho
  const getTriggerTypeName = (triggerType: string) => {
    switch (triggerType) {
      case 'before_appointment':
        return t('schedules:triggerBeforeAppointment');
      case 'on_confirmation':
        return t('schedules:triggerOnConfirmation');
      case 'on_cancellation':
        return t('schedules:triggerOnCancellation');
      case 'after_appointment':
        return t('schedules:triggerAfterAppointment');
      case 'on_reschedule':
        return t('schedules:triggerOnReschedule');
      case 'on_no_show':
        return t('schedules:triggerOnNoShow');
      default:
        return triggerType;
    }
  };

  // Função para obter o ícone do tipo de gatilho
  const getTriggerTypeIcon = (triggerType: string) => {
    switch (triggerType) {
      case 'before_appointment':
        return <Clock className="h-4 w-4" />;
      case 'on_confirmation':
        return <CheckCircle2 className="h-4 w-4" />;
      case 'on_cancellation':
        return <AlertTriangle className="h-4 w-4" />;
      case 'after_appointment':
        return <Calendar className="h-4 w-4" />;
      case 'on_reschedule':
        return <RefreshCw className="h-4 w-4" />;
      case 'on_no_show':
        return <Calendar className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  // Função para formatar o tempo antes
  const formatTimeBefore = (timeBefore: string) => {
    const [quantity, unit] = timeBefore.split(' ');
    
    switch (unit) {
      case 'minutes':
        return `${quantity} ${t('schedules:minutes')}`;
      case 'minute':
        return `${quantity} ${t('schedules:minute')}`;
      case 'hours':
        return `${quantity} ${t('schedules:hours')}`;
      case 'hour':
        return `${quantity} ${t('schedules:hour')}`;
      case 'days':
        return `${quantity} ${t('schedules:days')}`;
      case 'day':
        return `${quantity} ${t('schedules:day')}`;
      case 'weeks':
        return `${quantity} ${t('schedules:weeks')}`;
      case 'week':
        return `${quantity} ${t('schedules:week')}`;
      default:
        return timeBefore;
    }
  };

  // Renderizar carregamento
  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Mensagens de erro/sucesso */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 p-4 rounded-md flex items-center">
          <AlertTriangle className="h-5 w-5 mr-2 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
      
      {success && (
        <div className="bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 p-4 rounded-md flex items-center">
          <CheckCircle2 className="h-5 w-5 mr-2 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}
      
      {/* Cabeçalho e botão de adicionar */}
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
          <Bell className="h-5 w-5 mr-2" />
          {t('schedules:notificationTemplates')}
        </h2>
        <button
          type="button"
          onClick={handleCreateTemplate}
          className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <Plus className="h-4 w-4 mr-1" />
          {t('schedules:addTemplate')}
        </button>
      </div>
      
      {/* Lista de templates */}
      {templates.length === 0 ? (
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-6 text-center">
          <Bell className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-3" />
          <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-1">
            {t('schedules:noTemplates')}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t('schedules:addFirstTemplate')}
          </p>
          <button
            type="button"
            onClick={handleCreateTemplate}
            className="mt-4 inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Plus className="h-4 w-4 mr-1" />
            {t('schedules:addTemplate')}
          </button>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg overflow-hidden">
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {templates.map(template => {
              // As configurações já vêm junto com o template graças ao hook
              const templateSettings = template.settings || [];
              
              return (
                <li key={template.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          template.active
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
                        }`}>
                          {template.active ? t('common:active') : t('common:inactive')}
                        </span>
                        
                        <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                          {getTriggerTypeIcon(template.trigger_type)}
                          <span className="ml-1">{getTriggerTypeName(template.trigger_type)}</span>
                        </span>
                        
                        {template.channel && (
                          <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300">
                            {template.channel.name}
                          </span>
                        )}
                      </div>
                      
                      <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                        {template.name}
                      </h3>
                      
                      <div className="mt-2 text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                        {template.content}
                      </div>
                      
                      {/* Configurações de tempo */}
                      {template.trigger_type === 'before_appointment' && (
                        <div className="mt-3">
                          <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                            {t('schedules:timingSettings')}
                          </h4>
                          
                          {templateSettings.length > 0 ? (
                            <ul className="space-y-1">
                              {templateSettings.map((setting: ScheduleNotificationSetting) => (
                                <li key={setting.id} className="flex items-center justify-between text-sm">
                                  <div className="flex items-center">
                                    <Clock className="h-3 w-3 text-gray-400 mr-1" />
                                    <span className="text-gray-600 dark:text-gray-300">
                                      {formatTimeBefore(setting.time_before || '')}
                                    </span>
                                    {!setting.active && (
                                      <span className="ml-2 text-xs text-gray-400 dark:text-gray-500">
                                        ({t('common:inactive')})
                                      </span>
                                    )}
                                  </div>
                                  
                                  <div className="flex items-center space-x-2">
                                    <button
                                      type="button"
                                      onClick={() => handleEditTiming(setting, template)}
                                      className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                                    >
                                      <PencilLine className="h-4 w-4" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleConfirmDeleteTiming(setting.id)}
                                      className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  </div>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {t('schedules:noTimingSettings')}
                            </p>
                          )}
                          
                          <button
                            type="button"
                            onClick={() => handleAddTiming(template)}
                            className="mt-2 inline-flex items-center text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            {t('schedules:addTiming')}
                          </button>
                        </div>
                      )}
                    </div>
                    
                    <div className="ml-4 flex-shrink-0 flex space-x-2">
                      <button
                        type="button"
                        onClick={() => handleEditTemplate(template)}
                        className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                      >
                        <PencilLine className="h-5 w-5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleConfirmDeleteTemplate(template.id)}
                        className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
      
      {/* Modal para formulário de template */}
      <Modal
        isOpen={showTemplateForm}
        onClose={() => setShowTemplateForm(false)}
        title={editingTemplate ? t('schedules:editTemplate') : t('schedules:newTemplate')}
        size="lg"
      >
        <NotificationTemplateForm
          scheduleId={scheduleId}
          template={editingTemplate || undefined}
          onSuccess={handleTemplateFormSuccess}
          onCancel={() => setShowTemplateForm(false)}
        />
      </Modal>
      
      {/* Modal para formulário de configuração de tempo */}
      <Modal
        isOpen={showTimingForm && editingTemplate !== null}
        onClose={() => setShowTimingForm(false)}
        title={editingSetting ? t('schedules:editTiming') : t('schedules:newTiming')}
        size="md"
      >
        {editingTemplate && (
          <NotificationTimingForm
            scheduleId={scheduleId}
            template={editingTemplate}
            setting={editingSetting || undefined}
            onSuccess={handleTimingFormSuccess}
            onCancel={() => setShowTimingForm(false)}
          />
        )}
      </Modal>
      
      {/* Modal de confirmação de exclusão */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              {deletingTemplateId 
                ? t('schedules:confirmDeleteTemplate')
                : t('schedules:confirmDeleteTiming')
              }
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              {deletingTemplateId 
                ? t('schedules:deleteTemplateWarning')
                : t('schedules:deleteTimingWarning')
              }
            </p>
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeletingTemplateId(null);
                  setDeletingSettingId(null);
                }}
                disabled={deleting}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md"
              >
                {t('common:cancel')}
              </button>
              <button
                type="button"
                onClick={deletingTemplateId ? handleDeleteTemplate : handleDeleteTiming}
                disabled={deleting}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md flex items-center disabled:opacity-50"
              >
                {deleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {t('common:delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationManager; 