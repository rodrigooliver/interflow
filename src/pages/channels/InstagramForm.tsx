import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, AlertTriangle, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuthContext } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import api from '../../lib/api';
import { toast } from 'react-hot-toast';
import TransferChatsModal from '../../components/channels/TransferChatsModal';

// Interface para erros com resposta
interface ApiError extends Error {
  response?: {
    data?: {
      error?: string;
    };
  };
}

export default function InstagramForm() {
  const { t } = useTranslation(['channels', 'common']);
  const navigate = useNavigate();
  const { id } = useParams(); // Pega o ID da URL se estiver editando
  const { currentOrganizationMember } = useAuthContext();
  
  // Adicionar função para voltar usando a history do navegador
  const handleGoBack = () => {
    window.history.back();
  };
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    is_connected: false,
    status: 'inactive',
    credentials: {} as { username?: string; instagram_id?: string }
  });

  // Carrega os dados do canal se estiver editando
  useEffect(() => {
    if (id) {
      loadChannelData();
    }
  }, [id]);

  const loadChannelData = async () => {
    try {
      console.log(`${import.meta.env.VITE_API_URL}/api/webhook/instagram/${id}/connect`);
      setLoading(true);
      const { data, error } = await supabase
        .from('chat_channels')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      
      setFormData({
        name: data.name,
        is_connected: data.is_connected,
        status: data.status,
        credentials: data.credentials || {}
      });
    } catch (error: unknown) {
      const err = error as Error;
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      
      const newChannel = {
        name: formData.name,
        type: 'instagram',
        organization_id: currentOrganizationMember?.organization.id,
        status: 'inactive',
        is_connected: false,
        is_tested: false,
        credentials: {},
        settings: {}
      };
      
      const { data, error } = await supabase
        .from('chat_channels')
        .insert(newChannel)
        .select()
        .single();

      if (error) {
        console.error('Erro detalhado:', error);
        throw error;
      }

      navigate(`/app/channels/${data.id}/edit/instagram`);
    } catch (error: unknown) {
      const err = error as Error;
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('chat_channels')
        .update({ name: formData.name })
        .eq('id', id);

      if (error) {
        console.error('Erro detalhado:', error);
        throw error;
      }

      // Não navegamos após atualizar, permanecemos na mesma página
    } catch (error: unknown) {
      const err = error as Error;
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = () => {
    const INSTAGRAM_AUTH_URL = 'https://www.instagram.com/oauth/authorize';
    
    // Criando objeto state com channelId e organizationId
    const stateData = {
      channelId: id,
      organizationId: currentOrganizationMember?.organization.id
    };

    const params = new URLSearchParams({
      enable_fb_login: '0',
      force_authentication: '1',
      client_id: import.meta.env.VITE_INSTAGRAM_CLIENT_ID,
      redirect_uri: `${import.meta.env.VITE_API_URL}/api/webhook/instagram/oauth`,
      response_type: 'code',
      state: btoa(JSON.stringify(stateData)), // Codificando os dados em base64
      scope: [
        'instagram_business_basic',
        'instagram_business_manage_messages',
        // 'instagram_business_manage_comments',
        // 'instagram_business_content_publish',
        // 'instagram_business_manage_insights'
      ].join(',')
    });

    window.location.href = `${INSTAGRAM_AUTH_URL}?${params}`;
  };

  // Adicionar função para alternar status
  const handleToggleStatus = async () => {
    if (!id) return;
    
    setUpdatingStatus(true);
    try {
      const { error } = await supabase
        .from('chat_channels')
        .update({
          status: formData.status === 'active' ? 'inactive' : 'active',
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;

      // Atualizar estado local
      setFormData(prev => ({
        ...prev,
        status: prev.status === 'active' ? 'inactive' : 'active'
      }));

    } catch (error: unknown) {
      console.error('Error toggling status:', error);
      setError(t('common:error'));
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Adicionar função para deletar
  const handleDelete = async () => {
    if (!id) return;
    
    setDeleting(true);
    setError('');

    try {
      const response = await api.delete(`/api/${currentOrganizationMember?.organization.id}/channel/instagram/${id}`);

      if (!response.data.success) {
        throw new Error(response.data.error || t('common:error'));
      }

      // Usar a função handleGoBack em vez de navegar diretamente
      handleGoBack();
      toast.success(t('channels:deleteSuccess'));
    } catch (error: unknown) {
      const err = error as ApiError;
      console.error('Error deleting channel:', error);
      setError(err.response?.data?.error || err.message || t('common:error'));
      toast.error(err.response?.data?.error || err.message || t('common:error'));
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center mb-6">
            <button
              onClick={handleGoBack}
              className="mr-4 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          </div>
          <div className="flex justify-center items-center min-h-[200px]">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center mb-6">
          <button
            onClick={handleGoBack}
            className="mr-4 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {id ? t('form.title.edit') : t('form.title.create')}
          </h1>

          {/* Status de Conexão */}
          {id && (
            <div className="ml-4 flex items-center space-x-2">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                formData.is_connected
                  ? 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-400'
                  : 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-400'
              }`}>
                {formData.is_connected ? t('status.connected') : t('status.disconnected')}
              </span>
              {formData.is_connected && formData.credentials.username && (
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  @{formData.credentials.username}
                </span>
              )}
            </div>
          )}

          {/* Botões de ação */}
          {id && formData.is_connected && (
            <div className="ml-auto flex items-center space-x-2">
              <button
                onClick={() => setShowTransferModal(true)}
                className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-blue-700 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/50 hover:bg-blue-200 dark:hover:bg-blue-900/70"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {t('channels:form.transferChats')}
              </button>

              <button
                onClick={handleToggleStatus}
                disabled={updatingStatus}
                className={`inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md ${
                  formData.status === 'active'
                    ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/70'
                    : 'bg-gray-100 dark:bg-gray-900/50 text-gray-700 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-900/70'
                }`}
              >
                {updatingStatus ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  formData.status === 'active' ? t('status.active') : t('status.inactive')
                )}
              </button>

              <button
                onClick={() => setShowDeleteModal(true)}
                className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-900/50 hover:bg-red-200 dark:hover:bg-red-900/70"
              >
                {t('common:delete')}
              </button>
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
          <form onSubmit={id ? handleUpdateChannel : handleCreateChannel} className="p-6 space-y-6">
            {error && (
              <div className="bg-red-50 dark:bg-red-900/50 text-red-700 dark:text-red-400 p-4 rounded-md">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('form.name')}
              </label>
              <input
                type="text"
                id="name"
                required
                className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 h-10 px-3"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            {/* Seção de informações da conta conectada */}
            {id && formData.is_connected && formData.credentials.username && (
              <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
                <div className="flex items-center space-x-3">
                  <img 
                    src="/images/logos/instagram.svg" 
                    alt="Instagram" 
                    className="w-6 h-6"
                  />
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                      {t('form.instagram.connectedAccount')}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      @{formData.credentials.username}
                      {formData.credentials.instagram_id && (
                        <span className="ml-2 text-xs text-gray-400 dark:text-gray-500">
                          (ID: {formData.credentials.instagram_id})
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end space-x-4">
              {!id && (
                <button
                  type="submit"
                  disabled={!formData.name}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t('channels:form.instagram.saveAndContinue')}
                </button>
              )}
              
              {id && (
                <>
                  <button
                    type="submit"
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    {t('common:save')}
                  </button>
                  
                  {!formData.is_connected && (
                    <button
                      type="button"
                      onClick={handleConnect}
                      className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 hover:from-purple-700 hover:via-pink-700 hover:to-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500"
                    >
                      <img 
                        src="/images/logos/instagram.svg" 
                        alt="Instagram" 
                        className="w-5 h-5 mr-2"
                      />
                      {t('channels:form.instagram.connect')}
                    </button>
                  )}
                </>
              )}
            </div>
          </form>
        </div>

        {/* Modal de confirmação de exclusão */}
        {showDeleteModal && (
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
          channelType="instagram"
        />
      </div>
    </div>
  );
}