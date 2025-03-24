import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router-dom';
import { Loader2, User, Building, Mail, Lock, Search, ChevronDown } from 'lucide-react';
import { supabase } from '../../../../lib/supabase';
import { useReferral } from '../../../../hooks/useReferral';
import { useTrackingPixel } from '../../../../hooks/useTrackingPixel';
import { generateSlug } from '../../../../utils/string';
import { countryCodes } from '../../../../utils/countryCodes';

interface SignupFormData {
  fullName: string;
  email: string;
  password: string;
  organizationName: string;
  whatsapp: string;
  countryCode: string;
}

export default function SignupForm() {
  const { t } = useTranslation(['auth', 'common']);
  const { referral } = useReferral();
  const { trackEvent } = useTrackingPixel();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const planId = queryParams.get('planId') || '2dca5696-fab0-4cea-8db6-9d53c22b3c5a';
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
    const showError = (message: string) => {
      setError(message);
      setLoading(false);
      // Scroll para o topo do formulário para garantir que o erro seja visto
      window.scrollTo({ top: 0, behavior: 'smooth' });
      // Focar no primeiro campo do formulário
      const firstInput = document.querySelector('form input') as HTMLInputElement;
      if (firstInput) firstInput.focus();
    };

    // Validação de nome completo
    if (formData.fullName.trim().length < 3 || !formData.fullName.includes(' ')) {
      showError(t('auth:signup.errors.invalidName', 'Por favor, informe seu nome completo.'));
      return;
    }

    // Validação de nome da organização
    if (formData.organizationName.trim().length < 2) {
      showError(t('auth:signup.errors.invalidOrgName', 'O nome da organização deve ter pelo menos 2 caracteres.'));
      return;
    }

    // Validação de e-mail
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      showError(t('auth:signup.errors.invalidEmail', 'O e-mail informado parece ser inválido. Verifique e tente novamente.'));
      return;
    }

    // Validação de senha
    if (formData.password.length < 6) {
      showError(t('auth:signup.errors.weakPassword', 'A senha deve ter pelo menos 6 caracteres.'));
      return;
    }

    // Validação básica do WhatsApp
    if (formData.whatsapp && formData.whatsapp.length < 8) {
      showError(t('auth:signup.errors.invalidWhatsapp', 'O número de WhatsApp parece ser inválido. Verifique e tente novamente.'));
      return;
    }

    try {
      // 1. Criar usuário no Auth
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName
          }
        }
      });

      if (signUpError) {
        // Verificar mensagens específicas de erro
        if (signUpError.message.includes('email') || signUpError.message.includes('already registered')) {
          throw new Error(t('auth:signup.errors.emailInUse', 'Este e-mail já está em uso. Tente outro ou faça login.'));
        } else if (signUpError.message.includes('password')) {
          throw new Error(t('auth:signup.errors.weakPassword', 'A senha não atende aos requisitos mínimos de segurança.'));
        } else if (signUpError.message.includes('rate limit')) {
          throw new Error(t('auth:signup.errors.rateLimit', 'Muitas tentativas. Aguarde alguns minutos e tente novamente.'));
        } else {
          throw new Error(t('auth:signup.errors.authError', 'Erro na autenticação: ') + signUpError.message);
        }
      }
      
      if (!authData.user) throw new Error(t('auth:signup.errors.noUserData', 'Não foi possível criar o usuário. Tente novamente.'));

      // 2. Criar profile
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          email: formData.email,
          full_name: formData.fullName,
          role: 'admin',
          whatsapp: formData.whatsapp ? `+${countryCodes.find(c => c.code === formData.countryCode)?.dial_code}${formData.whatsapp.replace(/\D/g, '')}` : null
        });

      if (profileError) {
        // Tentar excluir o usuário criado para evitar inconsistências
        try {
          await supabase.auth.admin.deleteUser(authData.user.id);
        } catch (e) {
          console.error('Erro ao limpar usuário após falha:', e);
        }
        throw new Error(t('auth:signup.errors.profileCreation', 'Erro ao criar perfil. Tente novamente.'));
      }

      // 3. Criar organização
      const organizationSlug = generateSlug(formData.organizationName);
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name: formData.organizationName,
          slug: organizationSlug,
          email: formData.email,
          whatsapp: formData.whatsapp ? `${countryCodes.find(c => c.code === formData.countryCode)?.dial_code}${formData.whatsapp.replace(/\D/g, '')}` : null,
          referrer_id: referral?.id || null,
          indication_id: referral?.user_id || null
        })
        .select()
        .single();

      if (orgError) {
        // Tentar excluir o usuário criado para evitar inconsistências
        try {
          await supabase.auth.admin.deleteUser(authData.user.id);
        } catch (e) {
          console.error('Erro ao limpar usuário após falha:', e);
        }
        throw new Error(t('auth:signup.errors.organizationCreation', 'Erro ao criar organização. Tente novamente.'));
      }

      // 4. Adicionar usuário como membro da organização
      const { error: memberError } = await supabase
        .from('organization_members')
        .insert({
          organization_id: orgData.id,
          user_id: authData.user.id,
          profile_id: authData.user.id,
          role: 'owner'
        });

      if (memberError) {
        // Tentar excluir a organização e o usuário criados para evitar inconsistências
        try {
          await supabase.from('organizations').delete().eq('id', orgData.id);
          await supabase.auth.admin.deleteUser(authData.user.id);
        } catch (e) {
          console.error('Erro ao limpar dados após falha:', e);
        }
        throw new Error(t('auth:signup.errors.memberCreation', 'Erro ao adicionar usuário à organização. Tente novamente.'));
      }

      // 5. Criar subscription trial
      const { error: subscriptionError } = await supabase
        .from('subscriptions')
        .insert({
          organization_id: orgData.id,
          plan_id: planId,
          status: 'trialing',
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 dias de trial
          cancel_at_period_end: false,
          billing_period: billingPeriod
        });

      if (subscriptionError) {
        // Tentar limpar dados criados para evitar inconsistências
        try {
          await supabase.from('organization_members').delete().eq('organization_id', orgData.id);
          await supabase.from('organizations').delete().eq('id', orgData.id);
          await supabase.auth.admin.deleteUser(authData.user.id);
        } catch (e) {
          console.error('Erro ao limpar dados após falha:', e);
        }
        throw new Error(t('auth:signup.errors.subscriptionCreation', 'Erro ao criar assinatura. Tente novamente.'));
      }

      // 6. Criar customer para iniciar chat
      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .insert({
          name: formData.fullName,
          email: formData.email,
          organization_id: referral?.organization_id || 'eec1bc30-559e-43ba-a95a-5520a6b3109f',
          referrer_id: referral?.id || null,
          indication_id: referral?.user_id || null,
          whatsapp: formData.whatsapp ? `${countryCodes.find(c => c.code === formData.countryCode)?.dial_code}${formData.whatsapp.replace(/\D/g, '')}` : null
        })
        .select()
        .single();

      if (customerError) {
        throw new Error(t('auth:signup.errors.customerCreation', 'Erro ao criar cliente. O cadastro foi realizado, mas algumas funcionalidades podem estar limitadas.'));
      }

      // Inserir contatos na tabela customer_contacts
      const { error: contactError } = await supabase
        .from('customer_contacts')
        .insert([
          {
            customer_id: customerData.id,
            type: 'email',
            value: formData.email,
            label: 'Email Principal',
            created_at: new Date().toISOString()
          },
          {
            customer_id: customerData.id,
            type: 'whatsapp',
            value: formData.whatsapp ? `${countryCodes.find(c => c.code === formData.countryCode)?.dial_code}${formData.whatsapp.replace(/\D/g, '')}` : null,
            label: 'WhatsApp',
            created_at: new Date().toISOString()
          }
        ]);

      if (contactError) {
        console.error('Erro ao criar contatos:', contactError);
        // Não impede o fluxo, apenas loga o erro
        throw new Error(t('auth:signup.errors.customerCreation', 'Erro ao criar contatos. Tente novamente.'));
      }

      // 7. Disparar evento de tracking
      try {
        await trackEvent('SignUp', {
          method: 'email',
          organization_name: formData.organizationName
        });
      } catch (trackError) {
        console.error('Erro ao registrar evento de tracking:', trackError);
        // Não impede o fluxo, apenas loga o erro
      }

      // Mostrar mensagem de sucesso
      setSuccess(true);
      setLoading(false);

      // 8. Fazer login explícito para garantir que a sessão seja estabelecida
      try {
        // Aguardar um momento para garantir que todos os dados foram salvos
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Fazer login explícito com as credenciais fornecidas
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password
        });
        
        if (signInError) {
          console.error('Erro ao fazer login após cadastro:', signInError);
        }
        
        // Verificar se a sessão foi estabelecida
        const { data: sessionData } = await supabase.auth.getSession();
        
        if (sessionData.session) {
          console.log('Sessão estabelecida com sucesso após cadastro');
          
          // Verificar se o perfil está disponível
          try {
            const { data: profileData, error: profileError } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', sessionData.session.user.id)
              .single();
              
            if (profileData) {
              console.log('Perfil carregado com sucesso após cadastro');
              
              // Verificar se a organização está disponível
              try {
                const { data: orgMemberData, error: orgMemberError } = await supabase
                  .from('organization_members')
                  .select(`
                    organization:organizations (
                      id,
                      name,
                      slug
                    )
                  `)
                  .eq('user_id', sessionData.session.user.id)
                  .limit(1)
                  .single();
                  
                if (orgMemberData?.organization) {
                  console.log('Organização carregada com sucesso após cadastro:', orgMemberData.organization);
                } else {
                  console.error('Organização não encontrada após cadastro:', orgMemberError);
                }
              } catch (orgCheckError) {
                console.error('Erro ao verificar organização após cadastro:', orgCheckError);
              }
            } else {
              console.error('Perfil não encontrado após cadastro:', profileError);
            }
          } catch (profileCheckError) {
            console.error('Erro ao verificar perfil após cadastro:', profileCheckError);
          }
        } else {
          console.error('Sessão não estabelecida após cadastro e login explícito');
        }
        
        // Forçar recarregamento completo da página para garantir que a sessão seja estabelecida
        setTimeout(() => {
          // Obter o ID do projeto Supabase para limpar o token correto
          const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
          const projectId = supabaseUrl.match(/(?:\/\/|^)(.*?)\.supabase/)?.[1];
          
          if (projectId) {
            // Limpar qualquer cache de sessão local
            localStorage.removeItem(`sb-${projectId}-auth-token`);
          }
          
          // Registrar no OneSignal se estiver em ambiente mobile
          if (window.isNativeApp && window.nativeApp?.registerForNotifications && sessionData.session?.user?.id) {
            console.log('Registrando usuário no OneSignal após signup:', sessionData.session.user.id);
            window.nativeApp.registerForNotifications(sessionData.session.user.id);
          }
          
          // Armazenar credenciais temporariamente para login automático na página de destino
          localStorage.setItem('temp_auth_email', formData.email);
          localStorage.setItem('temp_auth_password', formData.password);
          localStorage.setItem('temp_auth_redirect', 'true');
          
          // Redirecionar para a página inicial do app
          window.location.href = '/app';
        }, 2000);
      } catch (authError) {
        console.error('Erro ao estabelecer sessão após cadastro:', authError);
        // Mesmo com erro, tentamos redirecionar
        setTimeout(() => {
          window.location.href = '/app';
        }, 2000);
      }
    } catch (err: unknown) {
      console.error('Erro no cadastro:', err);
      // Exibir mensagem de erro específica ou genérica
      showError(err instanceof Error ? err.message : t('auth:signup.errors.generic', 'Ocorreu um erro durante o cadastro. Tente novamente.'));
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