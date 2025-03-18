import React, { useState, useEffect } from 'react';
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
  X,
  CalendarOff,
  CalendarRange
} from 'lucide-react';
import { useSchedule, useScheduleProviders } from '../../../hooks/useQueryes';
import { supabase } from '../../../lib/supabase';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Holiday {
  id: string;
  schedule_id: string;
  provider_id: string | null;
  title: string;
  date: string;
  all_day: boolean;
  start_time: string | null;
  end_time: string | null;
  recurring: boolean;
  created_at: string;
  updated_at: string;
}

interface HolidayFormData {
  providerId: string | null;
  title: string;
  date: string;
  allDay: boolean;
  startTime: string;
  endTime: string;
  recurring: boolean;
}

const ScheduleHolidaysPage: React.FC = () => {
  const { t } = useTranslation(['schedules', 'common']);
  const { scheduleId } = useParams<{ scheduleId: string }>();
  const navigate = useNavigate();
  
  // Buscar dados da agenda e prestadores
  const { data: schedule, isLoading: isLoadingSchedule } = useSchedule(scheduleId);
  const { data: providers, isLoading: isLoadingProviders } = useScheduleProviders(scheduleId);
  
  // Estados
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [isLoadingHolidays, setIsLoadingHolidays] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);
  const [formData, setFormData] = useState<HolidayFormData>({
    providerId: null,
    title: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    allDay: true,
    startTime: '09:00',
    endTime: '18:00',
    recurring: false
  });
  
  // Estados para mensagens
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Buscar feriados/folgas
  const fetchHolidays = async () => {
    if (!scheduleId) return;
    
    try {
      setIsLoadingHolidays(true);
      
      const { data, error } = await supabase
        .from('schedule_holidays')
        .select('*')
        .eq('schedule_id', scheduleId)
        .order('date', { ascending: true });
        
      if (error) throw error;
      
      setHolidays(data || []);
    } catch (e) {
      console.error('Erro ao buscar feriados:', e);
      setError(
        e instanceof Error 
          ? e.message 
          : t('schedules:holidaysFetchError')
      );
    } finally {
      setIsLoadingHolidays(false);
    }
  };
  
  // Efeito para buscar feriados ao carregar a página
  useEffect(() => {
    fetchHolidays();
  }, [scheduleId]);
  
  // Função para abrir o formulário para adicionar um novo feriado
  const handleAddHoliday = () => {
    setEditingHoliday(null);
    setFormData({
      providerId: null,
      title: '',
      date: format(new Date(), 'yyyy-MM-dd'),
      allDay: true,
      startTime: '09:00',
      endTime: '18:00',
      recurring: false
    });
    setFormOpen(true);
  };
  
  // Função para abrir o formulário para editar um feriado existente
  const handleEditHoliday = (holiday: Holiday) => {
    setEditingHoliday(holiday);
    setFormData({
      providerId: holiday.provider_id,
      title: holiday.title,
      date: holiday.date,
      allDay: holiday.all_day,
      startTime: holiday.start_time ? holiday.start_time.slice(0, 5) : '09:00',
      endTime: holiday.end_time ? holiday.end_time.slice(0, 5) : '18:00',
      recurring: holiday.recurring
    });
    setFormOpen(true);
  };
  
  // Função para excluir um feriado
  const handleDeleteHoliday = async (id: string) => {
    if (!window.confirm(t('schedules:confirmDeleteHoliday'))) return;
    
    try {
      const { error } = await supabase
        .from('schedule_holidays')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      
      setSuccess(t('schedules:holidayDeletedSuccess'));
      fetchHolidays(); // Recarregar a lista
    } catch (e) {
      console.error('Erro ao excluir feriado:', e);
      setError(
        e instanceof Error 
          ? e.message 
          : t('schedules:holidayDeleteError')
      );
    }
  };
  
  // Função para salvar o feriado (criar ou atualizar)
  const handleSaveHoliday = async () => {
    try {
      // Validar os dados
      if (!formData.title.trim()) {
        throw new Error(t('schedules:titleRequired'));
      }
      
      if (!formData.date) {
        throw new Error(t('schedules:dateRequired'));
      }
      
      if (!formData.allDay && (!formData.startTime || !formData.endTime)) {
        throw new Error(t('schedules:timeRequiredWhenNotAllDay'));
      }
      
      if (!formData.allDay && formData.startTime >= formData.endTime) {
        throw new Error(t('schedules:startTimeMustBeBeforeEndTime'));
      }
      
      // Preparar os dados
      const data = {
        schedule_id: scheduleId,
        provider_id: formData.providerId,
        title: formData.title.trim(),
        date: formData.date,
        all_day: formData.allDay,
        start_time: formData.allDay ? null : `${formData.startTime}:00`,
        end_time: formData.allDay ? null : `${formData.endTime}:00`,
        recurring: formData.recurring
      };
      
      let result;
      
      if (editingHoliday) {
        // Atualizar feriado existente
        result = await supabase
          .from('schedule_holidays')
          .update(data)
          .eq('id', editingHoliday.id);
      } else {
        // Criar novo feriado
        result = await supabase
          .from('schedule_holidays')
          .insert(data);
      }
      
      if (result.error) throw result.error;
      
      setSuccess(
        editingHoliday
          ? t('schedules:holidayUpdatedSuccess')
          : t('schedules:holidayCreatedSuccess')
      );
      
      // Limpar o formulário, fechar o modal e recarregar a lista
      setFormOpen(false);
      setEditingHoliday(null);
      fetchHolidays();
      
    } catch (e) {
      console.error('Erro ao salvar feriado:', e);
      setError(
        e instanceof Error 
          ? e.message 
          : t('schedules:holidaySaveError')
      );
    }
  };
  
  // Função para cancelar o formulário
  const handleCancelForm = () => {
    setFormOpen(false);
    setEditingHoliday(null);
  };
  
  // Função para obter o nome do prestador
  const getProviderName = (providerId: string | null) => {
    if (!providerId) return t('schedules:allProviders');
    const provider = providers?.find(p => p.id === providerId);
    return provider?.name || t('schedules:unnamed');
  };
  
  // Função para formatar a data
  const formatDate = (dateString: string) => {
    try {
      const date = parseISO(dateString);
      return format(date, 'dd/MM/yyyy', { locale: ptBR });
    } catch {
      return dateString;
    }
  };
  
  // Função para formatar o horário
  const formatTime = (time: string | null) => {
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
            {t('schedules:manageHolidays')}: {schedule.title}
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
      
      {/* Área principal */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white flex items-center">
            <CalendarOff className="h-5 w-5 mr-2 text-blue-600 dark:text-blue-400" />
            {t('schedules:holidaysAndDaysOff')}
          </h2>
          <button
            onClick={handleAddHoliday}
            className="inline-flex items-center px-4 py-2.5 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-sm transition-all duration-200 hover:shadow"
          >
            <PlusCircle className="h-4 w-4 mr-2" />
            {t('schedules:addHoliday')}
          </button>
        </div>
        
        {/* Lista de feriados */}
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {isLoadingHolidays ? (
            <div className="p-6 flex justify-center">
              <div className="animate-spin h-6 w-6 border-3 border-blue-600 rounded-full border-t-transparent"></div>
            </div>
          ) : holidays.length > 0 ? (
            holidays.map(holiday => (
              <div key={holiday.id} className="p-5 flex justify-between items-center hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <div className="flex items-center">
                  <div className={`h-12 w-12 rounded-full flex items-center justify-center mr-4 ${
                    holiday.recurring 
                      ? 'bg-purple-100 dark:bg-purple-900/30'
                      : 'bg-red-100 dark:bg-red-900/30'
                  }`}>
                    {holiday.recurring ? (
                      <CalendarRange className={`h-6 w-6 text-purple-600 dark:text-purple-400`} />
                    ) : (
                      <CalendarOff className={`h-6 w-6 text-red-600 dark:text-red-400`} />
                    )}
                  </div>
                  <div>
                    <h3 className="text-base font-medium text-gray-900 dark:text-white mb-1">
                      {holiday.title}
                      {holiday.recurring && (
                        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
                          {t('schedules:recurring')}
                        </span>
                      )}
                    </h3>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      <p className="flex items-center mb-1">
                        <Calendar className="h-3.5 w-3.5 mr-1.5 text-gray-400 dark:text-gray-500" />
                        {formatDate(holiday.date)}
                      </p>
                      {!holiday.all_day && holiday.start_time && holiday.end_time && (
                        <p className="flex items-center">
                          <Clock className="h-3.5 w-3.5 mr-1.5 text-gray-400 dark:text-gray-500" />
                          {formatTime(holiday.start_time)} - {formatTime(holiday.end_time)}
                        </p>
                      )}
                      {holiday.provider_id && (
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          {getProviderName(holiday.provider_id)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleEditHoliday(holiday)}
                    className="p-2 text-gray-600 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    aria-label={t('common:edit')}
                  >
                    <Edit className="h-4.5 w-4.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteHoliday(holiday.id)}
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
              <CalendarOff className="h-12 w-12 text-gray-300 dark:text-gray-600 mb-3" />
              {t('schedules:noHolidaysConfigured')}
              <p className="mt-2 text-sm text-gray-400 dark:text-gray-500">
                {t('schedules:addHolidaysDescription')}
              </p>
            </div>
          )}
        </div>
      </div>
      
      {/* Modal de formulário */}
      {formOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div 
            className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
                {editingHoliday 
                  ? t('schedules:editHoliday') 
                  : t('schedules:addHoliday')
                }
              </h3>
              <button
                onClick={handleCancelForm}
                className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="p-6">
              <form onSubmit={(e) => { e.preventDefault(); handleSaveHoliday(); }}>
                {/* Título */}
                <div className="mb-5">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('schedules:title')}
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="block w-full px-4 py-3 rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                    placeholder={t('schedules:holidayTitlePlaceholder')}
                    required
                  />
                </div>
                
                {/* Data */}
                <div className="mb-5">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('schedules:date')}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Calendar className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                    </div>
                    <input
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      className="block w-full pl-10 pr-4 py-3 rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                      required
                    />
                  </div>
                </div>
                
                {/* Prestador (opcional) */}
                {providers && providers.length > 0 && (
                  <div className="mb-5">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t('schedules:provider')} ({t('common:optional')})
                    </label>
                    <select
                      value={formData.providerId || ''}
                      onChange={(e) => setFormData({ ...formData, providerId: e.target.value || null })}
                      className="block w-full px-4 py-3 rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                    >
                      <option value="">{t('schedules:allProviders')}</option>
                      {providers.map(provider => (
                        <option key={provider.id} value={provider.id}>
                          {provider.name || t('schedules:unnamed')}
                        </option>
                      ))}
                    </select>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      {t('schedules:providerHolidayDescription')}
                    </p>
                  </div>
                )}
                
                {/* O dia todo? */}
                <div className="mb-5">
                  <div className="flex items-center">
                    <input
                      id="allDay"
                      type="checkbox"
                      checked={formData.allDay}
                      onChange={(e) => setFormData({ ...formData, allDay: e.target.checked })}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                    />
                    <label htmlFor="allDay" className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                      {t('schedules:allDay')}
                    </label>
                  </div>
                </div>
                
                {/* Horários (apenas se não for o dia todo) */}
                {!formData.allDay && (
                  <div className="grid grid-cols-2 gap-4 mb-5">
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
                          required={!formData.allDay}
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
                          required={!formData.allDay}
                        />
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Recorrente */}
                <div className="mb-6">
                  <div className="flex items-center">
                    <input
                      id="recurring"
                      type="checkbox"
                      checked={formData.recurring}
                      onChange={(e) => setFormData({ ...formData, recurring: e.target.checked })}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                    />
                    <label htmlFor="recurring" className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                      {t('schedules:recurring')}
                    </label>
                  </div>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {t('schedules:recurringDescription')}
                  </p>
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

export default ScheduleHolidaysPage; 