import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScheduleService } from '../../../types/schedules';
import { supabase } from '../../../lib/supabase';
import { Briefcase, Clock, DollarSign, Palette, CheckCircle2, AlertTriangle } from 'lucide-react';

interface ServiceFormProps {
  scheduleId: string;
  service?: ScheduleService;
  onSuccess: (service: ScheduleService) => void;
  onCancel: () => void;
}

interface ServiceFormData {
  title: string;
  description: string;
  price: number;
  currency: string;
  duration: string;
  color: string;
  status: 'active' | 'inactive';
}

const ServiceForm: React.FC<ServiceFormProps> = ({ 
  scheduleId, 
  service, 
  onSuccess, 
  onCancel 
}) => {
  const { t } = useTranslation(['schedules', 'common']);
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Definir estado do formulário
  const [formData, setFormData] = useState<ServiceFormData>({
    title: service?.title || '',
    description: service?.description || '',
    price: service?.price || 0,
    currency: service?.currency || 'BRL',
    duration: service?.duration || '01:00:00', // 1 hora como padrão
    color: service?.color || '#3b82f6',
    status: service?.status || 'active',
  });
  
  // Manipular mudanças nos campos de texto e select
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // Para campos numéricos, converter para número
    if (name === 'price') {
      setFormData(prev => ({
        ...prev,
        [name]: parseFloat(value)
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };
  
  // Manipular envio do formulário
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsLoading(true);
    
    try {
      if (service?.id) {
        // Atualizar serviço existente
        const { data, error } = await supabase
          .from('schedule_services')
          .update({
            title: formData.title,
            description: formData.description,
            price: formData.price,
            currency: formData.currency,
            duration: formData.duration,
            color: formData.color,
            status: formData.status,
            updated_at: new Date().toISOString()
          })
          .eq('id', service.id)
          .select()
          .single();
          
        if (error) throw error;
        
        setSuccess(t('schedules:serviceUpdatedSuccess'));
        onSuccess(data as ScheduleService);
      } else {
        // Criar novo serviço
        const { data, error } = await supabase
          .from('schedule_services')
          .insert({
            schedule_id: scheduleId,
            title: formData.title,
            description: formData.description,
            price: formData.price,
            currency: formData.currency,
            duration: formData.duration,
            color: formData.color,
            status: formData.status,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single();
          
        if (error) throw error;
        
        setSuccess(t('schedules:serviceCreatedSuccess'));
        onSuccess(data as ScheduleService);
      }
    } catch (e) {
      console.error('Erro ao salvar serviço:', e);
      setError(
        e instanceof Error 
          ? e.message 
          : t('schedules:serviceSaveError')
      );
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-5 flex items-center">
        <Briefcase className="h-5 w-5 mr-2 text-blue-600 dark:text-blue-400" />
        {service?.id 
          ? t('schedules:editService') 
          : t('schedules:addService')}
      </h2>
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-200 text-red-700 rounded-lg flex items-start">
          <AlertTriangle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
      
      {success && (
        <div className="mb-4 p-3 bg-green-100 border border-green-200 text-green-700 rounded-lg flex items-start">
          <CheckCircle2 className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Nome do Serviço */}
          <div className="md:col-span-2">
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center">
              <Briefcase className="h-4 w-4 mr-1.5 text-blue-600 dark:text-blue-400" />
              {t('schedules:serviceName')} *
            </label>
            <input 
              id="title"
              type="text" 
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              className="w-full p-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              placeholder={t('schedules:serviceNamePlaceholder')}
            />
          </div>
          
          {/* Descrição */}
          <div className="md:col-span-2">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('schedules:serviceDescription')}
            </label>
            <textarea 
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              className="w-full p-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none"
              placeholder={t('schedules:serviceDescriptionPlaceholder')}
            />
          </div>
          
          {/* Duração */}
          <div>
            <label htmlFor="duration" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center">
              <Clock className="h-4 w-4 mr-1.5 text-blue-600 dark:text-blue-400" />
              {t('schedules:serviceDuration')} *
            </label>
            <div className="relative">
              <select
                id="duration"
                name="duration"
                value={formData.duration}
                onChange={handleChange}
                required
                className="w-full p-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none transition-colors pr-10"
              >
                <option value="00:15:00">15 {t('schedules:minutes')}</option>
                <option value="00:30:00">30 {t('schedules:minutes')}</option>
                <option value="00:45:00">45 {t('schedules:minutes')}</option>
                <option value="01:00:00">1 {t('schedules:hour')}</option>
                <option value="01:30:00">1.5 {t('schedules:hours')}</option>
                <option value="02:00:00">2 {t('schedules:hours')}</option>
                <option value="02:30:00">2.5 {t('schedules:hours')}</option>
                <option value="03:00:00">3 {t('schedules:hours')}</option>
                <option value="04:00:00">4 {t('schedules:hours')}</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700 dark:text-gray-300">
                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                  <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                </svg>
              </div>
            </div>
          </div>
          
          {/* Status */}
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('schedules:status')} *
            </label>
            <div className="relative">
              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleChange}
                required
                className="w-full p-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none transition-colors pr-10"
              >
                <option value="active">{t('schedules:statusActive')}</option>
                <option value="inactive">{t('schedules:statusInactive')}</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700 dark:text-gray-300">
                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                  <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                </svg>
              </div>
            </div>
          </div>
          
          {/* Preço */}
          <div>
            <label htmlFor="price" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center">
              <DollarSign className="h-4 w-4 mr-1.5 text-blue-600 dark:text-blue-400" />
              {t('schedules:servicePrice')} *
            </label>
            <div className="flex">
              <input 
                id="price"
                type="number" 
                name="price"
                min="0"
                step="0.01"
                value={formData.price}
                onChange={handleChange}
                required
                className="flex-1 p-2.5 border border-gray-300 dark:border-gray-700 rounded-l-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
              <select
                id="currency"
                name="currency"
                value={formData.currency}
                onChange={handleChange}
                className="w-24 p-2.5 border border-gray-300 dark:border-gray-700 border-l-0 rounded-r-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              >
                <option value="BRL">BRL</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
              </select>
            </div>
          </div>
          
          {/* Cor */}
          <div>
            <label htmlFor="color" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center">
              <Palette className="h-4 w-4 mr-1.5 text-blue-600 dark:text-blue-400" />
              {t('schedules:serviceColor')} *
            </label>
            <div className="flex items-center space-x-2">
              <input 
                id="color"
                type="color" 
                name="color"
                value={formData.color}
                onChange={handleChange}
                required
                className="h-10 w-12 rounded border-0 p-0 bg-transparent"
              />
              <input 
                type="text" 
                name="color"
                value={formData.color}
                onChange={handleChange}
                className="flex-1 p-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
            </div>
          </div>
        </div>
        
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-4 pt-4">
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
                {service?.id ? t('common:saving') : t('common:creating')}
              </>
            ) : (
              <>
                {service?.id ? t('common:save') : t('common:create')}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ServiceForm; 