import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSubscriptionPlans, useCurrentSubscription, useInvoices } from '../../hooks/useQueryes';
import { useOrganizationContext } from '../../contexts/OrganizationContext';
import { Check, X, FileText, ExternalLink } from 'lucide-react';
import api from '../../lib/api';

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
  additional_flow_price_brl: number;
  additional_flow_price_usd: number;
  additional_team_price_brl: number;
  additional_team_price_usd: number;
  features_pt: string[] | Record<string, string>;
  features_en: string[] | Record<string, string>;
  features_es: string[] | Record<string, string>;
  stripe_price_id_brl_monthly: string;
  stripe_price_id_usd_monthly: string;
  stripe_price_id_brl_yearly: string;
  stripe_price_id_usd_yearly: string;
}

export function BillingSettings() {
  const { t } = useTranslation(['common', 'settings']);
  const { plans, isLoading: isLoadingPlans } = useSubscriptionPlans();
  const { currentOrganization } = useOrganizationContext();
  const { data: currentSubscription } = useCurrentSubscription(currentOrganization?.id);
  const { data: invoices, isLoading: isLoadingInvoices } = useInvoices(currentOrganization?.id);
  const [selectedCurrency, setSelectedCurrency] = useState<'BRL' | 'USD'>('BRL');
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [pendingPlanId, setPendingPlanId] = useState<string | null>(null);

  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const proceedWithSubscription = async (planId: string) => {
    try {
      setIsProcessing(true);
      const response = await api.post(`/api/${currentOrganization?.id}/stripe/create-checkout-session`, {
        planId,
        currency: selectedCurrency,
        billingPeriod,
        email: email || undefined
      });
      const { url } = response.data;
      if (url) {
        window.location.href = url;
        setTimeout(() => {
          setIsProcessing(false);
        }, 1000);
      } else {
        console.error('Error creating checkout session:', response.data);
        setIsProcessing(false);
      }
    } catch (error) {
      console.error('Error creating checkout session:', error);
      setIsProcessing(false);
    }
  };

  const handleManageSubscription = async () => {
    try {
      setIsProcessing(true);
      const response = await api.post(`/api/${currentOrganization?.id}/stripe/create-portal-session`);
      const { url } = response.data;
      if (url) {
        window.location.href = url;
        setTimeout(() => {
          setIsProcessing(false);
        }, 1000);
      } else {
        console.error('Error creating portal session:', response.data);
        setIsProcessing(false);
      }
    } catch (error) {
      console.error('Error creating portal session:', error);
      setIsProcessing(false);
    }
  };

  const handleSubscribe = async (planId: string) => {
    try {
      setIsProcessing(true);

      if (!currentOrganization?.email) {
        setPendingPlanId(planId);
        setShowEmailModal(true);
        setIsProcessing(false);
        return;
      }

      await proceedWithSubscription(planId);
    } catch (error) {
      console.error('Error in subscription process:', error);
      setIsProcessing(false);
    }
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

  const formatPrice = (price: number, currency: 'BRL' | 'USD') => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: currency,
    }).format(price);
  };

  if (isLoadingPlans) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4" role="status">
          <span className="sr-only">{t('common:loading')}</span>
        </div>
        <p className="text-gray-500 dark:text-gray-400">{t('common:loading')}</p>
      </div>
    );
  }

  return (
    <div className="px-0 py-0">
      {/* Modal de Email */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-3 sm:p-6 w-full max-w-md relative">
            <div className="absolute top-3 right-3">
              <button
                onClick={() => {
                  setShowEmailModal(false);
                  setPendingPlanId(null);
                  setEmail('');
                  setEmailError('');
                }}
                className="text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <X className="h-5 w-5 sm:h-6 sm:w-6" />
              </button>
            </div>
            
            <div className="mb-4 sm:mb-6">
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-2">
                {t('settings:billing.updateEmail')}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t('settings:billing.emailRequired')}
              </p>
            </div>

            <div className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('settings:billing.emailLabel')}
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setEmailError('');
                  }}
                  className="block w-full px-4 py-3 rounded-md border border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-base"
                  placeholder="seu@email.com"
                />
                {emailError && (
                  <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                    {emailError}
                  </p>
                )}
              </div>

              <div className="flex flex-col sm:flex-row sm:justify-end space-y-3 sm:space-y-0 sm:space-x-3">
                <button
                  onClick={() => {
                    setShowEmailModal(false);
                    setPendingPlanId(null);
                    setEmail('');
                    setEmailError('');
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"
                >
                  {t('common:cancel')}
                </button>
                <button
                  onClick={() => {
                    if (!email || !validateEmail(email)) {
                      setEmailError(t('settings:billing.invalidEmail'));
                      return;
                    }
                    setIsProcessing(true);
                    setShowEmailModal(false);
                    if (pendingPlanId) {
                      proceedWithSubscription(pendingPlanId);
                    }
                  }}
                  disabled={!email || isProcessing}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isProcessing ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin h-4 w-4 border-b-2 border-white rounded-full mr-2"></div>
                      {t('common:processing')}
                    </div>
                  ) : t('settings:billing.updateAndContinue')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Seletores de moeda e período */}
      <div className="flex flex-col sm:flex-row justify-center mb-6 sm:mb-8 space-y-3 sm:space-y-0 sm:space-x-4">
        {/* Seletor de período */}
        <div className="inline-flex rounded-md shadow-sm self-center w-full max-w-xs sm:w-auto" role="group">
          <button
            type="button"
            className={`flex-1 px-4 py-2 text-sm font-medium rounded-l-lg ${
              billingPeriod === 'monthly'
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
            onClick={() => setBillingPeriod('monthly')}
          >
            {t('settings:billing.monthly')}
          </button>
          <button
            type="button"
            className={`flex-1 px-4 py-2 text-sm font-medium rounded-r-lg ${
              billingPeriod === 'yearly'
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
            onClick={() => setBillingPeriod('yearly')}
          >
            {t('settings:billing.yearly')}
          </button>
        </div>

        {/* Seletor de moeda */}
        <div className="inline-flex rounded-md shadow-sm self-center w-full max-w-xs sm:w-auto" role="group">
          <button
            type="button"
            className={`flex-1 px-4 py-2 text-sm font-medium rounded-l-lg ${
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
            className={`flex-1 px-4 py-2 text-sm font-medium rounded-r-lg ${
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

      {/* Lista de planos */}
      <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
        {plans.map((plan) => {
          const price = getPrice(plan);
          const monthlyPrice = getMonthlyPrice(plan);
          const savingsPercentage = billingPeriod === 'yearly' ? getSavingsPercentage(plan) : 0;
          const isCurrentPlan = currentSubscription?.plan_id === plan.id;

          return (
            <div
              key={plan.id}
              className={`rounded-lg border p-3 sm:p-4 md:p-6 bg-white dark:bg-gray-800 ${
                isCurrentPlan
                  ? 'border-blue-500 dark:border-blue-400'
                  : 'border-gray-200 dark:border-gray-700'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
                  {selectedCurrency === 'BRL' ? plan.name_pt : plan.name_en}
                </h3>
                {isCurrentPlan && currentSubscription?.status === 'active' && (
                  <span className="mt-1 sm:mt-0 sm:ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                    {t('settings:billing.currentPlan')}
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-3 sm:mb-4">
                {selectedCurrency === 'BRL' ? plan.description_pt : plan.description_en}
              </p>
              {isCurrentPlan && currentSubscription?.cancel_at_period_end && (
                <div className="mb-3 sm:mb-4 p-2 sm:p-3 bg-yellow-50 dark:bg-yellow-900/30 rounded-md border border-yellow-200 dark:border-yellow-800">
                  <p className="text-xs sm:text-sm text-yellow-800 dark:text-yellow-200">
                    {t('settings:billing.willCancelOn', {
                      date: new Date(currentSubscription.current_period_end).toLocaleDateString()
                    })}
                  </p>
                </div>
              )}
              <div className="mb-3 sm:mb-4 md:mb-6">
                <div className="flex flex-wrap items-baseline">
                  <p className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mr-1">
                    {formatPrice(price, selectedCurrency)}
                  </p>
                  <span className="text-xs sm:text-sm font-normal text-gray-500 dark:text-gray-400">
                    /{billingPeriod === 'yearly' ? t('settings:billing.year') : t('settings:billing.month')}
                  </span>
                </div>
                {billingPeriod === 'yearly' && (
                  <div className="mt-1">
                    <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                      {t('settings:billing.monthlyEquivalent', {
                        price: formatPrice(monthlyPrice, selectedCurrency)
                      })}
                    </p>
                    <p className="text-xs sm:text-sm font-medium text-green-600 dark:text-green-400">
                      {t('settings:billing.yearlySavings', { percentage: savingsPercentage })}
                    </p>
                  </div>
                )}
              </div>

              {/* Lista de recursos */}
              <ul className="mt-3 sm:mt-4 md:mt-6 space-y-2 sm:space-y-3 md:space-y-4 mb-3 sm:mb-4 md:mb-6">
                {[
                  `${t('settings:billing.maxUsers')}: ${plan.max_users}`,
                  `${t('settings:billing.maxCustomers')}: ${plan.max_customers}`,
                  `${t('settings:billing.maxChannels')}: ${plan.max_channels || 1}`,
                  `${t('settings:billing.maxFlows')}: ${plan.max_flows || 5}`,
                  `${t('settings:billing.maxTeams')}: ${plan.max_teams || 1}`,
                  `${t('settings:billing.storage')}: ${(plan.storage_limit / 1048576).toFixed(0)}MB`
                ].map((feature, index) => (
                  <li key={index} className="flex items-start">
                    <div className="flex-shrink-0">
                      <Check className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500 dark:text-blue-400" />
                    </div>
                    <p className="ml-2 sm:ml-3 text-xs sm:text-sm text-gray-500 dark:text-gray-400">{feature}</p>
                  </li>
                ))}

                {/* Preços adicionais */}
                {plan.additional_user_price_brl > 0 && (
                  <li className="flex items-start">
                    <div className="flex-shrink-0">
                      <Check className="h-5 w-5 text-blue-500 dark:text-blue-400" />
                    </div>
                    <p className="ml-3 text-sm text-gray-500 dark:text-gray-400">
                      {t('settings:billing.additionalUser')}: {formatPrice(
                        selectedCurrency === 'BRL' ? plan.additional_user_price_brl : plan.additional_user_price_usd,
                        selectedCurrency
                      )}
                    </p>
                  </li>
                )}

                {plan.additional_channel_price_brl > 0 && (
                  <li className="flex items-start">
                    <div className="flex-shrink-0">
                      <Check className="h-5 w-5 text-blue-500 dark:text-blue-400" />
                    </div>
                    <p className="ml-3 text-sm text-gray-500 dark:text-gray-400">
                      {t('settings:billing.additionalChannel')}: {formatPrice(
                        selectedCurrency === 'BRL' ? plan.additional_channel_price_brl : plan.additional_channel_price_usd,
                        selectedCurrency
                      )}
                    </p>
                  </li>
                )}

                {plan.additional_flow_price_brl > 0 && (
                  <li className="flex items-start">
                    <div className="flex-shrink-0">
                      <Check className="h-5 w-5 text-blue-500 dark:text-blue-400" />
                    </div>
                    <p className="ml-3 text-sm text-gray-500 dark:text-gray-400">
                      {t('settings:billing.additionalFlow')}: {formatPrice(
                        selectedCurrency === 'BRL' ? plan.additional_flow_price_brl : plan.additional_flow_price_usd,
                        selectedCurrency
                      )}
                    </p>
                  </li>
                )}

                {plan.additional_team_price_brl > 0 && (
                  <li className="flex items-start">
                    <div className="flex-shrink-0">
                      <Check className="h-5 w-5 text-blue-500 dark:text-blue-400" />
                    </div>
                    <p className="ml-3 text-sm text-gray-500 dark:text-gray-400">
                      {t('settings:billing.additionalTeam')}: {formatPrice(
                        selectedCurrency === 'BRL' ? plan.additional_team_price_brl : plan.additional_team_price_usd,
                        selectedCurrency
                      )}
                    </p>
                  </li>
                )}
              </ul>

              <button
                onClick={() => 
                  isCurrentPlan && !!currentSubscription?.stripe_subscription_id
                    ? handleManageSubscription()
                    : handleSubscribe(plan.id)
                }
                disabled={isProcessing}
                className={`w-full py-2 px-4 rounded-md text-sm font-medium transition-colors duration-200 ${
                  isCurrentPlan && !!currentSubscription?.stripe_subscription_id
                    ? 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                    : 'bg-blue-600 text-white hover:bg-blue-700 dark:hover:bg-blue-500'
                } ${isProcessing ? 'opacity-75 cursor-not-allowed' : ''}`}
              >
                {isProcessing
                  ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin h-5 w-5 border-b-2 border-white rounded-full mr-2"></div>
                      {t('common:processing')}
                    </div>
                  )
                  : isCurrentPlan && !!currentSubscription?.stripe_subscription_id
                  ? t('settings:billing.manageSubscription')
                  : t('settings:billing.subscribe')}
              </button>
            </div>
          );
        })}
      </div>

      {/* Histórico de Faturas */}
      <div className="mt-8 sm:mt-12">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-4 sm:mb-6">
          {t('settings:billing.invoiceHistory')}
        </h2>
        
        {isLoadingInvoices ? (
          <div className="text-center py-6 sm:py-8 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-3" role="status">
              <span className="sr-only">{t('common:loading')}</span>
            </div>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{t('common:loading')}</p>
          </div>
        ) : invoices && invoices.length > 0 ? (
          <>
            {/* Versão para desktop */}
            <div className="hidden sm:block overflow-x-auto sm:rounded-lg shadow">
              <div className="inline-block min-w-full align-middle">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th scope="col" className="px-4 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        {t('settings:billing.invoiceDate')}
                      </th>
                      <th scope="col" className="px-4 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        {t('settings:billing.invoiceAmount')}
                      </th>
                      <th scope="col" className="px-4 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        {t('settings:billing.invoiceStatus')}
                      </th>
                      <th scope="col" className="px-4 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        {t('settings:billing.invoiceDueDate')}
                      </th>
                      <th scope="col" className="px-4 sm:px-6 py-2 sm:py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        {t('settings:billing.invoiceActions')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {invoices.map((invoice) => (
                      <tr key={invoice.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-4 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                          {new Date(invoice.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-4 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                          {formatPrice(invoice.amount, invoice.currency.toUpperCase() as 'BRL' | 'USD')}
                        </td>
                        <td className="px-4 sm:px-6 py-2 sm:py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                            ${invoice.status === 'paid' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 
                              invoice.status === 'open' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' : 
                              'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'}`}>
                            {invoice.status === 'paid' ? t('settings:billing.invoicePaid') : 
                             invoice.status === 'open' ? t('settings:billing.invoiceOpen') : 
                             t('settings:billing.invoiceUnpaid')}
                          </span>
                        </td>
                        <td className="px-4 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                          {invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : '-'}
                        </td>
                        <td className="px-4 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-right text-xs sm:text-sm font-medium">
                          <div className="flex justify-end space-x-2 sm:space-x-3">
                            {invoice.hosted_invoice_url && (
                              <a 
                                href={invoice.hosted_invoice_url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                                title={t('settings:billing.viewInvoice')}
                                aria-label={t('settings:billing.viewInvoice')}
                              >
                                <ExternalLink className="h-4 w-4 sm:h-5 sm:w-5" />
                              </a>
                            )}
                            {invoice.pdf_url && (
                              <a 
                                href={invoice.pdf_url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                                title={t('settings:billing.downloadInvoice')}
                                aria-label={t('settings:billing.downloadInvoice')}
                              >
                                <FileText className="h-4 w-4 sm:h-5 sm:w-5" />
                              </a>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Versão para mobile */}
            <div className="sm:hidden space-y-3">
              {invoices.map((invoice) => (
                <div key={invoice.id} className="bg-white dark:bg-gray-800 rounded-lg shadow p-3 border border-gray-200 dark:border-gray-700">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="text-xs font-medium text-gray-900 dark:text-white">
                        {new Date(invoice.created_at).toLocaleDateString()}
                      </p>
                      <p className="text-base font-bold text-gray-900 dark:text-white mt-1">
                        {formatPrice(invoice.amount, invoice.currency.toUpperCase() as 'BRL' | 'USD')}
                      </p>
                    </div>
                    <span className={`px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full 
                      ${invoice.status === 'paid' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 
                        invoice.status === 'open' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' : 
                        'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'}`}>
                      {invoice.status === 'paid' ? t('settings:billing.invoicePaid') : 
                       invoice.status === 'open' ? t('settings:billing.invoiceOpen') : 
                       t('settings:billing.invoiceUnpaid')}
                    </span>
                  </div>
                  
                  {invoice.due_date && (
                    <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 mb-2">
                      <span className="font-medium mr-1">{t('settings:billing.invoiceDueDate')}:</span>
                      {new Date(invoice.due_date).toLocaleDateString()}
                    </div>
                  )}
                  
                  <div className="flex space-x-3 mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                    {invoice.hosted_invoice_url && (
                      <a 
                        href={invoice.hosted_invoice_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center text-xs text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                        aria-label={t('settings:billing.viewInvoice')}
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        {t('settings:billing.viewInvoice')}
                      </a>
                    )}
                    {invoice.pdf_url && (
                      <a 
                        href={invoice.pdf_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center text-xs text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                        aria-label={t('settings:billing.downloadInvoice')}
                      >
                        <FileText className="h-3 w-3 mr-1" />
                        {t('settings:billing.downloadInvoice')}
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-8 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">
              {t('settings:billing.noInvoices')}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('settings:billing.noInvoicesDescription')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}