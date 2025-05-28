import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, MessageSquare, Users, Calendar, CheckSquare } from 'lucide-react';
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
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-lg border-t border-gray-200/50 dark:border-gray-700/50 z-40 shadow-2xl">
      <div className="flex justify-around items-center h-16 px-1">
        {/* Botão para abrir a sidebar */}
        <button
          onClick={onOpenSidebar}
          className="flex flex-col items-center justify-center w-full h-full py-2 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-all duration-300 hover:scale-105 active:scale-95"
        >
          <div className="p-2 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 shadow-sm hover:shadow-md transition-all duration-300">
            <Menu className="h-5 w-5" strokeWidth={2} />
          </div>
          <span className="text-[10px] font-semibold mt-0.5 tracking-wide">{t('common:menu')}</span>
        </button>

        {/* Link para dashboard */}
        {/* <Link
          to="/app"
          className={`flex flex-col items-center justify-center w-full h-full py-2 transition-all duration-300 hover:scale-105 active:scale-95 ${
            isActive('/app') && location.pathname === '/app'
              ? 'text-blue-600 dark:text-blue-400'
              : 'text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400'
          }`}
        >
          <div className={`p-1.5 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 ${
            isActive('/app') && location.pathname === '/app' 
              ? 'bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/40 dark:to-blue-800/40 shadow-blue-200/50 dark:shadow-blue-900/30' 
              : 'bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700'
          }`}>
            <Home className="h-5 w-5" strokeWidth={2} />
          </div>
          <span className="text-[10px] font-semibold mt-0.5 tracking-wide">{t('navigation:dashboard')}</span>
        </Link> */}

        {/* Link para tarefas */}
        <Link
          to="/app/tasks"
          className={`flex flex-col items-center justify-center w-full h-full py-2 transition-all duration-300 hover:scale-105 active:scale-95 ${
            isActive('/app/tasks')
              ? 'text-blue-600 dark:text-blue-400'
              : 'text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400'
          }`}
        >
          <div className={`p-1.5 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 ${
            isActive('/app/tasks') 
              ? 'bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/40 dark:to-blue-800/40 shadow-blue-200/50 dark:shadow-blue-900/30' 
              : 'bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700'
          }`}>
            <CheckSquare className="h-5 w-5" strokeWidth={2} />
          </div>
          <span className="text-[10px] font-semibold mt-0.5 tracking-wide">{t('navigation:tasks', 'Tarefas')}</span>
        </Link>

        {/* Link para conversas */}
        <Link
          to="/app/chats"
          className={`flex flex-col items-center justify-center w-full h-full py-2 transition-all duration-300 hover:scale-105 active:scale-95 ${
            isActive('/app/chats')
              ? 'text-blue-600 dark:text-blue-400'
              : 'text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400'
          }`}
        >
          <div className={`p-1.5 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 ${
            isActive('/app/chats') 
              ? 'bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/40 dark:to-blue-800/40 shadow-blue-200/50 dark:shadow-blue-900/30' 
              : 'bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700'
          }`}>
            <MessageSquare className="h-5 w-5" strokeWidth={2} />
          </div>
          <span className="text-[10px] font-semibold mt-0.5 tracking-wide">{t('navigation:chats')}</span>
        </Link>

        {/* Link para clientes */}
        <Link
          to="/app/customers"
          className={`flex flex-col items-center justify-center w-full h-full py-2 transition-all duration-300 hover:scale-105 active:scale-95 ${
            isActive('/app/customers')
              ? 'text-blue-600 dark:text-blue-400'
              : 'text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400'
          }`}
        >
          <div className={`p-1.5 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 ${
            isActive('/app/customers') 
              ? 'bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/40 dark:to-blue-800/40 shadow-blue-200/50 dark:shadow-blue-900/30' 
              : 'bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700'
          }`}>
            <Users className="h-5 w-5" strokeWidth={2} />
          </div>
          <span className="text-[10px] font-semibold mt-0.5 tracking-wide">{t('navigation:customers')}</span>
        </Link>

        {/* Link para agendamentos */}
        <Link
          to="/app/appointments"
          className={`flex flex-col items-center justify-center w-full h-full py-2 transition-all duration-300 hover:scale-105 active:scale-95 ${
            isActive('/app/appointments')
              ? 'text-blue-600 dark:text-blue-400'
              : 'text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400'
          }`}
        >
          <div className={`p-1.5 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 ${
            isActive('/app/appointments') 
              ? 'bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/40 dark:to-blue-800/40 shadow-blue-200/50 dark:shadow-blue-900/30' 
              : 'bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700'
          }`}>
            <Calendar className="h-5 w-5" strokeWidth={2} />
          </div>
          <span className="text-[10px] font-semibold mt-0.5 tracking-wide">{t('common:schedules')}</span>
        </Link>
      </div>
    </div>
  );
};

export default MobileNavBar; 