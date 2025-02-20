import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import SignupForm from './components/SignupForm';
import { useTheme } from '../../../providers/ThemeProvider';

export default function SignupPage() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link to="/" className="flex justify-center">
          <img
            className="h-12 w-auto"
            src={theme === 'dark' ? '/interflow-logo-white.svg' : '/interflow-logo.svg'}
            alt="Logo"
          />
        </Link>
        <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
          {t('signup.title')}
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
          {t('signup.subtitle')}{' '}
          <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300">
            {t('signup.login_link')}
          </Link>
        </p>
      </div>

      <SignupForm />
    </div>
  );
} 