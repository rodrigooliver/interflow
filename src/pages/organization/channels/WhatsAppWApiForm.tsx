import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, QrCode, CheckCircle2, XCircle, AlertTriangle, Power, PowerOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { QRCodeSVG } from 'qrcode.react';
import { useOrganization } from '../../../hooks/useOrganization';
import { supabase } from '../../../lib/supabase';

export default function WhatsAppWApiForm() {
  const { t } = useTranslation(['channels', 'common', 'status']);
  const navigate = useNavigate();
  const { id } = useParams();
  const { currentOrganization } = useOrganization();
  const API_URL = import.meta.env.VITE_API_URL;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [generatingQr, setGeneratingQr] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'success' | 'error' | null>(null);
  const [error, setError] = useState('');
  const [subscription, setSubscription] = useState<ReturnType<typeof supabase.channel> | null>(null);
  const [waitingQrCode, setWaitingQrCode] = useState(false);

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
    } else {
      setLoading(false);
    }

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [id, currentOrganization]);

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
        // Ensure credentials object exists and has all required fields
        const credentials = {
          apiHost: '',
          apiConnectionKey: '',
          apiToken: '',
          webhookUrl: '',
          qrCode: '',
          qrExpiresAt: null,
          ...data.credentials
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
      // Ensure API URL is available
      if (!API_URL) {
        throw new Error('API URL is not configured');
      }

      const response = await fetch(`${API_URL}/api/webhook/wapi/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          apiHost: formData.credentials.apiHost,
          apiConnectionKey: formData.credentials.apiConnectionKey,
          apiToken: formData.credentials.apiToken
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to connect to WApi server');
      }

      if (!data.success) {
        throw new Error(data.error || 'Failed to establish WApi connection');
      }

      setConnectionStatus('success');
      setFormData(prev => ({
        ...prev,
        is_tested: true
      }));
      setShowConnectionSettings(false); // Esconde os campos após teste bem-sucedido
    } catch (error: any) {
      console.error('Error testing WApi connection:', error);
      setConnectionStatus('error');
      setError(error.message || t('form.whatsapp.error'));
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
      const response = await fetch(`${API_URL}/api/webhook/wapi/${id}/qr`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to generate QR code');
      }

      if (!data.success) {
        throw new Error(data.error || 'Failed to generate QR code');
      }

      // Removida a atualização do estado waitingQrCode aqui
      // O estado será atualizado quando o QR code chegar via subscription
    } catch (error: any) {
      console.error('Error generating QR code:', error);
      setError(error.message);
      setWaitingQrCode(false);
    } finally {
      setGeneratingQr(false);
      // Não alteramos mais o waitingQrCode aqui
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
      const response = await fetch(`${API_URL}/api/webhook/wapi/${id}/reset`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Falha ao reiniciar conexão');
      }

      if (!data.success) {
        throw new Error(data.error || 'Falha ao reiniciar conexão');
      }

      // Atualiza o estado do formulário
      setFormData(prev => ({
        ...prev,
        is_connected: false,
        credentials: {
          ...prev.credentials,
          qrCode: '',
          qrExpiresAt: null
        }
      }));
      
      // Mostra mensagem de sucesso
      setResetSuccess(true);
      
      // Remove a mensagem de sucesso após 3 segundos
      setTimeout(() => {
        setResetSuccess(false);
      }, 3000);

    } catch (error: any) {
      console.error('Erro ao reiniciar conexão:', error);
      setError(error.message);
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
      const response = await fetch(`${API_URL}/api/webhook/wapi/${id}/disconnect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Falha ao desconectar');
      }

      if (!data.success) {
        throw new Error(data.error || 'Falha ao desconectar');
      }

      // Atualiza o estado do formulário
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
      
      // Remove a mensagem de sucesso após 3 segundos
      setTimeout(() => {
        setDisconnectSuccess(false);
      }, 3000);

    } catch (error: any) {
      console.error('Erro ao desconectar:', error);
      setError(error.message);
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!currentOrganization) return;
    
    setSaving(true);
    setError('');

    try {
      // For new channels, require testing before creation
      if (!id && !formData.is_tested) {
        setError(t('channels:errors.testRequired'));
        setSaving(false);
        return;
      }

      // Generate webhook URL with channel identifier
      const webhookUrl = `${API_URL}/api/webhook/wapi/${id || 'new'}`;

      const credentials = {
        ...formData.credentials,
        webhookUrl
      };

      if (id) {
        // Update existing channel
        const { error } = await supabase
          .from('chat_channels')
          .update({
            name: formData.name,
            credentials,
            is_tested: formData.is_tested,
            is_connected: formData.is_connected,
            status: formData.status,
            updated_at: new Date().toISOString()
          })
          .eq('id', id);

        if (error) throw error;
        
        // Stay on edit page
        await loadChannel();
      } else {
        // Create new channel
        const { data, error } = await supabase
          .from('chat_channels')
          .insert([{
            organization_id: currentOrganization.id,
            name: formData.name,
            type: 'whatsapp_wapi',
            credentials,
            settings: {
              autoReply: true,
              notifyNewTickets: true
            },
            status: 'inactive',
            is_connected: false,
            is_tested: true
          }])
          .select()
          .single();

        if (error) throw error;

        // Redirect to edit page for QR code generation
        navigate(`/app/channels/${data.id}/edit/whatsapp_wapi`);
      }
    } catch (error) {
      console.error('Error saving channel:', error);
      setError(t('common:error'));
    } finally {
      setSaving(false);
    }
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

          {id && (
            <button
              onClick={handleToggleStatus}
              disabled={updatingStatus || !formData.is_tested || !formData.is_connected}
              className={`ml-auto inline-flex items-center px-3 py-2 rounded-md ${
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
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
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
                    {t('form.whatsapp.editConnection')}
                  </button>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 rounded-md p-4">
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    <div className="mb-2">
                      <span className="font-medium">API Host:</span> {formData.credentials.apiHost}
                    </div>
                    <div>
                      <span className="font-medium">
                        {t('form.whatsapp.credentialsConfigured')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6 border-t border-gray-200 dark:border-gray-700 pt-6">
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
                    
                    <div className="flex items-center p-4 bg-green-50 dark:bg-green-900/50 rounded-lg">
                      <CheckCircle2 className="w-5 h-5 text-green-500 dark:text-green-400 mr-2" />
                      <span className="text-green-700 dark:text-green-400">
                        {t('form.whatsapp.connectionSuccess')}
                      </span>
                    </div>
                    
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
    </div>
  );
}