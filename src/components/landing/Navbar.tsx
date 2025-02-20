import { useTranslation } from 'react-i18next';
import { useTheme } from '../../providers/ThemeProvider';
import i18next from 'i18next';
import { Link } from 'react-router-dom';

export const Navbar = () => {
  const { t } = useTranslation('landing');
  const { theme, setTheme } = useTheme();
  
  return (
    <nav className="fixed top-0 w-full bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-20">
          <div className="flex-shrink-0">
            <img 
              src={theme === 'dark' ? '/interflow-logo-white.svg' : '/interflow-logo.svg'}
              alt="Logo"
              className="h-10 hover:opacity-80 transition-opacity"
            />
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
                  className="bg-transparent text-sm border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 hover:border-gray-400 dark:hover:border-gray-600 transition-colors text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800"
                  value={i18next.language}
                >
                  <option value="pt" className="bg-white dark:bg-gray-800">PT</option>
                  <option value="en" className="bg-white dark:bg-gray-800">EN</option>
                  <option value="es" className="bg-white dark:bg-gray-800">ES</option>
                </select>

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
              </div>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}; 