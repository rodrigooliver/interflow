import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Calendar, 
  Clock, 
  PlusCircle, 
  Edit, 
  Trash2, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowLeft,
  Plus,
  X
} from 'lucide-react';
import { useSchedule, useScheduleProviders, useProviderAvailability } from '../../../hooks/useQueryes';
import { ScheduleAvailability } from '../../../types/database';
import { supabase } from '../../../lib/supabase';

interface AvailabilityFormData {
  providerId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

const ScheduleAvailabilityPage: React.FC = () => {
  const { t } = useTranslation(['schedules', 'common']);
  const { scheduleId } = useParams<{ scheduleId: string }>();
  const navigate = useNavigate();
  
  // Buscar dados da agenda
  const { data: schedule, isLoading: isLoadingSchedule } = useSchedule(scheduleId);
  const { data: providers, isLoading: isLoadingProviders } = useScheduleProviders(scheduleId);
  
  // Estado para o provedor selecionado
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(null);
  
  // Buscar a disponibilidade do provedor selecionado
  const { data: availability, refetch: refetchAvailability } = useProviderAvailability(selectedProviderId || undefined);
  
  // Estados para o formulário
  const [formOpen, setFormOpen] = useState(false);
  const [editingAvailability, setEditingAvailability] = useState<ScheduleAvailability | null>(null);
  const [formData, setFormData] = useState<AvailabilityFormData>({
    providerId: '',
    dayOfWeek: 1, // Segunda-feira como padrão
    startTime: '08:00',
    endTime: '18:00'
  });
  
  // Estados para mensagens
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Efeito para definir o provedor selecionado inicialmente
  React.useEffect(() => {
    if (providers && providers.length > 0 && !selectedProviderId) {
      setSelectedProviderId(providers[0].id);
      setFormData(prev => ({ ...prev, providerId: providers[0].id }));
    }
  }, [providers, selectedProviderId]);
  
  // Função para lidar com a seleção de um provedor
  const handleProviderSelect = (providerId: string) => {
    setSelectedProviderId(providerId);
    setFormData(prev => ({ ...prev, providerId }));
  };
  
  // Função para abrir o formulário para adicionar nova disponibilidade
  const handleAddAvailability = () => {
    setEditingAvailability(null);
    setFormData({
      providerId: selectedProviderId || '',
      dayOfWeek: 1,
      startTime: '08:00',
      endTime: '18:00'
    });
    setFormOpen(true);
  };
  
  // Função para abrir o formulário para editar disponibilidade existente
  const handleEditAvailability = (item: ScheduleAvailability) => {
    setEditingAvailability(item);
    setFormData({
      providerId: item.provider_id,
      dayOfWeek: item.day_of_week,
      startTime: item.start_time.slice(0, 5), // Formato HH:MM
      endTime: item.end_time.slice(0, 5) // Formato HH:MM
    });
    setFormOpen(true);
  };
  
  // Função para excluir disponibilidade
  const handleDeleteAvailability = async (id: string) => {
    if (!window.confirm(t('schedules:confirmDeleteAvailability'))) return;
    
    try {
      const { error } = await supabase
        .from('schedule_availability')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      
      setSuccess(t('schedules:availabilityDeletedSuccess'));
      refetchAvailability();
    } catch (e) {
      console.error('Erro ao excluir disponibilidade:', e);
      setError(
        e instanceof Error 
          ? e.message 
          : t('schedules:availabilityDeleteError')
      );
    }
  };
  
  // Função para salvar a disponibilidade (criar ou atualizar)
  const handleSaveAvailability = async () => {
    try {
      // Validar os dados
      if (!formData.providerId) {
        throw new Error(t('schedules:providerRequired'));
      }
      
      if (formData.startTime >= formData.endTime) {
        throw new Error(t('schedules:startTimeMustBeBeforeEndTime'));
      }
      
      // Converter para o formato correto
      const data = {
        provider_id: formData.providerId,
        day_of_week: formData.dayOfWeek,
        start_time: `${formData.startTime}:00`, // Adicionar segundos
        end_time: `${formData.endTime}:00` // Adicionar segundos
      };
      
      let result;
      
      if (editingAvailability) {
        // Atualizar disponibilidade existente
        result = await supabase
          .from('schedule_availability')
          .update(data)
          .eq('id', editingAvailability.id);
      } else {
        // Criar nova disponibilidade
        result = await supabase
          .from('schedule_availability')
          .insert(data);
      }
      
      if (result.error) throw result.error;
      
      setSuccess(
        editingAvailability
          ? t('schedules:availabilityUpdatedSuccess')
          : t('schedules:availabilityCreatedSuccess')
      );
      
      // Limpar o formulário e refetch
      setFormOpen(false);
      setEditingAvailability(null);
      refetchAvailability();
      
    } catch (e) {
      console.error('Erro ao salvar disponibilidade:', e);
      setError(
        e instanceof Error 
          ? e.message 
          : t('schedules:availabilitySaveError')
      );
    }
  };
  
  // Função para cancelar o formulário
  const handleCancelForm = () => {
    setFormOpen(false);
    setEditingAvailability(null);
  };
  
  // Array dos dias da semana para exibição
  const weekdays = [
    { value: 0, label: t('schedules:sunday') },
    { value: 1, label: t('schedules:monday') },
    { value: 2, label: t('schedules:tuesday') },
    { value: 3, label: t('schedules:wednesday') },
    { value: 4, label: t('schedules:thursday') },
    { value: 5, label: t('schedules:friday') },
    { value: 6, label: t('schedules:saturday') }
  ];
  
  // Função para obter o nome do dia da semana
  const getDayName = (dayOfWeek: number) => {
    return weekdays.find(day => day.value === dayOfWeek)?.label || '';
  };
  
  // Função para formatar o horário
  const formatTime = (time: string) => {
    if (!time) return '';
    
    // Se já estiver no formato HH:MM, não precisa processar
    if (time.length === 5) return time;
    
    // Se estiver no formato HH:MM:SS, remover os segundos
    return time.slice(0, 5);
  };
  
  // Voltar usando o history do navegador
  const handleGoBack = () => {
    navigate(-1);
  };
  
  if (isLoadingSchedule || isLoadingProviders) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin h-8 w-8 border-4 border-blue-600 rounded-full border-t-transparent"></div>
      </div>
    );
  }
  
  if (!schedule) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <AlertTriangle className="h-12 w-12 text-yellow-500 mb-4" />
        <h1 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">
          {t('schedules:scheduleNotFound')}
        </h1>
        <p className="text-gray-600 dark:text-gray-300">
          {t('schedules:scheduleNotFoundDescription')}
        </p>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
        <div className="flex items-center">
          <button 
            onClick={handleGoBack}
            className="mr-3 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label={t('common:back')}
          >
            <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-300" />
          </button>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
            {t('schedules:manageAvailability')}: {schedule.title}
          </h1>
        </div>
      </div>
      
      {error && (
        <div className="mb-6 p-4 bg-red-100 border border-red-200 text-red-700 rounded-lg flex items-start">
          <AlertTriangle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
          <button 
            onClick={() => setError(null)} 
            className="ml-auto text-red-500 hover:text-red-700"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      )}
      
      {success && (
        <div className="mb-6 p-4 bg-green-100 border border-green-200 text-green-700 rounded-lg flex items-start">
          <CheckCircle2 className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
          <span>{success}</span>
          <button 
            onClick={() => setSuccess(null)} 
            className="ml-auto text-green-500 hover:text-green-700"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      )}
      
      {/* Seletor de Profissional */}
      {providers && providers.length > 0 ? (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
            {t('schedules:selectProvider')}
          </h2>
          <div className="flex flex-wrap gap-3">
            {providers.map(provider => (
              <button
                key={provider.id}
                onClick={() => handleProviderSelect(provider.id)}
                className={`flex items-center px-5 py-3 rounded-lg transition-all duration-200 ${
                  selectedProviderId === provider.id
                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 border-2 border-blue-500 shadow-md'
                    : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200 border-2 border-transparent hover:bg-gray-200 dark:hover:bg-gray-600 hover:shadow'
                }`}
              >
                {provider.avatar_url ? (
                  <img 
                    src={provider.avatar_url} 
                    alt={provider.name || ''} 
                    className="h-7 w-7 rounded-full mr-3"
                  />
                ) : (
                  <div className="h-7 w-7 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center mr-3">
                    <span className="text-xs font-bold text-gray-600 dark:text-gray-300">
                      {provider.name ? provider.name.charAt(0).toUpperCase() : '?'}
                    </span>
                  </div>
                )}
                <span className="font-medium">{provider.name || t('schedules:unnamed')}</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="mb-8 p-6 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <div className="flex items-start">
            <AlertTriangle className="h-6 w-6 text-yellow-500 mr-3 mt-0.5" />
            <div>
              <h3 className="text-lg font-medium text-yellow-800 dark:text-yellow-200 mb-1">
                {t('schedules:noProvidersYet')}
              </h3>
              <p className="text-yellow-700 dark:text-yellow-300">
                {t('schedules:addProvidersToSchedule')}
              </p>
              <button
                onClick={() => navigate(`/app/schedules/${scheduleId}/management`)}
                className="mt-4 inline-flex items-center px-4 py-2 text-sm font-medium rounded-md bg-yellow-100 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-200 hover:bg-yellow-200 dark:hover:bg-yellow-700 transition-colors shadow-sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                {t('schedules:manageProviders')}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Área principal */}
      {selectedProviderId && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white flex items-center">
              <Calendar className="h-5 w-5 mr-2 text-blue-600 dark:text-blue-400" />
              {t('schedules:availability')}
            </h2>
            <button
              onClick={handleAddAvailability}
              className="inline-flex items-center px-4 py-2.5 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-sm transition-all duration-200 hover:shadow"
            >
              <PlusCircle className="h-4 w-4 mr-2" />
              {t('schedules:addAvailability')}
            </button>
          </div>
          
          {/* Lista de horários disponíveis */}
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {availability && availability.length > 0 ? (
              availability.map(item => (
                <div key={item.id} className="p-5 flex justify-between items-center hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <div className="flex items-center">
                    <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mr-4">
                      <Clock className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <h3 className="text-base font-medium text-gray-900 dark:text-white mb-1">
                        {getDayName(item.day_of_week)}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center">
                        <Clock className="h-3.5 w-3.5 mr-1.5 text-gray-400 dark:text-gray-500" />
                        {formatTime(item.start_time)} - {formatTime(item.end_time)}
                      </p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEditAvailability(item)}
                      className="p-2 text-gray-600 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      aria-label={t('common:edit')}
                    >
                      <Edit className="h-4.5 w-4.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteAvailability(item.id)}
                      className="p-2 text-gray-600 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      aria-label={t('common:delete')}
                    >
                      <Trash2 className="h-4.5 w-4.5" />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400 flex flex-col items-center">
                <Clock className="h-12 w-12 text-gray-300 dark:text-gray-600 mb-3" />
                {t('schedules:noAvailabilityConfigured')}
                <p className="mt-2 text-sm text-gray-400 dark:text-gray-500">
                  {t('schedules:setupAvailabilityHours')}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Modal de formulário */}
      {formOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div 
            className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
                {editingAvailability 
                  ? t('schedules:editAvailability') 
                  : t('schedules:addAvailability')
                }
              </h3>
              <button
                onClick={handleCancelForm}
                className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6">
              <form onSubmit={(e) => { e.preventDefault(); handleSaveAvailability(); }}>
                {/* Dia da semana */}
                <div className="mb-5">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('schedules:dayOfWeek')}
                  </label>
                  <select
                    value={formData.dayOfWeek}
                    onChange={(e) => setFormData({ ...formData, dayOfWeek: parseInt(e.target.value) })}
                    className="block w-full px-4 py-3 rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                  >
                    {weekdays.map(day => (
                      <option key={day.value} value={day.value}>
                        {day.label}
                      </option>
                    ))}
                  </select>
                </div>
                
                {/* Horários */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t('schedules:startTime')}
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Clock className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                      </div>
                      <input
                        type="time"
                        value={formData.startTime}
                        onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                        className="block w-full pl-10 pr-4 py-3 rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t('schedules:endTime')}
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Clock className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                      </div>
                      <input
                        type="time"
                        value={formData.endTime}
                        onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                        className="block w-full pl-10 pr-4 py-3 rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                        required
                      />
                    </div>
                  </div>
                </div>
                
                {/* Botões */}
                <div className="flex justify-end space-x-3 mt-8">
                  <button
                    type="button"
                    onClick={handleCancelForm}
                    className="px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-150"
                  >
                    {t('common:cancel')}
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2.5 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-150"
                  >
                    {t('common:save')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScheduleAvailabilityPage; 