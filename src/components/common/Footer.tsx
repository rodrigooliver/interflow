import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

export const Footer = () => {
  const { t } = useTranslation('landing');
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-50 dark:bg-gray-800 py-12">
      <div className="container mx-auto px-4">
        <div className="flex flex-col items-center space-y-4">
          <p className="text-center text-gray-600 dark:text-gray-400">
            © {currentYear} {t('landing:footer.copyright')}
          </p>
          <div className="flex space-x-4">
            <Link 
              to="/privacy-policy" 
              className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors"
            >
              {t('landing:footer.privacyPolicy')}
            </Link>
            <Link 
              to="/terms-of-service" 
              className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors"
            >
              {t('landing:footer.termsOfService')}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}; 