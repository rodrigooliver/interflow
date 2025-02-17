import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { SettingsSidebar } from '../../components/settings/SettingsSidebar';
import { Brain, HardDrive, Plus, Loader2, X, Trash2, Edit2 } from 'lucide-react';
import { useOrganization } from '../../hooks/useOrganization';
import { supabase } from '../../lib/supabase';
import { IntegrationForm } from '../../components/settings/IntegrationForm';
import { Integration } from '../../types/database';

  
interface IntegrationConfig {
    type: 'openai' | 'aws_s3';
    name: string;
    icon: React.ElementType;
    fields: {
        key: string;
        label: string;
        type: 'text' | 'password';
        placeholder: string;
        required: boolean;
    }[];
}

const integrationConfigs: IntegrationConfig[] = [
    {
        type: 'openai',
        name: 'OpenAI',
        icon: () => (
          <img 
            src="/openai.svg" 
            alt="OpenAI Logo" 
            className="w-8 h-8 transition-all dark:invert dark:brightness-200"
          />
        ),
        fields: [
        {
            key: 'api_key',
            label: 'API Key',
            type: 'password',
            placeholder: 'sk-...',
            required: true
        },
        {
            key: 'organization_id',
            label: 'Organization ID',
            type: 'text',
            placeholder: 'org-...',
            required: false
        }
        ]
    },
    {
        type: 'aws_s3',
        name: 'AWS S3',
        icon: HardDrive,
        fields: [
        {
            key: 'access_key_id',
            label: 'Access Key ID',
            type: 'text',
            placeholder: 'AKIA...',
            required: true
        },
        {
            key: 'secret_access_key',
            label: 'Secret Access Key',
            type: 'password',
            placeholder: 'Your AWS secret key',
            required: true
        },
        {
            key: 'region',
            label: 'Region',
            type: 'text',
            placeholder: 'us-east-1',
            required: true
        },
        {
            key: 'bucket',
            label: 'Bucket Name',
            type: 'text',
            placeholder: 'my-bucket',
            required: true
        }
        ]
    }
];

