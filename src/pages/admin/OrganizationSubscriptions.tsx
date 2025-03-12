import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { ArrowLeft, Plus, Loader2, X, Edit, Trash2, CreditCard, ExternalLink } from 'lucide-react';
import { Organization } from '../../types/database';
import api from '../../lib/api';

// Interface para o plano de assinatura
interface SubscriptionPlan {
  id: string;
  name_pt: string;
  name_en: string;
  name_es: string;
  description_pt?: string;
  description_en?: string;
  description_es?: string;
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
  stripe_price_id_brl_monthly?: string;
  stripe_price_id_usd_monthly?: string;
  stripe_price_id_brl_yearly?: string;
  stripe_price_id_usd_yearly?: string;
  created_at: string;
}

// Tipos para as assinaturas
interface Subscription {
  id: string;
  organization_id: string;
  plan_id: string;
  status: 'active' | 'canceled' | 'past_due' | 'trialing';
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  created_at: string;
  updated_at: string;
  billing_period: 'monthly' | 'yearly';
  stripe_subscription_id: string | null;
  canceled_at: string | null;
  cancel_at: string | null;
  plan: SubscriptionPlan;
}

// Formulário para adicionar/editar assinatura
interface SubscriptionFormData {
  plan_id: string;
  status: 'active' | 'canceled' | 'past_due' | 'trialing';
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  billing_period: 'monthly' | 'yearly';
  stripe_subscription_id: string;
}

