import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Schedule } from '../../types/schedules';
import { useAuthContext } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { CalendarDays, Clock, Globe, Info, Palette, CheckCircle2, AlertTriangle } from 'lucide-react';
import { timezones } from '../../utils/timezones';
import Select from 'react-select';

interface ScheduleFormProps {
  schedule?: Schedule;
  onSuccess: (schedule: Schedule) => void;
  onCancel: () => void;
}

interface ScheduleFormData {
  title: string;
  description?: string;
  type: 'service' | 'meeting';
  status: 'active' | 'inactive';
  color: string;
  is_public: boolean;
  requires_confirmation: boolean;
  enable_ai_agent: boolean;
  timezone: string;
  default_slot_duration: number;
}

const ScheduleForm: React.FC<ScheduleFormProps> = ({ schedule, onSuccess, onCancel }) => {
  const { t } = useTranslation(['schedules', 'common']);
  const { currentOrganizationMember } = useAuthContext();
  const organizationId = currentOrganizationMember?.organization?.id;
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Estado do formulário
  const [formData, setFormData] = useState<ScheduleFormData>({
    title: schedule?.title || '',
    description: schedule?.description || '',
    type: schedule?.type || 'service',
    status: schedule?.status || 'active',
    color: schedule?.color || '#3b82f6',
    is_public: schedule?.is_public || false,
    requires_confirmation: schedule?.requires_confirmation || false,
    enable_ai_agent: schedule?.enable_ai_agent || false,
    timezone: schedule?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
    default_slot_duration: schedule?.default_slot_duration || 60,
  });

  // Manipular mudanças nos campos
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // Para campos numéricos, converter para número
    if (name === 'default_slot_duration') {
      setFormData(prev => ({
        ...prev,
        [name]: parseInt(value, 10)
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  // Manipular mudanças em checkboxes
  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: checked }));
  };

  // Enviar formulário
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const scheduleData = {
        ...formData,
        organization_id: organizationId
      };

      if (schedule?.id) {
        // Atualizar agenda existente
        const { data, error } = await supabase
          .from('schedules')
          .update(scheduleData)
          .eq('id', schedule.id)
          .select('*')
          .single();

        if (error) throw error;
        
        setSuccess(t('schedules:scheduleUpdatedSuccess'));
        setTimeout(() => {
          onSuccess(data as Schedule);
        }, 1000);
      } else {
        // Criar nova agenda
        const { data, error } = await supabase
          .from('schedules')
          .insert(scheduleData)
          .select('*')
          .single();

        if (error) throw error;
        
        setSuccess(t('schedules:scheduleCreatedSuccess'));
        setTimeout(() => {
          onSuccess(data as Schedule);
        }, 1000);
      }
    } catch (error) {
      console.error('Erro ao salvar agenda:', error);
      setError(typeof error === 'object' && error !== null && 'message' in error 
        ? (error as Error).message 
        : t('common:unknownError'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
      {error && (
        <div className="mb-6 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start">
          <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 mr-3 flex-shrink-0" />
          <div>
            <h3 className="text-sm font-medium text-red-800 dark:text-red-300">{t('common:error')}</h3>
            <p className="mt-1 text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        </div>
      )}
      
      {success && (
        <div className="mb-6 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg p-4 flex items-start">
          <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 mr-3 flex-shrink-0" />
          <div>
            <h3 className="text-sm font-medium text-green-800 dark:text-green-300">{t('common:success')}</h3>
            <p className="mt-1 text-sm text-green-700 dark:text-green-300">{success}</p>
          </div>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center">
              <CalendarDays className="h-4 w-4 mr-1.5 text-blue-600 dark:text-blue-400" />
              {t('schedules:scheduleName')} *
            </label>
            <input 
              id="title"
              type="text" 
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              className="w-full p-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              placeholder={t('schedules:scheduleNamePlaceholder')}
            />
          </div>
          
          <div className="md:col-span-2">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center">
              <Info className="h-4 w-4 mr-1.5 text-blue-600 dark:text-blue-400" />
              {t('schedules:scheduleDescription')}
            </label>
            <textarea 
              id="description"
              name="description"
              value={formData.description || ''}
              onChange={handleChange}
              rows={3}
              className="w-full p-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none"
              placeholder={t('schedules:scheduleDescriptionPlaceholder')}
            />
          </div>
          
          <div>
            <label htmlFor="type" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center">
              <Clock className="h-4 w-4 mr-1.5 text-blue-600 dark:text-blue-400" />
              {t('schedules:type')} *
            </label>
            <div className="relative">
              <select
                id="type"
                name="type"
                value={formData.type}
                onChange={handleChange}
                required
                className="w-full p-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none transition-colors pr-10"
              >
                <option value="service">{t('schedules:serviceType')}</option>
                <option value="meeting">{t('schedules:meetingType')}</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700 dark:text-gray-300">
                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                  <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                </svg>
              </div>
            </div>
            <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
              {formData.type === 'service' 
                ? t('schedules:serviceTypeDescription') 
                : t('schedules:meetingTypeDescription')}
            </p>
          </div>
          
          <div>
            <label htmlFor="timezone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center">
              <Globe className="h-4 w-4 mr-1.5 text-blue-600 dark:text-blue-400" />
              {t('schedules:timezone')} *
            </label>
            <Select
              id="timezone"
              name="timezone"
              value={{ value: formData.timezone, label: `${timezones.find(tz => tz.value === formData.timezone)?.label || formData.timezone} (${timezones.find(tz => tz.value === formData.timezone)?.offset || 'UTC'})` }}
              onChange={(selected) => 
                handleChange({ 
                  target: { 
                    name: 'timezone', 
                    value: selected?.value || Intl.DateTimeFormat().resolvedOptions().timeZone 
                  } 
                } as React.ChangeEvent<HTMLSelectElement>)
              }
              options={timezones.map(tz => ({ 
                value: tz.value, 
                label: `${tz.label} (${tz.offset})` 
              }))}
              className="react-select-container"
              classNamePrefix="react-select"
              placeholder={t('schedules:selectTimezone') || 'Selecione um fuso horário'}
              isSearchable={true}
              noOptionsMessage={() => t('schedules:noTimezoneFound') || 'Nenhum fuso horário encontrado'}
              styles={{
                control: (base, state) => ({
                  ...base,
                  backgroundColor: 'var(--select-bg, #fff)',
                  borderColor: state.isFocused ? 'var(--select-focus-border, #3b82f6)' : 'var(--select-border, #d1d5db)',
                  '&:hover': {
                    borderColor: 'var(--select-hover-border, #9ca3af)'
                  },
                  boxShadow: state.isFocused ? '0 0 0 1px #3b82f6' : 'none',
                  borderRadius: '0.375rem'
                }),
                menu: (base) => ({
                  ...base,
                  backgroundColor: 'var(--select-bg, #fff)',
                  border: '1px solid var(--select-border, #d1d5db)',
                  zIndex: 50
                }),
                option: (base, { isFocused, isSelected }) => ({
                  ...base,
                  backgroundColor: isSelected 
                    ? 'var(--select-selected-bg, #2563eb)'
                    : isFocused 
                      ? 'var(--select-hover-bg, #dbeafe)'
                      : 'transparent',
                  color: isSelected 
                    ? 'var(--select-selected-text, white)'
                    : 'var(--select-text, #111827)'
                }),
                singleValue: (base) => ({
                  ...base,
                  color: 'var(--select-text, #111827)'
                })
              }}
            />
          </div>
          
          <div>
            <label htmlFor="color" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center">
              <Palette className="h-4 w-4 mr-1.5 text-blue-600 dark:text-blue-400" />
              {t('schedules:color')}
            </label>
            <div className="flex items-center space-x-3">
              <input 
                id="color"
                type="color" 
                name="color"
                value={formData.color}
                onChange={handleChange}
                className="h-10 w-16 border border-gray-300 dark:border-gray-700 rounded-md cursor-pointer"
              />
              <div className="flex-1">
                <div className="w-full h-10 rounded-lg" style={{ backgroundColor: formData.color }}></div>
              </div>
              <div className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-md text-sm font-mono text-gray-800 dark:text-gray-200">
                {formData.color}
              </div>
            </div>
          </div>
          
          {/* Campo para duração padrão de slots */}
          {formData.type === 'service' && (
            <div>
              <label htmlFor="default_slot_duration" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center">
                <Clock className="h-4 w-4 mr-1.5 text-blue-600 dark:text-blue-400" />
                {t('schedules:defaultSlotDuration')}
              </label>
              <div className="flex items-center">
                <input 
                  id="default_slot_duration"
                  type="number" 
                  name="default_slot_duration"
                  min="1"
                  max="240" // Máximo de 4 horas
                  value={formData.default_slot_duration}
                  onChange={handleChange}
                  required
                  className="w-24 p-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors mr-2"
                />
                <span className="text-gray-700 dark:text-gray-300">
                  {t('schedules:minutes')}
                </span>
              </div>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {t('schedules:defaultSlotDurationDescription')}
              </p>
            </div>
          )}
          
          <div className="md:col-span-2">
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-3">
                {t('schedules:options')}
              </h3>
              
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="is_public"
                    name="is_public"
                    checked={formData.is_public}
                    onChange={handleCheckboxChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label
                    htmlFor="is_public"
                    className="text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    {t('schedules:publicSchedule')}
                  </label>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="requires_confirmation"
                    name="requires_confirmation"
                    checked={formData.requires_confirmation}
                    onChange={handleCheckboxChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label
                    htmlFor="requires_confirmation"
                    className="text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    {t('schedules:requireConfirmation')}
                  </label>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="enable_ai_agent"
                    name="enable_ai_agent"
                    checked={formData.enable_ai_agent}
                    onChange={handleCheckboxChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label
                    htmlFor="enable_ai_agent"
                    className="text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    {t('schedules:enableAiAgent')}
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-4 pt-5">
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
                {schedule?.id ? t('common:saving') : t('common:creating')}
              </>
            ) : (
              <>
                {schedule?.id ? t('common:save') : t('common:create')}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ScheduleForm; 