import React from 'react';
import { useTranslation } from 'react-i18next';
import { SettingsSidebar } from '../../components/settings/SettingsSidebar';
import { BillingSettings } from '../../components/settings/BillingSettings';

export default function BillingPage() {
  const { t } = useTranslation(['settings', 'common']);

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto flex gap-6">
        <SettingsSidebar />
        
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            {t('settings:billing.title')}
          </h1>

          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            <BillingSettings />
          </div>
        </div>
      </div>
    </div>
  );
} 