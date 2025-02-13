import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useOrganization } from '../../../hooks/useOrganization';
import { supabase } from '../../../lib/supabase';

export default function FacebookForm() {
  const { t } = useTranslation(['channels', 'common']);
  const navigate = useNavigate();
  const { id } = useParams();
  const { currentOrganization } = useOrganization();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    credentials: {
      appId: '',
      appSecret: '',
      accessToken: '',
      pageId: '',
      webhookUrl: ''
    }
  });

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
        .eq('type', 'facebook')
        .single();

      if (error) throw error;

      if (data) {
        // Ensure credentials object exists and has all required fields
        const credentials = {
          appId: '',
          appSecret: '',
          accessToken: '',
          pageId: '',
          webhookUrl: '',
          ...data.credentials
        };

        setFormData({
          name: data.name || '',
          credentials
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
    if (!currentOrganization) return;

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
            updated_at: new Date().toISOString()
          })
          .eq('id', id);

        if (error) throw error;
      } else {
        // Create new channel
        const { error } = await supabase
          .from('chat_channels')
          .insert([{
            organization_id: currentOrganization.id,
            name: formData.name,
            type: 'facebook',
            credentials: formData.credentials,
            settings: {
              autoReply: true,
              notifyNewTickets: true
            },
            status: 'inactive',
            is_connected: false,
            is_tested: false
          }]);

        if (error) throw error;
      }

      navigate('/channels');
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
              <label htmlFor="appId" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                App ID
              </label>
              <input
                type="text"
                id="appId"
                required
                className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 h-10 px-3"
                value={formData.credentials.appId}
                onChange={(e) => setFormData({
                  ...formData,
                  credentials: { ...formData.credentials, appId: e.target.value }
                })}
              />
            </div>

            <div>
              <label htmlFor="appSecret" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                App Secret
              </label>
              <input
                type="password"
                id="appSecret"
                required
                className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 h-10 px-3"
                value={formData.credentials.appSecret}
                onChange={(e) => setFormData({
                  ...formData,
                  credentials: { ...formData.credentials, appSecret: e.target.value }
                })}
              />
            </div>

            <div>
              <label htmlFor="accessToken" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Access Token
              </label>
              <input
                type="password"
                id="accessToken"
                required
                className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 h-10 px-3"
                value={formData.credentials.accessToken}
                onChange={(e) => setFormData({
                  ...formData,
                  credentials: { ...formData.credentials, accessToken: e.target.value }
                })}
              />
            </div>

            <div>
              <label htmlFor="pageId" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Page ID
              </label>
              <input
                type="text"
                id="pageId"
                required
                className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 h-10 px-3"
                value={formData.credentials.pageId}
                onChange={(e) => setFormData({
                  ...formData,
                  credentials: { ...formData.credentials, pageId: e.target.value }
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
                onClick={() => navigate('/channels')}
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
      </div>
    </div>
  );
}