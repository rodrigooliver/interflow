import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Loader2, CheckCircle2, Search, ChevronDown } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { useSubscriptionPlans } from '../../hooks/useQueryes';
import { countryCodes } from '../../utils/countryCodes';

interface FormData {
  organizationName: string;
  organizationSlug: string;
  organizationEmail: string;
  organizationWhatsapp: string;
  countryCode: string;
  adminName: string;
  adminEmail: string;
  adminPassword: string;
  planId: string;
  billingPeriod: 'monthly' | 'yearly';
  language: 'pt' | 'en' | 'es';
  startFlow: boolean;
}

interface ApiError {
  response?: {
    data?: {
      error?: string;
      errorCode?: string;
    };
  };
  message?: string;
}

export default function AddOrganization() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  // Hook para carregar planos de assinatura
  const { plans, isLoading: plansLoading } = useSubscriptionPlans();
  
  // Estados para o dropdown de países
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  const countryDropdownRef = useRef<HTMLDivElement>(null);
  const dropdownContentRef = useRef<HTMLDivElement>(null);
  
  const [formData, setFormData] = useState<FormData>({
    organizationName: '',
    organizationSlug: '',
    organizationEmail: '',
    organizationWhatsapp: '',
    countryCode: 'BR', // Padrão Brasil
    adminName: '',
    adminEmail: '',
    adminPassword: '',
    planId: '',
    billingPeriod: 'monthly',
    language: 'pt',
    startFlow: false,
  });

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

  // Efeito para definir o primeiro plano como padrão
  useEffect(() => {
    if (plans && plans.length > 0 && !formData.planId) {
      setFormData(prev => ({ ...prev, planId: plans[0].id }));
    }
  }, [plans, formData.planId]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      // Preparar dados para envio conforme a função createOrganization espera
      const organizationData = {
        email: formData.adminEmail,
        password: formData.adminPassword,
        fullName: formData.adminName,
        organizationName: formData.organizationName,
        whatsapp: formData.organizationWhatsapp,
        countryCode: countryCodes.find(c => c.code === formData.countryCode)?.dial_code || '55',
        planId: formData.planId || undefined, // Se vazio, será usado o padrão
        billingPeriod: formData.billingPeriod,
        referral: null,
        language: formData.language,
        startFlow: formData.startFlow
      };

      const response = await api.post('/api/organizations', organizationData);

      if (!response.data.success) {
        throw new Error(response.data.error || 'Falha ao criar organização');
      }

      setSuccess(true);
      
      // Redirecionar após 2 segundos
      setTimeout(() => {
        navigate('/app/admin/organizations');
      }, 2000);

    } catch (error: unknown) {
      const apiError = error as ApiError;
      console.error('Erro ao criar organização:', error);
      
      // Tratamento de erros específicos
      const errorMessage = apiError.response?.data?.error || apiError.message || 'Ocorreu um erro ao criar a organização';
      const errorCode = apiError.response?.data?.errorCode;
      
      // Personalizar mensagens de erro com base no código
      switch (errorCode) {
        case 'emailInUse':
          setError('Este e-mail já está em uso. Tente outro ou faça login.');
          break;
        case 'weakPassword':
          setError('A senha não atende aos requisitos mínimos de segurança.');
          break;
        case 'rateLimit':
          setError('Muitas tentativas. Aguarde alguns minutos e tente novamente.');
          break;
        default:
          setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOrganizationNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setFormData({
      ...formData,
      organizationName: name,
      organizationSlug: name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    });
  };

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const slug = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
    setFormData({
      ...formData,
      organizationSlug: slug
    });
  };

  const handleWhatsAppChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Remove tudo exceto números
    const numbers = e.target.value.replace(/\D/g, '');
    setFormData({
      ...formData,
      organizationWhatsapp: numbers
    });
  };

  return (
    <div className="p-4 sm:p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center mb-6">
          <Link
            to="/app/admin/organizations"
            className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white flex items-center"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Voltar para Organizações
          </Link>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Nova Organização</h1>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-6">
            {error && (
              <div className="bg-red-50 dark:bg-red-900/50 text-red-700 dark:text-red-400 p-4 rounded-md">
                {error}
              </div>
            )}

            {success && (
              <div className="bg-green-50 dark:bg-green-900/50 text-green-700 dark:text-green-400 p-4 rounded-md flex items-center">
                <CheckCircle2 className="w-5 h-5 mr-2" />
                Organização criada com sucesso! Redirecionando...
              </div>
            )}

            <div className="space-y-4">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">Dados da Organização</h2>
              
              <div>
                <label htmlFor="organizationName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nome da Organização *
                </label>
                <input
                  type="text"
                  id="organizationName"
                  required
                  className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2"
                  value={formData.organizationName}
                  onChange={handleOrganizationNameChange}
                />
              </div>

              <div>
                <label htmlFor="organizationSlug" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Slug *
                </label>
                <input
                  type="text"
                  id="organizationSlug"
                  required
                  className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2"
                  value={formData.organizationSlug}
                  onChange={handleSlugChange}
                />
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Identificador único para a organização (apenas letras minúsculas, números e hífens)
                </p>
              </div>

              <div>
                <label htmlFor="organizationEmail" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email da Organização
                </label>
                <input
                  type="email"
                  id="organizationEmail"
                  className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2"
                  value={formData.organizationEmail}
                  onChange={(e) => setFormData({ ...formData, organizationEmail: e.target.value })}
                />
              </div>

              {/* Campo de WhatsApp com seletor de país */}
              <div>
                <label htmlFor="organizationWhatsapp" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  WhatsApp da Organização
                </label>
                <div className="flex w-full">
                  <div className="relative" ref={countryDropdownRef}>
                    <button
                      type="button"
                      className="h-full rounded-l-md border-r-0 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 flex items-center justify-center"
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
                              placeholder="Buscar país..."
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
                              Nenhum país encontrado
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="relative flex-1">
                    <input
                      id="organizationWhatsapp"
                      name="organizationWhatsapp"
                      type="text"
                      placeholder="11987654321"
                      value={formData.organizationWhatsapp}
                      onChange={handleWhatsAppChange}
                      className="block w-full rounded-r-md border-l-0 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 transition-all duration-200"
                    />
                  </div>
                </div>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Apenas números, sem espaços ou caracteres especiais
                </p>
              </div>

              <div>
                <label htmlFor="language" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Idioma Padrão *
                </label>
                <select
                  id="language"
                  required
                  className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2"
                  value={formData.language}
                  onChange={(e) => setFormData({ ...formData, language: e.target.value as 'pt' | 'en' | 'es' })}
                >
                  <option value="pt">Português</option>
                  <option value="en">English</option>
                  <option value="es">Español</option>
                </select>
              </div>
            </div>

            <div className="space-y-4">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">Administrador</h2>
              
              <div>
                <label htmlFor="adminName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  id="adminName"
                  required
                  className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2"
                  value={formData.adminName}
                  onChange={(e) => setFormData({ ...formData, adminName: e.target.value })}
                />
              </div>

              <div>
                <label htmlFor="adminEmail" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  id="adminEmail"
                  required
                  className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2"
                  value={formData.adminEmail}
                  onChange={(e) => setFormData({ ...formData, adminEmail: e.target.value })}
                />
              </div>

              <div>
                <label htmlFor="adminPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Senha *
                </label>
                <input
                  type="password"
                  id="adminPassword"
                  required
                  className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2"
                  value={formData.adminPassword}
                  onChange={(e) => setFormData({ ...formData, adminPassword: e.target.value })}
                />
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Mínimo 6 caracteres
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">Configurações de Assinatura</h2>
              
              <div>
                <label htmlFor="planId" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Plano de Assinatura
                </label>
                <select
                  id="planId"
                  className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2"
                  value={formData.planId}
                  onChange={(e) => setFormData({ ...formData, planId: e.target.value })}
                  disabled={plansLoading}
                >
                  <option value="">
                    {plansLoading ? 'Carregando planos...' : 'Usar plano padrão'}
                  </option>
                  {plans?.map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.name_pt} - R$ {plan.price_brl.toFixed(2)}/mês
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Selecione um plano específico ou deixe vazio para usar o plano padrão do sistema
                </p>
              </div>

              <div>
                <label htmlFor="billingPeriod" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Período de Cobrança *
                </label>
                <select
                  id="billingPeriod"
                  required
                  className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2"
                  value={formData.billingPeriod}
                  onChange={(e) => setFormData({ ...formData, billingPeriod: e.target.value as 'monthly' | 'yearly' })}
                >
                  <option value="monthly">Mensal</option>
                  <option value="yearly">Anual</option>
                </select>
              </div>
            </div>

            <div className="space-y-4">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">Configurações Adicionais</h2>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="startFlow"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded"
                  checked={formData.startFlow}
                  onChange={(e) => setFormData({ ...formData, startFlow: e.target.checked })}
                />
                <label htmlFor="startFlow" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                  Iniciar fluxo de chat automaticamente
                </label>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Se marcado, será criado um cliente na organização principal e iniciado um fluxo de chat automaticamente
              </p>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Criar Organização
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}