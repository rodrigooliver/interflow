import { useTranslation } from 'react-i18next';
import { useTheme } from '../../providers/ThemeProvider';
import i18next from 'i18next';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Menu as MenuIcon, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuthContext } from '../../contexts/AuthContext';
import { useReferral } from '../../hooks/useReferral';
import { useTrackingPixel } from '../../hooks/useTrackingPixel';

export const Navbar = () => {
  const { t } = useTranslation('landing');
  const { theme, setTheme } = useTheme();
  const { session } = useAuthContext();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { referral } = useReferral();
  const { trackEvent } = useTrackingPixel();
  
  // Efeito para tracking de pageview
  useEffect(() => {
    if (referral) {
      trackEvent('PageView');
    }
  }, [location.pathname, referral, trackEvent]);

  // Fechar o menu quando a rota mudar
  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

  // Impedir o scroll do body quando o menu estiver aberto em dispositivos móveis
  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMenuOpen]);
  
  // Função para navegar para uma seção específica
  const scrollToSection = (id: string) => {
    // Fechar o menu se estiver aberto
    setIsMenuOpen(false);
    
    // Se já estamos na página inicial, apenas role para a seção
    if (location.pathname === '/') {
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      } else if (id === 'top') {
        // Se o id for 'top', role para o topo da página
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } else {
      // Se não estamos na página inicial, navegue para a página inicial com um parâmetro de hash
      navigate(id === 'top' ? '/' : `/?section=${id}`);
    }
  };
  
  // Efeito para verificar se há um parâmetro de seção na URL ao carregar a página
  useEffect(() => {
    if (location.pathname === '/') {
      // Extrair o parâmetro 'section' da URL
      const params = new URLSearchParams(location.search);
      const section = params.get('section');
      
      if (section) {
        // Pequeno atraso para garantir que a página foi carregada completamente
        setTimeout(() => {
          const element = document.getElementById(section);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
            // Limpar o parâmetro da URL para não rolar novamente se a página for recarregada
            navigate('/', { replace: true });
          }
        }, 500);
      }
    }
  }, [location, navigate]);
  
  return (
    <>
      {/* Elemento para ocupar o espaço da navbar */}
      <div className="h-20 w-full" id="top"></div>
      
      <nav className="fixed top-0 left-0 right-0 w-full bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm md:border-b border-gray-200 dark:border-gray-800 z-50">
        <div className="container mx-auto">
          <div className="flex items-center justify-between h-20 px-4">
            <div className="flex-shrink-0">
              <Link to="/">
                <img 
                  src={theme === 'dark' ? '/images/logos/interflow-logo-white.svg' : '/images/logos/interflow-logo.svg'}
                  alt="Logo"
                  className="h-8 w-auto"
                />
              </Link>
            </div>
            
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 rounded-md text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 md:hidden"
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <MenuIcon className="h-6 w-6" />}
            </button>
            
            <div className="hidden md:block">
              <div className="flex items-center space-x-6">
                <button 
                  onClick={() => scrollToSection('top')} 
                  className="nav-link text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors bg-transparent border-none cursor-pointer"
                >
                  {t('nav.home')}
                </button>
                <button 
                  onClick={() => scrollToSection('pricing')} 
                  className="nav-link text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors bg-transparent border-none cursor-pointer"
                >
                  {t('nav.pricing')}
                </button>
                
                <div className="flex items-center space-x-4 ml-4">
                  <button 
                    onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                    className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    aria-label="Toggle theme"
                  >
                    {theme === 'dark' ? '🌞' : '🌙'}
                  </button>
                  
                  <select 
                    onChange={(e) => i18next.changeLanguage(e.target.value)}
                    className="ml-4 bg-transparent border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-700 dark:text-gray-200"
                    value={i18next.language}
                  >
                    <option value="pt" className="bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200">PT</option>
                    <option value="en" className="bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200">EN</option>
                    <option value="es" className="bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200">ES</option>
                  </select>

                  {session ? (
                    <Link 
                      to="/app" 
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                    >
                      {t('nav.goToDashboard')}
                    </Link>
                  ) : (
                    <>
                      <Link 
                        to="/login" 
                        className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
                      >
                        {t('nav.login')}
                      </Link>
                      <Link 
                        to="/signup" 
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                      >
                        {t('nav.register')}
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {isMenuOpen && (
            <div className="md:hidden bg-white/95 dark:bg-gray-800/95 p-4 absolute left-0 right-0 top-20 h-[calc(100dvh-5rem)] overflow-y-auto">
              <div className="pt-0 pb-3 space-y-1 sm:px-3">
                <button
                  onClick={() => scrollToSection('top')}
                  className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800 bg-transparent border-none cursor-pointer"
                >
                  {t('nav.home')}
                </button>
                <button
                  onClick={() => scrollToSection('pricing')}
                  className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800 bg-transparent border-none cursor-pointer"
                >
                  {t('nav.pricing')}
                </button>
              </div>
              <div className="pt-4 pb-3 border-t border-gray-200 dark:border-gray-700">
                <div className="px-2 space-y-1">
                  <div className="flex items-center px-3 py-2">
                    <button 
                      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                      className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
                    >
                      {theme === 'dark' ? '🌞' : '🌙'}
                    </button>
                    <select 
                      onChange={(e) => i18next.changeLanguage(e.target.value)}
                      className="ml-4 bg-transparent border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-700 dark:text-gray-200"
                      value={i18next.language}
                    >
                      <option value="pt" className="bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200">PT</option>
                      <option value="en" className="bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200">EN</option>
                      <option value="es" className="bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200">ES</option>
                    </select>
                  </div>
                  {session ? (
                    <Link 
                      to="/app" 
                      className="block px-3 py-2 rounded-md text-base font-medium text-white bg-blue-600 hover:bg-blue-700"
                    >
                      {t('nav.goToDashboard')}
                    </Link>
                  ) : (
                    <>
                      <Link 
                        to="/login" 
                        className="block px-3 py-2 rounded-md text-base font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800"
                      >
                        {t('nav.login')}
                      </Link>
                      <Link 
                        to="/signup" 
                        className="block px-3 py-2 rounded-md text-base font-medium text-white bg-blue-600 hover:bg-blue-700"
                      >
                        {t('nav.register')}
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </nav>
    </>
  );
}; 