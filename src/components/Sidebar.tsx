import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { MessageSquare, Users, Settings as SettingsIcon, LayoutDashboard, LogOut, Sun, Moon, X, Building2, UserPlus, UsersRound, Share2, Keyboard, GitFork, GitMerge, Tag, User, MessageSquareText, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useDarkMode } from '../hooks/useDarkMode';
import { LanguageSwitcher } from './LanguageSwitcher';
import { useAuthContext } from '../contexts/AuthContext';

interface SidebarProps {
  onClose?: () => void;
  isMobile?: boolean;
  isCollapsed?: boolean;
  setIsCollapsed?: (value: boolean) => void;
}

const Sidebar = ({ onClose, isMobile = false, isCollapsed, setIsCollapsed }: SidebarProps) => {
  const location = useLocation();
  const { signOut, profile } = useAuthContext();
  const { isDark, setIsDark } = useDarkMode();
  const { t } = useTranslation(['navigation', 'common']);

  // Base links that all users can see
  const baseLinks = [
    { to: '/app', icon: LayoutDashboard, label: t('navigation:dashboard') },
    { to: '/app/chats', icon: MessageSquare, label: t('navigation:chats') },
    { to: '/app/customers', icon: Users, label: t('navigation:customers') },
    { to: '/app/crm', icon: GitMerge, label: t('navigation:crm') },
    { to: '/app/shortcuts', icon: Keyboard, label: t('navigation:shortcuts') },
    { to: '/app/tags', icon: Tag, label: t('navigation:tags') },
    { to: '/app/prompts', icon: MessageSquareText, label: t('navigation:prompts') },
  ];

  // Admin and owner only links
  const adminLinks = [
    { to: '/app/team', icon: UserPlus, label: t('navigation:team') },
    { to: '/app/service-teams', icon: UsersRound, label: t('navigation:serviceTeams') },
    { to: '/app/channels', icon: Share2, label: t('navigation:channels') },
    { to: '/app/flows', icon: GitFork, label: t('navigation:flows') },
    { to: '/app/settings', icon: SettingsIcon, label: t('navigation:settings') },
  ];

  // Super admin links
  const superAdminLinks = [
    { to: '/app/admin/organizations', icon: Building2, label: t('navigation:organizations') },
  ];

  // Combine links based on user role
  let links = [...baseLinks];
  
  // Add admin links for admin and owner roles
  if (profile?.role === 'admin' || profile?.is_superadmin) {
    links = [...links, ...adminLinks];
  }

  // Add super admin links
  if (profile?.is_superadmin) {
    links = [...links, ...superAdminLinks];
  }

  // Determinar se deve mostrar conteúdo colapsado (apenas em desktop)
  const shouldCollapse = !isMobile && isCollapsed;

  // Effect para colapsar sidebar apenas na versão desktop
  React.useEffect(() => {
    if (location.pathname === '/app/chats' && !isMobile && setIsCollapsed) {
      setIsCollapsed(true);
    }
  }, [location.pathname, isMobile, setIsCollapsed]);

  return (
    <div className={`h-screen bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col ${
      shouldCollapse ? 'w-16' : 'w-64'
    } transition-all duration-300 ease-in-out relative`}>
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <div className="flex items-center">
          <img src="/interflow.svg" alt="Interflow" className="h-8 w-8" />
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

      {/* Scrollable Navigation - ajustando para garantir scroll adequado */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <nav className="p-4">
          <ul className="space-y-2">
            {links.map(({ to, icon: Icon, label }) => (
              <li key={to}>
                <Link
                  to={to}
                  onClick={onClose}
                  className={`flex items-center ${shouldCollapse ? 'justify-center' : ''} rounded-lg transition-colors ${
                    location.pathname === to
                      ? 'bg-blue-50 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                  } ${shouldCollapse ? 'px-2 py-2' : 'px-3 py-2'}`}
                >
                  <Icon className={`w-5 h-5 flex-shrink-0 ${!shouldCollapse && 'mr-3'}`} />
                  {!shouldCollapse && <span>{label}</span>}
                </Link>
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
          <button
            onClick={() => setIsDark(!isDark)}
            className={`flex items-center ${shouldCollapse ? 'justify-center' : 'justify-start'} rounded-lg transition-colors text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
              shouldCollapse ? 'p-2' : 'px-4 py-2'
            }`}
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            {!shouldCollapse && <span className="ml-2">{isDark ? t('common:lightMode') : t('common:darkMode')}</span>}
          </button>
          <button
            onClick={() => signOut()}
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

export default Sidebar;