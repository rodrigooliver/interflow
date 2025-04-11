import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router-dom';
import { Loader2, User, Building, Mail, Lock, Search, ChevronDown } from 'lucide-react';
import { supabase } from '../../../../lib/supabase';
import { useReferral } from '../../../../hooks/useReferral';
import { useTrackingPixel } from '../../../../hooks/useTrackingPixel';
import { countryCodes } from '../../../../utils/countryCodes';
import OneSignal from 'react-onesignal';
import api from '../../../../lib/api';
import axios from 'axios';

interface SignupFormData {
  fullName: string;
  email: string;
  password: string;
  organizationName: string;
  whatsapp: string;
  countryCode: string;
}

export default function SignupForm() {
  const { t, i18n } = useTranslation(['auth', 'common']);
  const { referral } = useReferral();
  const { trackEvent } = useTrackingPixel();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const planId = queryParams.get('planId') || undefined;
  const billingPeriod = queryParams.get('billingPeriod') || 'monthly';
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState<SignupFormData>({
    fullName: '',
    email: '',
    password: '',
    organizationName: '',
    whatsapp: '',
    countryCode: 'BR'
  });
  
  // Estados para o dropdown de países
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  const countryDropdownRef = useRef<HTMLDivElement>(null);
  const dropdownContentRef = useRef<HTMLDivElement>(null);

  const currentLanguage = i18n.language || 'pt';

  // Efeito para fechar dropdown quando clicar fora dele
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      // Verificar se o clique foi fora do dropdown
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

    // Adicionar listener apenas quando o dropdown estiver aberto
    if (showCountryDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    // Limpar event listener
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
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const response = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`);
          const data = await response.json();
          const countryCode = countryCodes.find(country => country.name === data.countryName)?.code;
          if (countryCode) {
            setFormData(prev => ({ ...prev, countryCode }));
          }
        } catch (error) {
          console.error('Erro ao obter localização:', error);
        }
      }, (error) => {
        console.error('Erro ao acessar geolocalização:', error);
      });
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    // Função para exibir erro e garantir que o usuário o veja
    const showError = (errorKey: string, defaultMessage: string) => {
      setError(t(`auth:signup.errors.${errorKey}`, defaultMessage));
      setLoading(false);
      // Scroll para o topo do formulário para garantir que o erro seja visto
      window.scrollTo({ top: 0, behavior: 'smooth' });
      // Focar no primeiro campo do formulário
      const firstInput = document.querySelector('form input') as HTMLInputElement;
      if (firstInput) firstInput.focus();
    };

    // Validação de nome completo
    if (formData.fullName.trim().length < 3 || !formData.fullName.includes(' ')) {
      showError('invalidName', 'Por favor, informe seu nome completo.');
      return;
    }

    // Validação de nome da organização
    if (formData.organizationName.trim().length < 2) {
      showError('invalidOrgName', 'O nome da organização deve ter pelo menos 2 caracteres.');
      return;
    }

    // Validação de e-mail
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      showError('invalidEmail', 'O e-mail informado parece ser inválido. Verifique e tente novamente.');
      return;
    }

    // Validação de senha
    if (formData.password.length < 6) {
      showError('weakPassword', 'A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    // Validação básica do WhatsApp
    if (formData.whatsapp && formData.whatsapp.length < 8) {
      showError('invalidWhatsapp', 'O número de WhatsApp parece ser inválido. Verifique e tente novamente.');
      return;
    }

    try {
      // Enviar dados para o backend que vai fazer todo o processo de cadastro
      const response = await api.post('/api/user/signup', {
        fullName: formData.fullName,
        email: formData.email,
        password: formData.password,
        organizationName: formData.organizationName,
        whatsapp: formData.whatsapp,
        countryCode: countryCodes.find(c => c.code === formData.countryCode)?.dial_code || '55',
        planId,
        billingPeriod,
        referral: referral,
        language: currentLanguage
      });

      if (response.data.error) {
        // Usar o código de erro recebido diretamente do backend, ou fallback para o mapeamento
        const errorCode = response.data.errorCode || 'generic';
        showError(errorCode, response.data.error);
        return;
      }

      // Mostrar mensagem de sucesso
      setSuccess(true);
      
      // Registrar evento de tracking
      try {
        await trackEvent('SignUp', {
          method: 'email',
          organization_name: formData.organizationName
        });
      } catch (trackError) {
        console.error('Erro ao registrar evento de tracking:', trackError);
        // Não impede o fluxo, apenas loga o erro
      }
      
      // Fazer login diretamente no Supabase com as credenciais fornecidas
      try {
        const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password
        });

        if (loginError) {
          console.error('Erro ao fazer login após cadastro:', loginError);
          // Mesmo com erro no login, continuamos com sucesso no cadastro
        } else if (loginData.session) {
          console.log('Login realizado com sucesso após cadastro');
          
          // Salvar o ID da organização no localStorage
          if (response.data.organization?.id) {
            localStorage.setItem('selectedOrganizationId', response.data.organization.id);
            console.log('ID da organização salvo no localStorage:', response.data.organization.id);
          }
          
          // Registrar no OneSignal se estiver em ambiente mobile
          if (window.isNativeApp && window.nativeApp?.registerForNotifications && loginData.user?.id) {
            console.log('Registrando usuário no OneSignal após signup:', loginData.user.id);
            window.nativeApp.registerForNotifications(loginData.user.id);
          }
          
          // Fazer login no OneSignal com o ID do usuário como externalId
          if (loginData.user?.id) {
            try {
              console.log('Registrando externalId no OneSignal após signup:', loginData.user.id);
              OneSignal.login(loginData.user.id)
                .then(() => console.log('OneSignal login bem-sucedido'))
                .catch(error => console.error('Erro no OneSignal login:', error));
            } catch (oneSignalError) {
              console.error('Erro ao registrar usuário no OneSignal após signup:', oneSignalError);
            }
          }
        }
      } catch (loginError) {
        console.error('Erro ao fazer login após cadastro:', loginError);
        // Mesmo com erro no login, continuamos com o fluxo de sucesso
      }


    } catch (err: unknown) {
      console.error('Erro no cadastro:', err);
      
      // Verificar se é um erro do Axios com resposta do servidor
      if (axios.isAxiosError(err) && err.response?.data?.error) {
        // Usar o código de erro recebido diretamente do backend, ou fallback para 'generic'
        const errorCode = err.response.data.errorCode || 'generic';
        showError(errorCode, err.response.data.error);
      } else {
        // Exibir mensagem de erro genérica
        showError('generic', err instanceof Error ? err.message : 'Ocorreu um erro durante o cadastro. Tente novamente.');
      }
    } finally {
      if (!success) {
        setLoading(false);
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5 p-5 sm:p-6">
      {error && (
        <div className="p-4 mb-4 text-sm text-red-600 bg-red-50 dark:bg-red-900/50 dark:text-red-400 rounded-lg border-l-4 border-red-500 dark:border-red-600 flex items-start shadow-sm">
          <div className="mr-3 flex-shrink-0 text-red-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <span className="font-medium block mb-1">{t('auth:signup.errors.title', 'Erro no cadastro:')}</span>
            {error}
          </div>
        </div>
      )}

      {success && (
        <div className="p-4 mb-4 text-sm text-green-600 bg-green-50 dark:bg-green-900/50 dark:text-green-400 rounded-lg border-l-4 border-green-500 dark:border-green-600 flex items-start shadow-sm">
          <div className="mr-3 flex-shrink-0 text-green-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <span className="font-medium block mb-1">{t('auth:signup.success.title', 'Sucesso!')}</span>
            {t('auth:signup.success', 'Cadastro realizado com sucesso! Redirecionando...')}
          </div>
        </div>
      )}

      <div className="relative group">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 dark:text-gray-500 group-focus-within:text-blue-500 dark:group-focus-within:text-blue-400 transition-colors duration-200">
          <User size={18} />
        </div>
        <input
          id="fullName"
          name="fullName"
          type="text"
          required
          placeholder={t('auth:signup.fields.fullName')}
          value={formData.fullName}
          onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
          className="block w-full rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 pl-10 pr-3 py-2.5 transition-all duration-200"
        />
      </div>

      <div className="relative group">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 dark:text-gray-500 group-focus-within:text-blue-500 dark:group-focus-within:text-blue-400 transition-colors duration-200">
          <Building size={18} />
        </div>
        <input
          id="organizationName"
          name="organizationName"
          type="text"
          required
          placeholder={t('auth:signup.fields.organizationName')}
          value={formData.organizationName}
          onChange={(e) => setFormData(prev => ({ ...prev, organizationName: e.target.value }))}
          className="block w-full rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 pl-10 pr-3 py-2.5 transition-all duration-200"
        />
      </div>

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
          placeholder={t('auth:signup.fields.email')}
          value={formData.email}
          onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
          className="block w-full rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 pl-10 pr-3 py-2.5 transition-all duration-200"
        />
      </div>

      {/* Campo de WhatsApp com seletor de país */}
      <div className="relative group">
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
              id="whatsapp"
              name="whatsapp"
              type="text"
              placeholder={t('auth:signup.fields.whatsapp')}
              value={formData.whatsapp}
              onChange={(e) => setFormData(prev => ({ ...prev, whatsapp: e.target.value }))}
              className="block w-full rounded-r-lg border-l-0 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2.5 transition-all duration-200"
            />
          </div>
        </div>
      </div>

      <div className="relative group">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 dark:text-gray-500 group-focus-within:text-blue-500 dark:group-focus-within:text-blue-400 transition-colors duration-200">
          <Lock size={18} />
        </div>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          placeholder={t('auth:signup.fields.password')}
          value={formData.password}
          onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
          className="block w-full rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 pl-10 pr-3 py-2.5 transition-all duration-200"
        />
      </div>

      <button
        type="submit"
        disabled={loading || success}
        className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-md text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:translate-y-[-1px] hover:shadow-lg mt-2"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            {t('common:loading')}
          </>
        ) : success ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            {t('auth:signup.redirecting', 'Redirecionando...')}
          </>
        ) : (
          t('auth:signup.submit')
        )}
      </button>
      
      <div className="text-center text-xs text-gray-500 dark:text-gray-400 mt-4">
        {t('auth:signup.agreement')}
        <Link to="/terms-of-service" target="_blank" className="text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300">
          {t('auth:signup.termsOfService')}
        </Link>
        {' '}
        <Link to="/privacy-policy" target="_blank" className="text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300">
          {t('auth:signup.privacyPolicy')}
        </Link>
      </div>
    </form>
  );
} 