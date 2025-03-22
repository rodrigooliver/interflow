import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router-dom';
import { Link as LinkIcon, CreditCard, HardDrive, KeyIcon, ChevronDown } from 'lucide-react';

export function SettingsTabs() {
  const { t } = useTranslation(['settings']);
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navigationItems = [
    // Temporariamente comentados
    // { 
    //   id: 'general', 
    //   icon: SettingsIcon, 
    //   label: t('settings:sections.general'),
    //   href: '/app/settings'
    // },
    // { 
    //   id: 'notifications', 
    //   icon: Bell, 
    //   label: t('settings:sections.notifications'),
    //   href: '/app/settings/notifications'
    // },
    ...(typeof window.isNativeApp !== 'boolean' || !window.isNativeApp ? [
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
    ] : []),
    { 
      id: 'integrations', 
      icon: LinkIcon, 
      label: t('settings:sections.integrations'),
      href: '/app/settings/integrations'
    },
    {
      id: 'api-keys', 
      icon: KeyIcon,
      label: t('settings:sections.apiKeys'),
      href: '/app/settings/api-keys',
    }
  ];

  const currentItem = navigationItems.find(item => item.href === location.pathname) || navigationItems[0];

  return (
    <div className="w-full">
      {/* Mobile dropdown */}
      <div className="sm:hidden">
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="w-full flex items-center justify-between px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <div className="flex items-center">
            <currentItem.icon className="w-5 h-5 mr-2" />
            <span>{currentItem.label}</span>
          </div>
          <ChevronDown className="w-5 h-5 ml-2" />
        </button>

        {isMenuOpen && (
          <div className="mt-2 origin-top-right rounded-md bg-white dark:bg-gray-800 shadow-lg ring-1 ring-black ring-opacity-5 absolute z-50 w-[calc(100%-2rem)] mx-4">
            <div className="py-1">
              {navigationItems.map(({ id, icon: Icon, label, href }) => (
                <Link
                  key={id}
                  to={href}
                  onClick={() => setIsMenuOpen(false)}
                  className={`
                    flex items-center px-4 py-2 text-sm
                    ${location.pathname === href
                      ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400'
                      : 'text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700'
                    }
                  `}
                >
                  <Icon className="w-5 h-5 mr-3" />
                  {label}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Desktop tabs */}
      <div className="hidden sm:block">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-8 overflow-x-auto">
            {navigationItems.map(({ id, icon: Icon, label, href }) => (
              <Link
                key={id}
                to={href}
                className={`
                  whitespace-nowrap flex items-center py-4 px-1 border-b-2 font-medium text-sm
                  ${location.pathname === href
                    ? 'border-blue-500 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:border-gray-600'
                  }
                `}
              >
                <Icon className="w-5 h-5 mr-2" />
                {label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </div>
  );
} 