import React from 'react';
import { useTranslation } from 'react-i18next';
import { SettingsTabs } from '../../components/settings/SettingsTabs';
import { BillingSettings } from '../../components/settings/BillingSettings';

export default function BillingPage() {
  const { t } = useTranslation(['settings', 'common']);

  return (
    <div className="p-3 sm:p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        <SettingsTabs />
        
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-3 sm:p-4 md:p-6">
          <h1 className="text-lg font-bold text-gray-900 dark:text-white mb-3 sm:mb-4">
            {t('settings:billing.title')}
          </h1>

          <BillingSettings />
        </div>
      </div>
    </div>
  );
} 