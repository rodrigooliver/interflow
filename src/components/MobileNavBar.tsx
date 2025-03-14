import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, MessageSquare, Users, Calendar, Home } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface MobileNavBarProps {
  onOpenSidebar: () => void;
}

const MobileNavBar: React.FC<MobileNavBarProps> = ({ onOpenSidebar }) => {
  const location = useLocation();
  const { t } = useTranslation(['navigation', 'common']);

  // Função para verificar se um caminho está ativo
  const isActive = (path: string) => {
    if (path === '/app') {
      return location.pathname === '/app';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 z-40">
      <div className="flex justify-around items-center h-16">
        {/* Botão para abrir a sidebar */}
        <button
          onClick={onOpenSidebar}
          className="flex flex-col items-center justify-center w-full h-full text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400"
        >
          <Menu className="h-6 w-6" />
          <span className="text-xs mt-1">{t('common:menu')}</span>
        </button>

        {/* Link para dashboard */}
        <Link
          to="/app"
          className={`flex flex-col items-center justify-center w-full h-full ${
            isActive('/app') && location.pathname === '/app'
              ? 'text-blue-600 dark:text-blue-400'
              : 'text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400'
          }`}
        >
          <Home className="h-6 w-6" />
          <span className="text-xs mt-1">{t('navigation:dashboard')}</span>
        </Link>

        {/* Link para conversas */}
        <Link
          to="/app/chats"
          className={`flex flex-col items-center justify-center w-full h-full ${
            isActive('/app/chats')
              ? 'text-blue-600 dark:text-blue-400'
              : 'text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400'
          }`}
        >
          <MessageSquare className="h-6 w-6" />
          <span className="text-xs mt-1">{t('navigation:chats')}</span>
        </Link>

        {/* Link para clientes */}
        <Link
          to="/app/customers"
          className={`flex flex-col items-center justify-center w-full h-full ${
            isActive('/app/customers')
              ? 'text-blue-600 dark:text-blue-400'
              : 'text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400'
          }`}
        >
          <Users className="h-6 w-6" />
          <span className="text-xs mt-1">{t('navigation:customers')}</span>
        </Link>

        {/* Link para agendamentos */}
        <Link
          to="/app/schedules"
          className={`flex flex-col items-center justify-center w-full h-full ${
            isActive('/app/schedules')
              ? 'text-blue-600 dark:text-blue-400'
              : 'text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400'
          }`}
        >
          <Calendar className="h-6 w-6" />
          <span className="text-xs mt-1">{t('common:schedules')}</span>
        </Link>
      </div>
    </div>
  );
};

export default MobileNavBar; 