import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Settings as SettingsIcon, Bell, Link, CreditCard, HardDrive } from 'lucide-react';
import { BillingSettings } from '../components/settings/BillingSettings';
import { IntegrationsSettings } from '../components/settings/IntegrationsSettings';
import FileManager from '../pages/settings/FileManager';

type SettingsTab = 'general' | 'notifications' | 'integrations' | 'billing' | 'usage';

export default function Settings() {
  const { t } = useTranslation(['settings', 'common']);
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');

  const tabs = [
    { id: 'general', icon: SettingsIcon, label: t('settings:sections.general') },
    { id: 'notifications', icon: Bell, label: t('settings:sections.notifications') },
    { id: 'integrations', icon: Link, label: t('settings:sections.integrations') },
    { id: 'billing', icon: CreditCard, label: t('settings:sections.billing') },
    { id: 'usage', icon: HardDrive, label: t('settings:sections.usage') }
  ] as const;

  const renderContent = () => {
    switch (activeTab) {
      case 'integrations':
        return <IntegrationsSettings />;
      case 'billing':
        return <BillingSettings />;
      case 'usage':
        return <FileManager />;
      default:
        return (
          <div className="text-center text-gray-500 dark:text-gray-400 py-12">
            {t('settings:sections.comingSoon')}
          </div>
        );
    }
  };

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          {t('settings:title')}
        </h1>

        <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
          <div className="sm:hidden">
            <select
              value={activeTab}
              onChange={(e) => setActiveTab(e.target.value as SettingsTab)}
              className="block w-full px-3 py-2 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              {tabs.map(({ id, label }) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="hidden sm:block">
            <div className="border-b border-gray-200 dark:border-gray-700">
              <nav className="flex -mb-px">
                {tabs.map(({ id, icon: Icon, label }) => (
                  <button
                    key={id}
                    onClick={() => setActiveTab(id)}
                    className={`
                      flex-1 px-4 py-4 text-sm font-medium text-center border-b-2 
                      ${activeTab === id
                        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                      }
                    `}
                  >
                    <Icon className="w-5 h-5 mx-auto mb-1" />
                    <span>{label}</span>
                  </button>
                ))}
              </nav>
            </div>
          </div>

          <div className="p-6">
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
}