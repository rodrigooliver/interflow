import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from 'react-router-dom';
import { User, Briefcase, PlusCircle, Edit, Trash2, AlertTriangle, CheckCircle2, ArrowLeft, Clock, CalendarOff } from 'lucide-react';
import { useSchedule, useScheduleProviders, useScheduleServices } from '../../../hooks/useQueryes';
import { ScheduleProvider, ScheduleService } from '../../../types/schedules';
import ProviderForm from '../../../components/schedules/forms/ProviderForm';
import ServiceForm from '../../../components/schedules/forms/ServiceForm';
import { supabase } from '../../../lib/supabase';

const ScheduleManagementPage: React.FC = () => {
  const { t } = useTranslation(['schedules', 'common']);
  const { scheduleId } = useParams<{ scheduleId: string }>();
  const navigate = useNavigate();
  
  // Buscar dados da agenda
  const { data: schedule, isLoading: isLoadingSchedule } = useSchedule(scheduleId);
  const { data: providers, refetch: refetchProviders } = useScheduleProviders(scheduleId);
  const { data: services, refetch: refetchServices } = useScheduleServices(scheduleId);
  
  // Estados para controlar os modais de formulário
  const [addProviderOpen, setAddProviderOpen] = useState(false);
  const [editProvider, setEditProvider] = useState<ScheduleProvider | null>(null);
  
  const [addServiceOpen, setAddServiceOpen] = useState(false);
  const [editService, setEditService] = useState<ScheduleService | null>(null);
  
  // Estados para mensagens
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Excluir um provider
  const handleDeleteProvider = async (providerId: string) => {
    if (!window.confirm(t('schedules:confirmDeleteProvider'))) return;
    
    try {
      const { error } = await supabase
        .from('schedule_providers')
        .delete()
        .eq('id', providerId);
        
      if (error) throw error;
      
      setSuccess(t('schedules:providerDeletedSuccess'));
      refetchProviders();
    } catch (e) {
      console.error('Erro ao excluir profissional:', e);
      setError(
        e instanceof Error 
          ? e.message 
          : t('schedules:providerDeleteError')
      );
    }
  };
  
  // Excluir um serviço
  const handleDeleteService = async (serviceId: string) => {
    if (!window.confirm(t('schedules:confirmDeleteService'))) return;
    
    try {
      const { error } = await supabase
        .from('schedule_services')
        .delete()
        .eq('id', serviceId);
        
      if (error) throw error;
      
      setSuccess(t('schedules:serviceDeletedSuccess'));
      refetchServices();
    } catch (e) {
      console.error('Erro ao excluir serviço:', e);
      setError(
        e instanceof Error 
          ? e.message 
          : t('schedules:serviceDeleteError')
      );
    }
  };
  
  // Manipuladores para adicionar/editar providers e serviços
  const handleProviderSuccess = () => {
    refetchProviders();
    setAddProviderOpen(false);
    setEditProvider(null);
  };
  
  const handleServiceSuccess = () => {
    refetchServices();
    setAddServiceOpen(false);
    setEditService(null);
  };
  
  // Fechar modais e limpar estados
  const handleCancelProvider = () => {
    setAddProviderOpen(false);
    setEditProvider(null);
  };
  
  const handleCancelService = () => {
    setAddServiceOpen(false);
    setEditService(null);
  };
  
  // Preparar lista de serviços para o componente ProviderForm
  const serviceIds = services ? services.map(service => service.id) : [];
  
  // Voltar usando o history do navegador
  const handleGoBack = () => {
    navigate(-1);
  };
  
  if (isLoadingSchedule) {
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
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
        <div className="flex items-center">
          <button 
            onClick={handleGoBack}
            className="mr-3 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label={t('common:back')}
          >
            <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-300" />
          </button>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
            {t('schedules:manageSchedule')}: {schedule.title}
          </h1>
        </div>
        <div className="mt-3 md:mt-0">
          <div className="flex space-x-2">
            <button
              onClick={() => navigate(`/app/schedules/${scheduleId}/availability`)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <Clock className="h-4 w-4 mr-2 text-gray-500 dark:text-gray-400" />
              {t('schedules:manageAvailability')}
            </button>
            <button
              onClick={() => navigate(`/app/schedules/${scheduleId}/holidays`)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <CalendarOff className="h-4 w-4 mr-2 text-gray-500 dark:text-gray-400" />
              {t('schedules:holidaysAndDaysOff')}
            </button>
          </div>
        </div>
      </div>
      
      {error && (
        <div className="mb-6 p-4 bg-red-100 border border-red-200 text-red-700 rounded-lg flex items-start">
          <AlertTriangle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
      
      {success && (
        <div className="mb-6 p-4 bg-green-100 border border-green-200 text-green-700 rounded-lg flex items-start">
          <CheckCircle2 className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Seção de Profissionais */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white flex items-center">
              <User className="h-5 w-5 mr-2 text-blue-600 dark:text-blue-400" />
              {t('schedules:professionals')}
            </h2>
            <button
              onClick={() => setAddProviderOpen(true)}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <PlusCircle className="h-4 w-4 mr-1" />
              {t('schedules:addProvider')}
            </button>
          </div>
          
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {providers && providers.length > 0 ? (
              providers.map(provider => (
                <div key={provider.id} className="p-4 flex justify-between items-center">
                  <div className="flex items-center">
                    {provider.avatar_url ? (
                      <img 
                        src={provider.avatar_url} 
                        alt={provider.name || ''} 
                        className="h-10 w-10 rounded-full mr-3"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center mr-3">
                        <User className="h-6 w-6 text-gray-600 dark:text-gray-400" />
                      </div>
                    )}
                    <div>
                      <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                        {provider.name || t('schedules:unnamed')}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {provider.status === 'active' 
                          ? t('schedules:statusActive') 
                          : t('schedules:statusInactive')}
                      </p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setEditProvider(provider)}
                      className="p-1.5 text-gray-600 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      aria-label={t('common:edit')}
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteProvider(provider.id)}
                      className="p-1.5 text-gray-600 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      aria-label={t('common:delete')}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-6 text-center text-gray-500 dark:text-gray-400">
                {t('schedules:noProvidersYet')}
              </div>
            )}
          </div>
        </div>
        
        {/* Seção de Serviços */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white flex items-center">
              <Briefcase className="h-5 w-5 mr-2 text-blue-600 dark:text-blue-400" />
              {t('schedules:services')}
            </h2>
            <button
              onClick={() => setAddServiceOpen(true)}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <PlusCircle className="h-4 w-4 mr-1" />
              {t('schedules:addService')}
            </button>
          </div>
          
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {services && services.length > 0 ? (
              services.map(service => (
                <div key={service.id} className="p-4 flex justify-between items-center">
                  <div className="flex items-center">
                    <div 
                      className="h-10 w-10 rounded-full mr-3 flex items-center justify-center"
                      style={{ backgroundColor: service.color }}
                    >
                      <Briefcase className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                        {service.title}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {new Intl.NumberFormat(undefined, {
                          style: 'currency',
                          currency: service.currency,
                        }).format(service.price)} - {service.duration.substring(0, 5)}
                      </p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setEditService(service)}
                      className="p-1.5 text-gray-600 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      aria-label={t('common:edit')}
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteService(service.id)}
                      className="p-1.5 text-gray-600 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      aria-label={t('common:delete')}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-6 text-center text-gray-500 dark:text-gray-400">
                {t('schedules:noServicesYet')}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Modal de Adicionar/Editar Profissional */}
      {(addProviderOpen || editProvider) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-2xl">
            <ProviderForm
              scheduleId={scheduleId || ''}
              provider={editProvider || undefined}
              services={serviceIds}
              onSuccess={handleProviderSuccess}
              onCancel={handleCancelProvider}
            />
          </div>
        </div>
      )}
      
      {/* Modal de Adicionar/Editar Serviço */}
      {(addServiceOpen || editService) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-2xl">
            <ServiceForm
              scheduleId={scheduleId || ''}
              service={editService || undefined}
              onSuccess={handleServiceSuccess}
              onCancel={handleCancelService}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ScheduleManagementPage; 