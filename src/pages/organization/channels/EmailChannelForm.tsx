import React, { useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useOrganizationContext } from '../../../contexts/OrganizationContext';
import { supabase } from '../../../lib/supabase';

export default function EmailChannelForm() {
  const { t } = useTranslation(['channels', 'common']);
  const navigate = useNavigate();
  const { id } = useParams();
  const { currentOrganization } = useOrganizationContext();
  const API_URL = import.meta.env.VITE_API_URL;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'success' | 'error' | null>(null);
  const [error, setError] = useState('');

  // Form state with default values
  const [formData, setFormData] = useState({
    name: '',
    host: '',
    port: 993,
    secure: true,
    username: '',
    password: '',
    fromName: '',
    pollingInterval: 60,
    smtpHost: '',
    smtpPort: 587,
    smtpSecure: true,
    smtpUsername: '',
    smtpPassword: '',
    is_tested: false,
    is_connected: false
  });

  React.useEffect(() => {
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
        .eq('type', 'email')
        .single();

      if (error) throw error;

      if (data) {
        const credentials = data.credentials || {};
        setFormData({
          name: data.name || '',
          host: credentials.host || '',
          port: credentials.port || 993,
          secure: credentials.secure ?? true,
          username: credentials.username || '',
          password: credentials.password || '',
          fromName: credentials.fromName || '',
          pollingInterval: credentials.pollingInterval || 60,
          smtpHost: credentials.smtpHost || '',
          smtpPort: credentials.smtpPort || 587,
          smtpSecure: credentials.smtpSecure ?? true,
          smtpUsername: credentials.smtpUsername || '',
          smtpPassword: credentials.smtpPassword || '',
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

  const validateConfig = () => {
    // Validate IMAP settings
    if (!formData.host) return 'IMAP server is required';
    if (!formData.port) return 'IMAP port is required';
    if (!formData.username) return 'Email is required';
    if (!formData.password) return 'Password is required';

    // Validate SMTP settings
    if (!formData.smtpHost) return 'SMTP server is required';
    if (!formData.smtpPort) return 'SMTP port is required';
    if (!formData.smtpUsername) return 'SMTP username is required';
    if (!formData.smtpPassword) return 'SMTP password is required';
    if (!formData.fromName) return 'Sender name is required';

    return null;
  };

  const testEmailConnection = async () => {
    setTesting(true);
    setConnectionStatus(null);
    setError('');

    // Validate configuration before testing
    const validationError = validateConfig();
    if (validationError) {
      setConnectionStatus('error');
      setError(validationError);
      setTesting(false);
      return;
    }
    
    try {
      // Ensure API URL is available
      if (!API_URL) {
        throw new Error('API URL is not configured');
      }

      const response = await fetch(`${API_URL}/api/test-email-connection`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          // IMAP settings
          host: formData.host,
          port: formData.port,
          secure: formData.secure,
          username: formData.username,
          password: formData.password,
          
          // SMTP settings
          smtpHost: formData.smtpHost,
          smtpPort: formData.smtpPort,
          smtpSecure: formData.smtpSecure,
          smtpUsername: formData.smtpUsername,
          smtpPassword: formData.smtpPassword,
          
          // Other settings
          fromName: formData.fromName,
          pollingInterval: formData.pollingInterval
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to connect to email server');
      }

      if (!data.success) {
        throw new Error(data.error || 'Failed to establish email connection');
      }

      setConnectionStatus('success');
      setFormData(prev => ({
        ...prev,
        is_tested: true,
        is_connected: true
      }));
    } catch (error: any) {
      console.error('Error testing email connection:', error);
      setConnectionStatus('error');
      setError(error.message || t('form.email.error'));
    } finally {
      setTesting(false);
    }
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!currentOrganization) return;
    
    setSaving(true);
    setError('');

    try {
      const credentials = {
        host: formData.host,
        port: formData.port,
        secure: formData.secure,
        username: formData.username,
        password: formData.password,
        fromName: formData.fromName,
        pollingInterval: formData.pollingInterval,
        smtpHost: formData.smtpHost,
        smtpPort: formData.smtpPort,
        smtpSecure: formData.smtpSecure,
        smtpUsername: formData.smtpUsername,
        smtpPassword: formData.smtpPassword
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
      } else {
        // For new channels, require testing before creation
        if (!formData.is_tested) {
          setError(t('channels:errors.testRequired'));
          setSaving(false);
          return;
        }

        // Create new channel
        const { error } = await supabase
          .from('chat_channels')
          .insert([{
            organization_id: currentOrganization.id,
            name: formData.name,
            type: 'email',
            credentials,
            settings: {
              autoReply: true,
              notifyNewTickets: true
            },
            status: 'inactive',
            is_connected: true, // Auto set connected for new channels after testing
            is_tested: true
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

            {/* IMAP Settings */}
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-4">IMAP Settings</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('form.email.server')}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="imap.gmail.com"
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 h-10 px-3"
                    value={formData.host}
                    onChange={(e) => setFormData({ ...formData, host: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {t('form.email.port')}
                    </label>
                    <input
                      type="number"
                      required
                      className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 h-10 px-3"
                      value={formData.port}
                      onChange={(e) => setFormData({ ...formData, port: parseInt(e.target.value) })}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {t('form.email.secure')}
                    </label>
                    <select
                      className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 h-10 px-3"
                      value={formData.secure.toString()}
                      onChange={(e) => setFormData({ ...formData, secure: e.target.value === 'true' })}
                    >
                      <option value="true">{t('form.email.secureYes')}</option>
                      <option value="false">{t('form.email.secureNo')}</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('form.email.username')}
                  </label>
                  <input
                    type="email"
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 h-10 px-3"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('form.email.password')}
                  </label>
                  <input
                    type="password"
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 h-10 px-3"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  />
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {t('form.email.passwordHint')}
                  </p>
                </div>
              </div>
            </div>

            {/* SMTP Settings */}
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-4">SMTP Settings</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    SMTP Server
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="smtp.gmail.com"
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 h-10 px-3"
                    value={formData.smtpHost}
                    onChange={(e) => setFormData({ ...formData, smtpHost: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      SMTP Port
                    </label>
                    <input
                      type="number"
                      required
                      className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 h-10 px-3"
                      value={formData.smtpPort}
                      onChange={(e) => setFormData({ ...formData, smtpPort: parseInt(e.target.value) })}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      SMTP Secure
                    </label>
                    <select
                      className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 h-10 px-3"
                      value={formData.smtpSecure.toString()}
                      onChange={(e) => setFormData({ ...formData, smtpSecure: e.target.value === 'true' })}
                    >
                      <option value="true">{t('form.email.secureYes')}</option>
                      <option value="false">{t('form.email.secureNo')}</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    SMTP Username
                  </label>
                  <input
                    type="email"
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 h-10 px-3"
                    value={formData.smtpUsername}
                    onChange={(e) => setFormData({ ...formData, smtpUsername: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    SMTP Password
                  </label>
                  <input
                    type="password"
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 h-10 px-3"
                    value={formData.smtpPassword}
                    onChange={(e) => setFormData({ ...formData, smtpPassword: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Other Settings */}
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-4">Other Settings</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('form.email.senderName')}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Support"
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 h-10 px-3"
                    value={formData.fromName}
                    onChange={(e) => setFormData({ ...formData, fromName: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('form.email.pollingInterval')}
                  </label>
                  <input
                    type="number"
                    required
                    min="30"
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 h-10 px-3"
                    value={formData.pollingInterval}
                    onChange={(e) => setFormData({ ...formData, pollingInterval: parseInt(e.target.value) })}
                  />
                </div>
              </div>
            </div>

            {/* Test Connection Button */}
            <div>
              <button
                type="button"
                onClick={testEmailConnection}
                disabled={testing}
                className="w-full inline-flex justify-center items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed h-10"
              >
                {testing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t('form.email.testing')}
                  </>
                ) : (
                  t('form.email.testConnection')
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
                      ? t('form.email.success')
                      : error || t('form.email.error')}
                  </span>
                </div>
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
    </div>
  );
}