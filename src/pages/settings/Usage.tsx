import React from 'react';
import { useTranslation } from 'react-i18next';
import { SettingsTabs } from '../../components/settings/SettingsTabs';
import { UsageSettings } from '../../components/settings/UsageSettings';

export default function UsagePage() {
  const { t } = useTranslation(['settings', 'common']);

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <SettingsTabs />
        
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <h1 className="text-lg font-medium text-gray-900 dark:text-white">
            {t('settings:usage.title')}
          </h1>

          <UsageSettings />
        </div>
      </div>
    </div>
  );
} 