import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { User, Loader2, Lock, Search, ChevronDown } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthContext } from '../contexts/AuthContext';
import { countryCodes } from '../utils/countryCodes';

export default function Profile() {
  const { t } = useTranslation(['profile', 'common']);
  const { profile: currentProfile } = useAuthContext();
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

  return (
    <div className="p-6 ">
      <div className="max-w-2xl mx-auto pb-16 md:pb-0">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center">
          <User className="w-6 h-6 mr-2" />
          {t('profile:title')}
        </h1>

        {/* Perfil */}
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
      </div>
    </div>
  );
}