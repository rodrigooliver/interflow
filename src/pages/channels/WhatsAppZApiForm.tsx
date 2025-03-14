import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuthContext } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

export default function WhatsAppZApiForm() {
  const { t } = useTranslation(['channels', 'common']);
  const navigate = useNavigate();
  const { id } = useParams();
  const { currentOrganizationMember } = useAuthContext();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    credentials: {
      instanceId: '',
      token: '',
      webhookUrl: ''
    }
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
        .eq('type', 'whatsapp_zapi')
        .single();

      if (error) throw error;

      if (data) {
        setFormData({
          name: data.name,
          credentials: data.credentials || {}
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
            type: 'whatsapp_zapi',
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

            <div>
              <label htmlFor="instanceId" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Instance ID
              </label>
              <input
                type="text"
                id="instanceId"
                required
                className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 h-10 px-3"
                value={formData.credentials.instanceId}
                onChange={(e) => setFormData({
                  ...formData,
                  credentials: { ...formData.credentials, instanceId: e.target.value }
                })}
              />
            </div>

            <div>
              <label htmlFor="token" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Token
              </label>
              <input
                type="password"
                id="token"
                required
                className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 h-10 px-3"
                value={formData.credentials.token}
                onChange={(e) => setFormData({
                  ...formData,
                  credentials: { ...formData.credentials, token: e.target.value }
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
      </div>
    </div>
  );
}