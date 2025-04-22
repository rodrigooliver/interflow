import React from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft,
  Bell
} from 'lucide-react';
import { useSchedule } from '../../hooks/useQueryes';
import NotificationManager from '../../components/schedules/NotificationManager';

const NotificationTemplatesPage: React.FC = () => {
  const { scheduleId } = useParams<{ scheduleId: string }>();
  const { t } = useTranslation(['schedules', 'common']);
  const navigate = useNavigate();
  
  // Buscar os dados da agenda
  const { data: schedule, isLoading } = useSchedule(scheduleId);
  
  const handleGoBack = () => {
    navigate('/app/schedules/list');
  };
  
  // Exibir mensagem de carregamento
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full w-full bg-gray-50 dark:bg-gray-900">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-14 w-14 border-t-3 border-b-3 border-blue-600 dark:border-blue-400"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300 text-lg">{t('common:loading')}</p>
        </div>
      </div>
    );
  }
  
  if (!schedule) {
    return (
      <div className="flex items-center justify-center h-full w-full bg-gray-50 dark:bg-gray-900">
        <div className="flex flex-col items-center text-center p-6">
          <div className="bg-red-100 dark:bg-red-900/30 rounded-full p-3 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2">{t('schedules:scheduleNotFound')}</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-4">{t('schedules:scheduleNotFoundDescription')}</p>
          <button
            onClick={handleGoBack}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('common:goBack')}
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="h-full flex flex-col p-5 bg-gray-50 dark:bg-gray-900">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div>
          <div className="flex items-center">
            <button
              onClick={handleGoBack}
              className="mr-3 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-800 dark:text-white flex items-center">
              <Bell className="h-6 w-6 sm:h-8 sm:w-8 mr-2 text-blue-600 dark:text-blue-400" />
              {t('schedules:notificationsForSchedule', { name: schedule.title })}
            </h1>
          </div>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 mt-1 ml-9">
            {t('schedules:manageNotificationsDescription')}
          </p>
        </div>
      </div>
      
      <div className="flex-1 overflow-auto">
        <NotificationManager scheduleId={scheduleId || ''} />
      </div>
    </div>
  );
};

export default NotificationTemplatesPage; 