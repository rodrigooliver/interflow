import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useOrganizationContext } from '../../contexts/OrganizationContext';
import { useSubscriptionPlans } from '../../hooks/useQueryes';

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
  stripe_price_id: string;
}

interface Subscription {
  id: string;
  organization_id: string;
  plan_id: string;
  status: string;
  current_period_end: string;
  subscription_plans: SubscriptionPlan;
}

export function BillingSettings() {
  const { t, i18n } = useTranslation(['settings', 'common']);
  const { currentOrganization } = useOrganizationContext();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [currentSubscription, setCurrentSubscription] = useState<Subscription | null>(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(true);
  const { plans: subscriptionPlans, isLoading: plansLoading } = useSubscriptionPlans();
  
  // Definir a moeda com base no idioma do usuário
  const getDefaultCurrency = (): 'BRL' | 'USD' => {
    return i18n.language === 'pt' ? 'BRL' : 'USD';
  };
  
  const [selectedCurrency, setSelectedCurrency] = useState<'BRL' | 'USD'>(getDefaultCurrency());
  
  // Atualizar a moeda quando o idioma mudar
  useEffect(() => {
    setSelectedCurrency(getDefaultCurrency());
  }, [i18n.language]);

  useEffect(() => {
    if (currentOrganization) {
      loadCurrentSubscription();
    }
  }, [currentOrganization]);

  async function loadCurrentSubscription() {
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*, subscription_plans(*)')
        .eq('organization_id', currentOrganization?.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setCurrentSubscription(data);
    } catch (err) {
      console.error('Erro ao carregar assinatura:', err);
    } finally {
      setSubscriptionLoading(false);
    }
  }

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

  const handleSubscribe = async (planId: string) => {
    // Implementar integração com Stripe aqui
    console.log('Assinar plano:', planId);
  };

  if (plansLoading || subscriptionLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Seletor de moeda */}
      <div className="flex justify-end">
        <div className="inline-flex rounded-md shadow-sm" role="group">
          <button
            type="button"
            className={`px-4 py-2 text-sm font-medium rounded-l-lg ${
              selectedCurrency === 'BRL'
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600'
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
                : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600'
            }`}
            onClick={() => setSelectedCurrency('USD')}
          >
            USD ($)
          </button>
        </div>
      </div>

      {/* Grade de planos */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {subscriptionPlans.map((plan) => {
          const isCurrentPlan = currentSubscription?.plan_id === plan.id;
          const price = selectedCurrency === 'BRL' ? plan.price_brl : plan.price_usd;

          return (
            <div
              key={plan.id}
              className={`relative rounded-lg border ${
                isCurrentPlan
                  ? 'border-blue-500 dark:border-blue-400'
                  : 'border-gray-200 dark:border-gray-700'
              } bg-white dark:bg-gray-800 p-6 shadow-sm`}
            >
              {isCurrentPlan && (
                <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2">
                  <span className="inline-flex items-center rounded-full bg-blue-100 dark:bg-blue-900 px-3 py-1 text-xs font-medium text-blue-700 dark:text-blue-300">
                    {t('settings:billing.currentPlan')}
                  </span>
                </div>
              )}

              <div className="text-center">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  {getPlanName(plan)}
                </h3>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  {getPlanDescription(plan)}
                </p>
                <p className="mt-4">
                  <span className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
                    {formatPrice(price, selectedCurrency)}
                  </span>
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    /mês
                  </span>
                </p>
              </div>

              <ul className="mt-6 space-y-4">
                {[
                  `${t('settings:billing.maxUsers')}: ${plan.max_users}`,
                  `${t('settings:billing.maxCustomers')}: ${plan.max_customers}`,
                  `${t('settings:billing.maxChannels')}: ${plan.max_channels || 1}`,
                  `${t('settings:billing.maxFlows')}: ${plan.max_flows || 5}`,
                  `${t('settings:billing.maxTeams')}: ${plan.max_teams || 1}`,
                  `${t('settings:billing.storage')}: ${(plan.storage_limit / 1048576).toFixed(0)}MB`,
                  ...(Array.isArray(getPlanFeatures(plan)) ? getPlanFeatures(plan) as string[] : 
                     typeof getPlanFeatures(plan) === 'object' && getPlanFeatures(plan) !== null ? 
                     Object.values(getPlanFeatures(plan) as Record<string, string>) : [])
                ].map((feature, index) => (
                  <li key={index} className="flex items-start">
                    <div className="flex-shrink-0">
                      <Check className="h-5 w-5 text-blue-500" />
                    </div>
                    <p className="ml-3 text-sm text-gray-500 dark:text-gray-400">{feature}</p>
                  </li>
                ))}

                {/* Preços adicionais */}
                {plan.additional_user_price_brl > 0 && (
                  <li className="flex items-start">
                    <div className="flex-shrink-0">
                      <Check className="h-5 w-5 text-blue-500" />
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
                      <Check className="h-5 w-5 text-blue-500" />
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
                      <Check className="h-5 w-5 text-blue-500" />
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
                      <Check className="h-5 w-5 text-blue-500" />
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

              <div className="mt-8">
                <button
                  onClick={() => handleSubscribe(plan.id)}
                  disabled={isCurrentPlan}
                  className={`w-full rounded-md px-3.5 py-2 text-sm font-semibold leading-6 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${
                    isCurrentPlan
                      ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                      : 'bg-blue-600 text-white shadow-sm hover:bg-blue-500 focus-visible:outline-blue-600'
                  }`}
                >
                  {isCurrentPlan
                    ? t('settings:billing.currentPlan')
                    : t('settings:billing.subscribe')}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Payment Methods */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          {t('settings:billing.paymentMethods')}
        </h2>
        <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
          <div className="flex items-center">
            <Check className="w-8 h-8 text-gray-400 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                •••• •••• •••• 4242
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Expires 12/25
              </p>
            </div>
          </div>
          <button className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300">
            {t('settings:billing.edit')}
          </button>
        </div>
        <button className="mt-4 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300">
          + {t('settings:billing.addPaymentMethod')}
        </button>
      </div>

      {/* Billing History */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          {t('settings:billing.history')}
        </h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t('settings:billing.date')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t('settings:billing.description')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t('settings:billing.amount')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t('settings:billing.status')}
                </th>
                <th className="relative px-6 py-3">
                  <span className="sr-only">{t('settings:billing.download')}</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {/* Example invoice row */}
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  01/03/2024
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                  Professional Plan
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {formatPrice(99.90, 'BRL')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-400">
                    {t('settings:billing.paid')}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300">
                    {t('settings:billing.download')}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}