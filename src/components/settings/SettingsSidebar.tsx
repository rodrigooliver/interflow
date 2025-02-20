import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Settings as SettingsIcon, Bell, Link as LinkIcon, CreditCard, HardDrive, ChevronRight, ChevronLeft } from 'lucide-react';

export function SettingsSidebar() {
  const { t } = useTranslation(['settings']);
  const location = useLocation();
  const navigate = useNavigate();
  const [isMinimized, setIsMinimized] = useState(() => {
    const stored = localStorage.getItem('settingsSidebarMinimized');
    return stored ? JSON.parse(stored) : false;
  });

  const handleMinimizeChange = (value: boolean) => {
    setIsMinimized(value);
    localStorage.setItem('settingsSidebarMinimized', JSON.stringify(value));
  };

  const navigationItems = [
    { 
      id: 'general', 
      icon: SettingsIcon, 
      label: t('settings:sections.general'),
      href: '/app/settings'
    },
    { 
      id: 'notifications', 
      icon: Bell, 
      label: t('settings:sections.notifications'),
      href: '/app/settings/notifications'
    },
    { 
      id: 'integrations', 
      icon: LinkIcon, 
      label: t('settings:sections.integrations'),
      href: '/app/settings/integrations'
    },
    { 
      id: 'billing', 
      icon: CreditCard, 
      label: t('settings:sections.billing'),
      href: '/app/settings/billing'
    },
    { 
      id: 'usage', 
      icon: HardDrive, 
      label: t('settings:sections.usage'),
      href: '/app/settings/usage'
    }
  ];

  const handleLinkClick = (href: string) => {
    handleMinimizeChange(true);
    navigate(href);
  };

  return (
    <div className={`bg-white dark:bg-gray-800 shadow rounded-lg p-4 h-fit transition-all duration-300 ${isMinimized ? 'w-20' : 'w-64'}`}>
      <div className={`flex ${isMinimized ? 'justify-center' : 'justify-end'} mb-4`}>
        <button
          onClick={() => handleMinimizeChange(!isMinimized)}
          className="group p-2 rounded-full hover:bg-blue-50 dark:hover:bg-blue-900/50 
            transition-all duration-200 hover:text-blue-600 dark:hover:text-blue-400
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800
            text-gray-600 dark:text-gray-400"
          title={isMinimized ? t('settings:expand') : t('settings:collapse')}
          aria-label={isMinimized ? t('settings:expand') : t('settings:collapse')}
        >
          {isMinimized ? (
            <ChevronRight className="w-5 h-5 transform transition-transform group-hover:scale-110" />
          ) : (
            <ChevronLeft className="w-5 h-5 transform transition-transform group-hover:scale-110" />
          )}
        </button>
      </div>
      <nav className="space-y-1">
        {navigationItems.map(({ id, icon: Icon, label, href }) => (
          <Link
            key={id}
            to={href}
            onClick={(e) => {
              e.preventDefault();
              handleLinkClick(href);
            }}
            className={`
              flex items-center px-4 py-2 text-sm font-medium rounded-md
              ${location.pathname === href
                ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400'
                : 'text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-700'
              }
              ${isMinimized ? 'justify-center' : ''}
            `}
          >
            <Icon className={`w-5 h-5 ${isMinimized ? '' : 'mr-3'}`} />
            {!isMinimized && label}
          </Link>
        ))}
      </nav>
    </div>
  );
} 