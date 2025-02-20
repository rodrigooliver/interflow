import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { Loader2, ArrowLeft } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Integration } from '../../types/database';
import { useOrganizationContext } from '../../contexts/OrganizationContext';

export default function PromptFormPage() {
  const { t } = useTranslation(['prompts', 'common']);
  const navigate = useNavigate();
  const { id } = useParams(); // para edição
  const { currentOrganization } = useOrganizationContext();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    description: '',
    tags: [] as string[]
  });
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);
  const [chatMessages, setChatMessages] = useState<Array<{role: 'user' | 'assistant', content: string}>>([]);
  const [testMessage, setTestMessage] = useState('');
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    if (id) {
      loadPrompt();
    }
    loadIntegrations();
  }, [id, currentOrganization]);

  async function loadPrompt() {
    try {
      const { data, error } = await supabase
        .from('prompts')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      if (data) {
        setFormData({
          title: data.title,
          content: data.content,
          description: data.description || '',
          tags: data.tags || []
        });
      }
    } catch (error) {
      console.error('Error loading prompt:', error);
      setError(t('common:error'));
    }
  }

  async function loadIntegrations() {
    if (!currentOrganization) return;
    
    try {
      const { data, error } = await supabase
        .from('integrations')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .eq('type', 'openai')
        .eq('status', 'active');

      if (error) throw error;
      setIntegrations(data || []);
      if (data && data.length > 0) {
        setSelectedIntegration(data[0]);
      }
    } catch (error) {
      console.error('Erro ao carregar integrações:', error);
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrganization) return;

    setSaving(true);
    setError('');

    try {
      if (id) {
        // Atualização
        const { error } = await supabase
          .from('prompts')
          .update({
            title: formData.title,
            content: formData.content,
            description: formData.description || null,
            tags: formData.tags,
            updated_at: new Date().toISOString()
          })
          .eq('id', id);

        if (error) throw error;
      } else {
        // Criação
        const { error } = await supabase
          .from('prompts')
          .insert([{
            organization_id: currentOrganization.id,
            title: formData.title,
            content: formData.content,
            description: formData.description || null,
            tags: formData.tags
          }]);

        if (error) throw error;
      }

      navigate('/app/prompts');
    } catch (error) {
      console.error('Error saving prompt:', error);
      setError(t('common:error'));
    } finally {
      setSaving(false);
    }
  };

  async function handleTestPrompt() {
    if (!selectedIntegration || !testMessage) return;
    
    setTesting(true);
    try {
      const promptContent = formData.content.replace(/{{input}}/g, testMessage);
      
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${selectedIntegration.credentials.api_key}`
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: [
            { role: "user", content: promptContent }
          ]
        })
      });

      const data = await response.json();
      
      if (data.error) throw new Error(data.error.message);
      
      setChatMessages(prev => [
        ...prev,
        { role: 'user', content: testMessage },
        { role: 'assistant', content: data.choices[0].message.content }
      ]);
      
      setTestMessage('');
    } catch (error) {
      console.error('Erro ao testar prompt:', error);
      setError(t('common:error'));
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex gap-6">
        <div className="flex-1">
          <div className="flex items-center mb-6">
            <button
              onClick={() => navigate('/app/prompts')}
              className="mr-4 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full"
            >
              <ArrowLeft className="w-5 h-5 text-gray-700 dark:text-gray-300" />
            </button>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {id ? t('prompts:edit') : t('prompts:add')}
            </h1>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 dark:bg-red-900/50 text-red-700 dark:text-red-400 p-3 rounded-md">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('prompts:form.title')} *
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full p-2 border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('prompts:form.description')}
              </label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full p-2 border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('prompts:form.content')} *
              </label>
              <textarea
                required
                rows={10}
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                className="w-full p-2 border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('prompts:form.tags')}
              </label>
              <input
                type="text"
                value={formData.tags.join(', ')}
                onChange={(e) => setFormData({
                  ...formData,
                  tags: e.target.value.split(',').map(tag => tag.trim()).filter(Boolean)
                })}
                placeholder={t('prompts:form.tagsPlaceholder')}
                className="w-full p-2 border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => navigate('/app/prompts')}
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
                {t('common:save')}
              </button>
            </div>
          </form>
        </div>

        <div className="w-96 border-l pl-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-700 dark:text-gray-300 mb-1">{t('prompts:test')}</h2>
          
          <div className="mb-4">
            <select
              value={selectedIntegration?.id || ''}
              onChange={(e) => setSelectedIntegration(integrations.find(i => i.id === e.target.value) || null)}
              className="w-full p-2 border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              {integrations.map(integration => (
                <option key={integration.id} value={integration.id} className="text-gray-900 dark:text-white">
                  OpenAI - {integration.name || integration.id}
                </option>
              ))}
            </select>
          </div>

          <div className="h-96 border rounded-md mb-4 p-4 overflow-y-auto border-gray-300 dark:border-gray-600">
            {chatMessages.map((message, index) => (
              <div key={index} className={`mb-3 ${message.role === 'assistant' ? 'pl-4' : 'pr-4'}`}>
                <div className={`p-2 rounded-lg ${
                  message.role === 'assistant' 
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-gray-900 dark:text-white' 
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white'
                }`}>
                  {message.content}
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={testMessage}
              onChange={(e) => setTestMessage(e.target.value)}
              placeholder={t('prompts:testPlaceholder')}
              className="flex-1 p-2 border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
            <button
              onClick={handleTestPrompt}
              disabled={testing || !selectedIntegration}
              className="px-4 py-2 bg-blue-600 text-white rounded-md disabled:opacity-50"
            >
              {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : t('prompts:send')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 