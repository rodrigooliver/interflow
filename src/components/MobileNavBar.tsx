import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, MessageSquare, Users, Calendar, Home } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavbarVisibility } from '../contexts/NavbarVisibilityContext';

interface MobileNavBarProps {
  onOpenSidebar: () => void;
}

const MobileNavBar: React.FC<MobileNavBarProps> = ({ onOpenSidebar }) => {
  const location = useLocation();
  const { t } = useTranslation(['navigation', 'common']);
  const { isNavbarVisible } = useNavbarVisibility();

  // Verificar se estamos em uma rota de chat específico
  const isInSpecificChatRoute = location.pathname.match(/\/app\/chats\/([^/]+)$/) || location.pathname.match(/\/app\/chat\/([^/]+)$/);

  // Se a barra de navegação não estiver visível ou estivermos em uma rota de chat específico, não renderizar nada
  if (!isNavbarVisible || isInSpecificChatRoute) {
    return null;
  }

  // Função para verificar se um caminho está ativo
  const isActive = (path: string) => {
    if (path === '/app') {
      return location.pathname === '/app';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gradient-to-b dark:from-gray-800 dark:to-gray-900 border-t border-gray-200 dark:border-gray-700 z-40 shadow-lg">
      <div className="flex justify-around items-center h-16 px-2">
        {/* Botão para abrir a sidebar */}
        <button
          onClick={onOpenSidebar}
          className="flex flex-col items-center justify-center w-full h-full py-2 text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200"
        >
          <div className="p-1.5 rounded-full bg-gray-100 dark:bg-gray-700">
            <Menu className="h-5 w-5" strokeWidth={2.2} />
          </div>
          <span className="text-xs font-medium mt-1">{t('common:menu')}</span>
        </button>

        {/* Link para dashboard */}
        <Link
          to="/app"
          className={`flex flex-col items-center justify-center w-full h-full py-2 transition-colors duration-200 ${
            isActive('/app') && location.pathname === '/app'
              ? 'text-blue-600 dark:text-blue-400'
              : 'text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400'
          }`}
        >
          <div className={`p-1.5 rounded-full ${isActive('/app') && location.pathname === '/app' ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-gray-100 dark:bg-gray-700'}`}>
            <Home className="h-5 w-5" strokeWidth={2.2} />
          </div>
          <span className="text-xs font-medium mt-1">{t('navigation:dashboard')}</span>
        </Link>

        {/* Link para conversas */}
        <Link
          to="/app/chats"
          className={`flex flex-col items-center justify-center w-full h-full py-2 transition-colors duration-200 ${
            isActive('/app/chats')
              ? 'text-blue-600 dark:text-blue-400'
              : 'text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400'
          }`}
        >
          <div className={`p-1.5 rounded-full ${isActive('/app/chats') ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-gray-100 dark:bg-gray-700'}`}>
            <MessageSquare className="h-5 w-5" strokeWidth={2.2} />
          </div>
          <span className="text-xs font-medium mt-1">{t('navigation:chats')}</span>
        </Link>

        {/* Link para clientes */}
        <Link
          to="/app/customers"
          className={`flex flex-col items-center justify-center w-full h-full py-2 transition-colors duration-200 ${
            isActive('/app/customers')
              ? 'text-blue-600 dark:text-blue-400'
              : 'text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400'
          }`}
        >
          <div className={`p-1.5 rounded-full ${isActive('/app/customers') ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-gray-100 dark:bg-gray-700'}`}>
            <Users className="h-5 w-5" strokeWidth={2.2} />
          </div>
          <span className="text-xs font-medium mt-1">{t('navigation:customers')}</span>
        </Link>

        {/* Link para agendamentos */}
        <Link
          to="/app/appointments"
          className={`flex flex-col items-center justify-center w-full h-full py-2 transition-colors duration-200 ${
            isActive('/app/appointments')
              ? 'text-blue-600 dark:text-blue-400'
              : 'text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400'
          }`}
        >
          <div className={`p-1.5 rounded-full ${isActive('/app/appointments') ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-gray-100 dark:bg-gray-700'}`}>
            <Calendar className="h-5 w-5" strokeWidth={2.2} />
          </div>
          <span className="text-xs font-medium mt-1">{t('common:schedules')}</span>
        </Link>
      </div>
    </div>
  );
};

export default MobileNavBar; 