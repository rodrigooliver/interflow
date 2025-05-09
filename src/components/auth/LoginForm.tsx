import React, { useState } from 'react';
import { Loader2, Mail, Lock } from 'lucide-react';
import { useAuthContext } from '../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import ResetPasswordForm from './ResetPasswordForm';
import OneSignal from 'react-onesignal';
import api from '../../lib/api';

// Estendendo a interface Window para incluir nossas propriedades personalizadas
declare global {
  interface Window {
    isNativeApp?: boolean;
    loginToOneSignal?: (userId: string) => void;
    logoutFromOneSignal?: () => void;
    nativeApp?: {
      registerForNotifications: (userId: string) => boolean;
      unregisterFromNotifications: () => boolean;
    };
  }
}

interface LoginFormProps {
  onSuccess?: () => void;
  redirectPath?: string;
  isModal?: boolean;
}

export default function LoginForm({ onSuccess, redirectPath, isModal = false }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const { signIn } = useAuthContext();
  const { t } = useTranslation('auth');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = redirectPath || searchParams.get('redirect') || '/app';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      const { error: signInError } = await signIn(email, password);
      
      if (signInError) {
        if (signInError.message === 'Invalid login credentials') {
          setError(t('login.errors.invalidCredentials'));
        } else {
          setError(t('login.errors.generic'));
        }
      } else {
        // Se o login for bem-sucedido
        // Obter o userId do usuário atual
        const { data: { user } } = await supabase.auth.getUser();
        
        // Atualizar status de first_login para true
        if (user) {
          try {
            await api.put(`/api/user/${user.id}/first-login`);
            console.log('Status de primeiro login atualizado com sucesso');
          } catch (updateError) {
            console.error('Erro ao atualizar status de primeiro login:', updateError);
            // Continuar com o fluxo mesmo se houver erro aqui
          }
        }
        
        // Registrar no OneSignal se estiver em ambiente mobile
        if (user && window.isNativeApp && window.nativeApp?.registerForNotifications) {
          console.log('Registrando usuário no OneSignal:', user.id);
          window.nativeApp.registerForNotifications(user.id);
        }
        
        // Fazer login no OneSignal com o ID do usuário como externalId
        if (user) {
          try {
            console.log('Registrando externalId no OneSignal:', user.id);
            await OneSignal.login(user.id);
          } catch (oneSignalError) {
            console.error('Erro ao registrar usuário no OneSignal:', oneSignalError);
          }
        }

        if (onSuccess) {
          onSuccess();
        } else {
          // Verificar se há um token de convite pendente
          const pendingToken = localStorage.getItem('pendingJoinToken');
          
          if (pendingToken && redirect === 'join') {
            navigate(`/join?token=${pendingToken}`);
            localStorage.removeItem('pendingJoinToken');
          } else {
            navigate(redirect);
          }
        }
      }
    } catch {
      setError(t('login.errors.generic'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {showResetPassword ? (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-md w-full mx-4 relative">
            <button
              onClick={() => setShowResetPassword(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <ResetPasswordForm
              isModal={true}
              onSuccess={() => {
                setShowResetPassword(false);
                // Opcional: mostrar uma mensagem de sucesso no formulário de login
              }}
            />
          </div>
        </div>
      ) : null}

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
            placeholder={t('login.fields.email')}
          />
        </div>
        
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 dark:text-gray-500 group-focus-within:text-blue-500 dark:group-focus-within:text-blue-400 transition-colors duration-200">
            <Lock size={18} />
          </div>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="block w-full rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 pl-10 pr-3 py-2.5 transition-all duration-200"
            placeholder={t('login.fields.password')}
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
            t('login.signIn')
          )}
        </button>

        {!window.isNativeApp && (
          <div className="space-y-3">
            <div className="text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t('login.noAccount')}{' '}
                <Link
                  to="/signup"
                  className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  {t('login.createAccount')}
                </Link>
              </p>
            </div>
            <div className="text-center">
              <button
                type="button"
                onClick={() => setShowResetPassword(true)}
                className="text-sm font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
              >
                {t('login.forgotPassword')}
              </button>
            </div>
          </div>
        )}
      </form>
    </>
  );
} 