export default function OrganizationSubscriptions() {
  const { organizationId } = useParams<{ organizationId: string }>();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null);
  const [processing, setProcessing] = useState(false);
  const [managingSubscription, setManagingSubscription] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Estado inicial do formulário
  const initialFormState: SubscriptionFormData = {
    plan_id: '',
    status: 'active',
    current_period_start: new Date().toISOString(),
    current_period_end: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString(),
    cancel_at_period_end: false,
    billing_period: 'monthly',
    stripe_subscription_id: '',
  };
  
  const [formData, setFormData] = useState<SubscriptionFormData>(initialFormState);

  useEffect(() => {
    if (organizationId) {
      loadOrganization();
      loadSubscriptions();
      loadPlans();
    }
  }, [organizationId]);

  async function loadOrganization() {
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', organizationId)
        .single();

      if (error) throw error;
      setOrganization(data);
    } catch (error) {
      console.error('Erro ao carregar organização:', error);
    }
  }

  async function loadSubscriptions() {
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select(`
          *,
          plan:subscription_plans(*)
        `)
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSubscriptions(data || []);
    } catch (error) {
      console.error('Erro ao carregar assinaturas:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadPlans() {
    try {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .order('price_brl', { ascending: true });

      if (error) throw error;
      setPlans(data || []);
    } catch (error) {
      console.error('Erro ao carregar planos:', error);
    }
  }

  function handleAddSubscription() {
    setModalMode('add');
    setSelectedSubscription(null);
    setFormData(initialFormState);
    setShowModal(true);
    setError('');
    setSuccess('');
  }

  function handleEditSubscription(subscription: Subscription) {
    setModalMode('edit');
    setSelectedSubscription(subscription);
    setFormData({
      plan_id: subscription.plan_id,
      status: subscription.status,
      current_period_start: subscription.current_period_start,
      current_period_end: subscription.current_period_end,
      cancel_at_period_end: subscription.cancel_at_period_end,
      billing_period: subscription.billing_period,
      stripe_subscription_id: subscription.stripe_subscription_id || '',
    });
    setShowModal(true);
    setError('');
    setSuccess('');
  }

  async function handleDeleteSubscription(subscriptionId: string) {
    if (!confirm('Tem certeza que deseja excluir esta assinatura?')) return;

    try {
      setLoading(true);
      const { error } = await supabase
        .from('subscriptions')
        .delete()
        .eq('id', subscriptionId);

      if (error) throw error;
      
      // Recarregar assinaturas após a exclusão
      await loadSubscriptions();
      alert('Assinatura excluída com sucesso!');
    } catch (error) {
      console.error('Erro ao excluir assinatura:', error);
      alert('Erro ao excluir assinatura. Verifique o console para mais detalhes.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setProcessing(true);
    setError('');
    setSuccess('');

    try {
      if (modalMode === 'add') {
        // Adicionar nova assinatura
        const { error } = await supabase
          .from('subscriptions')
          .insert({
            organization_id: organizationId,
            ...formData,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });

        if (error) throw error;
        setSuccess('Assinatura adicionada com sucesso!');
      } else {
        // Atualizar assinatura existente
        if (!selectedSubscription) return;

        const { error } = await supabase
          .from('subscriptions')
          .update({
            ...formData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', selectedSubscription.id);

        if (error) throw error;
        setSuccess('Assinatura atualizada com sucesso!');
      }

      // Recarregar assinaturas
      await loadSubscriptions();
      
      // Fechar modal após um breve delay
      setTimeout(() => {
        setShowModal(false);
        setSelectedSubscription(null);
        setSuccess('');
      }, 1500);
    } catch (error: unknown) {
      console.error('Erro ao processar assinatura:', error);
      setError(typeof error === 'object' && error !== null && 'message' in error 
        ? (error as { message: string }).message 
        : 'Ocorreu um erro ao processar a assinatura');
    } finally {
      setProcessing(false);
    }
  }

  async function handleManageSubscription(subscriptionId: string, stripeSubscriptionId: string | null) {
    if (!stripeSubscriptionId) {
      alert('Esta assinatura não possui um ID do Stripe associado.');
      return;
    }

    try {
      setManagingSubscription(subscriptionId);
      const response = await api.post(`/api/${organizationId}/stripe/create-portal-session`);
      const { url } = response.data;
      if (url) {
        window.location.href = url;
        setTimeout(() => {
          setManagingSubscription(null);
        }, 1000);
      } else {
        console.error('Erro ao criar sessão do portal:', response.data);
        setManagingSubscription(null);
      }
    } catch (error) {
      console.error('Erro ao criar sessão do portal:', error);
      setManagingSubscription(null);
    }
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString('pt-BR');
  }

  // Função para formatar preço
  function formatPrice(price: number | null | undefined) {
    if (price === null || price === undefined) return 'N/A';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price);
  }

  // Função para obter o preço do plano de acordo com o período de cobrança
  function getPlanPrice(plan: SubscriptionPlan, billingPeriod: 'monthly' | 'yearly') {
    if (billingPeriod === 'monthly') {
      return plan.price_brl;
    } else {
      return plan.price_brl_yearly;
    }
  }

  // Função para calcular estatísticas das assinaturas
  function getSubscriptionStats() {
    const activeCount = subscriptions.filter(sub => sub.status === 'active').length;
    const trialCount = subscriptions.filter(sub => sub.status === 'trialing').length;
    const canceledCount = subscriptions.filter(sub => sub.status === 'canceled').length;
    const pendingCount = subscriptions.filter(sub => sub.status === 'past_due').length;
    const scheduledForCancellation = subscriptions.filter(sub => sub.cancel_at_period_end).length;
    
    return { activeCount, trialCount, canceledCount, pendingCount, scheduledForCancellation };
  }

  // Função para atualizar a data de fim do período com base no período de cobrança
  function updatePeriodEndDate(startDate: string, billingPeriod: 'monthly' | 'yearly') {
    const start = new Date(startDate);
    const end = new Date(start);
    
    if (billingPeriod === 'monthly') {
      end.setMonth(start.getMonth() + 1);
    } else {
      end.setFullYear(start.getFullYear() + 1);
    }
    
    return end.toISOString();
  }

  // Função para lidar com a mudança do período de cobrança
  function handleBillingPeriodChange(value: string) {
    const billingPeriod = value as 'monthly' | 'yearly';
    const newEndDate = updatePeriodEndDate(formData.current_period_start, billingPeriod);
    
    setFormData({
      ...formData,
      billing_period: billingPeriod,
      current_period_end: newEndDate
    });
  }

  // Função para lidar com a mudança da data de início
  function handleStartDateChange(value: string) {
    const newStartDate = new Date(value).toISOString();
    const newEndDate = updatePeriodEndDate(newStartDate, formData.billing_period);
    
    setFormData({
      ...formData,
      current_period_start: newStartDate,
      current_period_end: newEndDate
    });
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center mb-6">
          <Link to="/app/admin/organizations" className="mr-4">
            <ArrowLeft className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Carregando...</h1>
        </div>
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <div className="animate-pulse flex space-x-4">
            <div className="flex-1 space-y-4 py-1">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center mb-6">
        <Link to="/app/admin/organizations" className="mr-4">
          <ArrowLeft className="h-5 w-5 text-gray-500 dark:text-gray-400" />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Assinaturas: {organization?.name}
        </h1>
      </div>

      <div className="mb-6 flex justify-between items-center">
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Gerencie as assinaturas desta organização
        </div>
        <button
          onClick={handleAddSubscription}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nova Assinatura
        </button>
      </div>

      {/* Resumo das assinaturas */}
      {subscriptions.length > 0 && (
        <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {(() => {
            const stats = getSubscriptionStats();
            return (
              <>
                <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4 flex flex-col">
                  <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Ativas</div>
                  <div className="mt-1 text-2xl font-semibold text-green-600 dark:text-green-400">{stats.activeCount}</div>
                </div>
                <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4 flex flex-col">
                  <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Trial</div>
                  <div className="mt-1 text-2xl font-semibold text-blue-600 dark:text-blue-400">{stats.trialCount}</div>
                </div>
                <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4 flex flex-col">
                  <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Canceladas</div>
                  <div className="mt-1 text-2xl font-semibold text-red-600 dark:text-red-400">{stats.canceledCount}</div>
                </div>
                <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4 flex flex-col">
                  <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Pendentes</div>
                  <div className="mt-1 text-2xl font-semibold text-yellow-600 dark:text-yellow-400">{stats.pendingCount}</div>
                </div>
                <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4 flex flex-col">
                  <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Agendadas para cancelamento</div>
                  <div className="mt-1 text-2xl font-semibold text-orange-600 dark:text-orange-400">{stats.scheduledForCancellation}</div>
                </div>
              </>
            );
          })()}
        </div>
      )}

      {/* Mensagem informativa sobre o Stripe */}
      <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
        <div className="flex">
          <div className="flex-shrink-0">
            <ExternalLink className="h-5 w-5 text-blue-400" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800 dark:text-blue-300">
              Gerenciamento de assinaturas no Stripe
            </h3>
            <div className="mt-2 text-sm text-blue-700 dark:text-blue-400">
              <p>
                Assinaturas com um ID do Stripe podem ser gerenciadas diretamente no portal do Stripe. 
                Clique no ícone <ExternalLink className="h-3 w-3 inline" /> para acessar o portal de gerenciamento.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
        {subscriptions.length === 0 ? (
          <div className="p-6 text-center text-gray-500 dark:text-gray-400">
            Nenhuma assinatura encontrada para esta organização
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Plano
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Período
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Cobrança
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    ID Stripe
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Criado em
                  </th>
                  <th className="relative px-6 py-3">
                    <span className="sr-only">Ações</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {subscriptions.map((subscription) => (
                  <tr key={subscription.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <CreditCard className="h-4 w-4 text-gray-500 dark:text-gray-400 mr-2" />
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {subscription.plan?.name_pt || 'Plano desconhecido'}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {subscription.plan && formatPrice(getPlanPrice(subscription.plan, subscription.billing_period))}
                            {subscription.billing_period === 'yearly' ? '/ano' : '/mês'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        subscription.status === 'active'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-400'
                          : subscription.status === 'trialing'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-400'
                          : subscription.status === 'canceled'
                          ? 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-400'
                          : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-400'
                      }`}>
                        {subscription.status === 'active' ? 'Ativo' : 
                         subscription.status === 'trialing' ? 'Trial' :
                         subscription.status === 'canceled' ? 'Cancelado' : 'Pendente'}
                      </span>
                      {subscription.cancel_at_period_end && (
                        <div className="mt-1">
                          <span className="text-xs text-red-500 dark:text-red-400">
                            Cancelamento agendado
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      <div>
                        <div>Início: {formatDate(subscription.current_period_start)}</div>
                        <div>Fim: {formatDate(subscription.current_period_end)}</div>
                        {subscription.canceled_at && (
                          <div className="mt-1 text-xs text-red-500 dark:text-red-400">
                            Cancelado em: {formatDate(subscription.canceled_at)}
                          </div>
                        )}
                        {subscription.cancel_at && (
                          <div className="mt-1 text-xs text-red-500 dark:text-red-400">
                            Cancelamento em: {formatDate(subscription.cancel_at)}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {subscription.billing_period === 'monthly' ? 'Mensal' : 'Anual'}
                      {subscription.cancel_at_period_end && (
                        <span className="ml-2 text-red-500 dark:text-red-400">(Cancelar ao final)</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {subscription.stripe_subscription_id ? (
                        <span className="font-mono text-xs">{subscription.stripe_subscription_id}</span>
                      ) : (
                        <span className="text-gray-400 dark:text-gray-500">Não disponível</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {formatDate(subscription.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-3">
                        <button
                          onClick={() => handleEditSubscription(subscription)}
                          className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                          title="Editar assinatura"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        {subscription.stripe_subscription_id && (
                          <button
                            onClick={() => handleManageSubscription(subscription.id, subscription.stripe_subscription_id)}
                            className="text-purple-600 hover:text-purple-900 dark:text-purple-400 dark:hover:text-purple-300"
                            title="Gerenciar no Stripe"
                            disabled={managingSubscription === subscription.id}
                          >
                            {managingSubscription === subscription.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <ExternalLink className="h-4 w-4" />
                            )}
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteSubscription(subscription.id)}
                          className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                          title="Excluir assinatura"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal para adicionar/editar assinatura */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
            <div className="flex justify-between items-center p-6 border-b dark:border-gray-700">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                {modalMode === 'add' ? 'Nova Assinatura' : 'Editar Assinatura'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6">
              {error && (
                <div className="mb-4 bg-red-50 dark:bg-red-900/50 text-red-700 dark:text-red-400 p-3 rounded-md">
                  {error}
                </div>
              )}

              {success && (
                <div className="mb-4 bg-green-50 dark:bg-green-900/50 text-green-700 dark:text-green-400 p-3 rounded-md">
                  {success}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label htmlFor="plan_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Plano
                  </label>
                  <select
                    id="plan_id"
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 py-2 px-3"
                    value={formData.plan_id}
                    onChange={(e) => setFormData({ ...formData, plan_id: e.target.value })}
                  >
                    <option value="">Selecione um plano</option>
                    {plans.map((plan) => {
                      const price = formData.billing_period === 'monthly' 
                        ? formatPrice(plan.price_brl) 
                        : formatPrice(plan.price_brl_yearly);
                      
                      return (
                        <option key={plan.id} value={plan.id}>
                          {plan.name_pt} - {price} ({formData.billing_period === 'monthly' ? 'mensal' : 'anual'})
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <label htmlFor="status" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Status
                  </label>
                  <select
                    id="status"
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 py-2 px-3"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'canceled' | 'past_due' | 'trialing' })}
                  >
                    <option value="active">Ativo</option>
                    <option value="trialing">Trial</option>
                    <option value="canceled">Cancelado</option>
                    <option value="past_due">Pendente</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="billing_period" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Período de Cobrança
                  </label>
                  <select
                    id="billing_period"
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 py-2 px-3"
                    value={formData.billing_period}
                    onChange={(e) => handleBillingPeriodChange(e.target.value)}
                  >
                    <option value="monthly">Mensal</option>
                    <option value="yearly">Anual</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="current_period_start" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Início do Período Atual
                  </label>
                  <input
                    type="date"
                    id="current_period_start"
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 py-2 px-3"
                    value={formData.current_period_start.split('T')[0]}
                    onChange={(e) => handleStartDateChange(e.target.value)}
                  />
                </div>

                <div>
                  <label htmlFor="current_period_end" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Fim do Período Atual
                  </label>
                  <input
                    type="date"
                    id="current_period_end"
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 py-2 px-3"
                    value={formData.current_period_end.split('T')[0]}
                    onChange={(e) => setFormData({ ...formData, current_period_end: new Date(e.target.value).toISOString() })}
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="cancel_at_period_end"
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    checked={formData.cancel_at_period_end}
                    onChange={(e) => setFormData({ ...formData, cancel_at_period_end: e.target.checked })}
                  />
                  <label htmlFor="cancel_at_period_end" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                    Cancelar ao final do período
                  </label>
                </div>

                <div>
                  <label htmlFor="stripe_subscription_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    ID da Assinatura no Stripe (opcional)
                  </label>
                  <input
                    type="text"
                    id="stripe_subscription_id"
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 py-2 px-3"
                    value={formData.stripe_subscription_id}
                    onChange={(e) => setFormData({ ...formData, stripe_subscription_id: e.target.value })}
                    placeholder="sub_123456789"
                  />
                </div>

                {/* Informações do plano selecionado */}
                {formData.plan_id && (
                  <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-md">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Detalhes do plano
                    </h4>
                    {(() => {
                      const selectedPlan = plans.find(p => p.id === formData.plan_id);
                      if (!selectedPlan) return null;
                      
                      return (
                        <div className="space-y-2 text-xs text-gray-600 dark:text-gray-400">
                          <div className="flex justify-between">
                            <span>Usuários:</span>
                            <span className="font-medium">{selectedPlan.max_users}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Clientes:</span>
                            <span className="font-medium">{selectedPlan.max_customers}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Canais:</span>
                            <span className="font-medium">{selectedPlan.max_channels}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Fluxos:</span>
                            <span className="font-medium">{selectedPlan.max_flows}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Times:</span>
                            <span className="font-medium">{selectedPlan.max_teams}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Armazenamento:</span>
                            <span className="font-medium">{(selectedPlan.storage_limit / (1024 * 1024)).toFixed(0)} MB</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Preço mensal:</span>
                            <span className="font-medium">{formatPrice(selectedPlan.price_brl)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Preço anual:</span>
                            <span className="font-medium">{formatPrice(selectedPlan.price_brl_yearly)}</span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={processing}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {processing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {modalMode === 'add' ? 'Adicionar' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
} 