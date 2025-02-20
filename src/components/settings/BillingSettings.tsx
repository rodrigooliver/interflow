import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { CreditCard, Package, ChevronRight, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { SubscriptionPlan } from '../../types/database';
import { useOrganizationContext } from '../../contexts/OrganizationContext';

export function BillingSettings() {
  const { t } = useTranslation(['settings', 'common']);
  const { subscription } = useOrganizationContext();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadPlans();
  }, []);

  async function loadPlans() {
    try {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .order('price');

      if (error) throw error;
      setPlans(data || []);
    } catch (error) {
      console.error('Error loading plans:', error);
      setError(t('common:error'));
    } finally {
      setLoading(false);
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  };

  const formatStorageSize = (bytes: number) => {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current Plan */}
      <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          {t('settings:billing.currentPlan')}
        </h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {subscription?.plan?.name || 'Free'}
            </p>
            {subscription && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {subscription.status === 'trialing'
                  ? t('settings:billing.trialEnds', {
                      date: new Date(subscription.current_period_end).toLocaleDateString()
                    })
                  : t('settings:billing.renewsOn', {
                      date: new Date(subscription.current_period_end).toLocaleDateString()
                    })}
              </p>
            )}
          </div>
          <button className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700">
            {t('settings:billing.manageBilling')}
          </button>
        </div>
      </div>

      {/* Available Plans */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border-2 ${
              subscription?.plan?.id === plan.id
                ? 'border-blue-500'
                : 'border-transparent'
            } p-6`}
          >
            <div className="flex items-center justify-between mb-4">
              <Package className="w-8 h-8 text-blue-500" />
              {subscription?.plan?.id === plan.id && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-400">
                  {t('settings:billing.currentPlan')}
                </span>
              )}
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              {plan.name}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              {plan.description}
            </p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
              {formatPrice(plan.price)}
              <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
                /month
              </span>
            </p>
            <ul className="space-y-3 mb-6">
              <li className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                <ChevronRight className="w-4 h-4 mr-2 text-blue-500" />
                {t('settings:billing.features.users', { count: plan.max_users })}
              </li>
              <li className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                <ChevronRight className="w-4 h-4 mr-2 text-blue-500" />
                {t('settings:billing.features.storage', { size: formatStorageSize(plan.storage_limit) })}
              </li>
              <li className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                <ChevronRight className="w-4 h-4 mr-2 text-blue-500" />
                {t('settings:billing.features.channels', { count: plan.features.chat_channels.length })}
              </li>
              <li className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                <ChevronRight className="w-4 h-4 mr-2 text-blue-500" />
                {t('settings:billing.features.concurrentChats', { count: plan.features.max_concurrent_chats })}
              </li>
            </ul>
            <button
              disabled={subscription?.plan?.id === plan.id}
              className={`w-full px-4 py-2 rounded-md text-sm font-medium ${
                subscription?.plan?.id === plan.id
                  ? 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {subscription?.plan?.id === plan.id
                ? t('settings:billing.currentPlan')
                : t('settings:billing.selectPlan')}
            </button>
          </div>
        ))}
      </div>

      {/* Payment Methods */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          {t('settings:billing.paymentMethods')}
        </h2>
        <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
          <div className="flex items-center">
            <CreditCard className="w-8 h-8 text-gray-400 mr-3" />
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
                  {formatPrice(99.90)}
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