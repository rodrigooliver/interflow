import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, AlertTriangle, RefreshCw, ArrowRight, Check, X, MessageSquare, Trash } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useOrganizationContext } from '../../../contexts/OrganizationContext';
import { supabase } from '../../../lib/supabase';
import api from '../../../lib/api';
import { toast } from 'react-hot-toast';
import { RealtimeChannel } from '@supabase/supabase-js';

// Interface para erros com resposta
interface ApiError extends Error {
  response?: {
    data?: {
      error?: string;
    };
  };
}

// Declaração para o SDK do Facebook
declare global {
  interface Window {
    FB: {
      init: (options: {
        appId: string;
        autoLogAppEvents: boolean;
        xfbml: boolean;
        version: string;
      }) => void;
      login: (
        callback: (response: {
          authResponse?: {
            code: string;
          };
        }) => void,
        options: Record<string, unknown>
      ) => void;
    };
    fbAsyncInit: () => void;
  }
}

export default function WhatsAppOfficialForm() {
  const { t } = useTranslation(['channels', 'common']);
  const navigate = useNavigate();
  const { id } = useParams();
  const { currentOrganization } = useOrganizationContext();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [tokenInput, setTokenInput] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    is_connected: false,
    status: 'inactive'
  });
  // Referência para armazenar as informações da sessão de forma síncrona
  const sessionInfoRef = useRef<Record<string, unknown>>({});
  // Estado para armazenar informações de configuração
  const [setupInfo, setSetupInfo] = useState<{
    currentStep?: string;
    nextStep?: string;
    setupStatus?: string;
    lastError?: string;
  }>({});

  // Subscription para ouvir alterações no canal
  const [subscription, setSubscription] = useState<RealtimeChannel | null>(null);

  useEffect(() => {
    if (id) {
      loadChannelData();
      
      // Iniciar subscription para ouvir alterações no canal
      subscribeToChannelUpdates();
    }
    
    // Inicializar o SDK do Facebook
    initFacebookSDK();
    
    // Adicionar listener para mensagens do Facebook
    window.addEventListener('message', handleFacebookMessage);
    
    return () => {
      window.removeEventListener('message', handleFacebookMessage);
      
      // Limpar subscription ao desmontar o componente
      if (id) {
        unsubscribeFromChannelUpdates();
      }
    };
  }, [id]);

  const initFacebookSDK = () => {
    window.fbAsyncInit = function() {
      window.FB.init({
        appId: import.meta.env.VITE_FB_APP_ID,
        autoLogAppEvents: true,
        xfbml: true,
        version: 'v22.0'
      });
      console.log(window.FB)
    };

    // Carregar o SDK do Facebook de forma assíncrona
    (function(d, s, id) {
      const fjs = d.getElementsByTagName(s)[0];
      if (d.getElementById(id)) return;
      const js = d.createElement(s) as HTMLScriptElement;
      js.id = id;
      js.src = "https://connect.facebook.net/pt_BR/sdk.js";
      js.async = true;
      js.defer = true;
      js.crossOrigin = "anonymous";
      fjs.parentNode?.insertBefore(js, fjs);
    }(document, 'script', 'facebook-jssdk'));
  };

  const handleFacebookMessage = (event: MessageEvent) => {
    if (event.origin !== "https://www.facebook.com" && event.origin !== "https://web.facebook.com") {
      return;
    }
    
    try {
      const data = JSON.parse(event.data);
      if (data.type === 'WA_EMBEDDED_SIGNUP') {
        // Se o usuário concluir o fluxo de Cadastro Incorporado
        if (data.event === 'FINISH') {
          const { phone_number_id, waba_id } = data.data;
          console.log("ID do número de telefone:", phone_number_id, "ID da conta WhatsApp Business:", waba_id);
          
          // Armazenar as informações da sessão na referência
          sessionInfoRef.current = data.data;
          
          toast.success(t('channels:form.whatsapp.sessionInfoReceived'));
        } else if (data.event === 'CANCEL') {
          const { current_step } = data.data;
          console.warn("Cancelado em:", current_step);
          toast.error(t('channels:form.whatsapp.setupCancelled'));
        } else if (data.event === 'ERROR') {
          const { error_message } = data.data;
          console.error("Erro:", error_message);
          setError(error_message);
          toast.error(error_message || t('common:error'));
        }
      }
    } catch {
      console.log('Resposta não-JSON:', event.data);
    }
  };

  const loadChannelData = async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('chat_channels')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      
      setFormData({
        name: data.name,
        is_connected: data.is_connected,
        status: data.status
      });

      // Extrair informações de configuração das credenciais
      if (data.credentials) {
        console.log('Credenciais carregadas:', data.credentials);
        setSetupInfo({
          currentStep: data.credentials.current_step,
          nextStep: data.credentials.next_step,
          setupStatus: data.credentials.setup_status,
          lastError: data.credentials.last_error
        });
      }
    } catch (error: unknown) {
      const err = error as Error;
      console.error('Erro ao carregar dados do canal:', error);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      
      const newChannel = {
        name: formData.name,
        type: 'whatsapp_official',
        organization_id: currentOrganization?.id,
        status: 'inactive',
        is_connected: false,
        is_tested: false,
        credentials: {},
        settings: {
          autoReply: true,
          notifyNewTickets: true
        }
      };
      
      const { data, error } = await supabase
        .from('chat_channels')
        .insert(newChannel)
        .select()
        .single();

      if (error) {
        console.error('Erro detalhado:', error);
        throw error;
      }

      navigate(`/app/channels/${data.id}/edit/whatsapp_official`);
    } catch (error: unknown) {
      const err = error as Error;
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('chat_channels')
        .update({ name: formData.name })
        .eq('id', id);

      if (error) {
        console.error('Erro detalhado:', error);
        throw error;
      }
    } catch (error: unknown) {
      const err = error as Error;
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = () => {
    // Usar o Cadastro Incorporado do WhatsApp em vez do fluxo OAuth padrão
    const fbLoginCallback = (response: { authResponse?: { code: string } }) => {
      if (response.authResponse) {
        const code = response.authResponse.code;
        // O código retornado deve ser transmitido para o backend
        handleExchangeCodeForToken(code);
      } else {
        console.log('Usuário cancelou o login ou não autorizou completamente.');
        toast.error(t('channels:form.whatsapp.authFailed'));
      }
    };

    // Iniciar o fluxo de Cadastro Incorporado
    if (window.FB) {
      window.FB.login(fbLoginCallback, {
        config_id: import.meta.env.VITE_FB_CONFIG_ID || '1004475731524645', // ID de configuração
        response_type: 'code', // deve ser definido como 'code' para token de acesso do Usuário do Sistema
        override_default_response_type: true, // quando verdadeiro, qualquer tipo de resposta passado no "response_type" terá precedência sobre os tipos padrão
        extras: {
          setup: {}, // Pode ser personalizado conforme necessário
          featureType: '',
          sessionInfoVersion: '2',
        }
      });
    } else {
      toast.error(t('channels:form.whatsapp.sdkNotLoaded'));
    }
  };

  const handleExchangeCodeForToken = async (code: string) => {
    try {
      setLoading(true);
      // Usar a referência direta para garantir que temos os dados mais recentes
      const currentSessionInfo = sessionInfoRef.current;
      console.log("Código recebido:", code, "Session Info:", currentSessionInfo);
      
      // Enviar o código para o backend para processar a etapa de troca de código
      const response = await api.post(`/api/${currentOrganization?.id}/channel/whatsapp/${id}/process-step`, {
        step: 'exchange_code',
        code,
        sessionInfo: currentSessionInfo
      });

      // Não esperamos a conclusão do processo, apenas mostramos que foi iniciado
      toast.success(t('channels:form.whatsapp.processingStarted'));
      
      // Verificar permissões do token
      if (response.data.permissoesValidas === false && response.data.permissoesFaltantes?.length > 0) {
        toast.error(
          t('channels:form.whatsapp.tokenMissingPermissions', {
            permissions: response.data.permissoesFaltantes.join(', ')
          }),
          { 
            icon: '⚠️', // Ícone de aviso
            style: { backgroundColor: '#FEF3C7', color: '#92400E' } // Estilo visual de aviso
          }
        );
      }
      
    } catch (error: unknown) {
      const err = error as Error;
      console.error('Erro na troca do código por token:', error);
      setError(err.message || t('common:error'));
      toast.error(err.message || t('common:error'));
    } finally {
      setLoading(false);
    }
  };

  const processNextStep = async (step: string) => {
    try {
      setLoading(true);
      console.log(`Processando próxima etapa: ${step}`);
      
      // Usar a referência direta para garantir que temos os dados mais recentes
      const currentSessionInfo = sessionInfoRef.current;
      
      // Enviar a solicitação para processar a próxima etapa
      await api.post(`/api/${currentOrganization?.id}/channel/whatsapp/${id}/process-step`, {
        step,
        sessionInfo: currentSessionInfo
      });

      // Não esperamos a conclusão do processo, apenas mostramos que foi iniciado
      toast.success(t('channels:form.whatsapp.processingStep', { step }));
      
      // Não precisamos mais chamar processNextStep recursivamente aqui, 
      // pois a subscription vai atualizar o estado e mostrar a próxima etapa
      
    } catch (error: unknown) {
      const err = error as Error;
      console.error(`Erro ao processar etapa ${step}:`, error);
      setError(err.message || t('common:error'));
      toast.error(err.message || t('common:error'));
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!id) return;
    
    setUpdatingStatus(true);
    try {
      const { error } = await supabase
        .from('chat_channels')
        .update({
          status: formData.status === 'active' ? 'inactive' : 'active',
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;

      setFormData(prev => ({
        ...prev,
        status: prev.status === 'active' ? 'inactive' : 'active'
      }));

    } catch (error) {
      console.error('Error toggling status:', error);
      setError(t('common:error'));
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    
    setDeleting(true);
    setError('');

    try {
      const response = await api.delete(`/api/${currentOrganization?.id}/channel/whatsapp/${id}`);

      if (!response.data.success) {
        throw new Error(response.data.error || t('common:error'));
      }

      navigate('/app/channels');
      toast.success(t('channels:deleteSuccess'));
    } catch (error: unknown) {
      const err = error as ApiError;
      console.error('Error deleting channel:', error);
      setError(err.response?.data?.error || err.message || t('common:error'));
      toast.error(err.response?.data?.error || err.message || t('common:error'));
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const handleTokenSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenInput.trim() || !id) return;
    
    try {
      setLoading(true);
      // Enviar o token para o backend para verificação usando a nova abordagem de etapas
      await api.post(`/api/${currentOrganization?.id}/channel/whatsapp/${id}/process-step`, {
        step: 'verify_token',
        token: tokenInput
      });

      // Não esperamos a conclusão do processo, apenas mostramos que foi iniciado
      toast.success(t('channels:form.whatsapp.verifyingToken'));
      
      // Fechar o modal após iniciar o processo
      setShowTokenModal(false);
      setTokenInput('');
      
      // Não precisamos mais chamar processNextStep aqui, pois a subscription vai atualizar o estado
      
    } catch (error: unknown) {
      const err = error as Error;
      console.error('Erro na verificação do token:', error);
      setError(err.message || t('common:error'));
      toast.error(err.message || t('common:error'));
    } finally {
      setLoading(false);
    }
  };

  const continueSetup = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Determinar qual etapa continuar
      const stepToContinue = setupInfo.nextStep || setupInfo.currentStep;
      
      if (!stepToContinue) {
        throw new Error(t('channels:form.whatsapp.noStepToContinue'));
      }
      
      await processNextStep(stepToContinue);
    } catch (error: unknown) {
      const err = error as Error;
      console.error('Erro ao continuar configuração:', error);
      setError(err.message || t('common:error'));
      toast.error(err.message || t('common:error'));
    } finally {
      setLoading(false);
    }
  };

  // Componente para exibir o status da configuração
  const SetupStatus = () => {
    if (!setupInfo.currentStep && !setupInfo.setupStatus) return null;
    
    // Determinar se há um erro para ajustar o texto do botão
    const hasError = setupInfo.setupStatus?.includes('error_') || !!setupInfo.lastError;
    
    // Lista de etapas possíveis para exibir o progresso
    const setupSteps = [
      'exchange_code',
      'verify_token',
      // 'fetch_accounts',
      'fetch_waba_details',
      'fetch_phone_numbers',
      'fetch_templates',
      'subscribe_app',
      'register_phone',
      'complete_setup'
    ];
    
    // Determinar o índice da etapa atual
    const currentStepIndex = setupInfo.currentStep 
      ? setupSteps.findIndex(step => setupInfo.currentStep === step)
      : -1;
    
    // Calcular o progresso (0-100%)
    const progress = currentStepIndex >= 0 
      ? Math.round(((currentStepIndex + 1) / setupSteps.length) * 100)
      : 0;
    
    // Função para extrair o nome da etapa do status
    const getStepFromStatus = (status: string) => {
      if (!status) return '';
      const parts = status.split('_');
      if (parts.length < 2) return '';
      
      // Remove o prefixo (starting_, completed_, error_)
      parts.shift();
      return parts.join('_');
    };
    
    // Verificar se o status atual corresponde a uma etapa específica
    const statusStep = setupInfo.setupStatus ? getStepFromStatus(setupInfo.setupStatus) : '';
    
    return (
      <div className="mt-4 p-5 border rounded-md bg-gray-50 dark:bg-gray-800 dark:border-gray-700">
        <h3 className="text-lg font-medium mb-3 text-gray-900 dark:text-gray-200">{t('channels:form.whatsapp.setupStatus')}</h3>
        
        {/* Barra de progresso */}
        <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4 dark:bg-gray-700">
          <div 
            className={`h-2.5 rounded-full ${hasError ? 'bg-red-600 dark:bg-red-500' : 'bg-blue-600 dark:bg-blue-500'}`} 
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        
        {/* Status atual */}
        {setupInfo.setupStatus && (
          <div className="mb-3 flex items-center">
            <span className="font-medium mr-2 text-gray-900 dark:text-gray-200">{t('channels:form.whatsapp.status')}:</span>
            <span 
              className={`px-2.5 py-0.5 rounded-full text-sm font-medium ${
                setupInfo.setupStatus.includes('error_') 
                  ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' 
                  : setupInfo.setupStatus.includes('completed_') 
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
              }`}
            >
              {t(`channels:form.whatsapp.statusLabels.${setupInfo.setupStatus}`, {
                defaultValue: setupInfo.setupStatus
              })}
            </span>
          </div>
        )}
        
        {/* Etapas de configuração */}
        <div className="mb-4 space-y-2">
          {setupSteps.map((step, index) => {
            // Determinar o estado da etapa
            let stepStatus = 'pending';
            if (currentStepIndex > index) stepStatus = 'completed';
            else if (currentStepIndex === index) {
              stepStatus = setupInfo.setupStatus?.includes('error_') ? 'error' : 'current';
            }
            
            // Verificar se esta etapa tem um erro específico
            const hasStepError = setupInfo.lastError && (
              setupInfo.currentStep === step || 
              (statusStep === step && setupInfo.setupStatus?.includes('error_'))
            );
            
            return (
              <div 
                key={step} 
                className={`flex items-center p-2 rounded-md ${
                  stepStatus === 'completed' ? 'bg-green-50 dark:bg-green-900/10' : 
                  stepStatus === 'current' ? 'bg-blue-50 dark:bg-blue-900/10 border-l-4 border-blue-500' : 
                  stepStatus === 'error' ? 'bg-red-50 dark:bg-red-900/10 border-l-4 border-red-500' : 
                  'bg-gray-50 dark:bg-gray-800'
                }`}
              >
                <div className={`w-6 h-6 flex items-center justify-center rounded-full mr-3 ${
                  stepStatus === 'completed' ? 'bg-green-500 text-white' : 
                  stepStatus === 'current' ? 'bg-blue-500 text-white' : 
                  stepStatus === 'error' ? 'bg-red-500 text-white' : 
                  'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                }`}>
                  {stepStatus === 'completed' ? (
                    <Check className="w-4 h-4" />
                  ) : stepStatus === 'error' ? (
                    <div className="relative group">
                      <X className="w-4 h-4" />
                      {hasStepError && (
                        <div className="absolute z-10 invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-opacity duration-300 bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64 p-2 bg-gray-900 text-white text-xs rounded shadow-lg">
                          <div className="font-medium mb-1">{t('channels:form.whatsapp.lastError')}:</div>
                          <div className="text-xs break-words">{setupInfo.lastError}</div>
                          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 w-2 h-2 bg-gray-900 rotate-45"></div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs">{index + 1}</span>
                  )}
                </div>
                <div className="flex-1">
                  <span className={`text-sm ${
                    stepStatus === 'completed' ? 'text-green-800 dark:text-green-400' : 
                    stepStatus === 'current' ? 'text-blue-800 dark:text-blue-400 font-medium' : 
                    stepStatus === 'error' ? 'text-red-800 dark:text-red-400 font-medium' : 
                    'text-gray-500 dark:text-gray-400'
                  }`}>
                    {t(`channels:form.whatsapp.steps.${step}`, { defaultValue: step })}
                  </span>
                </div>
                
                {/* Ícone de informação para exibir o erro como tooltip */}
                {hasStepError && (
                  <div className="relative group ml-2">
                    <AlertTriangle className="w-4 h-4 text-red-500 cursor-help" />
                    <div className="absolute z-10 invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-opacity duration-300 bottom-full right-0 mb-2 w-64 p-2 bg-gray-900 text-white text-xs rounded shadow-lg">
                      <div className="text-xs break-words">{setupInfo.lastError}</div>
                      <div className="absolute bottom-0 right-4 transform translate-y-1/2 w-2 h-2 bg-gray-900 rotate-45"></div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        
        {/* Botão de continuar configuração ou tentar novamente */}
        {(setupInfo.nextStep || setupInfo.lastError) && (
          <div className="mt-4">
            <button
              type="button"
              onClick={continueSetup}
              disabled={loading}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center dark:bg-blue-700 dark:hover:bg-blue-600 dark:focus:ring-blue-600"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : hasError ? (
                <RefreshCw className="w-4 h-4 mr-2" />
              ) : (
                <ArrowRight className="w-4 h-4 mr-2" />
              )}
              {hasError 
                ? t('channels:form.whatsapp.tryAgain') 
                : t('channels:form.whatsapp.continueSetup')}
            </button>
            
            {setupInfo.lastError && (
              <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                {t('channels:form.whatsapp.continueInstructions')}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const subscribeToChannelUpdates = () => {
    if (!id) return;

    console.log('Iniciando subscription para o canal:', id);
    
    const newSubscription = supabase
      .channel(`channel-${id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chat_channels',
          filter: `id=eq.${id}`
        },
        (payload) => {
          console.log('Canal atualizado:', payload);
          
          // Atualizar dados do formulário
          const updatedChannel = payload.new;
          setFormData({
            name: updatedChannel.name,
            is_connected: updatedChannel.is_connected,
            status: updatedChannel.status
          });
          
          // Atualizar informações de configuração
          if (updatedChannel.credentials) {
            console.log('Credenciais atualizadas:', updatedChannel.credentials);
            setSetupInfo({
              currentStep: updatedChannel.credentials.current_step,
              nextStep: updatedChannel.credentials.next_step,
              setupStatus: updatedChannel.credentials.setup_status,
              lastError: updatedChannel.credentials.last_error
            });
            
            // Exibir toast com status atualizado
            if (updatedChannel.credentials.setup_status) {
              const statusMessage = t(`channels:form.whatsapp.statusLabels.${updatedChannel.credentials.setup_status}`, {
                defaultValue: updatedChannel.credentials.setup_status.replace(/_/g, ' ')
              });
              
              toast.success(
                t('channels:form.whatsapp.statusUpdated', { 
                  status: statusMessage 
                })
              );
              
              // Se a configuração foi concluída com sucesso
              if (updatedChannel.credentials.setup_status.includes('completed_complete_setup')) {
                toast.success(t('channels:form.whatsapp.setupComplete'));
              }
              
              // Se ocorreu um erro
              if (updatedChannel.credentials.setup_status.includes('error_')) {
                const errorMessage = updatedChannel.credentials.last_error || 
                                    t('common:error');
                toast.error(errorMessage);
              }
            }
          }
        }
      )
      .subscribe();
      
    setSubscription(newSubscription);
  };

  const unsubscribeFromChannelUpdates = () => {
    if (subscription) {
      console.log('Encerrando subscription');
      supabase.removeChannel(subscription);
      setSubscription(null);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex justify-center items-center min-h-[200px]">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center mb-6">
            <button
              onClick={() => navigate('/app/channels')}
              className="mr-4 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {id ? t('channels:form.title.edit') : t('channels:form.title.create')}
            </h1>

            {id && (
              <div className="ml-auto flex items-center space-x-2">
                {/* Botão para gerenciar templates */}
                <button
                  onClick={() => navigate(`/app/channels/${id}/templates`)}
                  className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-blue-700 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/50 hover:bg-blue-200 dark:hover:bg-blue-900/70"
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  {t('channels:form.whatsapp.manageTemplates')}
                </button>
                
                {/* Botão para atualizar token */}
                <button
                  onClick={() => setShowTokenModal(true)}
                  className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-blue-700 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/50 hover:bg-blue-200 dark:hover:bg-blue-900/70"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  {t('channels:form.whatsapp.updateToken')}
                </button>
                
                {/* Botão para excluir canal */}
                <button
                  onClick={() => setShowDeleteModal(true)}
                  className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-900/50 hover:bg-red-200 dark:hover:bg-red-900/70"
                >
                  <Trash className="w-4 h-4 mr-2" />
                  {t('common:delete')}
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center mb-6">
            {id && (
              <div className="ml-4 flex items-center">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  formData.is_connected
                    ? 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-400'
                    : 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-400'
                }`}>
                  {formData.is_connected ? t('status.connected') : t('status.disconnected')}
                </span>
              </div>
            )}

            {id && formData.is_connected && (
              <div className="ml-auto flex items-center space-x-2">
                <button
                  onClick={handleToggleStatus}
                  disabled={updatingStatus}
                  className={`inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md ${
                    formData.status === 'active'
                      ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/70'
                      : 'bg-gray-100 dark:bg-gray-900/50 text-gray-700 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-900/70'
                  }`}
                >
                  {updatingStatus ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    formData.status === 'active' ? t('status.active') : t('status.inactive')
                  )}
                </button>
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
            <form onSubmit={id ? handleUpdateChannel : handleCreateChannel} className="p-6 space-y-6">
              {error && (
                <div className="bg-red-50 dark:bg-red-900/50 text-red-700 dark:text-red-400 p-4 rounded-md">
                  {error}
                </div>
              )}

              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('form.name')}
                </label>
                <input
                  type="text"
                  id="name"
                  required
                  className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 h-10 px-3"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              {/* Exibir o status da configuração */}
              <SetupStatus />

              <div className="flex justify-end space-x-4">
                {!id && (
                  <button
                    type="submit"
                    disabled={!formData.name}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {t('channels:form.whatsapp.saveAndContinue')}
                  </button>
                )}
                
                {id && (
                  <>
                    <button
                      type="submit"
                      className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      {t('common:save')}
                    </button>
                    
                    {!formData.is_connected && (
                      <button
                        type="button"
                        onClick={handleConnect}
                        className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                      >
                        <img 
                          src="/images/logos/whatsapp.svg" 
                          alt="WhatsApp" 
                          className="w-5 h-5 mr-2"
                        />
                        {t('channels:form.whatsapp.connect')}
                      </button>
                    )}
                    
                    <button
                      type="button"
                      onClick={() => setShowTokenModal(true)}
                      className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
                    >
                      <img 
                        src="/images/logos/whatsapp.svg" 
                        alt="WhatsApp" 
                        className="w-5 h-5 mr-2"
                      />
                      {formData.is_connected 
                        ? t('channels:form.whatsapp.updateToken')
                        : t('channels:form.whatsapp.insertToken')
                      }
                    </button>
                  </>
                )}
              </div>
            </form>
          </div>
        </div>
      </div>

      {showDeleteModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 dark:bg-red-900/50 rounded-full mb-4">
                <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white text-center mb-2">
                {t('delete.title')}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-6">
                {t('delete.confirmation', { name: formData.name })}
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  disabled={deleting}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  {t('common:back')}
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  {deleting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {t('common:deleting')}
                    </>
                  ) : (
                    t('common:confirmDelete')
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showTokenModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white text-center mb-4">
                {t('channels:form.whatsapp.insertToken')}
              </h3>
              <form onSubmit={handleTokenSubmit}>
                <div className="mb-4">
                  <label htmlFor="token" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('channels:form.whatsapp.token')}
                  </label>
                  <input
                    type="text"
                    id="token"
                    required
                    className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 h-10 px-3"
                    value={tokenInput}
                    onChange={(e) => setTokenInput(e.target.value)}
                    placeholder={t('channels:form.whatsapp.tokenPlaceholder')}
                  />
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowTokenModal(false);
                      setTokenInput('');
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    {t('common:cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={!tokenInput.trim() || loading}
                    className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {t('common:processing')}
                      </>
                    ) : (
                      t('common:confirm')
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}