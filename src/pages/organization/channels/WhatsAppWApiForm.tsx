import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, QrCode, CheckCircle2, XCircle, AlertTriangle, Power, PowerOff, Settings, Zap, Trash2, ArrowRightLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { QRCodeSVG } from 'qrcode.react';
import { useOrganizationContext } from '../../../contexts/OrganizationContext';
import { supabase } from '../../../lib/supabase';
import api from '../../../lib/api';
import { toast } from 'react-hot-toast';

type ConnectionType = 'custom' | 'interflow' | null;

export default function WhatsAppWApiForm() {
  const { t } = useTranslation(['channels', 'common', 'status']);
  const navigate = useNavigate();
  const { id } = useParams();
  const { currentOrganization } = useOrganizationContext();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [generatingQr, setGeneratingQr] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'success' | 'error' | null>(null);
  const [error, setError] = useState('');
  const [subscription, setSubscription] = useState<ReturnType<typeof supabase.channel> | null>(null);
  const [waitingQrCode, setWaitingQrCode] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Form state with default values
  const [formData, setFormData] = useState({
    name: '',
    credentials: {
      apiHost: '',
      apiConnectionKey: '',
      apiToken: '',
      webhookUrl: '',
      qrCode: '',
      qrExpiresAt: null as string | null
    },
    is_tested: false,
    is_connected: false,
    status: 'inactive' as 'active' | 'inactive'
  });

  const [showConnectionSettings, setShowConnectionSettings] = useState(false);

  // Adicionar novos estados
  const [resetting, setResetting] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [showDisconnectModal, setShowDisconnectModal] = useState(false);
  const [disconnectSuccess, setDisconnectSuccess] = useState(false);

  // Adicionar novo estado
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const [creating, setCreating] = useState(false);
  const [connectionType, setConnectionType] = useState<ConnectionType>(null);

  // Adicionar novo estado
  const [deleting, setDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Adicionar novos estados
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferring, setTransferring] = useState(false);
  const [availableChannels, setAvailableChannels] = useState<Array<{id: string, name: string}>>([]);
  const [selectedChannelId, setSelectedChannelId] = useState('');

  const validateApiHost = (host: string) => {
    // Remove any protocol and trailing slashes
    const cleanHost = host.replace(/^https?:\/\//, '').replace(/\/$/, '');
    
    // Check if host matches the expected format (e.g., host10.serverapi.dev)
    const hostRegex = /^[a-zA-Z0-9-]+\.[a-zA-Z0-9-]+\.[a-zA-Z]+$/;
    return hostRegex.test(cleanHost) ? cleanHost : null;
  };

  const handleApiHostChange = (value: string) => {
    const validHost = validateApiHost(value);
    if (validHost || value === '') {
      setFormData(prev => ({
        ...prev,
        credentials: { 
          ...prev.credentials, 
          apiHost: validHost || value 
        }
      }));
      setError('');
    } else {
      setError(t('form.whatsapp.invalidHost'));
    }
  };

  useEffect(() => {
    if (id && currentOrganization) {
      loadChannel();
      const sub = subscribeToChannelUpdates();
      setSubscription(sub);

      // Se vier da criação do Interflow, já mostra a espera do QR code
      const params = new URLSearchParams(window.location.search);
      if (params.get('source') === 'interflow') {
        setWaitingQrCode(true);
      }
    } else {
      setLoading(false);
    }

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [id, currentOrganization]);

  useEffect(() => {
    // Se for edição, já mostra o formulário direto
    if (id) {
      setConnectionType('custom');
    }
  }, [id]);

  const subscribeToChannelUpdates = () => {
    if (!id) return null;

    const channelName = `channel-${id}-${Math.random().toString(36).substring(7)}`;

    const subscription = supabase
      .channel(channelName)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'chat_channels',
        filter: `id=eq.${id}`
      }, (payload) => {
        console.log('Channel updated:', payload);
        const updatedChannel = payload.new;
        
        // Se recebeu o QR code, reseta o estado de espera
        if (updatedChannel.credentials?.qrCode) {
          setWaitingQrCode(false);
        }

        const updatedCredentials = {
          apiHost: updatedChannel.credentials?.apiHost || '',
          apiConnectionKey: updatedChannel.credentials?.apiConnectionKey || '',
          apiToken: updatedChannel.credentials?.apiToken || '',
          webhookUrl: updatedChannel.credentials?.webhookUrl || '',
          qrCode: updatedChannel.credentials?.qrCode || '',
          qrExpiresAt: updatedChannel.credentials?.qrExpiresAt || null
        };

        setFormData(prev => {
          const wasDisconnected = !prev.is_connected;
          const isNowConnected = updatedChannel.is_connected;

          if (wasDisconnected && isNowConnected) {
            setWaitingQrCode(false); // Garante que a espera do QR code é cancelada
            return {
              ...prev,
              credentials: {
                ...updatedCredentials,
                qrCode: '', // Limpa o QR code quando conectado
                qrExpiresAt: null
              },
              is_connected: true,
              is_tested: updatedChannel.is_tested || false
            };
          }

          return {
            ...prev,
            credentials: updatedCredentials,
            is_connected: updatedChannel.is_connected || false,
            is_tested: updatedChannel.is_tested || false
          };
        });
      })
      .subscribe();

    return subscription;
  };

  async function loadChannel() {
    try {
      const { data, error } = await supabase
        .from('chat_channels')
        .select('*')
        .eq('id', id)
        .eq('type', 'whatsapp_wapi')
        .single();

      if (error) throw error;

      if (data) {
        // Ensure credentials object exists with only non-sensitive fields
        const credentials = {
          apiHost: '',
          apiConnectionKey: '', // Campo sensível - não preencher
          apiToken: '', // Campo sensível - não preencher
          webhookUrl: data.credentials?.webhookUrl || '',
          qrCode: data.credentials?.qrCode || '',
          qrExpiresAt: data.credentials?.qrExpiresAt || null
        };

        setFormData({
          name: data.name || '',
          credentials,
          is_tested: data.is_tested || false,
          is_connected: data.is_connected || false,
          status: data.status || 'inactive'
        });
        setShowConnectionSettings(!data.is_tested || false);
      }
    } catch (error) {
      console.error('Error loading channel:', error);
      setError(t('common:error'));
    }
  }

  // Adicionar um useEffect para monitorar as mudanças no formData
  useEffect(() => {
    if (id && formData.name) {
      // Só remove o loading quando os dados do formulário estiverem preenchidos
      setLoading(false);
    }
  }, [id, formData]);

  const testConnection = async () => {
    setTesting(true);
    setConnectionStatus(null);
    setError('');

    try {
      // Determinar qual endpoint usar com base na existência de um ID
      const endpoint = id 
        ? `/api/${currentOrganization?.id}/channel/wapi/${id}/test` 
        : `/api/${currentOrganization?.id}/channel/wapi/test`;
      
      // Enviar os dados de conexão em ambos os casos
      const response = await api.post(endpoint, {
        apiHost: formData.credentials.apiHost,
        apiConnectionKey: formData.credentials.apiConnectionKey,
        apiToken: formData.credentials.apiToken
      });

      const data = response.data;

      if (!data.success) {
        throw new Error(data.error || 'Failed to establish WApi connection');
      }

      setConnectionStatus('success');
      setFormData(prev => ({
        ...prev,
        is_tested: true,
        is_connected: data.data?.connected || false
      }));
      setShowConnectionSettings(false);
    } catch (error: any) {
      console.error('Error testing WApi connection:', error);
      setConnectionStatus('error');
      setError(error.response?.data?.error || error.message || t('form.whatsapp.error'));
    } finally {
      setTesting(false);
    }
  };

  const generateQrCode = async () => {
    if (!id) return;

    setGeneratingQr(true);
    setWaitingQrCode(true);
    setError('');

    try {
      const response = await api.post(`/api/${currentOrganization?.id}/channel/wapi/${id}/qr`);
      const data = response.data;

      if (!data.success) {
        throw new Error(data.error || 'Failed to generate QR code');
      }
    } catch (error: any) {
      console.error('Error generating QR code:', error);
      setError(error.response?.data?.error || error.message);
      setWaitingQrCode(false);
    } finally {
      setGeneratingQr(false);
    }
  };

  // Função auxiliar para verificar se o QR code expirou
  const isQrCodeExpired = () => {
    if (!formData.credentials.qrExpiresAt) return false;
    return new Date(formData.credentials.qrExpiresAt) < new Date();
  };

  // Adicionar as novas funções
  const resetConnection = async () => {
    if (!id) return;

    setError('');
    setResetting(true);
    setResetSuccess(false);

    try {
      const response = await api.post(`/api/${currentOrganization?.id}/channel/wapi/${id}/reset`);
      const data = response.data;

      if (!data.success) {
        throw new Error(data.error || 'Falha ao reiniciar conexão');
      }

      setFormData(prev => ({
        ...prev,
        is_connected: false,
        credentials: {
          ...prev.credentials,
          qrCode: '',
          qrExpiresAt: null
        }
      }));
      
      setResetSuccess(true);
      setTimeout(() => {
        setResetSuccess(false);
      }, 3000);
    } catch (error: any) {
      console.error('Erro ao reiniciar conexão:', error);
      setError(error.response?.data?.error || error.message);
    } finally {
      setResetting(false);
    }
  };

  const disconnectWhatsApp = async () => {
    if (!id) return;

    setError('');
    setDisconnecting(true);
    setDisconnectSuccess(false);

    try {
      const response = await api.post(`/api/${currentOrganization?.id}/channel/wapi/${id}/disconnect`);
      const data = response.data;

      if (!data.success) {
        throw new Error(data.error || 'Falha ao desconectar');
      }

      setFormData(prev => ({
        ...prev,
        is_connected: false,
        credentials: {
          ...prev.credentials,
          qrCode: '',
          qrExpiresAt: null
        }
      }));
      
      setDisconnectSuccess(true);
      setShowDisconnectModal(false);
      setTimeout(() => {
        setDisconnectSuccess(false);
      }, 3000);
    } catch (error: any) {
      console.error('Erro ao desconectar:', error);
      setError(error.response?.data?.error || error.message);
    } finally {
      setDisconnecting(false);
    }
  };

  // Adicionar nova função para alternar status
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

    } catch (error) {
      console.error('Error toggling status:', error);
      setError(t('common:error'));
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleInterflowConnection = async () => {
    if (!currentOrganization || !formData.name.trim()) return;
    
    setCreating(true);
    setError('');

    try {
      const response = await api.post(`/api/${currentOrganization.id}/channel/wapi/interflow`, {
        type: 'whatsapp_wapi',
        name: formData.name.trim(),
        settings: {
          autoReply: true,
          notifyNewTickets: true
        },
        status: 'inactive'
      });

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to create Interflow channel');
      }

      // Redireciona para a página de edição com parâmetro source=interflow
      navigate(`/app/channels/${response.data.id}/edit/whatsapp_wapi?source=interflow`);
    } catch (error: any) {
      console.error('Error creating Interflow channel:', error);
      setError(error.response?.data?.error || error.message || t('common:error'));
      setConnectionType(null); // Reset da seleção em caso de erro
    } finally {
      setCreating(false);
    }
  };

  // Adicionar função para deletar
  const handleDelete = async () => {
    if (!id || !currentOrganization) return;
    
    setDeleting(true);
    setError('');

    try {
      const response = await api.delete(`/api/${currentOrganization.id}/channel/wapi/${id}`);
      
      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to delete channel');
      }

      // Redirecionar para a lista de canais
      navigate('/app/channels');
    } catch (error: any) {
      console.error('Error deleting channel:', error);
      setError(error.response?.data?.error || error.message || t('common:error'));
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!currentOrganization) return;
    
    setSaving(true);
    setError('');
    setSaveSuccess(false);

    try {
      // Para novos canais ou ao editar credenciais, exigir teste antes de salvar
      if ((!id || showConnectionSettings) && !formData.is_tested) {
        setError(t('channels:errors.testRequired'));
        setSaving(false);
        return;
      }

      const channelData = {
        name: formData.name,
        credentials: showConnectionSettings && formData.is_tested 
          ? formData.credentials 
          : undefined,
        // Se estiver salvando novas credenciais testadas, marca como testado mas desconectado
        is_tested: showConnectionSettings ? true : formData.is_tested,
        is_connected: showConnectionSettings ? false : formData.is_connected,
        status: formData.status
      };

      if (id) {
        // Update existing channel
        const response = await api.put(`/api/${currentOrganization.id}/channel/wapi/${id}`, channelData);
        
        if (!response.data.success) {
          throw new Error(response.data.error || 'Failed to update channel');
        }

        // Reload channel data
        await loadChannel();
        setSaveSuccess(true);
        
        // Se salvou novas credenciais, reseta o estado de exibição das configurações
        if (showConnectionSettings) {
          setShowConnectionSettings(false);
        }
        
        // Limpar mensagem de sucesso após 3 segundos
        setTimeout(() => {
          setSaveSuccess(false);
        }, 3000);
      } else {
        // Create new channel
        const response = await api.post(`/api/${currentOrganization.id}/channel/wapi`, {
          ...channelData,
          type: 'whatsapp_wapi',
          settings: {
            autoReply: true,
            notifyNewTickets: true
          },
          status: 'inactive',
          is_connected: false,
          is_tested: true
        });

        if (!response.data.success) {
          throw new Error(response.data.error || 'Failed to create channel');
        }

        setSaveSuccess(true);
        // Redirect to edit page for QR code generation
        navigate(`/app/channels/${response.data.id}/edit/whatsapp_wapi`);
      }
    } catch (error: any) {
      console.error('Error saving channel:', error);
      setError(error.response?.data?.error || error.message || t('common:error'));
    } finally {
      setSaving(false);
    }
  }

  // Atualizar a renderização do QR code para mostrar loading quando estiver esperando
  const renderQrCode = () => {
    if (waitingQrCode) {
      return (
        <div className="flex flex-col items-center justify-center p-8 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
          <Loader2 className="w-8 h-8 text-primary-500 animate-spin mb-4" />
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t('channels:form.whatsapp.waitingQrCode')}
          </p>
        </div>
      );
    }

    if (formData.credentials.qrCode) {
      return (
        <div className="flex flex-col items-center justify-center p-8 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
          <QRCodeSVG
            value={formData.credentials.qrCode}
            size={256}
            level="H"
            includeMargin={true}
          />
          <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
            {t('channels:form.whatsapp.scanQrCode')}
          </p>
          {isQrCodeExpired() && (
            <p className="mt-2 text-sm text-red-600 dark:text-red-400">
              {t('channels:form.whatsapp.qrCodeExpired')}
            </p>
          )}
        </div>
      );
    }

    return null;
  };

  // Adicionar após as outras funções de carregamento
  const loadAvailableChannels = async () => {
    try {
      const { data, error } = await supabase
        .from('chat_channels')
        .select('id, name')
        .eq('type', 'whatsapp_wapi')
        .eq('organization_id', currentOrganization?.id)
        .neq('id', id) // Exclui o canal atual
        .eq('status', 'active'); // Apenas canais ativos

      if (error) throw error;
      setAvailableChannels(data || []);
    } catch (error) {
      console.error('Error loading channels:', error);
      setError(t('common:error'));
    }
  };

  // Adicionar função de transferência
  const handleTransferChats = async () => {
    if (!selectedChannelId || !id) return;
    
    setTransferring(true);
    setError('');

    try {
      const response = await api.post(`/api/${currentOrganization?.id}/channel/wapi/${id}/transfer`, {
        targetChannelId: selectedChannelId
      });

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to transfer chats');
      }

      setShowTransferModal(false);
      // Mostrar mensagem de sucesso temporária
      toast.success(t('channels:form.whatsapp.transferSuccess'));
    } catch (error: any) {
      console.error('Error transferring chats:', error);
      setError(error.response?.data?.error || error.message || t('common:error'));
    } finally {
      setTransferring(false);
    }
  };

  if (!id && connectionType === null) {
    return (
      <div className="p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            {error && (
              <div className="mb-6 bg-red-50 dark:bg-red-900/50 text-red-700 dark:text-red-400 p-4 rounded-md">
                {error}
              </div>
            )}
            
            {/* Campo de nome */}
            <div className="mb-8">
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('form.name')} *
              </label>
              <input
                type="text"
                id="name"
                required
                className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 h-10 px-3"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder={t('form.whatsapp.namePlaceholder')}
              />
            </div>

            <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-6">
              {t('channels:form.whatsapp.selectConnectionType')}
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Opção para conexão personalizada */}
              <button
                onClick={() => setConnectionType('custom')}
                disabled={creating || !formData.name.trim()}
                className="relative border border-gray-300 dark:border-gray-600 rounded-lg p-6 hover:border-primary-500 dark:hover:border-primary-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-center mb-4">
                  <Settings className="w-6 h-6 text-primary-500 mr-2" />
                  <h3 className="text-base font-medium text-gray-900 dark:text-gray-100">
                    {t('channels:form.whatsapp.customConnection')}
                  </h3>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t('channels:form.whatsapp.customConnectionDescription')}
                </p>
              </button>

              {/* Opção para conexão Interflow */}
              <button
                onClick={handleInterflowConnection}
                disabled={creating || !formData.name.trim()}
                className="relative border border-gray-300 dark:border-gray-600 rounded-lg p-6 hover:border-primary-500 dark:hover:border-primary-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-center mb-4">
                  {creating ? (
                    <Loader2 className="w-6 h-6 text-primary-500 mr-2 animate-spin" />
                  ) : (
                    <Zap className="w-6 h-6 text-primary-500 mr-2" />
                  )}
                  <h3 className="text-base font-medium text-gray-900 dark:text-gray-100">
                    {creating ? t('channels:form.whatsapp.creatingConnection') : t('channels:form.whatsapp.interflowConnection')}
                  </h3>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t('channels:form.whatsapp.interflowConnectionDescription')}
                </p>
                <span className="absolute top-2 right-2 bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 text-xs font-medium px-2 py-1 rounded">
                  {t('common:recommended')}
                </span>
              </button>
            </div>

            {!formData.name.trim() && (
              <p className="mt-4 text-sm text-yellow-600 dark:text-yellow-400">
                {t('channels:form.whatsapp.nameRequired')}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Se for conexão Interflow, redireciona para outra página ou mostra outro componente
  if (connectionType === 'interflow') {
    return (
      <div className="p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-6">
              {t('channels:whatsapp.interflowSetup')}
            </h2>
            {/* Adicionar aqui o conteúdo para configuração do Interflow */}
            <p className="text-gray-500 dark:text-gray-400">
              {t('channels:whatsapp.interflowSetupDescription')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (id && (!formData.name || loading)) {
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
          
          {/* Status de Conexão */}
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

          {/* Botões de ação */}
          <div className="ml-auto flex items-center space-x-2">
            {id && (
              <>
                <button
                  onClick={handleToggleStatus}
                  disabled={updatingStatus || !formData.is_tested || !formData.is_connected}
                  className={`inline-flex items-center px-3 py-2 rounded-md ${
                    formData.status === 'active'
                      ? 'text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-500'
                      : 'text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                  title={!formData.is_tested ? t('errors.testRequired') : !formData.is_connected ? t('errors.connectionRequired') : undefined}
                >
                  {updatingStatus ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                      {t('status.updating')}
                    </>
                  ) : (
                    <>
                      {formData.status === 'active' ? (
                        <Power className="w-5 h-5 mr-2" />
                      ) : (
                        <PowerOff className="w-5 h-5 mr-2" />
                      )}
                      {formData.status === 'active' ? t('status.deactivate') : t('status.activate')}
                    </>
                  )}
                </button>

                <button
                  onClick={() => setShowDeleteModal(true)}
                  disabled={deleting}
                  className="inline-flex items-center px-3 py-2 rounded-md text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {deleting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                      {t('common:deleting')}
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-5 h-5 mr-2" />
                      {t('common:delete')}
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {error && (
              <div className="bg-red-50 dark:bg-red-900/50 text-red-700 dark:text-red-400 p-4 rounded-md">
                {error}
              </div>
            )}

            {saveSuccess && (
              <div className="bg-green-50 dark:bg-green-900/50 text-green-700 dark:text-green-400 p-4 rounded-md flex items-center">
                <CheckCircle2 className="w-5 h-5 mr-2" />
                {t('common:saveSuccess')}
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

            {/* Seção de Configurações de Conexão */}
            {formData.is_tested && !showConnectionSettings ? (
              <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {t('form.whatsapp.connectionSettings')}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {t('form.whatsapp.connectionTested')}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowConnectionSettings(true)}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                  >
                    {t('form.whatsapp.newConnection')}
                  </button>
                </div>
                
              </div>
            ) : (
              <div className="space-y-6 border-t border-gray-200 dark:border-gray-700 pt-6">
                {showConnectionSettings && (
                  <div className="bg-yellow-50 dark:bg-yellow-900/50 p-4 rounded-md mb-4">
                    <div className="flex">
                      <AlertTriangle className="h-5 w-5 text-yellow-400 mr-2" />
                      <p className="text-sm text-yellow-700 dark:text-yellow-400">
                        {t('form.whatsapp.newConnectionWarning')}
                      </p>
                    </div>
                  </div>
                )}

                <div>
                  <label htmlFor="apiHost" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    API Host
                  </label>
                  <input
                    type="text"
                    id="apiHost"
                    required
                    placeholder="host10.serverapi.dev"
                    className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 h-10 px-3"
                    value={formData.credentials.apiHost}
                    onChange={(e) => handleApiHostChange(e.target.value)}
                  />
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {t('form.whatsapp.hostFormat')}
                  </p>
                </div>

                <div>
                  <label htmlFor="apiConnectionKey" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    API Connection Key
                  </label>
                  <input
                    type="password"
                    id="apiConnectionKey"
                    required
                    className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 h-10 px-3"
                    value={formData.credentials.apiConnectionKey}
                    onChange={(e) => setFormData({
                      ...formData,
                      credentials: { ...formData.credentials, apiConnectionKey: e.target.value },
                      is_tested: false
                    })}
                  />
                </div>

                <div>
                  <label htmlFor="apiToken" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    API Token
                  </label>
                  <input
                    type="password"
                    id="apiToken"
                    required
                    className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 h-10 px-3"
                    value={formData.credentials.apiToken}
                    onChange={(e) => setFormData({
                      ...formData,
                      credentials: { ...formData.credentials, apiToken: e.target.value },
                      is_tested: false
                    })}
                  />
                </div>

                {/* Botão de Teste */}
                <div>
                  <button
                    type="button"
                    onClick={testConnection}
                    disabled={testing}
                    className="w-full inline-flex justify-center items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed h-10"
                  >
                    {testing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {t('form.whatsapp.testing')}
                      </>
                    ) : (
                      t('form.whatsapp.testConnection')
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Status da Conexão */}
            {connectionStatus && (
              <div className={`p-4 rounded-md ${
                connectionStatus === 'success' 
                  ? 'bg-green-50 dark:bg-green-900/50 text-green-700 dark:text-green-400'
                  : 'bg-red-50 dark:bg-red-900/50 text-red-700 dark:text-red-400'
              }`}>
                <div className="flex items-center">
                  {connectionStatus === 'success' ? (
                    <>
                      <CheckCircle2 className="w-5 h-5 mr-2" />
                      <div>                        
                        <p className="text-sm mt-1">{t('form.whatsapp.credentialsValid')}</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-5 h-5 mr-2" />
                      <span>{error || t('form.whatsapp.error')}</span>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* QR Code Section */}
            {id && formData.is_tested && (
              <div>
                {formData.is_connected ? (
                  <div className="space-y-4">
                    {(resetSuccess || disconnectSuccess) && (
                      <div className="flex items-center p-4 bg-green-50 dark:bg-green-900/50 rounded-lg">
                        <CheckCircle2 className="w-5 h-5 text-green-500 dark:text-green-400 mr-2" />
                        <span className="text-green-700 dark:text-green-400">
                          {resetSuccess 
                            ? t('form.whatsapp.connectionRestarted')
                            : t('form.whatsapp.disconnectSuccess')
                          }
                        </span>
                      </div>
                    )}
                    
                    {/* <div className="flex items-center p-4 bg-green-50 dark:bg-green-900/50 rounded-lg">
                      <CheckCircle2 className="w-5 h-5 text-green-500 dark:text-green-400 mr-2" />
                      <span className="text-green-700 dark:text-green-400">
                        {t('form.whatsapp.connectionSuccess')}
                      </span>
                    </div> */}
                    
                    {/* Botões de ação */}
                    <div className="flex space-x-3">
                      <button
                        type="button"
                        onClick={resetConnection}
                        disabled={resetting}
                        className="flex-1 inline-flex justify-center items-center px-4 py-2 border border-yellow-300 dark:border-yellow-600 rounded-md shadow-sm text-sm font-medium text-yellow-700 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/50 hover:bg-yellow-100 dark:hover:bg-yellow-900/70 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {resetting ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            {t('form.whatsapp.restarting')}
                          </>
                        ) : (
                          t('form.whatsapp.restartConnection')
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowDisconnectModal(true)}
                        disabled={disconnecting}
                        className="flex-1 inline-flex justify-center items-center px-4 py-2 border border-red-300 dark:border-red-600 rounded-md shadow-sm text-sm font-medium text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/50 hover:bg-red-100 dark:hover:bg-red-900/70 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {disconnecting ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            {t('form.whatsapp.disconnecting')}
                          </>
                        ) : (
                          t('form.whatsapp.disconnect')
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {(!formData.credentials.qrCode || isQrCodeExpired()) && !waitingQrCode && (
                      <button
                        type="button"
                        onClick={generateQrCode}
                        disabled={generatingQr}
                        className="w-full inline-flex justify-center items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed h-10"
                      >
                        {generatingQr ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <QrCode className="w-4 h-4 mr-2" />
                        )}
                        {t('form.whatsapp.startConnection')}
                      </button>
                    )}

                    {waitingQrCode && (
                      <div className="flex flex-col items-center p-6 bg-gray-50 dark:bg-gray-700/50 rounded-lg mt-4">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-4" />
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {t('form.whatsapp.waitingQrCode')}
                        </p>
                      </div>
                    )}

                    {formData.credentials.qrCode && !isQrCodeExpired() && !waitingQrCode && (
                      <div className="flex flex-col items-center p-6 bg-gray-50 dark:bg-gray-700/50 rounded-lg mt-4">
                        <QrCode className="w-8 h-8 text-gray-400 mb-4" />
                        <div className="bg-white p-4 rounded-lg">
                          <QRCodeSVG
                            value={formData.credentials.qrCode}
                            size={256}
                            level="L"
                            includeMargin={true}
                            style={{ display: 'block' }}
                          />
                        </div>
                        <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                          {t('form.whatsapp.scanQrCode')}
                        </p>
                        {formData.credentials.qrExpiresAt && (
                          <p className="mt-2 text-sm text-yellow-600 dark:text-yellow-400">
                            {t('form.whatsapp.qrExpiresAt', {
                              time: new Date(formData.credentials.qrExpiresAt).toLocaleTimeString()
                            })}
                          </p>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            <div className="flex space-x-3">
              <button
                type="button"
                onClick={() => {
                  loadAvailableChannels();
                  setShowTransferModal(true);
                }}
                className="flex-1 inline-flex justify-center items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ArrowRightLeft className="w-4 h-4 mr-2" />
                {t('form.whatsapp.transferChats')}
              </button>
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
                disabled={saving || (!id && !formData.is_tested)}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {t('common:saving')}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Modal de Confirmação de Desconexão */}
      {showDisconnectModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 dark:bg-red-900/50 rounded-full mb-4">
                <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white text-center mb-2">
                {t('form.whatsapp.disconnectTitle')}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-6">
                {t('form.whatsapp.disconnectWarning')}
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowDisconnectModal(false)}
                  disabled={disconnecting}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t('common:back')}
                </button>
                <button
                  type="button"
                  onClick={disconnectWhatsApp}
                  disabled={disconnecting}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {disconnecting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {t('form.whatsapp.disconnecting')}
                    </>
                  ) : (
                    t('form.whatsapp.confirmDisconnect')
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmação de exclusão */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              {t('channels:form.whatsapp.deleteConfirmTitle')}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              {t('channels:form.whatsapp.deleteConfirmMessage')}
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md"
              >
                {t('common:cancel')}
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md disabled:opacity-50"
              >
                {deleting ? t('common:deleting') : t('common:delete')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Transferência de Chats */}
      {showTransferModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              {t('channels:form.whatsapp.transferTitle')}
            </h3>
            
            {error && (
              <div className="mb-4 bg-red-50 dark:bg-red-900/50 text-red-700 dark:text-red-400 p-4 rounded-md">
                {error}
              </div>
            )}

            <div className="mb-6">
              <label htmlFor="targetChannel" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('channels:form.whatsapp.selectTargetChannel')}
              </label>
              <select
                id="targetChannel"
                value={selectedChannelId}
                onChange={(e) => setSelectedChannelId(e.target.value)}
                className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="">{t('channels:form.whatsapp.selectChannel')}</option>
                {availableChannels.map(channel => (
                  <option key={channel.id} value={channel.id}>
                    {channel.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowTransferModal(false)}
                disabled={transferring}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md"
              >
                {t('common:cancel')}
              </button>
              <button
                onClick={handleTransferChats}
                disabled={transferring || !selectedChannelId}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50 inline-flex items-center"
              >
                {transferring ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t('channels:form.whatsapp.transferring')}
                  </>
                ) : (
                  t('channels:form.whatsapp.transfer')
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}