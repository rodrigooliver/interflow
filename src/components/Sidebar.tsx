import React, { useState } from 'react';
import { Link, useLocation, Location } from 'react-router-dom';
import { MessageSquare, Users, Settings as SettingsIcon, LayoutDashboard, LogOut, Sun, Moon, X, Building2, UserPlus, UsersRound, Share2, Keyboard, GitFork, GitMerge, Tag, User, MessageSquareText, ChevronLeft, ChevronRight, CheckCircle, CreditCard, AlertTriangle, Calendar, ChevronDown, ListTodo, DollarSign, FileText, Stethoscope } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useDarkMode } from '../hooks/useDarkMode';
import { LanguageSwitcher } from './LanguageSwitcher';
import { useAuthContext } from '../contexts/AuthContext';
import { useCurrentSubscription } from '../hooks/useQueryes';
import OneSignal from 'react-onesignal';

// Definindo tipos para interface de link
interface LinkChild {
  to: string;
  label: string;
  exact?: boolean;
}

interface NavigationLink {
  to: string;
  icon: React.FC<{ className?: string }>;
  label: string;
  exact?: boolean;
}

interface NavigationLinkWithChildren extends NavigationLink {
  children?: LinkChild[];
}

interface SubmenuItemProps {
  link: NavigationLinkWithChildren;
  location: Location;
  shouldCollapse: boolean;
  onClose?: () => void;
}

interface SidebarProps {
  onClose?: () => void;
  isMobile?: boolean;
  isCollapsed?: boolean;
  setIsCollapsed?: (value: boolean) => void;
}

