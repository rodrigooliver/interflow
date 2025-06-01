import { useState, useEffect } from 'react';
import { Share2, Plus, AlertTriangle, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams, Link as RouterLink } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { ChatChannel } from '../../types/database';
import { ChannelCard } from '../../components/channels/ChannelCard';
import { useAuthContext } from '../../contexts/AuthContext';
import { useOrganizationMemberByOrgId, useOrganizationById } from '../../hooks/useQueryes';
import api from '../../lib/api';
import { useQueryClient } from '@tanstack/react-query';

export default function Channels() {
  const { t } = useTranslation('channels');
  const navigate = useNavigate();
  const { currentOrganizationMember, profile } = useAuthContext();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const queryOrganizationId = searchParams.get('organizationId');
  const [channels, setChannels] = useState<ChatChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState<ChatChannel | null>(null);
  const [error, setError] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [deletingChannel, setDeletingChannel] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Determinar qual organização usar - query string ou da organização atual
  const targetOrganizationId = queryOrganizationId || currentOrganizationMember?.organization.id;
  
  // Buscar dados da organização específica se vier da URL
  const { data: urlOrganization } = useOrganizationById(queryOrganizationId || undefined);
  
  // Buscar membro da organização específica se vier da URL
  const { data: urlOrganizationMember } = useOrganizationMemberByOrgId(
    queryOrganizationId || undefined, 
    profile?.id
  );

  // Verificar limite de canais - usar dados da URL se disponível, senão usar currentOrganizationMember
  const organizationData = urlOrganization || currentOrganizationMember?.organization;
  const channelUsage = organizationData?.usage?.channels;
  const isChannelLimitReached = channelUsage && channelUsage.used >= channelUsage.limit;

  // Determinar qual membro da organização usar para verificações de permissão
  const effectiveOrganizationMember = urlOrganizationMember || currentOrganizationMember;

  // Verificar se o usuário tem acesso à organização
  const hasAccess = queryOrganizationId 
    ? (profile?.is_superadmin || !!urlOrganizationMember)
    : !!currentOrganizationMember;

  useEffect(() => {
    if (targetOrganizationId && hasAccess) {
      loadChannels();
    }
  }, [targetOrganizationId, hasAccess]);

  // Limpar mensagem de erro após 5 segundos
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  async function loadChannels() {
    if (!targetOrganizationId) return;

    try {
      const { data, error } = await supabase
        .from('chat_channels')
        .select('*')
        .eq('organization_id', targetOrganizationId)
        .order('status', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;
      setChannels(data || []);
    } catch (error) {
      console.error('Error loading channels:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleStatus(channel: ChatChannel) {
    setUpdatingStatus(channel.id);
    try {
      // Don't allow activation if channel hasn't been tested
      if (!channel.is_tested && channel.status === 'inactive') {
        setError(t('errors.testRequired'));
        return;
      }

      const newStatus = channel.status === 'active' ? 'inactive' : 'active';
      const { error } = await supabase
        .from('chat_channels')
        .update({ status: newStatus })
        .eq('id', channel.id);

      if (error) throw error;
      await loadChannels();
    } catch (error) {
      console.error('Error updating channel status:', error);
    } finally {
      setUpdatingStatus(null);
    }
  }

  async function handleDeleteChannel(channelId: string) {
    setDeletingChannel(true);
    setDeleteError(''); // Limpar erro anterior
    try {
      //Chamar backend
      const response = await api.delete(`/api/${targetOrganizationId}/channel/${channelId}`);
      if (!response.data.success) {
        throw new Error(response.data.error);
      }

      //Invalidar cache organization após 5 segundos
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['organization', profile?.id] });
      }, 5000);

      // Atualizar a lista de canais
      await loadChannels();
      setShowDeleteModal(false);
      setSelectedChannel(null);
    } catch (error: unknown) {
      console.error('Error deleting channel:', error);
      // Exibir erro no modal em vez de fechar
      let errorMessage = t('common:error');
      
      // Verificar se é um erro de resposta HTTP com dados específicos
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { error?: string; message?: string } } };
        if (axiosError.response?.data?.error) {
          errorMessage = axiosError.response.data.error;
        } else if (axiosError.response?.data?.message) {
          errorMessage = axiosError.response.data.message;
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      setDeleteError(errorMessage);
    } finally {
      setDeletingChannel(false);
    }
  }

  if (!effectiveOrganizationMember) {
    return (
      <div className="p-6">
        <div className="flex justify-center items-center min-h-[200px]">
          <div className="text-gray-500 dark:text-gray-400">
            {t('common:loading')}
          </div>
        </div>
      </div>
    );
  }

  // Verificar se usuário tem acesso (super_admin ou membro da organização)
  if (queryOrganizationId && !profile?.is_superadmin && !urlOrganizationMember) {
    return (
      <div className="p-6">
        <div className="flex justify-center items-center min-h-[200px]">
          <div className="text-red-500 dark:text-red-400">
            {t('common:accessDenied', 'Acesso negado. Você não tem permissão para visualizar esta organização.')}
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex justify-center items-center min-h-[200px]">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 md:p-6 pb-20 md:pb-unset">
      {/* Indicador para super_admin visualizando outra organização */}
      {queryOrganizationId && profile?.is_superadmin && (
        <div className="mb-4 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 p-4 rounded-md">
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2" />
            <span className="text-sm">
              {t('common:superAdminViewing', 'Você está visualizando como super administrador a organização: ')}
              <strong>{urlOrganizationMember?.organization?.name || queryOrganizationId}</strong>
            </span>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center mb-6">
        <h1 className="text md:text-2xl font-bold text-gray-900 dark:text-white flex items-center">
          <Share2 className="w-6 h-6 mr-2" />
          {t('title')}
          {channelUsage && (
            <span className="ml-3 text-sm font-normal text-gray-500 dark:text-gray-400">
              ({channelUsage.used}/{channelUsage.limit} canais)
            </span>
          )}
        </h1>
        {(effectiveOrganizationMember?.role === 'owner' || effectiveOrganizationMember?.role === 'admin' || profile?.is_superadmin) && (
          <button
            onClick={() => navigate(`/app/channels/new${queryOrganizationId ? `?organizationId=${queryOrganizationId}` : ''}`)}
            disabled={isChannelLimitReached}
            className={`inline-flex items-center p-2 border border-transparent rounded-md shadow-sm text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 ${
              isChannelLimitReached
                ? 'text-gray-400 bg-gray-300 cursor-not-allowed'
                : 'text-white bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
            }`}
          >
            <Plus className="w-4 h-4 mr-2" />
            {t('newChannel')}
          </button>
        )}
      </div>

      {/* Mensagem de limite atingido */}
      {isChannelLimitReached && (
        <div className="mb-6 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 p-4 rounded-md flex items-start justify-between">
          <div className="flex items-start">
            <div className="flex-shrink-0 mt-0.5">
              <AlertTriangle className="h-5 w-5 text-yellow-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium">
                {t('limit.title', 'Limite de canais atingido')}
              </h3>
              <p className="text-sm mt-1">
                {t('limit.message', 'Você atingiu o limite de {{limit}} canais do seu plano atual. Para adicionar mais canais, faça upgrade do seu plano.', { limit: channelUsage?.limit })}
              </p>
            </div>
          </div>
          <div className="ml-4">
            <RouterLink
              to="/app/settings/billing"
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-yellow-700 bg-yellow-100 hover:bg-yellow-200 dark:text-yellow-300 dark:bg-yellow-900/30 dark:hover:bg-yellow-900/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
            >
              {t('limit.upgrade', 'Trocar Plano')}
            </RouterLink>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md text-red-600 dark:text-red-400">
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {channels.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {channels.map((channel) => (
            <ChannelCard
              key={channel.id}
              channel={channel}
              canManage={!!(effectiveOrganizationMember?.role === 'owner' || effectiveOrganizationMember?.role === 'admin' || profile?.is_superadmin)}
              onToggleStatus={() => handleToggleStatus(channel)}
              onEdit={() => navigate(`/app/channels/${channel.id}/edit/${channel.type}${queryOrganizationId ? `?organizationId=${queryOrganizationId}` : ''}`)}
              onDelete={() => {
                setSelectedChannel(channel);
                setShowDeleteModal(true);
              }}
              updatingStatus={updatingStatus === channel.id}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
          <div className="flex flex-col items-center justify-center space-y-4">
            <Share2 className="w-16 h-16 text-gray-300 dark:text-gray-600" />
            <h3 className="text-xl font-medium text-gray-900 dark:text-white">
              {t('noChannelsYet')}
            </h3>
            <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
              {t('noChannelsDescription')}
            </p>
            {(effectiveOrganizationMember?.role === 'owner' || effectiveOrganizationMember?.role === 'admin' || profile?.is_superadmin) && (
              <button
                onClick={() => navigate(`/app/channels/new${queryOrganizationId ? `?organizationId=${queryOrganizationId}` : ''}`)}
                disabled={isChannelLimitReached}
                className={`mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                  isChannelLimitReached
                    ? 'text-gray-400 bg-gray-300 cursor-not-allowed'
                    : 'text-white bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
                }`}
              >
                <Plus className="w-4 h-4 mr-2" />
                {t('createFirstChannel')}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedChannel && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 dark:bg-red-900/50 rounded-full mb-4">
                <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white text-center mb-2">
                {t('delete.title')}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-6">
                {t('delete.confirmation', { name: selectedChannel.name })}
                <br />
                {t('delete.warning')}
              </p>
              
              {/* Exibir erro de exclusão no modal */}
              {deleteError && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md text-red-600 dark:text-red-400 text-sm">
                  <div className="flex items-center">
                    <AlertTriangle className="h-4 w-4 mr-2 flex-shrink-0" />
                    <span>{deleteError}</span>
                  </div>
                </div>
              )}
              
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteModal(false);
                    setSelectedChannel(null);
                    setDeleteError(''); // Limpar erro ao fechar
                  }}
                  disabled={deletingChannel}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t('common:back')}
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteChannel(selectedChannel.id)}
                  disabled={deletingChannel}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {deletingChannel ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {t('common:deleting')}
                    </>
                  ) : (
                    t('common:confirmDelete')
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}