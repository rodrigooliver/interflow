import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import Backend from 'i18next-http-backend';
import { supabase } from './lib/supabase';

// List of all namespaces used in the application
const namespaces = [
  'common',
  'auth',
  'navigation',
  'dashboard',
  'chats',
  'customers',
  'crm',
  'shortcuts',
  'team',
  'serviceTeams',
  'channels',
  'flows',
  'settings',
  'landing'
] as const;

export type Namespace = typeof namespaces[number];

// Initialize i18n
const i18nInstance = i18n
  .use(Backend)
  .use(LanguageDetector)
  .use(initReactI18next);

// Initialize with basic configuration first
await i18nInstance.init({
  fallbackLng: ['pt'],
  supportedLngs: ['pt', 'en', 'es'],
  ns: namespaces,
  defaultNS: 'common',
  interpolation: {
    escapeValue: false
  },
  detection: {
    order: ['querystring', 'navigator'],
    lookupQuerystring: 'lng',
    caches: ['localStorage'] // Enable localStorage cache
  },
  backend: {
    loadPath: '/locales/{{lng}}/{{ns}}.json',
    allowMultiLoading: false,
    crossDomain: false,
    withCredentials: false,
    requestOptions: {
      cache: 'default', // Enable HTTP cache
      headers: {
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
        'Pragma': 'cache'
      }
    }
  },
  load: 'currentOnly',
  preload: ['pt', 'en', 'es'],
  debug: import.meta.env.VITE_ENV === 'development',
  react: {
    useSuspense: true,
    bindI18n: 'languageChanged loaded',
    bindI18nStore: 'added removed',
    transEmptyNodeValue: '',
    transSupportBasicHtmlNodes: true,
    transKeepBasicHtmlNodesFor: ['br', 'strong', 'i', 'p']
  },
  // Cache settings
  returnNull: false,
  returnEmptyString: false,
  returnObjects: true,
  saveMissing: false,
  missingKeyHandler: false,
  appendNamespaceToMissingKey: true,
  parseMissingKeyHandler: false,
  cache: {
    enabled: true,
    prefix: 'i18next_res_',
    expirationTime: 7 * 24 * 60 * 60 * 1000, // 7 days
    versions: {}
  }
});

// Function to update user language preference
export async function updateUserLanguage(userId: string, language: string) {
  try {
    // Update language in database first
    const { error } = await supabase
      .from('profiles')
      .update({ language })
      .eq('id', userId);

    if (error) throw error;

    // Change language and reload only missing resources
    await i18n.changeLanguage(language);
    
    // Update localStorage language
    localStorage.setItem('i18nextLng', language);
  } catch (err) {
    console.error('Error updating user language:', err);
    throw err;
  }
}

// Function to force reload translations
export async function reloadTranslations(language: string) {
  try {
    // Change language and let i18next handle caching
    await i18n.changeLanguage(language);
  } catch (err) {
    console.error('Error reloading translations:', err);
    throw err;
  }
}

// Initialize with default language
const defaultLanguage = localStorage.getItem('i18nextLng') || 'pt';
await i18n.changeLanguage(defaultLanguage);
// Load all namespaces
await Promise.all(namespaces.map(ns => i18n.loadNamespaces(ns)));

// Exporte a instância do i18n
export default i18nInstance;

