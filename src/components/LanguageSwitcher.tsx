import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, Loader2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { updateUserLanguage, reloadTranslations } from '../i18n';

const languages = [
  { code: 'pt', name: 'PT' },
  { code: 'en', name: 'EN' },
  { code: 'es', name: 'ES' }
];

interface LanguageSwitcherProps {
  isCollapsed?: boolean;
}

export function LanguageSwitcher({ isCollapsed }: LanguageSwitcherProps) {
  const { i18n } = useTranslation();
  const { session } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [changing, setChanging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLanguageChange = useCallback(async (languageCode: string) => {
    if (changing) return;
    
    setChanging(true);
    setError(null);

    try {
      // Force reload translations first
      await reloadTranslations(languageCode);
      
      // Update user preference if logged in
      if (session?.user?.id) {
        await updateUserLanguage(session.user.id, languageCode);
      }
    } catch (err) {
      console.error('Error changing language:', err);
      setError('Error changing language');
    } finally {
      setChanging(false);
      setIsOpen(false);
    }
  }, [session, changing]);

  // Don't render until i18n is initialized and has loaded initial resources
  if (!i18n.isInitialized || !i18n.hasLoadedNamespace('common')) {
    return null;
  }

  const currentLanguage = languages.find(lang => lang.code === i18n.language);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={changing}
        className={`flex items-center ${isCollapsed ? 'justify-center p-2' : 'justify-start px-3 py-2'} w-full text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed`}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        {changing ? (
          <Loader2 className={`${isCollapsed ? 'w-5 h-5' : 'w-4 h-4'} animate-spin`} />
        ) : (
          <Globe className={`${isCollapsed ? 'w-5 h-5' : 'w-4 h-4'}`} />
        )}
        {!isCollapsed && <span className="ml-2">{currentLanguage?.name || 'Language'}</span>}
      </button>

      {isOpen && (
        <div 
          className={`absolute ${isCollapsed ? 'left-full' : 'left-0'} bottom-full mb-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 z-50 ring-1 ring-black ring-opacity-5 ${isCollapsed ? 'ml-2' : ''}`}
          role="menu"
          aria-orientation="vertical"
          aria-labelledby="language-menu"
        >
          {languages.map((language) => (
            <button
              key={language.code}
              onClick={() => handleLanguageChange(language.code)}
              disabled={changing || language.code === i18n.language}
              className={`w-full text-left px-4 py-2 text-sm ${
                i18n.language === language.code
                  ? 'bg-blue-50 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
              role="menuitem"
            >
              {language.name}
            </button>
          ))}
        </div>
      )}

      {error && (
        <div className="absolute left-0 bottom-full mb-2 w-48 bg-red-50 dark:bg-red-900/50 text-red-600 dark:text-red-400 text-sm rounded-md p-2">
          {error}
        </div>
      )}
    </div>
  );
}