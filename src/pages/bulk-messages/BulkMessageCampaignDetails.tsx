import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, Users, MessageSquare, CheckCircle, XCircle, AlertCircle, RefreshCw, Pause, Play, ExternalLink, Edit } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuthContext } from '../../contexts/AuthContext';
import { useToast } from '../../hooks/useToast';
import { useBulkMessageCampaign, useBulkMessageQueue, useRefreshBulkMessageQueue } from '../../hooks/useBulkMessages';
import { supabase } from '../../lib/supabase';
import { useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import BulkMessageCampaignForm from '../../components/bulk-messages/BulkMessageCampaignForm';

const BulkMessageCampaignDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation('bulkMessages');
  const { currentOrganizationMember } = useAuthContext();
  const { show: showToast } = useToast();
  const queryClient = useQueryClient();
  
  const [filter, setFilter] = useState<'all' | 'pending' | 'processing' | 'sent' | 'failed'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [startingCampaign, setStartingCampaign] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const itemsPerPage = 50;

  // Usar os hooks para carregar dados
  const { data: campaign, isLoading: campaignLoading, error: campaignError } = useBulkMessageCampaign(
    id!, 
    currentOrganizationMember?.organization_id
  );
  
  const { data: queueItems = [], isLoading: queueLoading, refetch: refetchQueue } = useBulkMessageQueue(
    id!, 
    currentOrganizationMember?.organization_id, 
    filter
  );
  
  const refreshMutation = useRefreshBulkMessageQueue();
  
  // Estado local para controle de subscription
  const [isSubscriptionActive, setIsSubscriptionActive] = useState(false);

  const loading = campaignLoading || queueLoading;
  const refreshing = refreshMutation.isPending;

  // Mostrar toast de erro se houver
  React.useEffect(() => {
    if (campaignError) {
      showToast({ description: t('messages.loadError'), variant: 'destructive' });
    }
  }, [campaignError, showToast, t]);

  // Subscription para escutar mudanças em tempo real na fila de mensagens E na campanha
  useEffect(() => {
    if (!id || !currentOrganizationMember?.organization_id) return;

    console.log('Configurando subscriptions para campanha:', id);

    const subscription = supabase
      .channel(`bulk_message_campaign_${id}`)
      // Subscription para mudanças na campanha (status, estatísticas)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'bulk_message_campaigns',
          filter: `id=eq.${id}`,
        },
        (payload) => {
          console.log('Mudança detectada na campanha:', payload);
          
          // Atualizar dados da campanha no cache
          const campaignQueryKey = ['bulk-message-campaign', id];
          queryClient.setQueryData(campaignQueryKey, (oldData: unknown) => {
            if (!oldData) return oldData;
            
            return {
              ...(oldData as Record<string, unknown>),
              status: payload.new.status,
              total_recipients: payload.new.total_recipients,
              messages_sent: payload.new.messages_sent,
              messages_failed: payload.new.messages_failed,
              started_at: payload.new.started_at,
              completed_at: payload.new.completed_at,
              updated_at: payload.new.updated_at
            };
          });
        }
      )
      // Subscription para mudanças na fila de mensagens
      .on(
        'postgres_changes',
        {
          event: '*', // Escutar todos os eventos (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'bulk_message_queue',
          filter: `campaign_id=eq.${id}`,
        },
        (payload) => {
          console.log('Mudança detectada na fila:', payload);
          
          // Atualizar apenas o cache local ao invés de refazer toda a query
          const queryKey = ['bulk-message-queue', id, filter];
          
          if (payload.eventType === 'UPDATE') {
            // Atualizar item existente no cache
            queryClient.setQueryData(queryKey, (oldData: Record<string, unknown>[]) => {
              if (!oldData) return oldData;
              
              return oldData.map((item: Record<string, unknown>) => 
                item.id === payload.new.id 
                  ? { 
                      ...item, 
                      status: payload.new.status,
                      sent_at: payload.new.sent_at,
                      error_message: payload.new.error_message,
                      updated_at: payload.new.updated_at
                    }
                  : item
              );
            });
          } else if (payload.eventType === 'INSERT') {
            // Fazer refetch apenas para novos itens (estrutura de join complexa)
            refetchQueue();
          } else if (payload.eventType === 'DELETE') {
            // Remover item do cache
            queryClient.setQueryData(queryKey, (oldData: Record<string, unknown>[]) => {
              if (!oldData) return oldData;
              return oldData.filter((item: Record<string, unknown>) => item.id !== payload.old.id);
            });
          }
        }
      )
      .subscribe((status) => {
        console.log('Status da subscription:', status);
        if (status === 'SUBSCRIBED') {
          console.log('Subscription ativa para mudanças na fila de mensagens');
          setIsSubscriptionActive(true);
        } else if (status === 'CLOSED') {
          setIsSubscriptionActive(false);
        }
      });

    // Cleanup subscription
    return () => {
      console.log('Removendo subscription da fila de mensagens');
      setIsSubscriptionActive(false);
      subscription.unsubscribe();
    };
  }, [id, currentOrganizationMember?.organization_id, refetchQueue]);

  const handleRefresh = async () => {
    if (!id || !currentOrganizationMember?.organization_id) return;
    
    try {
      // O refreshMutation já invalida as queries automaticamente
      // Não precisamos fazer refetchQueue() depois
      await refreshMutation.mutateAsync({
        campaignId: id
      });
    } catch (error) {
      console.error('Erro ao atualizar dados:', error);
      showToast({ description: t('messages.refreshError'), variant: 'destructive' });
    }
  };

  const handleStartCampaign = async () => {
    if (!id || !currentOrganizationMember?.organization_id) return;

    setStartingCampaign(true);
    try {
      // Chamada para a API do backend para iniciar a campanha
      const response = await api.post(`/api/${currentOrganizationMember.organization_id}/bulk-messages/${id}/start`);

      if (!response.data.success) {
        throw new Error(response.data.error || 'Falha ao iniciar campanha');
      }

      showToast({ description: t('messages.startSuccess'), variant: 'success' });
    } catch (error: unknown) {
      const apiError = error as { response?: { data?: { error?: string } }; message?: string };
      console.error('Erro ao iniciar campanha:', error);
      showToast({ 
        description: apiError.response?.data?.error || apiError.message || t('messages.startError'), 
        variant: 'destructive' 
      });
    } finally {
      setStartingCampaign(false);
    }
  };

  const handlePauseCampaign = async () => {
    if (!id || !currentOrganizationMember?.organization_id) return;

    try {
      // Chamada para a API do backend para pausar a campanha
      const response = await api.post(`/api/${currentOrganizationMember.organization_id}/bulk-messages/${id}/pause`);

      if (!response.data.message) {
        throw new Error(response.data.error || 'Falha ao pausar campanha');
      }

      showToast({ description: t('messages.pauseSuccess'), variant: 'success' });
    } catch (error: unknown) {
      const apiError = error as { response?: { data?: { error?: string } }; message?: string };
      console.error('Erro ao pausar campanha:', error);
      showToast({ 
        description: apiError.response?.data?.error || apiError.message || t('messages.pauseError'), 
        variant: 'destructive' 
      });
    }
  };

  const handleResumeCampaign = async () => {
    if (!id || !currentOrganizationMember?.organization_id) return;

    try {
      // Chamada para a API do backend para retomar a campanha
      const response = await api.post(`/api/${currentOrganizationMember.organization_id}/bulk-messages/${id}/resume`);

      if (!response.data.message) {
        throw new Error(response.data.error || 'Falha ao retomar campanha');
      }

      showToast({ description: t('messages.resumeSuccess'), variant: 'success' });
    } catch (error: unknown) {
      const apiError = error as { response?: { data?: { error?: string } }; message?: string };
      console.error('Erro ao retomar campanha:', error);
      showToast({ 
        description: apiError.response?.data?.error || apiError.message || t('messages.resumeError'), 
        variant: 'destructive' 
      });
    }
  };

  const handleEditSuccess = () => {
    setShowEditForm(false);
    // As queries serão atualizadas automaticamente via subscription
    showToast({ description: t('messages.updateSuccess'), variant: 'success' });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock size={16} className="text-yellow-500" />;
      case 'processing': return <RefreshCw size={16} className="text-blue-500 animate-spin" />;
      case 'sent': return <CheckCircle size={16} className="text-green-500" />;
      case 'failed': return <XCircle size={16} className="text-red-500" />;
      default: return <AlertCircle size={16} className="text-gray-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return t('status.pending');
      case 'processing': return t('status.processing');
      case 'sent': return t('status.sent');
      case 'failed': return t('status.failed');
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'processing': return 'bg-blue-100 text-blue-800';
      case 'sent': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCampaignStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'processing': return 'bg-yellow-100 text-yellow-800';
      case 'paused': return 'bg-orange-100 text-orange-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCampaignStatusText = (status: string) => {
    switch (status) {
      case 'draft': return t('status.draft');
      case 'scheduled': return t('status.scheduled');
      case 'processing': return t('status.processing');
      case 'paused': return t('status.paused');
      case 'completed': return t('status.completed');
      case 'cancelled': return t('status.cancelled');
      case 'failed': return t('status.failed');
      default: return status;
    }
  };

  const getChannelTypeText = (type: string) => {
    switch (type) {
      case 'whatsapp_official': return t('channelTypes.whatsapp_official');
      case 'whatsapp_wapi': return t('channelTypes.whatsapp_wapi');
      case 'whatsapp_zapi': return t('channelTypes.whatsapp_zapi');
      case 'whatsapp_evo': return t('channelTypes.whatsapp_evo');
      case 'instagram': return t('channelTypes.instagram');
      case 'facebook': return t('channelTypes.facebook');
      case 'email': return t('channelTypes.email');
      case 'telegram': return t('channelTypes.telegram');
      default: return type;
    }
  };



  // Calcular estatísticas
  const stats = {
    total: queueItems.length,
    pending: queueItems.filter(item => item.status === 'pending').length,
    processing: queueItems.filter(item => item.status === 'processing').length,
    sent: queueItems.filter(item => item.status === 'sent').length,
    failed: queueItems.filter(item => item.status === 'failed').length,
  };

  // Filtrar itens para paginação
  const filteredItems = filter === 'all' ? queueItems : queueItems.filter(item => item.status === filter);
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedItems = filteredItems.slice(startIndex, startIndex + itemsPerPage);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">{t('campaign.notFound')}</h1>
          <button
            onClick={() => navigate('/app/bulk-messages')}
            className="text-blue-600 hover:text-blue-700"
          >
            {t('navigation.backToCampaigns')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Cabeçalho */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={() => navigate('/app/bulk-messages')}
            className="text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{campaign.name}</h1>
            <p className="text-gray-600 dark:text-gray-300 mt-1">
              {campaign.description || t('campaign.details')}
            </p>
          </div>
        </div>

        {/* Status da campanha */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getCampaignStatusColor(campaign.status)}`}>
              {getCampaignStatusText(campaign.status)}
            </span>
            {campaign.scheduled_at && (
              <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
                <Clock size={14} />
                {t('scheduling.scheduledFor')} {new Date(campaign.scheduled_at).toLocaleString()}
              </div>
            )}
          </div>
          
          {/* Botões de controle da campanha */}
          {(campaign.status === 'draft' || campaign.status === 'scheduled') && (
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowEditForm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Edit size={16} />
                {t('actions.editCampaign')}
              </button>
              <button
                onClick={handleStartCampaign}
                disabled={startingCampaign}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {startingCampaign ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                ) : (
                  <Play size={16} />
                )}
                {startingCampaign ? t('actions.starting') : t('actions.startCampaign')}
              </button>
            </div>
          )}
          
          {campaign.status === 'processing' && (
            <button
              onClick={handlePauseCampaign}
              className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
            >
              <Pause size={16} />
              {t('actions.pauseCampaign')}
            </button>
          )}
          
          {campaign.status === 'paused' && (
            <button
              onClick={handleResumeCampaign}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Play size={16} />
              {t('actions.resumeCampaign')}
            </button>
          )}
        </div>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <div className="flex items-center gap-2 mb-2">
            <Users size={16} className="text-gray-500" />
            <span className="text-sm text-gray-600 dark:text-gray-400">{t('stats.total')}</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <div className="flex items-center gap-2 mb-2">
            <Clock size={16} className="text-yellow-500" />
            <span className="text-sm text-gray-600 dark:text-gray-400">{t('stats.pending')}</span>
          </div>
          <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <div className="flex items-center gap-2 mb-2">
            <RefreshCw size={16} className="text-blue-500" />
            <span className="text-sm text-gray-600 dark:text-gray-400">{t('stats.processing')}</span>
          </div>
          <p className="text-2xl font-bold text-blue-600">{stats.processing}</p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle size={16} className="text-green-500" />
            <span className="text-sm text-gray-600 dark:text-gray-400">{t('stats.sent')}</span>
          </div>
          <p className="text-2xl font-bold text-green-600">{stats.sent}</p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <div className="flex items-center gap-2 mb-2">
            <XCircle size={16} className="text-red-500" />
            <span className="text-sm text-gray-600 dark:text-gray-400">{t('stats.failed')}</span>
          </div>
          <p className="text-2xl font-bold text-red-600">{stats.failed}</p>
        </div>
      </div>

      {/* Filtros e ações */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-6">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">{t('queue.title')}</h2>
            <div className="flex items-center gap-4">
              {isSubscriptionActive && (
                <div className="flex items-center gap-2 text-green-600 text-sm">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  {t('queue.realtimeUpdates')}
                </div>
              )}
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center gap-2 px-3 py-2 text-blue-600 hover:text-blue-700 disabled:opacity-50"
              >
                <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
                {t('actions.refresh')}
              </button>
            </div>
          </div>
          
          {/* Filtros */}
          <div className="flex gap-2 mt-4">
                          {[
                { key: 'all', label: t('filters.all'), count: stats.total },
                { key: 'pending', label: t('filters.pending'), count: stats.pending },
                { key: 'processing', label: t('filters.processing'), count: stats.processing },
                { key: 'sent', label: t('filters.sent'), count: stats.sent },
                { key: 'failed', label: t('filters.failed'), count: stats.failed },
              ].map((filterOption) => (
                <button
                  key={filterOption.key}
                  onClick={() => {
                    setFilter(filterOption.key as 'all' | 'pending' | 'processing' | 'sent' | 'failed');
                    setCurrentPage(1);
                  }}
                className={`px-3 py-1 text-sm rounded-full transition-colors ${
                  filter === filterOption.key
                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                {filterOption.label} ({filterOption.count})
              </button>
            ))}
          </div>
        </div>

        {/* Lista de mensagens */}
        {filteredItems.length === 0 ? (
          <div className="p-8 text-center">
            <MessageSquare size={48} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500 dark:text-gray-400">
              {filter === 'all' ? t('queue.noMessages') : t('queue.noMessagesWithFilter', { status: getStatusText(filter).toLowerCase() })}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      {t('queue.customer')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      {t('queue.channel')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      {t('queue.status')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      {t('queue.batch')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      {t('scheduling.scheduledAt')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      {t('scheduling.sentAt')}
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      {t('queue.action')}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {paginatedItems.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {item.customer?.name || t('queue.customerNotFound')}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {(() => {
                              const customer = item.customer;
                              if (!customer?.contacts) return t('queue.contactNotAvailable');
                              
                              // Buscar telefone primeiro
                              const phoneContact = customer.contacts.find((c) => 
                                c.type === 'whatsapp' || c.type === 'phone'
                              );
                              if (phoneContact) return phoneContact.value;
                              
                              // Se não houver telefone, buscar email
                              const emailContact = customer.contacts.find((c) => c.type === 'email');
                              if (emailContact) return emailContact.value;
                              
                              // Se não houver nenhum, mostrar o primeiro contato disponível
                              return customer.contacts[0]?.value || t('queue.contactNotAvailable');
                            })()}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-white">
                          {item.channel?.name || t('queue.channelNotFound')}
                        </div>
                        {item.channel?.type && (
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {getChannelTypeText(item.channel.type)}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(item.status)}
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(item.status)}`}>
                            {getStatusText(item.status)}
                          </span>
                        </div>
                        {item.error_message && (
                          <div className="text-xs text-red-500 mt-1" title={item.error_message}>
                            {item.error_message.length > 50 
                              ? `${item.error_message.substring(0, 50)}...` 
                              : item.error_message
                            }
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {t('queue.batchInfo', { number: item.batch_number, position: item.position_in_batch })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {new Date(item.scheduled_at).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {item.sent_at ? new Date(item.sent_at).toLocaleString() : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        {item.message?.id && item.message?.chat_id && (
                          <button
                            onClick={() => navigate(`/app/chats/${item.message?.chat_id}?messageId=${item.message?.id}`)}
                            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                            title={t('queue.viewInChat')}
                          >
                            <ExternalLink size={16} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Paginação */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-700 dark:text-gray-300">
                    {t('pagination.showing', { 
                      start: startIndex + 1, 
                      end: Math.min(startIndex + itemsPerPage, filteredItems.length), 
                      total: filteredItems.length 
                    })}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:border-gray-600 dark:hover:bg-gray-700"
                    >
                      {t('pagination.previous')}
                    </button>
                    <span className="px-3 py-1 text-sm text-gray-700 dark:text-gray-300">
                      {t('pagination.page', { current: currentPage, total: totalPages })}
                    </span>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:border-gray-600 dark:hover:bg-gray-700"
                    >
                      {t('pagination.next')}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Formulário de edição */}
      <BulkMessageCampaignForm
        isOpen={showEditForm}
        onClose={() => setShowEditForm(false)}
        onSuccess={handleEditSuccess}
        editingCampaign={campaign}
        title={t('campaign.editTitle')}
      />
    </div>
  );
};

export default BulkMessageCampaignDetails; 