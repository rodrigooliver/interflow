import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Clock, MessageSquare, Trash2, Edit, Play, Pause, X, Eye } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuthContext } from '../../contexts/AuthContext';
import { useToast } from '../../hooks/useToast';
import { supabase } from '../../lib/supabase';
import api from '../../lib/api';
import { BulkMessageCampaign } from '../../types/database';
import BulkMessageCampaignForm from '../../components/bulk-messages/BulkMessageCampaignForm';



const BulkMessages: React.FC = () => {
  const { currentOrganizationMember } = useAuthContext();
  const { show: showToast } = useToast();
  const navigate = useNavigate();
  const { t } = useTranslation('bulkMessages');
  
  const [campaigns, setCampaigns] = useState<BulkMessageCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<BulkMessageCampaign | null>(null);
  const [startingCampaign, setStartingCampaign] = useState<string | null>(null);
  const [pausingCampaign, setPausingCampaign] = useState<string | null>(null);
  const [resumingCampaign, setResumingCampaign] = useState<string | null>(null);
  const [deletingCampaign, setDeletingCampaign] = useState<string | null>(null);
  const [campaignToDelete, setCampaignToDelete] = useState<BulkMessageCampaign | null>(null);

  // Carregar dados iniciais
  useEffect(() => {
    if (currentOrganizationMember?.organization_id) {
      loadCampaigns();
    }
  }, [currentOrganizationMember?.organization_id]);



  // Subscription para escutar mudanças em tempo real nas campanhas
  useEffect(() => {
    if (!currentOrganizationMember?.organization_id) return;

    console.log('Configurando subscription para campanhas da organização:', currentOrganizationMember.organization_id);

    const subscription = supabase
      .channel(`bulk_message_campaigns_${currentOrganizationMember.organization_id}`)
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'bulk_message_campaigns',
          filter: `organization_id=eq.${currentOrganizationMember.organization_id}`,
        },
        (payload) => {
          console.log('Mudança detectada nas campanhas:', payload);
          
          if (payload.eventType === 'UPDATE') {
            // Atualizar campanha específica no cache
            setCampaigns(prevCampaigns => 
              prevCampaigns.map(campaign =>
                campaign.id === payload.new.id
                  ? {
                      ...campaign,
                      status: payload.new.status,
                      total_recipients: payload.new.total_recipients,
                      messages_sent: payload.new.messages_sent,
                      messages_failed: payload.new.messages_failed,
                      started_at: payload.new.started_at,
                      completed_at: payload.new.completed_at,
                      updated_at: payload.new.updated_at
                    }
                  : campaign
              )
            );
          } else if (payload.eventType === 'INSERT') {
            // Recarregar lista para novos itens (estrutura de join complexa)
            loadCampaigns();
          } else if (payload.eventType === 'DELETE') {
            // Remover campanha do cache
            setCampaigns(prevCampaigns => 
              prevCampaigns.filter(campaign => campaign.id !== payload.old.id)
            );
          }
        }
      )
      .subscribe((status) => {
        console.log('Status da subscription de campanhas:', status);
      });

    // Cleanup subscription
    return () => {
      console.log('Removendo subscription de campanhas');
      subscription.unsubscribe();
    };
  }, [currentOrganizationMember?.organization_id]);

  const loadCampaigns = async () => {
    try {
      const { data, error } = await supabase
        .from('bulk_message_campaigns')
        .select(`
          *,
          created_by_profile:profiles!bulk_message_campaigns_created_by_fkey(
            id, full_name, avatar_url
          )
        `)
        .eq('organization_id', currentOrganizationMember?.organization_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCampaigns(data || []);
    } catch (error) {
      console.error('Erro ao carregar campanhas:', error);
      showToast({ description: t('messages.loadCampaignsError'), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleStartCampaign = async (campaignId: string) => {
    setStartingCampaign(campaignId);
    try {
      // Chamada para a API do backend para iniciar a campanha
      const response = await api.post(`/api/${currentOrganizationMember?.organization_id}/bulk-messages/${campaignId}/start`);

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
      // Sempre recarrega a lista, independente de sucesso ou erro
      loadCampaigns();
      setStartingCampaign(null);
    }
  };

  const handleCancelCampaign = async (campaignId: string) => {
    try {
      const response = await api.post(`/api/${currentOrganizationMember?.organization_id}/bulk-messages/${campaignId}/cancel`);

      if (!response.data.message) {
        throw new Error('Falha ao cancelar campanha');
      }
      
      showToast({ description: t('messages.cancelSuccess'), variant: 'success' });
    } catch (error: unknown) {
      const apiError = error as { response?: { data?: { error?: string } }; message?: string };
      console.error('Erro ao cancelar campanha:', error);
      showToast({ 
        description: apiError.response?.data?.error || t('messages.cancelError'), 
        variant: 'destructive' 
      });
    } finally {
      // Sempre recarrega a lista, independente de sucesso ou erro
      loadCampaigns();
    }
  };

  const handlePauseCampaign = async (campaignId: string) => {
    setPausingCampaign(campaignId);
    try {
      const response = await api.post(`/api/${currentOrganizationMember?.organization_id}/bulk-messages/${campaignId}/pause`);

      if (!response.data.message) {
        throw new Error('Falha ao pausar campanha');
      }
      
      showToast({ description: t('messages.pauseSuccess'), variant: 'success' });
    } catch (error: unknown) {
      const apiError = error as { response?: { data?: { error?: string } }; message?: string };
      console.error('Erro ao pausar campanha:', error);
      showToast({ 
        description: apiError.response?.data?.error || t('messages.pauseError'), 
        variant: 'destructive' 
      });
    } finally {
      loadCampaigns();
      setPausingCampaign(null);
    }
  };

  const handleResumeCampaign = async (campaignId: string) => {
    setResumingCampaign(campaignId);
    try {
      const response = await api.post(`/api/${currentOrganizationMember?.organization_id}/bulk-messages/${campaignId}/resume`);

      if (!response.data.message) {
        throw new Error('Falha ao retomar campanha');
      }
      
      showToast({ description: t('messages.resumeSuccess'), variant: 'success' });
    } catch (error: unknown) {
      const apiError = error as { response?: { data?: { error?: string } }; message?: string };
      console.error('Erro ao retomar campanha:', error);
      showToast({ 
        description: apiError.response?.data?.error || t('messages.resumeErrorGeneric'), 
        variant: 'destructive' 
      });
    } finally {
      loadCampaigns();
      setResumingCampaign(null);
    }
  };

  const handleDeleteCampaign = async () => {
    if (!campaignToDelete) return;

    setDeletingCampaign(campaignToDelete.id);
    try {
      const response = await api.delete(`/api/${currentOrganizationMember?.organization_id}/bulk-messages/${campaignToDelete.id}`);

      if (!response.data.message) {
        throw new Error(response.data.message || 'Falha ao deletar campanha');
      }
      
      showToast({ description: t('messages.deleteSuccess'), variant: 'success' });
      setCampaignToDelete(null);
    } catch (error) {
      console.error('Erro ao excluir campanha:', error);
      showToast({ description: t('messages.deleteError'), variant: 'destructive' });
    } finally {
      setDeletingCampaign(null);
      // Sempre recarrega a lista, independente de sucesso ou erro
      loadCampaigns();
    }
  };

  const handleFormSuccess = (campaignId?: string) => {
    setShowForm(false);
    setEditingCampaign(null);
    
    if (campaignId) {
      // Navegar para a página de detalhes da campanha recém-criada
      navigate(`/app/bulk-messages/${campaignId}`);
    } else {
      // Recarregar lista para edições
      loadCampaigns();
    }
  };



  const getStatusColor = (status: string) => {
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

  const getStatusText = (status: string) => {
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

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
            <p className="text-gray-600 dark:text-gray-300 mt-1">
              {t('subtitle')}
            </p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
          >
            <Plus size={16} />
            {t('form.newCampaign')}
          </button>
        </div>
      </div>

      {/* Formulário Modal */}
      <BulkMessageCampaignForm
        isOpen={showForm}
        onClose={() => {
          setShowForm(false);
          setEditingCampaign(null);
        }}
        onSuccess={handleFormSuccess}
        editingCampaign={editingCampaign}
      />

      {/* Lista de Campanhas */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">{t('campaigns.title')}</h2>
        </div>
        
        {campaigns.length === 0 ? (
          <div className="p-8 text-center">
            <MessageSquare size={48} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500 dark:text-gray-400">{t('campaigns.noCampaigns')}</p>
            <button
              onClick={() => setShowForm(true)}
              className="mt-4 text-blue-600 hover:text-blue-700"
            >
              {t('campaigns.createFirst')}
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    {t('campaigns.campaign')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    {t('queue.status')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    {t('campaigns.recipients')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    {t('campaigns.progress')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    {t('scheduling.scheduledAt')}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    {t('queue.action')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {campaigns.map((campaign) => (
                  <tr key={campaign.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {campaign.name}
                        </div>
                        {campaign.description && (
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {campaign.description}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(campaign.status)}`}>
                        {getStatusText(campaign.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {campaign.total_recipients}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {campaign.status === 'processing' || campaign.status === 'completed' ? (
                        <div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {campaign.messages_sent} {t('campaigns.sent')}
                          </div>
                          {campaign.messages_failed > 0 && (
                            <div className="text-xs text-red-500">
                              {campaign.messages_failed} {t('campaigns.failed')}
                            </div>
                          )}
                        </div>
                      ) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {campaign.scheduled_at ? (
                        <div className="flex items-center gap-1">
                          <Clock size={14} />
                          {new Date(campaign.scheduled_at).toLocaleString()}
                        </div>
                      ) : t('form.immediate')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        {/* Botão para visualizar detalhes - sempre visível */}
                        <button
                          onClick={() => navigate(`/app/bulk-messages/${campaign.id}`)}
                          className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
                          title={t('campaigns.viewDetails')}
                        >
                          <Eye size={16} />
                        </button>
                        
                        {(campaign.status === 'draft' || campaign.status === 'scheduled') && (
                          <>
                            <button
                              onClick={() => handleStartCampaign(campaign.id)}
                              disabled={startingCampaign === campaign.id}
                              className="text-green-600 hover:text-green-900 dark:text-green-400 disabled:opacity-50 disabled:cursor-not-allowed"
                              title={t('campaigns.startCampaign')}
                            >
                              {startingCampaign === campaign.id ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-green-600 border-t-transparent" />
                              ) : (
                                <Play size={16} />
                              )}
                            </button>
                            <button
                              onClick={() => {
                                setEditingCampaign(campaign);
                                setShowForm(true);
                              }}
                              className="text-blue-600 hover:text-blue-900 dark:text-blue-400"
                              title={t('campaigns.editCampaign')}
                            >
                              <Edit size={16} />
                            </button>
                          </>
                        )}
                        
                        {campaign.status === 'processing' && (
                          <>
                            <button
                              onClick={() => handlePauseCampaign(campaign.id)}
                              disabled={pausingCampaign === campaign.id}
                              className="text-orange-600 hover:text-orange-900 dark:text-orange-400 disabled:opacity-50 disabled:cursor-not-allowed"
                              title={t('campaigns.pauseCampaign')}
                            >
                              {pausingCampaign === campaign.id ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-orange-600 border-t-transparent" />
                              ) : (
                                <Pause size={16} />
                              )}
                            </button>
                            <button
                              onClick={() => handleCancelCampaign(campaign.id)}
                              className="text-red-600 hover:text-red-900 dark:text-red-400"
                              title={t('campaigns.cancelCampaign')}
                            >
                              <X size={16} />
                            </button>
                          </>
                        )}

                        {campaign.status === 'paused' && (
                          <>
                            <button
                              onClick={() => handleResumeCampaign(campaign.id)}
                              disabled={resumingCampaign === campaign.id}
                              className="text-green-600 hover:text-green-900 dark:text-green-400 disabled:opacity-50 disabled:cursor-not-allowed"
                              title={t('campaigns.resumeCampaign')}
                            >
                              {resumingCampaign === campaign.id ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-green-600 border-t-transparent" />
                              ) : (
                                <Play size={16} />
                              )}
                            </button>
                            <button
                              onClick={() => handleCancelCampaign(campaign.id)}
                              className="text-red-600 hover:text-red-900 dark:text-red-400"
                              title={t('campaigns.cancelCampaign')}
                            >
                              <X size={16} />
                            </button>
                          </>
                        )}
                        
                        {!['processing'].includes(campaign.status) && (
                          <button
                            onClick={() => setCampaignToDelete(campaign)}
                            className="text-red-600 hover:text-red-900 dark:text-red-400"
                            title={t('campaigns.deleteCampaign')}
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Confirmação de Exclusão */}
      {campaignToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              {t('messages.deleteModalTitle')}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {t('messages.deleteModalMessage', { campaignName: campaignToDelete.name })}
            </p>
            <div className="flex justify-end gap-4">
              <button
                onClick={() => setCampaignToDelete(null)}
                disabled={deletingCampaign === campaignToDelete.id}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 disabled:opacity-50"
              >
                {t('messages.deleteModalCancel')}
              </button>
              <button
                onClick={handleDeleteCampaign}
                disabled={deletingCampaign === campaignToDelete.id}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deletingCampaign === campaignToDelete.id ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    {t('messages.deleteModalDeleting')}
                  </>
                ) : (
                  <>
                    <Trash2 size={16} />
                    {t('messages.deleteModalDelete')}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BulkMessages; 