export default function IntegrationsPage() {
  const { t } = useTranslation(['settings', 'common']);
  const { currentOrganization } = useOrganization();
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);
  const [selectedType, setSelectedType] = useState<'openai' | 'aws_s3'>('openai');
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [integrationToDelete, setIntegrationToDelete] = useState<Integration | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function loadIntegrations() {
    if (!currentOrganization) return;

    try {
      const { data, error } = await supabase
        .from('integrations')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setIntegrations(data || []);
    } catch (error) {
      console.error('Error loading integrations:', error);
      setError(t('common:error'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (currentOrganization) {
      loadIntegrations();
    }
  }, [currentOrganization]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrganization) return;

    setSaving(true);
    setError('');

    try {
      const { title, ...credentials } = formData;
      const { error } = await supabase
        .from('integrations')
        .insert([{
          organization_id: currentOrganization.id,
          title,
          type: selectedType,
          credentials,
          status: 'active'
        }]);

      if (error) throw error;

      await loadIntegrations();
      setShowAddModal(false);
      setFormData({});
    } catch (error) {
      console.error('Error adding integration:', error);
      setError(t('common:error'));
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrganization || !selectedIntegration) return;

    setSaving(true);
    setError('');

    try {
      const { title, ...credentials } = formData;
      const { error } = await supabase
        .from('integrations')
        .update({
          title,
          credentials,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedIntegration.id);

      if (error) throw error;

      await loadIntegrations();
      setShowEditModal(false);
      setSelectedIntegration(null);
      setFormData({});
    } catch (error) {
      console.error('Error updating integration:', error);
      setError(t('common:error'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (integration: Integration) => {
    setDeletingId(integration.id);
    try {
      const { error } = await supabase
        .from('integrations')
        .delete()
        .eq('id', integration.id);

      if (error) throw error;

      await loadIntegrations();
      setShowDeleteModal(false);
      setIntegrationToDelete(null);
    } catch (error) {
      console.error('Error deleting integration:', error);
      setError(t('common:error'));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto flex gap-6">
        <SettingsSidebar />
        
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            {t('settings:integrations.title')}
          </h1>

          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                  {t('settings:integrations.title')}
                </h2>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {t('settings:integrations.add')}
                </button>
              </div>

              {error && (
                <div className="bg-red-50 dark:bg-red-900/50 text-red-700 dark:text-red-400 p-4 rounded-lg">
                  {error}
                </div>
              )}

              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="flex flex-col items-center space-y-4">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {t('common:loading')}
                    </p>
                  </div>
                </div>
              ) : integrations.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {t('settings:integrations.noIntegrations')}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-6">
                  {integrations.map((integration) => {
                    const config = integrationConfigs.find(c => c.type === integration.type);
                    if (!config) return null;

                    const Icon = config.icon;

                    return (
                      <div key={integration.id} className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div className="flex-shrink-0">
                              <Icon />
                            </div>
                            <div className="ml-4">
                              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                                {integration.title}
                              </h3>
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                {config.name} - {t('settings:integrations.lastUpdated')}: {new Date(integration.updated_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => {
                                setSelectedIntegration(integration);
                                setSelectedType(integration.type);
                                setFormData(integration.credentials);
                                setShowEditModal(true);
                              }}
                              className="p-2 text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-full"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setIntegrationToDelete(integration);
                                setShowDeleteModal(true);
                              }}
                              className="p-2 text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-full"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Add Integration Modal */}
              {showAddModal && (
                <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4">
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
                    <div className="flex justify-between items-center p-6 border-b dark:border-gray-700">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                        {t('settings:integrations.add')}
                      </h3>
                      <button
                        onClick={() => {
                          setShowAddModal(false);
                          setFormData({});
                        }}
                        className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="p-6">
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          {t('settings:integrations.type')}
                        </label>
                        <select
                          value={selectedType}
                          onChange={(e) => setSelectedType(e.target.value as 'openai' | 'aws_s3')}
                          className="w-full p-2 border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-blue-500"
                        >
                          {integrationConfigs.map(config => (
                            <option key={config.type} value={config.type}>
                              {config.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <IntegrationForm
                        type={selectedType}
                        formData={formData}
                        setFormData={setFormData}
                        onSubmit={handleAdd}
                        onCancel={() => {
                          setShowAddModal(false);
                          setFormData({});
                        }}
                        saving={saving}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Edit Integration Modal */}
              {showEditModal && selectedIntegration && (
                <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4">
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
                    <div className="flex justify-between items-center p-6 border-b dark:border-gray-700">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                        {t('settings:integrations.edit')}
                      </h3>
                      <button
                        onClick={() => {
                          setShowEditModal(false);
                          setSelectedIntegration(null);
                          setFormData({});
                        }}
                        className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="p-6">
                      <IntegrationForm
                        type={selectedType}
                        formData={formData}
                        setFormData={setFormData}
                        onSubmit={handleEdit}
                        onCancel={() => {
                          setShowEditModal(false);
                          setSelectedIntegration(null);
                          setFormData({});
                        }}
                        saving={saving}
                        integrationId={selectedIntegration.id}
                      />
                    </div>
                  </div>
                </div>
              )}

              {showDeleteModal && integrationToDelete && (
                <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4">
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                      {t('settings:integrations.deleteConfirmation')}
                    </h3>
                    <div className="mt-6 flex justify-end space-x-3">
                      <button
                        onClick={() => {
                          setShowDeleteModal(false);
                          setIntegrationToDelete(null);
                        }}
                        disabled={deletingId === integrationToDelete.id}
                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {t('common:cancel')}
                      </button>
                      <button
                        onClick={() => handleDelete(integrationToDelete)}
                        disabled={deletingId === integrationToDelete.id}
                        className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {deletingId === integrationToDelete.id ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            {t('common:deleting')}
                          </>
                        ) : (
                          t('settings:integrations.delete')
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 