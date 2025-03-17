import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ScheduleProvider, ScheduleService } from '../../../types/schedules';
import { useAuthContext } from '../../../contexts/AuthContext';
import { supabase } from '../../../lib/supabase';
import { User, Clock, Calendar, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useAgents, useScheduleServices } from '../../../hooks/useQueryes';

interface ProviderFormProps {
  scheduleId: string;
  provider?: ScheduleProvider;
  services?: string[]; // Lista de IDs de serviços disponíveis
  onSuccess: (provider: ScheduleProvider) => void;
  onCancel: () => void;
}

interface ProviderFormData {
  profile_id: string;
  schedule_id: string;
  status: 'active' | 'inactive';
  available_services: string[];
}

const ProviderForm: React.FC<ProviderFormProps> = ({ 
  scheduleId, 
  provider, 
  services = [], 
  onSuccess, 
  onCancel 
}) => {
  const { t } = useTranslation(['schedules', 'common']);
  const { currentOrganizationMember } = useAuthContext();
  const organizationId = currentOrganizationMember?.organization?.id;
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Buscar os membros da organização que podem ser adicionados como profissionais
  const { data: agents } = useAgents(organizationId);
  
  // Buscar detalhes dos serviços para exibir nomes ao invés de IDs
  const { data: serviceDetails } = useScheduleServices(scheduleId);
  
  // Mapeamento de IDs para serviços
  const serviceMap = React.useMemo(() => {
    const map: Record<string, ScheduleService> = {};
    if (serviceDetails) {
      serviceDetails.forEach(service => {
        map[service.id] = service;
      });
    }
    return map;
  }, [serviceDetails]);
  
  // Estado do formulário
  const [formData, setFormData] = useState<ProviderFormData>({
    profile_id: provider?.profile_id || '',
    schedule_id: scheduleId,
    status: provider?.status || 'active',
    available_services: provider?.available_services || [],
  });
  
  // Manipular mudanças nos campos
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  // Manipular mudanças em serviços disponíveis (checkboxes)
  const handleServiceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value, checked } = e.target;
    
    setFormData(prev => {
      if (checked) {
        return {
          ...prev,
          available_services: [...prev.available_services, value]
        };
      } else {
        return {
          ...prev,
          available_services: prev.available_services.filter(id => id !== value)
        };
      }
    });
  };
  
  // Manipulador de envio do formulário
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsLoading(true);
    
    try {
      if (provider?.id) {
        // Atualizar provider existente
        const { data, error } = await supabase
          .from('schedule_providers')
          .update({
            profile_id: formData.profile_id,
            status: formData.status,
            available_services: formData.available_services,
            updated_at: new Date().toISOString()
          })
          .eq('id', provider.id)
          .select()
          .single();
          
        if (error) throw error;
        
        // Encontrar dados do profile para adicionar nome e avatar
        const profileAgent = agents?.find(a => a.id === formData.profile_id);
        
        const updatedProvider: ScheduleProvider = {
          ...data,
          name: profileAgent?.profile?.full_name,
          avatar_url: profileAgent?.profile?.avatar_url
        };
        
        setSuccess(t('schedules:providerUpdatedSuccess'));
        onSuccess(updatedProvider);
      } else {
        // Criar novo provider
        const { data, error } = await supabase
          .from('schedule_providers')
          .insert({
            schedule_id: scheduleId,
            profile_id: formData.profile_id,
            status: formData.status,
            available_services: formData.available_services,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single();
          
        if (error) throw error;
        
        // Encontrar dados do profile para adicionar nome e avatar
        const profileAgent = agents?.find(a => a.id === formData.profile_id);
        
        const newProvider: ScheduleProvider = {
          ...data,
          name: profileAgent?.profile?.full_name,
          avatar_url: profileAgent?.profile?.avatar_url
        };
        
        setSuccess(t('schedules:providerCreatedSuccess'));
        onSuccess(newProvider);
      }
    } catch (e) {
      console.error('Erro ao salvar profissional:', e);
      setError(
        e instanceof Error 
          ? e.message 
          : t('schedules:providerSaveError')
      );
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-5 flex items-center">
        <User className="h-5 w-5 mr-2 text-blue-600 dark:text-blue-400" />
        {provider?.id 
          ? t('schedules:editProvider') 
          : t('schedules:addProvider')}
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
        <div className="space-y-4">
          {/* Seleção de Profissional */}
          <div>
            <label htmlFor="profile_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center">
              <User className="h-4 w-4 mr-1.5 text-blue-600 dark:text-blue-400" />
              {t('schedules:selectTeamMember')} *
            </label>
            <div className="relative">
              <select
                id="profile_id"
                name="profile_id"
                value={formData.profile_id}
                onChange={handleChange}
                required
                className="w-full p-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none transition-colors pr-10"
                disabled={!!provider?.id} // Não permitir trocar o profile se já existir
              >
                <option value="">{t('schedules:selectTeamMember')}</option>
                {agents?.filter(agent => 
                  // Filtrar apenas os que não estão já na agenda
                  !provider?.id || agent.id === provider.profile_id
                ).map(agent => (
                  <option key={agent.id} value={agent.id}>
                    {agent.profile?.full_name || agent.id}
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
          
          {/* Status */}
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center">
              <Clock className="h-4 w-4 mr-1.5 text-blue-600 dark:text-blue-400" />
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
          
          {/* Serviços Disponíveis */}
          {services.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center">
                <Calendar className="h-4 w-4 mr-1.5 text-blue-600 dark:text-blue-400" />
                {t('schedules:availableServices')}
              </label>
              <div className="space-y-2 max-h-60 overflow-y-auto p-3 border border-gray-300 dark:border-gray-700 rounded-lg">
                {services.map(serviceId => (
                  <div key={serviceId} className="flex items-center">
                    <input
                      type="checkbox"
                      id={`service-${serviceId}`}
                      name="available_services"
                      value={serviceId}
                      checked={formData.available_services.includes(serviceId)}
                      onChange={handleServiceChange}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor={`service-${serviceId}`} className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                      {serviceMap[serviceId]?.title || serviceId}
                    </label>
                  </div>
                ))}
                {services.length === 0 && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {t('schedules:noServicesAvailable')}
                  </p>
                )}
              </div>
            </div>
          )}
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
                {provider?.id ? t('common:saving') : t('common:creating')}
              </>
            ) : (
              <>
                {provider?.id ? t('common:save') : t('common:create')}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ProviderForm; 