import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { User, Loader2, Lock, Search, ChevronDown, Building2, Wallet, CreditCard } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthContext } from '../contexts/AuthContext';
import { countryCodes } from '../utils/countryCodes';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import * as Sentry from "@sentry/react";
import { ConnectAccountOnboarding, ConnectComponentsProvider, ConnectPayments } from "@stripe/react-connect-js";
import { useStripeConnect } from '../hooks/useStripeConnect';
import { StripeConnectInstance } from "@stripe/connect-js";
import PartnerOrganizations from '../components/profile/PartnerOrganizations';

export default function Profile() {
  const { t } = useTranslation(['profile', 'common']);
  const { profile: currentProfile, session } = useAuthContext();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    whatsapp: '',
    countryCode: 'BR'
  });
  const [passwordData, setPasswordData] = useState({
    new_password: '',
    confirm_password: ''
  });
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [error, setError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [success, setSuccess] = useState('');
  
  // Estados para o dropdown de países
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  const countryDropdownRef = useRef<HTMLDivElement>(null);
  const dropdownContentRef = useRef<HTMLDivElement>(null);
  
  // Adicionar estado para controle das abas
  const [activeTab, setActiveTab] = useState('profile'); // 'profile' ou 'partner'
  
  // Verificar parâmetros da URL após redirecionamento de convite
  useEffect(() => {
    const processInvitation = async () => {
      try {
        // Verificar se este é um redirecionamento de convite
        const isJoin = searchParams.get('join') === 'true';
        const orgId = searchParams.get('org');
        
        if (isJoin && orgId && session?.user?.id) {
          // console.log('Processando convite após autenticação na página de perfil:', { orgId, memberId });
          
          try {
            // Chamar o backend para atualizar o status do membro
            const response = await api.post(`/api/${orgId}/member/join`, {
              userId: session.user.id
            });
            
            if (response.data.success) {
              console.log('Convite aceito automaticamente após redirecionamento para perfil');
              setSuccess(t('common:joinSuccess', 'Você foi adicionado à organização com sucesso!'));
              
              // Limpar os parâmetros da URL
              // const newUrl = new URL(window.location.href);
              // newUrl.searchParams.delete('join');
              // newUrl.searchParams.delete('org');
              // newUrl.searchParams.delete('member');
              // window.history.replaceState({}, '', newUrl.toString());
              
            }
          } catch (error) {
            console.error('Erro ao processar convite automático:', error);
            Sentry.captureException(error, {
              tags: {
                location: 'Profile.processInvitation'
              }
            });
            setError(t('common:joinError', 'Erro ao processar o convite. Por favor, tente novamente.'));
          }
        }
      } catch (error) {
        console.error('Erro no processamento de parâmetros da URL:', error);
        Sentry.captureException(error, {
          tags: {
            location: 'Profile.useEffect.searchParams'
          }
        });
      }
    };
    
    if (session) {
      processInvitation();
    }
  }, [searchParams, session, navigate, t]);

  // Efeito para fechar dropdown quando clicar fora dele
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        countryDropdownRef.current && 
        !countryDropdownRef.current.contains(event.target as Node) &&
        dropdownContentRef.current && 
        !dropdownContentRef.current.contains(event.target as Node)
      ) {
        setShowCountryDropdown(false);
        setCountrySearch('');
      }
    }

    if (showCountryDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showCountryDropdown]);

  // Função para fechar o dropdown de forma segura
  const closeCountryDropdown = () => {
    setShowCountryDropdown(false);
    setCountrySearch('');
  };

  // Filtrar países com base na pesquisa
  const filteredCountries = countrySearch 
    ? countryCodes.filter(country => 
        country.name.toLowerCase().includes(countrySearch.toLowerCase()) || 
        (country.local_name && country.local_name.toLowerCase().includes(countrySearch.toLowerCase())) ||
        country.dial_code.includes(countrySearch) ||
        country.code.toLowerCase().includes(countrySearch.toLowerCase())
      )
    : countryCodes;

  useEffect(() => {
    if (currentProfile) {
      // Extrair o código do país do WhatsApp se existir
      const whatsapp = currentProfile.whatsapp || '';
      const countryCode = countryCodes.find(country => 
        whatsapp.startsWith(country.dial_code)
      )?.code || 'BR';

      // Extrair apenas os números do WhatsApp, removendo o código do país
      const whatsappNumber = whatsapp ? whatsapp.substring(countryCodes.find(c => c.code === countryCode)?.dial_code.length || 0) : '';

      setFormData({
        full_name: currentProfile.full_name || '',
        email: currentProfile.email || '',
        whatsapp: whatsappNumber,
        countryCode
      });
    }
  }, [currentProfile]);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        setSuccess('');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProfile) return;

    setSaving(true);
    setError('');

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name,
          whatsapp: formData.whatsapp ? `${countryCodes.find(c => c.code === formData.countryCode)?.dial_code}${formData.whatsapp.replace(/\D/g, '')}` : null,
          // updated_at: new Date().toISOString()
        })
        .eq('id', currentProfile.id);

      if (error) throw error;
      setSuccess(t('common:success'));
    } catch (error) {
      console.error('Error updating profile:', error);
      setError(t('common:error'));
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProfile) return;

    // Reset states
    setPasswordError('');
    setPasswordSuccess('');
    setChangingPassword(true);

    // Validate passwords
    if (passwordData.new_password.length < 6) {
      setPasswordError(t('profile:errors.passwordTooShort'));
      setChangingPassword(false);
      return;
    }

    if (passwordData.new_password !== passwordData.confirm_password) {
      setPasswordError(t('profile:errors.passwordsDoNotMatch'));
      setChangingPassword(false);
      return;
    }

    try {
      // Atualizamos a senha diretamente
      const { error } = await supabase.auth.updateUser({
        password: passwordData.new_password
      });

      if (error) throw error;

      // Limpar o formulário e mostrar mensagem de sucesso
      setPasswordData({
        new_password: '',
        confirm_password: ''
      });
      setPasswordSuccess(t('profile:passwordChanged'));
    } catch (error: unknown) {
      console.error('Error changing password:', error);
      setPasswordError(error instanceof Error ? error.message : t('common:error'));
    } finally {
      setChangingPassword(false);
    }
  };

  const [accountCreatePending, setAccountCreatePending] = useState(false);
  const [onboardingExited, setOnboardingExited] = useState(false);
  const [accountError, setAccountError] = useState('');
  const [clientSecret, setClientSecret] = useState<string>();
  const [localAccountId, setLocalAccountId] = useState<string>();
  const connectInstance = useStripeConnect(localAccountId || currentProfile?.stripe_account_id, clientSecret);
  const [stripeConnectInstance, setStripeConnectInstance] = useState<StripeConnectInstance | null>(null);
  const [activeComponent, setActiveComponent] = useState<'payments' | 'onboarding'>('payments');
  const [mountKey, setMountKey] = useState(Date.now());
  
  // Reset the mount key when changing components
  useEffect(() => {
    setMountKey(Date.now());
  }, [activeComponent, clientSecret]);

  // Manter sincronizado o estado local com o valor retornado pelo hook
  useEffect(() => {
    setStripeConnectInstance(connectInstance);
  }, [connectInstance]);

  const handleCreateAccount = async () => {
    // Limpar todos os estados e forçar reinicialização
    setClientSecret(undefined);
    setAccountCreatePending(true);
    setAccountError('');
    setStripeConnectInstance(null);
    setMountKey(Date.now()); // Forçar nova montagem
    
    // Apenas depois que os estados são zerados, definimos o tipo de componente
    setTimeout(() => {
      setActiveComponent('onboarding');
      setOnboardingExited(false);
    }, 0);
    
    try {
      const response = await api.post('/api/profile/account-stripe/onboarding');
      const data = response.data;
      
      console.log('Resposta da API:', data);

      if (!data.success) {
        throw new Error(data.error || 'Falha ao criar conta bancária');
      }

      // O backend já atualiza o perfil com o stripe_account_id
      // Salvamos o clientSecret e accountId para uso imediato
      if (data.clientSecret && data.accountId) {
        console.log('Dados recebidos:', { clientSecret: data.clientSecret, accountId: data.accountId });
        
        // Atualizamos com delay para garantir que a reinicialização ocorra
        setTimeout(() => {
          setClientSecret(data.clientSecret);
          setLocalAccountId(data.accountId);
        }, 50);
      } else {
        console.error('Dados necessários não encontrados na resposta:', data);
        throw new Error('Dados necessários não encontrados na resposta');
      }

    } catch (error: unknown) {
      console.error('Erro ao criar conta bancária:', error);
      const apiError = error as { response?: { data?: { error?: string } }; message?: string };
      setAccountError(apiError.response?.data?.error || apiError.message || t('common:error'));
      
      // Resetar o estado em caso de erro
      setActiveComponent('payments');
    } finally {
      setAccountCreatePending(false);
    }
  };

  const handleManageAccount = async (type: 'onboarding' | 'payments') => {
    // Limpar todos os estados e forçar reinicialização
    setClientSecret(undefined);
    setAccountCreatePending(true);
    setAccountError('');
    setStripeConnectInstance(null);
    setMountKey(Date.now()); // Forçar nova montagem
    
    // Apenas depois que os estados são zerados, definimos o tipo de componente
    setTimeout(() => {
      setActiveComponent(type);
      setOnboardingExited(false);
    }, 0);

    try {
      const response = await api.post('/api/profile/account-stripe/manage', {
        components: {
          [type]: {
            enabled: true
          }
        }
      });
      const data = response.data;
      
      console.log('Resposta da API de gerenciamento:', data);

      if (!data.success) {
        throw new Error(data.error || 'Falha ao acessar gerenciamento da conta');
      }

      // Salvamos o clientSecret e accountId para uso imediato
      if (data.clientSecret && data.accountId) {
        console.log('Dados recebidos:', { clientSecret: data.clientSecret, accountId: data.accountId });
        
        // Atualizamos com delay para garantir que a reinicialização ocorra
        setTimeout(() => {
          setClientSecret(data.clientSecret);
          setLocalAccountId(data.accountId);
        }, 50);
        
      } else {
        console.error('Dados necessários não encontrados na resposta:', data);
        throw new Error('Dados necessários não encontrados na resposta');
      }

    } catch (error: unknown) {
      console.error('Erro ao acessar gerenciamento da conta:', error);
      const apiError = error as { response?: { data?: { error?: string } }; message?: string };
      setAccountError(apiError.response?.data?.error || apiError.message || t('common:error'));
      
      // Resetar estados em caso de erro
      setActiveComponent('payments');
    } finally {
      setAccountCreatePending(false);
    }
  };

  // Adicionar useEffect para monitorar mudanças nos estados relevantes
  useEffect(() => {
    console.log('Estado atual:', {
      activeComponent,
      clientSecret: clientSecret ? `${clientSecret.substring(0, 8)}...` : null,
      stripeConnectInstance: !!stripeConnectInstance,
      stripe_account_id: currentProfile?.stripe_account_id,
      localAccountId
    });
    
    return () => {
      console.log('Componente desmontando...');
    };
  }, [activeComponent, clientSecret, stripeConnectInstance, currentProfile?.stripe_account_id, localAccountId]);

  const [showStripeMenu, setShowStripeMenu] = useState(false);
  const stripeMenuRef = useRef<HTMLDivElement>(null);

  // Adicionar useEffect para fechar o menu quando clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (stripeMenuRef.current && !stripeMenuRef.current.contains(event.target as Node)) {
        setShowStripeMenu(false);
      }
    }

    if (showStripeMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showStripeMenu]);

  return (
    <div className="p-6">
      <div className="max-w-2xl mx-auto pb-16 md:pb-0">
        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('profile')}
              className={`
                border-b-2 py-4 px-1 inline-flex items-center text-sm font-medium
                ${activeTab === 'profile'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'}
              `}
            >
              <User className="w-5 h-5 mr-2" />
              {t('profile:title')}
            </button>

            <button
              onClick={() => setActiveTab('partner')}
              className={`
                border-b-2 py-4 px-1 inline-flex items-center text-sm font-medium
                ${activeTab === 'partner'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'}
              `}
            >
              <Building2 className="w-5 h-5 mr-2" />
              {t('profile:partnerPortal')}
            </button>
          </nav>
        </div>

        {activeTab === 'profile' ? (
          <>
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg mb-6">
              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                {error && (
                  <div className="bg-red-50 dark:bg-red-900/50 text-red-700 dark:text-red-400 p-4 rounded-md">
                    {error}
                  </div>
                )}

                {success && (
                  <div className="bg-green-50 dark:bg-green-900/50 text-green-700 dark:text-green-400 p-4 rounded-md">
                    {success}
                  </div>
                )}

                {/* Full Name */}
                <div>
                  <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('profile:form.fullName')} *
                  </label>
                  <input
                    type="text"
                    id="full_name"
                    required
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 py-2 px-3"
                  />
                </div>

                {/* Email */}
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('profile:form.email')}
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={formData.email}
                    disabled
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm py-2 px-3 cursor-not-allowed"
                  />
                </div>

                {/* WhatsApp */}
                <div>
                  <label htmlFor="whatsapp" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('profile:form.whatsapp')}
                  </label>
                  <div className="flex w-full">
                    <div className="relative" ref={countryDropdownRef}>
                      <button
                        type="button"
                        className="h-full rounded-l-lg border-r-0 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 flex items-center justify-center"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowCountryDropdown(!showCountryDropdown);
                          setCountrySearch('');
                        }}
                      >
                        <span>{countryCodes.find(country => country.code === formData.countryCode)?.dial_code || '+55'}</span>
                        <ChevronDown className="w-4 h-4 ml-1 text-gray-500 dark:text-gray-400" />
                      </button>
                      
                      {showCountryDropdown && (
                        <div 
                          ref={dropdownContentRef}
                          className="absolute z-10 mt-1 w-64 bg-white dark:bg-gray-800 shadow-lg rounded-md border border-gray-200 dark:border-gray-700 py-1 max-h-60 overflow-auto"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700">
                            <div className="relative">
                              <input
                                type="text"
                                className="w-full h-8 pl-8 pr-3 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                placeholder={t('common:searchCountry')}
                                value={countrySearch}
                                onChange={(e) => setCountrySearch(e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                autoFocus
                              />
                              <Search className="absolute left-2 top-1.5 h-5 w-5 text-gray-400" />
                            </div>
                          </div>
                          <div className="max-h-48 overflow-y-auto">
                            {filteredCountries.map(country => (
                              <button
                                key={country.code}
                                type="button"
                                className="w-full px-3 py-2 text-left flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-white"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setFormData(prev => ({ ...prev, countryCode: country.code }));
                                  closeCountryDropdown();
                                }}
                              >
                                <span>{country.name}</span>
                                <span className="text-gray-500 dark:text-gray-400">{country.dial_code}</span>
                              </button>
                            ))}
                            {filteredCountries.length === 0 && (
                              <div className="px-3 py-2 text-gray-500 dark:text-gray-400 text-center">
                                {t('common:noCountriesFound')}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="relative flex-1">
                      <input
                        type="text"
                        id="whatsapp"
                        value={formData.whatsapp}
                        onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                        placeholder="(11) 98765-4321"
                        className="block w-full rounded-r-lg border-l-0 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{t('common:saving')}</> : t('common:save')}
                  </button>
                </div>
              </form>
            </div>

            {/* Alterar Senha */}
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
              <form onSubmit={handlePasswordChange} className="p-6 space-y-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                  <Lock className="w-5 h-5 mr-2" />
                  {t('profile:changePassword')}
                </h2>

                {passwordError && (
                  <div className="bg-red-50 dark:bg-red-900/50 text-red-700 dark:text-red-400 p-4 rounded-md">
                    {passwordError}
                  </div>
                )}

                {passwordSuccess && (
                  <div className="bg-green-50 dark:bg-green-900/50 text-green-700 dark:text-green-400 p-4 rounded-md">
                    {passwordSuccess}
                  </div>
                )}

                {/* Nova Senha */}
                <div>
                  <label htmlFor="new_password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('profile:form.newPassword')} *
                  </label>
                  <input
                    type="password"
                    id="new_password"
                    required
                    value={passwordData.new_password}
                    onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 py-2 px-3"
                  />
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {t('profile:form.passwordRequirements')}
                  </p>
                </div>

                {/* Confirmar Nova Senha */}
                <div>
                  <label htmlFor="confirm_password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('profile:form.confirmPassword')} *
                  </label>
                  <input
                    type="password"
                    id="confirm_password"
                    required
                    value={passwordData.confirm_password}
                    onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 py-2 px-3"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={changingPassword}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {changingPassword ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{t('profile:form.changing')}</> : t('profile:form.changePassword')}
                  </button>
                </div>
              </form>
            </div>
          </>
        ) : (
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                <Building2 className="w-5 h-5 mr-2" />
                {t('profile:partnerPortal')}
              </h2>

              <div className="space-y-6">
                {/* Status do Parceiro */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    {t('profile:partnerStatus')}
                  </h3>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <div className="space-y-4">
                      {/* Vendedor */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {t('profile:seller')}
                          </span>
                        </div>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          currentProfile?.is_seller
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'
                        }`}>
                          {currentProfile?.is_seller ? t('common:active') : t('common:inactive')}
                        </span>
                      </div>

                      {/* Suporte */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {t('profile:support')}
                          </span>
                        </div>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          currentProfile?.is_support
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'
                        }`}>
                          {currentProfile?.is_support ? t('common:active') : t('common:inactive')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Instruções para Parceiros */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    {t('profile:partnerInstructions', 'Instruções para Parceiros')}
                  </h3>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">
                      <p>
                        {t('profile:partnerIntro', 'No portal do parceiro, você pode ganhar comissões indicando, vendendo e dando suporte, porém tudo é estruturado em níveis:')}
                      </p>
                      
                      <div className="pl-4 space-y-2">
                        <p>
                          <span className="font-medium">• {t('profile:indicatorTitle', 'Indicador')}: </span>
                          {t('profile:indicatorDesc', 'Todos começam como Indicadores. Você ganha vitalício 10% do valor do plano que seu indicado contratar.')}
                        </p>
                        <p>
                          <span className="font-medium">• {t('profile:sellerTitle', 'Vendedor')}: </span>
                          {t('profile:sellerDesc', 'Após treinamento e aprovação, você pode se tornar Vendedor e ganhar mais 10% por cada venda realizada.')}
                        </p>
                        <p>
                          <span className="font-medium">• {t('profile:supportTitle', 'Suporte')}: </span>
                          {t('profile:supportDesc', 'Após treinamento e aprovação para suporte, você ganha mais 10% por cliente que atender no pós-venda.')}
                        </p>
                      </div>
                      
                      <p>
                        {t('profile:indicationProcess', 'Para indicação, você deve apresentar brevemente o Interflow ao cliente, e nossos vendedores entrarão em contato. Se você estiver habilitado como vendedor, poderá realizar a venda diretamente, assim como o suporte pós-venda se estiver habilitado.')}
                      </p>
                      
                      <p>
                        {t('profile:paymentProcess', 'Nosso repasse é feito através de split automático, onde a transferência para sua conta ocorre automaticamente quando o cliente efetua o pagamento, por meio do Stripe Connect. Para começar a receber, configure sua conta bancária abaixo.')}
                      </p>
                      
                      <p className="font-medium">
                        {t('profile:partnershipMessage', 'Esperamos construir uma excelente parceria!')}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Conta Bancária */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    {t('profile:bankAccount')}
                  </h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    {accountError && (
                      <div className="mb-4 bg-red-50 dark:bg-red-900/50 text-red-700 dark:text-red-400 p-4 rounded-md">
                        {accountError}
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Wallet className="w-5 h-5 mr-2 text-gray-500" />
                        <span className="text-sm font-medium text-gray-700">
                          {currentProfile?.stripe_account_id 
                            ? t('profile:manageBankAccount')
                            : t('profile:setupBankAccount')}
                        </span>
                      </div>
                      {currentProfile?.stripe_account_id ? (
                        <div className="relative" ref={stripeMenuRef}>
                          <button
                            onClick={() => setShowStripeMenu(!showStripeMenu)}
                            disabled={accountCreatePending}
                            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {accountCreatePending ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                {t('common:loading')}
                              </>
                            ) : (
                              <>
                                {t('profile:manageAccount')}
                                <ChevronDown className="w-4 h-4 ml-2" />
                              </>
                            )}
                          </button>

                          {showStripeMenu && (
                            <div className="absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5 z-50">
                              <div className="py-1" role="menu" aria-orientation="vertical">
                                <button
                                  onClick={() => {
                                    handleCreateAccount();
                                    setShowStripeMenu(false);
                                  }}
                                  className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
                                  role="menuitem"
                                >
                                  <Building2 className="w-4 h-4 mr-2" />
                                  {t('profile:configureAccount')}
                                </button>
                                <button
                                  onClick={() => {
                                    handleManageAccount('payments');
                                    setShowStripeMenu(false);
                                  }}
                                  className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
                                  role="menuitem"
                                >
                                  <CreditCard className="w-4 h-4 mr-2" />
                                  {t('profile:viewTransactions')}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <button
                          onClick={handleCreateAccount}
                          disabled={accountCreatePending}
                          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {accountCreatePending ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              {t('common:loading')}
                            </>
                          ) : (
                            t('profile:setupBankAccount')
                          )}
                        </button>
                      )}
                    </div>

                    {/* Stripe Connect Components */}
                    {stripeConnectInstance && clientSecret && (
                      <div className="mt-4" key={`container-${activeComponent}-${mountKey}`}>
                        {activeComponent === 'onboarding' ? (
                          <div key={`onboarding-container-${mountKey}`}>
                            <ConnectComponentsProvider connectInstance={stripeConnectInstance}>
                              <ConnectAccountOnboarding
                                onExit={() => {
                                  setOnboardingExited(true);
                                  setActiveComponent('payments');
                                }}
                              />
                            </ConnectComponentsProvider>
                          </div>
                        ) : (
                          <div key={`payments-container-${mountKey}`}>
                            <ConnectComponentsProvider connectInstance={stripeConnectInstance}>
                              <ConnectPayments />
                            </ConnectComponentsProvider>
                          </div>
                        )}
                      </div>
                    )}

                    {onboardingExited && activeComponent === 'onboarding' && (
                      <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                        {t('profile:onboardingExited')}
                      </p>
                    )}
                  </div>
                </div>

                {/* Organizações */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    {t('profile:organizations')}
                  </h3>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <PartnerOrganizations />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}