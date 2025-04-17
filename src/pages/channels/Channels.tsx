import React, { useState, useEffect } from 'react';
import { Share2, Plus, AlertTriangle, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { ChatChannel } from '../../types/database';
import { ChannelCard } from '../../components/channels/ChannelCard';
import { useAuthContext } from '../../contexts/AuthContext';

export default function Channels() {
  const { t } = useTranslation('channels');
  const navigate = useNavigate();
  const { currentOrganizationMember } = useAuthContext();
  const [channels, setChannels] = useState<ChatChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState<ChatChannel | null>(null);
  const [error, setError] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [deletingChannel, setDeletingChannel] = useState(false);

  useEffect(() => {
    if (currentOrganizationMember) {
      loadChannels();
    }
  }, [currentOrganizationMember]);

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
    if (!currentOrganizationMember) return;

    try {
      const { data, error } = await supabase
        .from('chat_channels')
        .select('*')
        .eq('organization_id', currentOrganizationMember.organization.id)
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
    try {
      // Check if channel has any chats
      const { data: chats, error: chatsError } = await supabase
        .from('chats')
        .select('id')
        .eq('channel_id', channelId)
        .limit(1);

      if (chatsError) throw chatsError;

      // If channel has chats, don't allow deletion
      if (chats && chats.length > 0) {
        setError(t('delete.error.hasChats'));
        setShowDeleteModal(false);
        setSelectedChannel(null);
        return;
      }

      // Delete channel if no chats exist
      const { error } = await supabase
        .from('chat_channels')
        .delete()
        .eq('id', channelId);

      if (error) throw error;
      await loadChannels();
      setShowDeleteModal(false);
      setSelectedChannel(null);
    } catch (error) {
      console.error('Error deleting channel:', error);
      setError(t('common:error'));
    } finally {
      setDeletingChannel(false);
    }
  }

  if (!currentOrganizationMember) {
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
      <div className="flex justify-between items-center mb-6">
        <h1 className="text md:text-2xl font-bold text-gray-900 dark:text-white flex items-center">
          <Share2 className="w-6 h-6 mr-2" />
          {t('title')}
        </h1>
        {(currentOrganizationMember?.role === 'owner' || currentOrganizationMember?.role === 'admin') && (
          <button
            onClick={() => navigate('/app/channels/new')}
            className="inline-flex items-center p-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Plus className="w-4 h-4 mr-2" />
            {t('newChannel')}
          </button>
        )}
      </div>

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
              canManage={currentOrganizationMember?.role === 'owner' || currentOrganizationMember?.role === 'admin'}
              onToggleStatus={() => handleToggleStatus(channel)}
              onEdit={() => navigate(`/app/channels/${channel.id}/edit`)}
              onDelete={channel.type === 'whatsapp_wapi' ? undefined : () => {
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
            {(currentOrganizationMember?.role === 'owner' || currentOrganizationMember?.role === 'admin') && (
              <button
                onClick={() => navigate('/app/channels/new')}
                className="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Plus className="w-4 h-4 mr-2" />
                {t('createFirstChannel')}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedChannel && selectedChannel.type !== 'whatsapp_wapi' && (
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
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteModal(false);
                    setSelectedChannel(null);
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