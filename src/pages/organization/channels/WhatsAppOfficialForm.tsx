import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useOrganizationContext } from '../../../contexts/OrganizationContext';
import { supabase } from '../../../lib/supabase';
import api from '../../../lib/api';
import { toast } from 'react-hot-toast';

export default function WhatsAppOfficialForm() {
  const { t } = useTranslation(['channels', 'common']);
  const navigate = useNavigate();
  const { id } = useParams();
  const { currentOrganization } = useOrganizationContext();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    is_connected: false,
    status: 'inactive'
  });

  useEffect(() => {
    if (id) {
      loadChannelData();
    }
  }, [id]);

  const loadChannelData = async () => {
    try {
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
        status: data.status
      });
    } catch (error) {
      setError(error.message);
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
        type: 'whatsapp_official',
        organization_id: currentOrganization?.id,
        status: 'inactive',
        is_connected: false,
        is_tested: false,
        credentials: {},
        settings: {
          autoReply: true,
          notifyNewTickets: true
        }
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

      navigate(`/app/channels/${data.id}/edit/whatsapp-official`);
    } catch (error) {
      setError(error.message);
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
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = () => {
    const FB_AUTH_URL = 'https://www.facebook.com/v22.0/dialog/oauth';
    
    // Criando objeto state com channelId e organizationId
    const stateData = {
      channelId: id,
      organizationId: currentOrganization?.id
    };

    const params = new URLSearchParams({
      client_id: import.meta.env.VITE_FB_APP_ID,
      display: 'popup',
      redirect_uri: `${import.meta.env.VITE_API_URL}/api/webhook/whatsapp/oauth`,
      response_type: 'token',
      state: btoa(JSON.stringify(stateData)), // Codificando os dados em base64
      scope: [
        'whatsapp_business_management',
        'whatsapp_business_messaging'
      ].join(',')
    });

    window.location.href = `${FB_AUTH_URL}?${params}`;
  };

  const handleWhatsAppSetup = async (accessToken: string) => {
    try {
      const response = await api.post(`/api/${currentOrganization?.id}/channel/whatsapp/${id}/setup`, {
        accessToken
      });

      if (response.data.success) {
        toast.success(t('channels:form.whatsapp.connectSuccess'));
        loadChannelData(); // Recarrega os dados do canal
      } else {
        throw new Error(response.data.error);
      }
    } catch (error) {
      console.error('Erro na configuração do WhatsApp:', error);
      toast.error(error.message || t('common:error'));
    }
  };

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

      setFormData(prev => ({
        ...prev,
        status: prev.status === 'active' ? 'inactive' : 'active'
      }));

    } catch (error) {
      console.error('Error toggling status:', error);
      setError(t('common:error'));
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    
    setDeleting(true);
    setError('');

    try {
      const response = await api.delete(`/api/${currentOrganization?.id}/channel/whatsapp/${id}`);

      if (!response.data.success) {
        throw new Error(response.data.error || t('common:error'));
      }

      navigate('/app/channels');
      toast.success(t('channels:deleteSuccess'));
    } catch (error: any) {
      console.error('Error deleting channel:', error);
      setError(error.response?.data?.error || error.message || t('common:error'));
      toast.error(error.response?.data?.error || error.message || t('common:error'));
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

          {id && (
            <div className="ml-4 flex items-center">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                formData.is_connected
                  ? 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-400'
                  : 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-400'
              }`}>
                {formData.is_connected ? t('status.connected') : t('status.disconnected')}
              </span>
            </div>
          )}

          {id && formData.is_connected && (
            <div className="ml-auto flex items-center space-x-2">
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

            <div className="flex justify-end space-x-4">
              {!id && (
                <button
                  type="submit"
                  disabled={!formData.name}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t('channels:form.whatsapp.saveAndContinue')}
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
                      className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                    >
                      <img 
                        src="/images/logos/whatsapp.svg" 
                        alt="WhatsApp" 
                        className="w-5 h-5 mr-2"
                      />
                      {t('channels:form.whatsapp.connect')}
                    </button>
                  )}
                </>
              )}
            </div>
          </form>
        </div>

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
      </div>
    </div>
  );
}