import React from 'react';
import { useTranslation } from 'react-i18next';
import { PublicLayout } from '../../layouts/PublicLayout';
import LoginForm from '../../components/auth/LoginForm';

export default function Login() { //Login page
  const { t } = useTranslation('auth');

  // Se estiver no app nativo, renderiza apenas o LoginForm
  if (typeof window.isNativeApp === 'boolean' && window.isNativeApp) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4 pb-28">
        <div className="w-full max-w-md">
          <div>
            <h2 className="text-center text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 dark:text-white bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-500">
              {t('login.title')}
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
              {t('login.description')}
            </p>
          </div>
          <div className="mt-6">
            <LoginForm />
          </div>
        </div>
      </div>
    );
  }

  // Se não estiver no app nativo, renderiza com o PublicLayout
  return (
    <PublicLayout>
      <div className="flex min-h-[calc(100vh-5rem)] items-start sm:items-start sm:pt-[18vh] px-4 sm:px-6 lg:px-8 pt-12">
        <div className="w-full max-w-md mx-auto">
          <div>
            <h2 className="text-center text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 dark:text-white bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-500">
              {t('login.title')}
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
              {t('login.description')}
            </p>
          </div>
          <div className="mt-6">
            <LoginForm />
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}