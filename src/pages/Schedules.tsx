import React from 'react';
import { Calendar, Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const Schedules: React.FC = () => {
  const { t } = useTranslation(['common']);

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('common:schedules')}</h1>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          {t('common:newSchedule')}
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
        <div className="flex items-center mb-4">
          <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-2" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('common:upcomingSchedules')}</h2>
        </div>

        <div className="space-y-4">
          {/* Mensagem quando não há agendamentos */}
          <div className="text-center py-8">
            <Clock className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400">{t('common:noSchedulesYet')}</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">{t('common:createScheduleMessage')}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Schedules; 