const Sidebar = ({ onClose, isMobile = false, isCollapsed, setIsCollapsed }: SidebarProps) => {
  const location = useLocation();
  const { signOut, profile, currentOrganizationMember } = useAuthContext();
  const { isDark, setIsDark } = useDarkMode();
  const { t } = useTranslation(['navigation', 'common']);
  const { data: subscription } = useCurrentSubscription(currentOrganizationMember?.organization.id);

  // Verificar se é trial
  const isTrial = subscription?.status === 'trialing';

  // Calcular dias do trial
  const trialDays = subscription ? 
    Math.ceil((new Date(subscription.current_period_end).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 0;

  // Verificar se o trial já venceu
  const isTrialExpired = isTrial && trialDays < 0;

  // Verificar se a subscription está próxima de vencer (7 dias ou menos)
  const isSubscriptionEndingSoon = subscription && !subscription.cancel_at_period_end && 
    new Date(subscription.current_period_end).getTime() - Date.now() <= 7 * 24 * 60 * 60 * 1000 &&
    new Date(subscription.current_period_end).getTime() > Date.now();

  // Verificar se a subscription já venceu
  const isSubscriptionExpired = subscription && !isTrial && 
    new Date(subscription.current_period_end).getTime() < Date.now();

  // Calcular dias desde que venceu
  const daysExpired = subscription ? 
    Math.abs(Math.ceil((Date.now() - new Date(subscription.current_period_end).getTime()) / (1000 * 60 * 60 * 24))) : 0;

  // Base links that all users can see
  const baseLinks: NavigationLinkWithChildren[] = [
    { to: '/app', icon: LayoutDashboard, label: t('navigation:dashboard') },
    { to: '/app/chats', icon: MessageSquare, label: t('navigation:chats') },
    { to: '/app/customers', icon: Users, label: t('navigation:customers') },
    { to: '/app/crm', icon: GitMerge, label: t('navigation:crm') },
    { to: '/app/appointments', icon: Calendar, label: t('navigation:appointments') },
    { 
      to: '/app/medical', 
      icon: Stethoscope, 
      label: t('navigation:medicalRecords'),
      children: [
        { to: '/app/medical/patients', label: t('navigation:patients') },
        { to: '/app/medical/consultations', label: t('navigation:consultations') },
        { to: '/app/medical/records', label: t('navigation:records') },
        { to: '/app/medical/prescriptions', label: t('navigation:prescriptions') },
        { to: '/app/medical/certificates', label: t('navigation:certificates') },
        { to: '/app/medical/templates', label: t('navigation:documentTemplates') }
      ]
    },
    { to: '/app/tasks', icon: ListTodo, label: t('navigation:tasks') },
    { to: '/app/financial', icon: DollarSign, label: t('navigation:financial') },
  ];

  // Admin and owner only links
  const adminLinks: NavigationLinkWithChildren[] = [
    { to: '/app/prompts', icon: MessageSquareText, label: t('navigation:prompts') },
    { to: '/app/flows', icon: GitFork, label: t('navigation:flows') },
    { to: '/app/channels', icon: Share2, label: t('navigation:channels') },
    { to: '/app/tags', icon: Tag, label: t('navigation:tags') },
    { to: '/app/closure-types', icon: CheckCircle, label: t('navigation:closureTypes') },
    { to: '/app/shortcuts', icon: Keyboard, label: t('navigation:shortcuts') },

    ...(typeof window.isNativeApp !== 'boolean' || !window.isNativeApp ? [
      { to: '/app/member', icon: UserPlus, label: t('navigation:users') }
    ] : []),
    { to: '/app/service-teams', icon: UsersRound, label: t('navigation:serviceTeams') },
    // Remover link de configurações se estiver no app nativo
    ...(typeof window.isNativeApp !== 'boolean' || !window.isNativeApp ? [
      { to: '/app/settings/billing', icon: SettingsIcon, label: t('navigation:settings') }
    ] : [
      { to: '/app/settings/integrations', icon: SettingsIcon, label: t('navigation:settings') }
    ])
  ];

  // Super admin links
  const superAdminLinks: NavigationLinkWithChildren[] = [
    { to: '/app/admin/organizations', icon: Building2, label: t('navigation:organizations') },
    { to: '/app/admin/subscription-plans', icon: CreditCard, label: t('navigation:subscriptionPlans') },
    { to: '/app/admin/blog', icon: FileText, label: t('navigation:blogAdmin') },
    // { to: '/app/admin/sitemap', icon: AlertTriangle, label: t('navigation:sitemapManager') },
  ];

  // Combine links based on user role
  let links: NavigationLinkWithChildren[] = [...baseLinks];
  
  // Add admin links for admin and owner roles
  if (profile?.role === 'admin' || profile?.is_superadmin) {
    links = [...links, ...adminLinks];
  }

  // Add super admin links
  if (profile?.is_superadmin) {
    links = [...links, ...superAdminLinks];
  }

  // Determinar se deve mostrar conteúdo colapsado (apenas em desktop)
  const shouldCollapse = !isMobile && !!isCollapsed;

  // Effect para colapsar sidebar apenas na versão desktop
  React.useEffect(() => {
    if (location.pathname === '/app/chats' && !isMobile && setIsCollapsed) {
      setIsCollapsed(true);
    }
  }, [location.pathname, isMobile, setIsCollapsed]);

  return (
    <div className={`h-screen bg-white dark:bg-gray-900 dark:md:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col ${
      shouldCollapse ? 'w-16' : 'w-64'
    } transition-all duration-300 ease-in-out relative`}>
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <div className="flex items-center">
          <img src="/images/logos/interflow.svg" alt="Interflow" className="h-8 w-8" />
          {!shouldCollapse && (
            <h1 className="ml-2 text-xl font-bold text-gray-800 dark:text-white">Interflow</h1>
          )}
        </div>
        {isMobile && (
          <button
            onClick={onClose}
            className="p-2 rounded-md text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Botão de colapso apenas no desktop */}
      {!isMobile && setIsCollapsed && (
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute top-4 -right-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full p-1 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors z-10"
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-300" />
          ) : (
            <ChevronLeft className="w-4 h-4 text-gray-600 dark:text-gray-300" />
          )}
        </button>
      )}

      {/* Alertas de Subscription - apenas se não estiver no app nativo */}
      {!shouldCollapse && (typeof window.isNativeApp !== 'boolean' || !window.isNativeApp) && (isTrial || isSubscriptionEndingSoon || isSubscriptionExpired) && (
        <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
          {isTrial && !isTrialExpired && (
            <div className="flex items-center space-x-2 text-yellow-600 dark:text-yellow-500 text-sm mb-2">
              <AlertTriangle className="w-4 h-4" />
              <span>
                {t('common:trialDaysLeft', { days: trialDays })}
              </span>
            </div>
          )}
          {isTrialExpired && (
            <div className="flex items-center space-x-2 text-red-600 dark:text-red-500 text-sm mb-2">
              <AlertTriangle className="w-4 h-4" />
              <span>
                {t('common:subscriptionExpired', { days: Math.abs(trialDays) })}
              </span>
            </div>
          )}
          {isSubscriptionEndingSoon && !isTrial && (
            <div className="flex items-center space-x-2 text-orange-600 dark:text-orange-500 text-sm">
              <AlertTriangle className="w-4 h-4" />
              <span>
                {t('common:subscriptionEndingSoon')}
              </span>
            </div>
          )}
          {isSubscriptionExpired && !isTrial && (
            <div className="flex items-center space-x-2 text-red-600 dark:text-red-500 text-sm">
              <AlertTriangle className="w-4 h-4" />
              <span>
                {t('common:subscriptionExpired', { days: daysExpired })}
              </span>
            </div>
          )}
          <Link
            to="/app/settings/billing"
            className="mt-2 text-xs text-blue-600 dark:text-blue-400 hover:underline block"
          >
            {t('common:updateSubscription')}
          </Link>
        </div>
      )}

      {/* Scrollable Navigation - ajustando para garantir scroll adequado */}
      <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar">
        <nav className="p-4">
          <ul className="space-y-2">
            {links.map((link) => (
              <li key={link.to}>
                {link.children ? (
                  <SubmenuItem 
                    link={link} 
                    location={location} 
                    shouldCollapse={shouldCollapse} 
                    onClose={onClose}
                  />
                ) : (
                  <Link
                    to={link.to}
                    onClick={onClose}
                    className={`flex items-center ${shouldCollapse ? 'justify-center' : ''} rounded-lg transition-colors ${
                      location.pathname === link.to
                        ? 'bg-blue-50 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                    } ${shouldCollapse ? 'px-2 py-2' : 'px-3 py-2'}`}
                  >
                    <link.icon className={`w-5 h-5 flex-shrink-0 ${!shouldCollapse && 'mr-3'}`} />
                    {!shouldCollapse && <span>{link.label}</span>}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </nav>
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 p-4 border-t border-gray-200 dark:border-gray-700">
        {!shouldCollapse && (
          <Link
            to="profile"
            className="flex items-center space-x-3 mb-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 p-2 rounded-lg transition-colors"
          >
            <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.full_name}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <User className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {profile?.full_name}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {profile?.email}
              </p>
            </div>
          </Link>
        )}
        <div className="flex flex-col space-y-2">
          <LanguageSwitcher isCollapsed={shouldCollapse} />
          {!(typeof window.isNativeApp === 'boolean' && window.isNativeApp) && (
            <button
              onClick={() => setIsDark(!isDark)}
              className={`flex items-center ${shouldCollapse ? 'justify-center' : 'justify-start'} rounded-lg transition-colors text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
                shouldCollapse ? 'p-2' : 'px-4 py-2'
              }`}
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              {!shouldCollapse && <span className="ml-2">{isDark ? t('common:lightMode') : t('common:darkMode')}</span>}
            </button>
          )}
          <button
            onClick={() => {
              // Deslogar do OneSignal se estiver em ambiente nativo
              if (typeof window.isNativeApp === 'boolean' && window.isNativeApp && window.nativeApp?.unregisterFromNotifications) {
                console.log('Deslogando do OneSignal (nativo)');
                window.nativeApp.unregisterFromNotifications();
              }
              
              // Deslogar do OneSignal web
              try {
                console.log('Deslogando do OneSignal');
                OneSignal.logout();
              } catch (error) {
                console.error('Erro ao deslogar do OneSignal:', error);
              }
              
              signOut();
            }}
            className={`flex items-center ${shouldCollapse ? 'justify-center' : 'justify-start'} rounded-lg transition-colors text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
              shouldCollapse ? 'p-2' : 'px-4 py-2'
            }`}
          >
            <LogOut className="w-4 h-4" />
            {!shouldCollapse && <span className="ml-2">{t('common:logout')}</span>}
          </button>
        </div>
      </div>
    </div>
  );
};

// Componente para itens de submenu
const SubmenuItem: React.FC<SubmenuItemProps> = ({ link, location, shouldCollapse, onClose }) => {
  const [isOpen, setIsOpen] = useState(false);
  const isActive = location.pathname.startsWith(link.to);

  return (
    <div>
      <div
        className={`flex items-center ${shouldCollapse ? 'justify-center' : 'justify-between'} rounded-lg transition-colors cursor-pointer
          ${isActive
            ? 'bg-blue-50 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400'
            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
          } ${shouldCollapse ? 'px-2 py-2' : 'px-3 py-2'}`}
        onClick={() => !shouldCollapse && setIsOpen(!isOpen)}
      >
        <div className="flex items-center">
          <link.icon className={`w-5 h-5 flex-shrink-0 ${!shouldCollapse && 'mr-3'}`} />
          {!shouldCollapse && <span>{link.label}</span>}
        </div>
        {!shouldCollapse && link.children && (
          <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'transform rotate-180' : ''}`} />
        )}
      </div>
      
      {!shouldCollapse && isOpen && link.children && (
        <ul className="mt-1 ml-5 space-y-1">
          {link.children.map((child: LinkChild) => (
            <li key={child.to}>
              <Link
                to={child.to}
                onClick={onClose}
                className={`flex items-center rounded-lg text-sm py-2 px-3 transition-colors
                  ${(child.exact ? location.pathname === child.to : location.pathname.startsWith(child.to))
                    ? 'bg-blue-50 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                  }`}
              >
                {child.label}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default Sidebar;