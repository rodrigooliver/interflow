import { useTranslation } from 'react-i18next';
import { SettingsTabs } from '../../components/settings/SettingsTabs';

export default function Settings() {
  const { t } = useTranslation(['settings', 'common']);

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <SettingsTabs />
        
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            {t('settings:title')}
          </h1>

          <div className="space-y-6">
            {/* Adicione aqui os campos de configurações gerais */}
            <div className="text-center text-gray-500 dark:text-gray-400">
              {t('settings:sections.comingSoon')}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}