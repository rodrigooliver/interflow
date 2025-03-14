import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../../lib/supabase';
import { Loader2, X } from 'lucide-react';
import api from '../../../lib/api';
import LoginForm from '../../../components/auth/LoginForm';
import { PublicLayout } from '../../../layouts/PublicLayout';
import { useAuthContext } from '../../../contexts/AuthContext';

export default function JoinPage() {
  const { t } = useTranslation(['common']);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const { signOut } = useAuthContext();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [tokenData, setTokenData] = useState<{
    userId: string;
    organizationId: string;
    role: string;
    exp: number;
  } | null>(null);

  useEffect(() => {
    async function processToken() {
      if (!token) {
        setError('Token de convite inválido ou ausente');
        setLoading(false);
        return;
      }

      try {
        // Decodificar o token
        const decodedData = JSON.parse(atob(token));
        const { userId, organizationId, role, exp } = decodedData;
        setTokenData(decodedData);

        // Verificar se o token expirou
        const currentTime = Math.floor(Date.now() / 1000);
        if (exp < currentTime) {
          setError('O link de convite expirou. Por favor, solicite um novo convite.');
          setLoading(false);
          return;
        }

        // Verificar se o usuário está logado
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          // Se não estiver logado, mostrar o modal de login
          localStorage.setItem('pendingJoinToken', token);
          setShowLoginModal(true);
          setLoading(false);
          return;
        }

        // Verificar se o usuário logado é o mesmo do token
        if (session.user.id !== userId) {
          // Fazer logout se o usuário logado não for o mesmo do token
          await signOut();
          setError('Você precisa estar logado com a conta associada ao convite.');
          localStorage.setItem('pendingJoinToken', token);
          setShowLoginModal(true);
          setLoading(false);
          return;
        }

        // Processar a vinculação do usuário à organização
        await joinOrganization(userId, organizationId, role);
      } catch {
        setError('Erro ao processar o convite. O token pode ser inválido.');
        setLoading(false);
      }
    }

    processToken();
  }, [token, navigate, signOut]);

  const joinOrganization = async (userId: string, organizationId: string, role: string) => {
    try {
      setLoading(true);
      const response = await api.post(`/api/${organizationId}/member/join`, {
        userId,
        role
      });

      if (response.data.success) {
        setSuccess(true);
        // Redirecionar para o dashboard após 3 segundos
        setTimeout(() => {
          navigate('/app');
        }, 3000);
      } else {
        setError(response.data.error || 'Erro ao processar o convite');
      }
    } catch {
      setError('Erro ao processar o convite. Por favor, tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSuccess = () => {
    setShowLoginModal(false);
    if (tokenData) {
      joinOrganization(tokenData.userId, tokenData.organizationId, tokenData.role);
    } else {
      setError('Erro ao processar o convite após login. Por favor, tente novamente.');
    }
  };

  return (
    <PublicLayout>
      <div className="min-h-[calc(100vh-5rem)] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
            {t('common:joinOrganization', 'Entrar na organização')}
          </h2>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white dark:bg-gray-800 py-8 px-4 shadow sm:rounded-lg sm:px-10">
            {loading ? (
              <div className="flex justify-center items-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                <span className="ml-2 text-gray-700 dark:text-gray-300">
                  {t('common:processing', 'Processando...')}
                </span>
              </div>
            ) : error ? (
              <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 p-4 rounded-md mb-4">
                <p>{error}</p>
                <div className="mt-4">
                  <button
                    onClick={() => navigate('/')}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    {t('common:backToHome', 'Voltar para a página inicial')}
                  </button>
                </div>
              </div>
            ) : success ? (
              <div className="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 p-4 rounded-md mb-4">
                <p>{t('common:joinSuccess', 'Você foi adicionado à organização com sucesso!')}</p>
                <p className="mt-2 text-sm">
                  {t('common:redirecting', 'Redirecionando para o dashboard...')}
                </p>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Modal de Login */}
      {showLoginModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
            <div className="flex justify-between items-center p-6 border-b dark:border-gray-700">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                {t('common:loginRequired', 'Login necessário')}
              </h3>
              <button
                onClick={() => navigate('/')}
                className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
                {t('common:loginToJoin', 'Faça login para aceitar o convite e entrar na organização.')}
              </p>
              <LoginForm 
                onSuccess={handleLoginSuccess} 
                redirectPath="join"
                isModal={true}
              />
            </div>
          </div>
        </div>
      )}
    </PublicLayout>
  );
} 