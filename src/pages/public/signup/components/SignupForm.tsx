import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, Link, useLocation } from 'react-router-dom';
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
  const navigate = useNavigate();
  const { referral } = useReferral();
  const { trackEvent } = useTrackingPixel();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const planId = queryParams.get('planId') || '2dca5696-fab0-4cea-8db6-9d53c22b3c5a';
  const billingPeriod = queryParams.get('billingPeriod') || 'monthly';
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
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

      if (signUpError) throw signUpError;
      if (!authData.user) throw new Error('No user data');

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

      if (profileError) throw profileError;

      // 3. Criar organização
      const organizationSlug = generateSlug(formData.organizationName);
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name: formData.organizationName,
          slug: organizationSlug,
          referrer_id: referral?.id || null,
          indication_id: referral?.user_id || null
        })
        .select()
        .single();

      if (orgError) throw orgError;

      // 4. Adicionar usuário como membro da organização
      const { error: memberError } = await supabase
        .from('organization_members')
        .insert({
          organization_id: orgData.id,
          user_id: authData.user.id,
          profile_id: authData.user.id,
          role: 'owner'
        });

      if (memberError) throw memberError;

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

      if (subscriptionError) throw subscriptionError;

      // 6. Criar customer para iniciar chat
      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .insert({
          name: formData.fullName,
          email: formData.email,
          organization_id: referral?.organization_id || 'eec1bc30-559e-43ba-a95a-5520a6b3109f',
          referrer_id: referral?.id || null,
          indication_id: referral?.user_id || null,
          whatsapp: formData.whatsapp ? `+${countryCodes.find(c => c.code === formData.countryCode)?.dial_code}${formData.whatsapp.replace(/\D/g, '')}` : null
        })
        .select()
        .single();

      if (customerError) throw customerError;

      // Inserir contatos na tabela customer_contacts
      const { error: contactError } = await supabase
        .from('customer_contacts')
        .insert([
          {
            customer_id: customerData.id,
            type: 'email',
            value: formData.email,
            label: 'Email Principal'
          },
          {
            customer_id: customerData.id,
            type: 'whatsapp',
            value: formData.whatsapp ? `+${countryCodes.find(c => c.code === formData.countryCode)?.dial_code}${formData.whatsapp.replace(/\D/g, '')}` : null,
            label: 'WhatsApp'
          }
        ]);

      if (contactError) throw contactError;

      // 7. Disparar evento de tracking
      await trackEvent('SignUp', {
        method: 'email',
        organization_name: formData.organizationName
      });

      // 8. Redirecionar para o app
      setTimeout(() => {
        navigate('/app');
      }, 1500);
    } catch (err) {
      console.error('Erro no cadastro:', err);
      setError(t('auth:signup.errors.generic'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5 p-5 sm:p-6">
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
        disabled={loading}
        className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-md text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:translate-y-[-1px] hover:shadow-lg mt-2"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            {t('common:loading')}
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