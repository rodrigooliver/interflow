import React, { useState } from 'react';
import { Loader2, Mail } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

interface ResetPasswordFormProps {
  onSuccess?: () => void;
  isModal?: boolean;
}

export default function ResetPasswordForm({ onSuccess, isModal = false }: ResetPasswordFormProps) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation('auth');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'https://interflow.chat/app/profile',
      });
      
      if (resetError) {
        setError(t('resetPassword.errors.generic'));
      } else {
        setSuccess(true);
        if (onSuccess) {
          onSuccess();
        }
      }
    } catch {
      setError(t('resetPassword.errors.generic'));
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className={`${isModal ? '' : 'bg-white dark:bg-gray-800 p-5 sm:p-6 shadow rounded-lg'}`}>
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 dark:bg-green-900">
            <svg className="h-6 w-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">{t('resetPassword.success.title')}</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t('resetPassword.success.description')}</p>
        </div>
      </div>
    );
  }

  return (
    <form className={`space-y-5 ${isModal ? '' : 'bg-white dark:bg-gray-800 p-5 sm:p-6 shadow rounded-lg'}`} onSubmit={handleSubmit}>
      {error && (
        <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/50 dark:text-red-400 rounded-lg border border-red-200 dark:border-red-800 flex items-center">
          <div className="mr-2 text-red-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          {error}
        </div>
      )}

      <div className="relative group">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 dark:text-gray-500 group-focus-within:text-blue-500 dark:group-focus-within:text-blue-400 transition-colors duration-200">
          <Mail size={18} />
        </div>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="block w-full rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 pl-10 pr-3 py-2.5 transition-all duration-200"
          placeholder={t('resetPassword.fields.email')}
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-md text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:translate-y-[-1px] hover:shadow-lg mt-2"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            {t('common:loading')}
          </>
        ) : (
          t('resetPassword.submit')
        )}
      </button>

      {!isModal && (
        <div className="text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t('resetPassword.rememberPassword')}{' '}
            <Link
              to="/login"
              className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
            >
              {t('resetPassword.backToLogin')}
            </Link>
          </p>
        </div>
      )}
    </form>
  );
} 