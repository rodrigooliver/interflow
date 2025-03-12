import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, HelpCircle } from 'lucide-react';
import { useSubscriptionPlans } from '../../hooks/useQueryes';
import { useNavigate, useLocation } from 'react-router-dom';

interface SubscriptionPlan {
  id: string;
  name_pt: string;
  name_en: string;
  name_es: string;
  description_pt: string;
  description_en: string;
  description_es: string;
  price_brl: number;
  price_usd: number;
  price_brl_yearly: number;
  price_usd_yearly: number;
  default_currency: 'BRL' | 'USD';
  max_users: number;
  max_customers: number;
  max_channels: number;
  max_flows: number;
  max_teams: number;
  storage_limit: number;
  additional_user_price_brl: number;
  additional_user_price_usd: number;
  additional_channel_price_brl: number;
  additional_channel_price_usd: number;
  features_pt: string[] | Record<string, string>;
  features_en: string[] | Record<string, string>;
  features_es: string[] | Record<string, string>;
}

export const Pricing = () => {
  const { t, i18n } = useTranslation(['landing', 'common']);
  const { plans, isLoading } = useSubscriptionPlans();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Definir a moeda com base no idioma do usuário
  const getDefaultCurrency = (): 'BRL' | 'USD' => {
    return i18n.language === 'pt' ? 'BRL' : 'USD';
  };
  
  const [selectedCurrency, setSelectedCurrency] = useState<'BRL' | 'USD'>(getDefaultCurrency());
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');
  
  // Atualizar a moeda quando o idioma mudar
  useEffect(() => {
    setSelectedCurrency(getDefaultCurrency());
  }, [i18n.language]);

  // Função para navegar para uma seção específica
  const scrollToSection = (id: string) => {
    // Se já estamos na página inicial, apenas role para a seção
    if (location.pathname === '/') {
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      // Se não estamos na página inicial, navegue para a página inicial com um parâmetro de hash
      navigate(`/?section=${id}`);
    }
  };

  const getPlanName = (plan: SubscriptionPlan) => {
    switch (i18n.language) {
      case 'en':
        return plan.name_en;
      case 'es':
        return plan.name_es;
      default:
        return plan.name_pt;
    }
  };

  const getPlanDescription = (plan: SubscriptionPlan) => {
    switch (i18n.language) {
      case 'en':
        return plan.description_en;
      case 'es':
        return plan.description_es;
      default:
        return plan.description_pt;
    }
  };

  const getPlanFeatures = (plan: SubscriptionPlan) => {
    switch (i18n.language) {
      case 'en':
        return plan.features_en;
      case 'es':
        return plan.features_es;
      default:
        return plan.features_pt;
    }
  };

  const formatPrice = (price: number, currency: 'BRL' | 'USD') => {
    return new Intl.NumberFormat(i18n.language, {
      style: 'currency',
      currency: currency,
    }).format(price);
  };

  const getFeaturesList = (plan: SubscriptionPlan) => {
    const features = getPlanFeatures(plan);
    if (Array.isArray(features)) {
      return features;
    } else if (typeof features === 'object' && features !== null) {
      return Object.values(features);
    }
    return [];
  };

  const getPrice = (plan: SubscriptionPlan) => {
    if (billingPeriod === 'yearly') {
      return selectedCurrency === 'BRL' ? plan.price_brl_yearly : plan.price_usd_yearly;
    }
    return selectedCurrency === 'BRL' ? plan.price_brl : plan.price_usd;
  };

  const getMonthlyPrice = (plan: SubscriptionPlan) => {
    if (billingPeriod === 'yearly') {
      const yearlyPrice = selectedCurrency === 'BRL' ? plan.price_brl_yearly : plan.price_usd_yearly;
      return yearlyPrice / 12;
    }
    return selectedCurrency === 'BRL' ? plan.price_brl : plan.price_usd;
  };

  const getSavingsPercentage = (plan: SubscriptionPlan) => {
    const monthlyPrice = selectedCurrency === 'BRL' ? plan.price_brl : plan.price_usd;
    const yearlyPrice = selectedCurrency === 'BRL' ? plan.price_brl_yearly : plan.price_usd_yearly;
    const monthlyTotal = monthlyPrice * 12;
    return Math.round(((monthlyTotal - yearlyPrice) / monthlyTotal) * 100);
  };

  if (isLoading) {
    return (
      <div className="py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-4xl text-center">
            <h2 className="text-base font-semibold leading-7 text-blue-600">
              {t('pricing.title')}
            </h2>
            <p className="mt-2 text-4xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-5xl">
              {t('pricing.subtitle')}
            </p>
          </div>
          <div className="flex justify-center mt-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-24 sm:py-32" id="pricing">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-base font-semibold leading-7 text-blue-600">
            {t('pricing.title')}
          </h2>
          <p className="mt-2 text-4xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-5xl">
            {t('pricing.subtitle')}
          </p>
          <p className="mt-6 text-lg leading-8 text-gray-600 dark:text-gray-300">
            {t('pricing.description')}
          </p>
        </div>

        {/* Seletores de moeda e período */}
        <div className="flex justify-center mt-8 mb-10 space-x-4">
          {/* Seletor de período */}
          <div className="inline-flex rounded-md shadow-sm" role="group">
            <button
              type="button"
              className={`px-4 py-2 text-sm font-medium rounded-l-lg ${
                billingPeriod === 'monthly'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
              onClick={() => setBillingPeriod('monthly')}
            >
              {t('pricing.monthly')}
            </button>
            <button
              type="button"
              className={`px-4 py-2 text-sm font-medium rounded-r-lg ${
                billingPeriod === 'yearly'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
              onClick={() => setBillingPeriod('yearly')}
            >
              {t('pricing.yearly')}
            </button>
          </div>

          {/* Seletor de moeda existente */}
          <div className="inline-flex rounded-md shadow-sm" role="group">
            <button
              type="button"
              className={`px-4 py-2 text-sm font-medium rounded-l-lg ${
                selectedCurrency === 'BRL'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
              onClick={() => setSelectedCurrency('BRL')}
            >
              BRL (R$)
            </button>
            <button
              type="button"
              className={`px-4 py-2 text-sm font-medium rounded-r-lg ${
                selectedCurrency === 'USD'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
              onClick={() => setSelectedCurrency('USD')}
            >
              USD ($)
            </button>
          </div>
        </div>

        <div className="isolate mx-auto mt-10 grid max-w-md grid-cols-1 gap-8 lg:mx-0 lg:max-w-none lg:grid-cols-3">
          {plans.map((plan, index) => {
            const price = getPrice(plan);
            const monthlyPrice = getMonthlyPrice(plan);
            const isPopular = index === 1;
            const savingsPercentage = billingPeriod === 'yearly' ? getSavingsPercentage(plan) : 0;
            
            return (
              <div
                key={plan.id}
                className={`rounded-3xl p-8 ring-1 ring-gray-200 dark:ring-gray-700 ${
                  isPopular 
                    ? 'bg-blue-50 dark:bg-blue-900/20 ring-blue-600 dark:ring-blue-500' 
                    : 'bg-white dark:bg-gray-800'
                } xl:p-10`}
              >
                <div className="flex items-center justify-between gap-x-4">
                  <h3 
                    className={`text-lg font-semibold leading-8 ${
                      isPopular ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-white'
                    }`}
                  >
                    {getPlanName(plan)}
                  </h3>
                  {isPopular && (
                    <span className="rounded-full bg-blue-100 dark:bg-blue-900 px-2.5 py-1 text-xs font-semibold leading-5 text-blue-600 dark:text-blue-300">
                      {t('pricing.popular')}
                    </span>
                  )}
                </div>
                <p className="mt-4 text-sm leading-6 text-gray-600 dark:text-gray-300">
                  {getPlanDescription(plan)}
                </p>
                <p className="mt-6 flex items-baseline gap-x-1">
                  <span className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
                    {formatPrice(price, selectedCurrency)}
                  </span>
                  <span className="text-sm font-semibold leading-6 text-gray-600 dark:text-gray-300">
                    /{billingPeriod === 'yearly' ? t('pricing.year') : t('pricing.month')}
                  </span>
                </p>
                {billingPeriod === 'yearly' && (
                  <div className="mt-1">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {t('pricing.monthlyEquivalent', {
                        price: formatPrice(monthlyPrice, selectedCurrency)
                      })}
                    </p>
                    <p className="text-sm font-medium text-green-600 dark:text-green-400">
                      {t('pricing.yearlySavings', { percentage: savingsPercentage })}
                    </p>
                  </div>
                )}
                <button
                  onClick={() => navigate(`/signup?planId=${plan.id}&billingPeriod=${billingPeriod}&currency=${selectedCurrency}`)}
                  className={`mt-6 block w-full rounded-md py-2 px-3 text-center text-sm font-semibold leading-6 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${
                    isPopular
                      ? 'bg-blue-600 text-white hover:bg-blue-500 focus-visible:outline-blue-600'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {t('pricing.subscribe')}
                </button>
                <ul className="mt-8 space-y-3 text-sm leading-6 text-gray-600 dark:text-gray-300">
                  {[
                    `${t('pricing.users')}: ${plan.max_users}`,
                    `${t('pricing.customers')}: ${plan.max_customers}`,
                    `${t('pricing.channels')}: ${plan.max_channels || 1}`,
                    `${t('pricing.flows')}: ${plan.max_flows || 5}`,
                    `${t('pricing.teams')}: ${plan.max_teams || 1}`,
                    `${t('pricing.storage')}: ${(plan.storage_limit / 1048576).toFixed(0)}MB`,
                    ...getFeaturesList(plan)
                  ].map((feature, index) => (
                    <li key={index} className="flex gap-x-3">
                      <Check className="h-6 w-5 flex-none text-blue-600 dark:text-blue-400" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        {/* Link para FAQ */}
        <div className="mt-16 text-center">
          <button 
            onClick={() => scrollToSection('faq')} 
            className="inline-flex items-center text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 bg-transparent border-none cursor-pointer"
          >
            <HelpCircle className="h-5 w-5 mr-2" />
            <span>{t('pricing.havingQuestions')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}; 