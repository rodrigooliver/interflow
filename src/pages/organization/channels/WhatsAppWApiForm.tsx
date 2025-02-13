import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, QrCode, CheckCircle2, XCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useOrganization } from '../../../hooks/useOrganization';
import { supabase } from '../../../lib/supabase';

export default function WhatsAppWApiForm() {
  const { t } = useTranslation(['channels', 'common']);
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
  const [formData, setFormData] = useState({
    name: '',
    credentials: {
      apiHost: '',
      apiConnectionKey: '',
      apiToken: '',
      webhookUrl: '',
      qrCode: ''
    },
    is_tested: false,
    is_connected: false
  });

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
      setFormData({
        ...formData,
        credentials: { 
          ...formData.credentials, 
          apiHost: validHost || value 
        }
      });
      setError('');
    } else {
      setError(t('form.whatsapp.invalidHost'));
    }
  };

  useEffect(() => {
    if (id && currentOrganization) {
      loadChannel();
    } else {
      setLoading(false);
    }
  }, [id, currentOrganization]);

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
          ...data.credentials
        };

        setFormData({
          name: data.name || '',
          credentials,
          is_tested: data.is_tested || false,
          is_connected: data.is_connected || false
        });
      }
    } catch (error) {
      console.error('Error loading channel:', error);
      setError(t('common:error'));
    } finally {
      setLoading(false);
    }
  }

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

      // Update form data with QR code
      setFormData(prev => ({
        ...prev,
        credentials: {
          ...prev.credentials,
          qrCode: data.data.qrCode
        }
      }));

      // Reload channel to get updated status
      await loadChannel();
    } catch (error: any) {
      console.error('Error generating QR code:', error);
      setError(error.message);
    } finally {
      setGeneratingQr(false);
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
        navigate(`/channels/${data.id}/edit/whatsapp_wapi`);
      }
    } catch (error) {
      console.error('Error saving channel:', error);
      setError(t('common:error'));
    } finally {
      setSaving(false);
    }
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
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center mb-6">
          <button
            onClick={() => navigate('/channels')}
            className="mr-4 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {id ? t('form.title.edit') : t('form.title.create')}
          </h1>
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
                  credentials: { ...formData.credentials, apiConnectionKey: e.target.value }
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
                  credentials: { ...formData.credentials, apiToken: e.target.value }
                })}
              />
            </div>

            <div className="space-y-6">
              {/* Test Connection Button */}
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

              {connectionStatus && (
                <div className={`p-4 rounded-md ${
                  connectionStatus === 'success' 
                    ? 'bg-green-50 dark:bg-green-900/50 text-green-700 dark:text-green-400'
                    : 'bg-red-50 dark:bg-red-900/50 text-red-700 dark:text-red-400'
                }`}>
                  <div className="flex items-center">
                    {connectionStatus === 'success' ? (
                      <CheckCircle2 className="w-5 h-5 mr-2" />
                    ) : (
                      <XCircle className="w-5 h-5 mr-2" />
                    )}
                    <span>
                      {connectionStatus === 'success' 
                        ? t('form.whatsapp.success')
                        : error || t('form.whatsapp.error')}
                    </span>
                  </div>
                </div>
              )}

              {/* QR Code Section */}
              {id && formData.is_tested && (
                <div>
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
                    Generate QR Code
                  </button>

                  {formData.credentials.qrCode && (
                    <div className="flex flex-col items-center p-6 bg-gray-50 dark:bg-gray-700/50 rounded-lg mt-4">
                      <QrCode className="w-8 h-8 text-gray-400 mb-4" />
                      <img
                        src={formData.credentials.qrCode}
                        alt="QR Code"
                        className="max-w-xs"
                      />
                      <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                        {t('form.whatsapp.scanQrCode')}
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => navigate('/channels')}
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
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}