import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuthContext } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import api from '../../lib/api';
import TransferChatsModal from '../../components/channels/TransferChatsModal';
import ChannelBasicFields from '../../components/channels/ChannelBasicFields';
import { useTeams } from '../../hooks/useQueryes';

// Interface para erros com resposta
interface ApiError extends Error {
  response?: {
    data?: {
      error?: string;
    };
  };
}

export default function WhatsAppEvoForm() {
  const { t } = useTranslation(['channels', 'common']);
  const navigate = useNavigate();
  const { id } = useParams();
  const { currentOrganizationMember } = useAuthContext();
  const { data: teams, isLoading: isLoadingTeams } = useTeams(currentOrganizationMember?.organization.id);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    credentials: {
      apiUrl: '',
      apiKey: '',
      instanceName: '',
      webhookUrl: ''
    },
    settings: {} as Record<string, boolean | string | null | undefined>
  });

  useEffect(() => {
    if (id && currentOrganizationMember) {
      loadChannel();
    } else {
      setLoading(false);
    }
  }, [id, currentOrganizationMember]);

  async function loadChannel() {
    try {
      const { data, error } = await supabase
        .from('chat_channels')
        .select('*')
        .eq('id', id)
        .eq('type', 'whatsapp_evo')
        .single();

      if (error) throw error;

      if (data) {
        setFormData({
          name: data.name,
          credentials: data.credentials || {},
          settings: data.settings || {}
        });
      }
    } catch (error) {
      console.error('Error loading channel:', error);
      setError(t('common:error'));
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!currentOrganizationMember) return;

    setSaving(true);
    setError('');

    try {
      if (id) {
        // Update existing channel
        const { error } = await supabase
          .from('chat_channels')
          .update({
            name: formData.name,
            credentials: formData.credentials,
            settings: formData.settings,
            updated_at: new Date().toISOString()
          })
          .eq('id', id);

        if (error) throw error;
      } else {
        // Create new channel
        const { error } = await supabase
          .from('chat_channels')
          .insert([{
            organization_id: currentOrganizationMember.organization.id,
            name: formData.name,
            type: 'whatsapp_evo',
            credentials: formData.credentials,
            settings: {
              ...formData.settings,
              autoReply: true,
              notifyNewTickets: true
            },
            status: 'inactive',
            is_connected: false,
            is_tested: false
          }]);

        if (error) throw error;
      }

      navigate('/app/channels');
    } catch (error) {
      console.error('Error saving channel:', error);
      setError(t('common:error'));
    } finally {
      setSaving(false);
    }
  }

  const handleDelete = async () => {
    if (!id) return;
    
    setDeleting(true);
    setError('');

    try {
      const response = await api.delete(`/api/${currentOrganizationMember?.organization.id}/channel/whatsapp_evo/${id}`);

      if (!response.data.success) {
        throw new Error(response.data.error || t('common:error'));
      }

      navigate('/app/channels');
    } catch (error: unknown) {
      const err = error as ApiError;
      console.error('Error deleting channel:', error);
      setError(err.response?.data?.error || err.message || t('common:error'));
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

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
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center mb-6">
          <button
            onClick={() => navigate('/app/channels')}
            className="mr-4 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {id ? t('form.title.edit') : t('form.title.create')}
          </h1>

          {/* Botões de ação */}
          {id && (
            <div className="ml-auto flex items-center space-x-2">
              <button
                onClick={() => setShowTransferModal(true)}
                className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-blue-700 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/50 hover:bg-blue-200 dark:hover:bg-blue-900/70"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {t('channels:form.transferChats')}
              </button>

              <button
                onClick={() => setShowDeleteModal(true)}
                className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-900/50 hover:bg-red-200 dark:hover:bg-red-900/70"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {t('common:delete')}
              </button>
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {error && (
              <div className="bg-red-50 dark:bg-red-900/50 text-red-700 dark:text-red-400 p-4 rounded-md">
                {error}
              </div>
            )}

            <ChannelBasicFields 
              name={formData.name}
              onNameChange={(name) => setFormData(prev => ({ ...prev, name }))}
              defaultTeamId={formData.settings.defaultTeamId as string}
              onDefaultTeamChange={(teamId) => setFormData(prev => ({
                ...prev,
                settings: {
                  ...prev.settings,
                  defaultTeamId: teamId || null
                }
              }))}
              messageSignature={formData.settings.messageSignature as string || ''}
              onMessageSignatureChange={(signature) => setFormData(prev => ({
                ...prev,
                settings: {
                  ...prev.settings,
                  messageSignature: signature
                }
              }))}
              teams={teams}
              isLoadingTeams={isLoadingTeams}
            />

            <div>
              <label htmlFor="apiUrl" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                API URL
              </label>
              <input
                type="url"
                id="apiUrl"
                required
                className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 h-10 px-3"
                value={formData.credentials.apiUrl}
                onChange={(e) => setFormData({
                  ...formData,
                  credentials: { ...formData.credentials, apiUrl: e.target.value }
                })}
              />
            </div>

            <div>
              <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                API Key
              </label>
              <input
                type="password"
                id="apiKey"
                required
                className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 h-10 px-3"
                value={formData.credentials.apiKey}
                onChange={(e) => setFormData({
                  ...formData,
                  credentials: { ...formData.credentials, apiKey: e.target.value }
                })}
              />
            </div>

            <div>
              <label htmlFor="instanceName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Instance Name
              </label>
              <input
                type="text"
                id="instanceName"
                required
                className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 h-10 px-3"
                value={formData.credentials.instanceName}
                onChange={(e) => setFormData({
                  ...formData,
                  credentials: { ...formData.credentials, instanceName: e.target.value }
                })}
              />
            </div>

            <div>
              <label htmlFor="webhookUrl" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Webhook URL
              </label>
              <input
                type="url"
                id="webhookUrl"
                required
                className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 h-10 px-3"
                value={formData.credentials.webhookUrl}
                onChange={(e) => setFormData({
                  ...formData,
                  credentials: { ...formData.credentials, webhookUrl: e.target.value }
                })}
              />
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => navigate('/app/channels')}
                disabled={saving}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                {t('common:back')}
              </button>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {t('common:saving')}
              </button>
            </div>
          </form>
        </div>

        {/* Modal de confirmação de exclusão */}
        {showDeleteModal && (
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
              <div className="p-6">
                <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 dark:bg-red-900/50 rounded-full mb-4">
                  <Trash2 className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white text-center mb-2">
                  {t('delete.title')}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-6">
                  {t('delete.confirmation', { name: formData.name })}
                </p>
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowDeleteModal(false)}
                    disabled={deleting}
                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    {t('common:back')}
                  </button>
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={deleting}
                    className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  >
                    {deleting ? (
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

        {/* Modal de transferência de chats */}
        <TransferChatsModal
          isOpen={showTransferModal}
          onClose={() => setShowTransferModal(false)}
          currentChannelId={id || ''}
          channelType="whatsapp_evo"
        />
      </div>
    </div>
  );
}