import React, { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useTranslation } from 'react-i18next';

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
  max_tokens: number;
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

export default function SubscriptionPlans() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const { t, i18n } = useTranslation(['common', 'subscription']);

  useEffect(() => {
    loadPlans();
  }, []);

  async function loadPlans() {
    try {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .order('price_brl', { ascending: true });

      if (error) throw error;
      setPlans(data || []);
    } catch (err) {
      console.error('Erro ao carregar planos:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Tem certeza que deseja excluir este plano?')) return;

    try {
      const { error } = await supabase
        .from('subscription_plans')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await loadPlans();
    } catch (err) {
      console.error('Erro ao excluir plano:', err);
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

  const formatPrice = (price: number, currency: 'BRL' | 'USD') => {
    return new Intl.NumberFormat(i18n.language, {
      style: 'currency',
      currency: currency,
    }).format(price);
  };

  const formatTokens = (tokens: number) => {
    return new Intl.NumberFormat(i18n.language).format(tokens);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {t('subscription:plans.title')}
        </h1>
        <Link
          to="/app/admin/subscription-plans/new"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <Plus className="h-5 w-5 mr-2" />
          {t('subscription:plans.add')}
        </Link>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200 dark:divide-gray-700">
          {plans.map((plan) => (
            <li key={plan.id} className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    {getPlanName(plan)}
                  </h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {getPlanDescription(plan)}
                  </p>
                  <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    <span className="font-medium">
                      {formatPrice(plan.price_brl, 'BRL')} / {formatPrice(plan.price_usd, 'USD')}
                    </span>
                  </div>
                  <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    <span>{t('subscription:plans.maxUsers')}: {plan.max_users}</span>
                    <span className="mx-2">•</span>
                    <span>{t('subscription:plans.maxCustomers')}: {plan.max_customers}</span>
                    <span className="mx-2">•</span>
                    <span>{t('subscription:plans.maxChannels')}: {plan.max_channels || 1}</span>
                  </div>
                  <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    <span>{t('subscription:plans.maxFlows')}: {plan.max_flows || 5}</span>
                    <span className="mx-2">•</span>
                    <span>{t('subscription:plans.maxTeams')}: {plan.max_teams || 1}</span>
                    <span className="mx-2">•</span>
                    <span>{(plan.storage_limit / 1048576).toFixed(0)} MB</span>
                  </div>
                  <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    <span>Tokens/mês: {formatTokens(plan.max_tokens || 1000000)}</span>
                  </div>
                  {plan.additional_user_price_brl > 0 && (
                    <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                      <span>Usuário adicional: {formatPrice(plan.additional_user_price_brl, 'BRL')}</span>
                    </div>
                  )}
                  {plan.additional_channel_price_brl > 0 && (
                    <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                      <span>Canal adicional: {formatPrice(plan.additional_channel_price_brl, 'BRL')}</span>
                    </div>
                  )}
                </div>
                <div className="flex space-x-3">
                  <Link
                    to={`/app/admin/subscription-plans/${plan.id}`}
                    className="inline-flex items-center p-2 border border-transparent rounded-full text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <Pencil className="h-5 w-5" />
                  </Link>
                  <button
                    onClick={() => handleDelete(plan.id)}
                    className="inline-flex items-center p-2 border border-transparent rounded-full text-red-600 hover:bg-red-100 dark:hover:bg-red-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
} 