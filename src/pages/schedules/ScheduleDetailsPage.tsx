import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, 
  Calendar, 
  Clock,
  Users,
  Settings as SettingsIcon, 
  List, 
  FileText, 
  ExternalLink 
} from 'lucide-react';
import { useAuthContext } from '../../contexts/AuthContext';
import { useSchedule } from '../../hooks/useQueryes';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';

type ScheduleTab = 'providers' | 'services' | 'availability' | 'settings';

const ScheduleDetailsPage: React.FC = () => {
  const { t } = useTranslation(['schedules', 'common']);
  const { scheduleId } = useParams<{ scheduleId: string }>();
  const navigate = useNavigate();
  const { currentOrganizationMember } = useAuthContext();
  const organizationId = currentOrganizationMember?.organization?.id;
  const [activeTab, setActiveTab] = useState<ScheduleTab>('providers');

  // Buscar detalhes da agenda pelo ID
  const { data: schedule, isLoading, error } = useSchedule(scheduleId);

  // Manipulador para voltar para a página de agendas
  const handleBack = () => {
    navigate('/schedules');
  };

  // Exibir loading enquanto os dados da agenda estão sendo carregados
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full w-full">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600 dark:border-blue-400"></div>
          <p className="mt-3 text-gray-600 dark:text-gray-300">{t('common:loading')}</p>
        </div>
      </div>
    );
  }

  // Exibir mensagem de erro se ocorrer algum problema ao carregar os dados
  if (error || !schedule) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full p-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-8 shadow-sm text-center max-w-md">
          <div className="text-red-500 dark:text-red-400 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">
            {t('schedules:scheduleNotFound')}
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            {t('schedules:scheduleNotFoundMessage')}
          </p>
          <button
            onClick={handleBack}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 inline-flex items-center"
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            {t('common:goBack')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Cabeçalho */}
      <div className="flex items-center mb-6">
        <button 
          onClick={handleBack}
          className="mr-4 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
          aria-label={t('common:goBack')}
        >
          <ChevronLeft className="h-5 w-5 text-gray-700 dark:text-gray-300" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center">
            {schedule.title}
            {schedule.is_public && (
              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100">
                {t('schedules:public')}
              </span>
            )}
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            {schedule.description || t('schedules:noDescription')}
          </p>
        </div>
      </div>

      {/* Link para página pública se a agenda for pública */}
      {schedule.is_public && (
        <div className="mb-6 bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('schedules:publicBookingPage')}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t('schedules:shareThisLinkWithClients')}
              </p>
            </div>
            <a
              href={`/booking/${organizationId}/${scheduleId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
            >
              {t('schedules:openPublicPage')}
              <ExternalLink className="h-4 w-4 ml-1" />
            </a>
          </div>
        </div>
      )}

      {/* Abas */}
      <Tabs
        value={activeTab}
        onValueChange={(value: string) => setActiveTab(value as ScheduleTab)}
        className="flex-1 flex flex-col"
      >
        <TabsList className="grid grid-cols-4 mb-6">
          <TabsTrigger value="providers" className="flex items-center">
            <Users className="h-4 w-4 mr-2" />
            {t('schedules:providers')}
          </TabsTrigger>
          <TabsTrigger value="services" className="flex items-center">
            <List className="h-4 w-4 mr-2" />
            {t('schedules:services')}
          </TabsTrigger>
          <TabsTrigger value="availability" className="flex items-center">
            <Clock className="h-4 w-4 mr-2" />
            {t('schedules:availability')}
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center">
            <SettingsIcon className="h-4 w-4 mr-2" />
            {t('schedules:settings')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="providers" className="flex-1">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 h-full">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
                {t('schedules:manageProviders')}
              </h2>
              <button 
                onClick={() => navigate(`/app/schedules/${scheduleId}/management`)}
                className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 inline-flex items-center text-sm"
              >
                {t('schedules:manageProviders')}
              </button>
            </div>
            
            {/* Lista de provedores (placeholder) */}
            <div className="text-gray-500 dark:text-gray-400 text-sm text-center py-12">
              <Calendar className="h-12 w-12 mx-auto mb-3 text-gray-400 dark:text-gray-500" />
              <p>{t('schedules:noProvidersYet')}</p>
              <p>{t('schedules:addProvidersToSchedule')}</p>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="services" className="flex-1">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 h-full">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
                {t('schedules:manageServices')}
              </h2>
              <button 
                onClick={() => navigate(`/app/schedules/${scheduleId}/management`)}
                className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 inline-flex items-center text-sm"
              >
                {t('schedules:manageServices')}
              </button>
            </div>
            
            {/* Lista de serviços (placeholder) */}
            <div className="text-gray-500 dark:text-gray-400 text-sm text-center py-12">
              <FileText className="h-12 w-12 mx-auto mb-3 text-gray-400 dark:text-gray-500" />
              <p>{t('schedules:noServicesYet')}</p>
              <p>{t('schedules:addServicesToSchedule')}</p>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="availability" className="flex-1">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 h-full">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
                {t('schedules:manageAvailability')}
              </h2>
              <button className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 inline-flex items-center text-sm">
                {t('schedules:addAvailability')}
              </button>
            </div>
            
            {/* Configuração de disponibilidade (placeholder) */}
            <div className="text-gray-500 dark:text-gray-400 text-sm text-center py-12">
              <Clock className="h-12 w-12 mx-auto mb-3 text-gray-400 dark:text-gray-500" />
              <p>{t('schedules:noAvailabilityConfigured')}</p>
              <p>{t('schedules:setupAvailabilityHours')}</p>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="settings" className="flex-1">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 h-full">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-6">
              {t('schedules:scheduleSettings')}
            </h2>
            
            {/* Formulário de configurações (placeholder) */}
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('schedules:scheduleName')}
                </label>
                <input 
                  type="text" 
                  defaultValue={schedule.title}
                  className="w-full p-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('schedules:scheduleDescription')}
                </label>
                <textarea 
                  defaultValue={schedule.description}
                  rows={3}
                  className="w-full p-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                />
              </div>
              
              <div className="flex items-center">
                <input 
                  type="checkbox" 
                  id="is_public" 
                  defaultChecked={schedule.is_public}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="is_public" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                  {t('schedules:publicSchedule')}
                </label>
              </div>
              
              <div className="flex items-center">
                <input 
                  type="checkbox" 
                  id="requires_confirmation" 
                  defaultChecked={schedule.requires_confirmation}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="requires_confirmation" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                  {t('schedules:requireConfirmation')}
                </label>
              </div>
              
              <div className="pt-5">
                <button
                  type="button"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 inline-flex items-center"
                >
                  {t('common:save')}
                </button>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ScheduleDetailsPage; 