import { useTranslation } from 'react-i18next';
import { useTheme } from '../../providers/ThemeProvider';
import i18next from 'i18next';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Menu as MenuIcon, X } from 'lucide-react';
import { useState } from 'react';

export const Navbar = () => {
  const { t } = useTranslation('landing');
  const { theme, setTheme } = useTheme();
  const { session } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  return (
    <nav className="fixed top-0 w-full bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm md:border-b border-gray-200 dark:border-gray-800 z-50">
      <div className="container mx-auto">
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="fixed top-4 right-4 p-2 rounded-md text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 md:hidden"
        >
          {isMenuOpen ? <X className="h-6 w-6" /> : <MenuIcon className="h-6 w-6" />}
        </button>
        <div className="items-center justify-between h-20 hidden md:flex  px-4">
          <div className="flex-shrink-0 hidden md:block">
            <Link to="/">
              <img 
                src={theme === 'dark' ? '/interflow-logo-white.svg' : '/interflow-logo.svg'}
                alt="Logo"
                className="hidden md:block h-8 w-auto"
              />
            </Link>
          </div>
          
          <div className="hidden md:block">
            <div className="flex items-center space-x-6">
              <a href="#" className="nav-link text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors">
                {t('nav.home')}
              </a>
              <a href="#pricing" className="nav-link text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors">
                {t('nav.pricing')}
              </a>
              
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
          <div className="md:hidden bg-white/95 dark:bg-gray-800/40 p-4">
            <div className="pt-0 pb-3 space-y-1 sm:px-3">
              <a
                href="#"
                className="block px-3 py-2 rounded-md text-base font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                {t('nav.home')}
              </a>
              <a
                href="#pricing"
                className="block px-3 py-2 rounded-md text-base font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                {t('nav.pricing')}
              </a>
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
  );
}; 