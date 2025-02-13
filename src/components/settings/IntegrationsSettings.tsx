import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Brain, HardDrive, Plus, Loader2, X, AlertTriangle } from 'lucide-react';
import { useOrganization } from '../../hooks/useOrganization';
import { supabase } from '../../lib/supabase';

interface Integration {
  id: string;
  organization_id: string;
  type: 'openai' | 'aws_s3';
  credentials: {
    [key: string]: string;
  };
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

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
    icon: Brain,
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

export function IntegrationsSettings() {
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

  useEffect(() => {
    if (currentOrganization) {
      loadIntegrations();
    }
  }, [currentOrganization]);

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

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrganization) return;

    setSaving(true);
    setError('');

    try {
      const { error } = await supabase
        .from('integrations')
        .insert([{
          organization_id: currentOrganization.id,
          type: selectedType,
          credentials: formData,
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
      const { error } = await supabase
        .from('integrations')
        .update({
          credentials: formData,
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
    if (!confirm(t('settings:integrations.deleteConfirmation'))) return;

    try {
      const { error } = await supabase
        .from('integrations')
        .delete()
        .eq('id', integration.id);

      if (error) throw error;

      await loadIntegrations();
    } catch (error) {
      console.error('Error deleting integration:', error);
      setError(t('common:error'));
    }
  };

  const renderIntegrationForm = (type: 'openai' | 'aws_s3') => {
    const config = integrationConfigs.find(c => c.type === type);
    if (!config) return null;

    return (
      <div className="space-y-4">
        {config.fields.map(field => (
          <div key={field.key}>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {field.label} {field.required && '*'}
            </label>
            <input
              type={field.type}
              required={field.required}
              placeholder={field.placeholder}
              value={formData[field.key] || ''}
              onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
              className="w-full p-2 border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
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
                    <Icon className="h-8 w-8 text-gray-400" />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                      {config.name}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {t('settings:integrations.lastUpdated')}: {new Date(integration.updated_at).toLocaleDateString()}
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
                    className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    {t('settings:integrations.edit')}
                  </button>
                  <button
                    onClick={() => handleDelete(integration)}
                    className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                  >
                    {t('settings:integrations.delete')}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

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

            <form onSubmit={handleAdd} className="p-6">
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

              {renderIntegrationForm(selectedType)}

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setFormData({});
                  }}
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

            <form onSubmit={handleEdit} className="p-6">
              {renderIntegrationForm(selectedType)}

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedIntegration(null);
                    setFormData({});
                  }}
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
      )}
    </div>
  );
}