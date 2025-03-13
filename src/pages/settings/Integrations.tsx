import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { SettingsTabs } from '../../components/settings/SettingsTabs';
import { HardDrive, Plus, Loader2, X, Trash2, Edit2 } from 'lucide-react';
import { useOrganizationContext } from '../../contexts/OrganizationContext';
import { supabase } from '../../lib/supabase';
import { Integration } from '../../types/database';
import { IntegrationFormOpenAI } from '../../components/settings/IntegrationFormOpenAI';
import { IntegrationFormS3 } from '../../components/settings/IntegrationFormS3';

  
interface IntegrationConfig {
    type: 'openai' | 'aws_s3';
    name: string;
    icon: React.ElementType;
}

const integrationConfigs: IntegrationConfig[] = [
    {
        type: 'openai',
        name: 'OpenAI',
        icon: () => (
          <img 
            src="/images/logos/openai.svg" 
            alt="OpenAI Logo" 
            className="w-6 h-6 sm:w-8 sm:h-8 transition-all dark:invert dark:brightness-200"
          />
        )
    },
    {
        type: 'aws_s3',
        name: 'AWS S3',
        icon: HardDrive
    }
];

export default function IntegrationsPage() {
  const { t } = useTranslation(['settings', 'common']);
  const { currentOrganization } = useOrganizationContext();
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddOpenAIModal, setShowAddOpenAIModal] = useState(false);
  const [showAddS3Modal, setShowAddS3Modal] = useState(false);
  const [showEditOpenAIModal, setShowEditOpenAIModal] = useState(false);
  const [showEditS3Modal, setShowEditS3Modal] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);
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

  const handleAddSuccess = async () => {
    await loadIntegrations();
    setShowAddOpenAIModal(false);
    setShowAddS3Modal(false);
  };

  const handleEditSuccess = async () => {
    await loadIntegrations();
    setShowEditOpenAIModal(false);
    setShowEditS3Modal(false);
    setSelectedIntegration(null);
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
    <div className="p-3 sm:p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        <SettingsTabs />
        
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-3 sm:p-4 md:p-6">
          <div className="flex flex-col gap-4 sm:gap-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-0">
              <h1 className="text-lg font-medium text-gray-900 dark:text-white">
                {t('settings:integrations.title')}
              </h1>
              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                <button
                  onClick={() => setShowAddOpenAIModal(true)}
                  className="inline-flex items-center justify-center px-3 sm:px-4 py-2 border border-transparent rounded-md shadow-sm text-xs sm:text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                  {t('settings:integrations.addOpenAI')}
                </button>
                <button
                  onClick={() => setShowAddS3Modal(true)}
                  className="inline-flex items-center justify-center px-3 sm:px-4 py-2 border border-transparent rounded-md shadow-sm text-xs sm:text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                  {t('settings:integrations.addS3')}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 dark:bg-red-900/50 text-red-700 dark:text-red-400 p-3 sm:p-4 rounded-lg text-xs sm:text-sm">
                {error}
              </div>
            )}

            {loading ? (
              <div className="flex items-center justify-center py-8 sm:py-12">
                <div className="flex flex-col items-center space-y-3 sm:space-y-4">
                  <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 animate-spin text-blue-500" />
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                    {t('common:loading')}
                  </p>
                </div>
              </div>
            ) : integrations.length === 0 ? (
              <div className="text-center py-8 sm:py-12">
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                  {t('settings:integrations.noIntegrations')}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:gap-4">
                {integrations.map((integration) => {
                  const config = integrationConfigs.find(c => c.type === integration.type);
                  if (!config) return null;

                  const Icon = config.icon;

                  return (
                    <div key={integration.id} className="bg-white dark:bg-gray-800 shadow rounded-lg p-3 sm:p-4 md:p-6 border border-gray-200 dark:border-gray-700">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="flex-shrink-0">
                            <Icon />
                          </div>
                          <div className="ml-3 sm:ml-4">
                            <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-white">
                              {integration.title}
                            </h3>
                            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                              {config.name} - {t('settings:integrations.lastUpdated')}: {new Date(integration.updated_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-1 sm:space-x-2">
                          <button
                            onClick={() => {
                              setSelectedIntegration(integration);
                              if (integration.type === 'openai') {
                                setShowEditOpenAIModal(true);
                              } else if (integration.type === 'aws_s3') {
                                setShowEditS3Modal(true);
                              }
                            }}
                            className="p-1.5 sm:p-2 text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-full"
                            aria-label={t('common:edit')}
                          >
                            <Edit2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setIntegrationToDelete(integration);
                              setShowDeleteModal(true);
                            }}
                            className="p-1.5 sm:p-2 text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-full"
                            aria-label={t('common:delete')}
                          >
                            <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Add OpenAI Integration Modal */}
            {showAddOpenAIModal && (
              <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-2 sm:p-4 z-50 overflow-y-auto">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] flex flex-col">
                  <div className="flex justify-between items-center p-3 sm:p-4 md:p-6 border-b dark:border-gray-700">
                    <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-white">
                      {t('settings:integrations.addOpenAI')}
                    </h3>
                    <button
                      onClick={() => setShowAddOpenAIModal(false)}
                      className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                      aria-label={t('common:close')}
                    >
                      <X className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                  </div>

                  <div className="p-3 sm:p-4 md:p-6 overflow-y-auto">
                    <IntegrationFormOpenAI
                      onSuccess={handleAddSuccess}
                      onCancel={() => setShowAddOpenAIModal(false)}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Add S3 Integration Modal */}
            {showAddS3Modal && (
              <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-2 sm:p-4 z-50 overflow-y-auto">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] flex flex-col">
                  <div className="flex justify-between items-center p-3 sm:p-4 md:p-6 border-b dark:border-gray-700">
                    <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-white">
                      {t('settings:integrations.addS3')}
                    </h3>
                    <button
                      onClick={() => setShowAddS3Modal(false)}
                      className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                      aria-label={t('common:close')}
                    >
                      <X className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                  </div>

                  <div className="p-3 sm:p-4 md:p-6 overflow-y-auto">
                    <IntegrationFormS3
                      onSuccess={handleAddSuccess}
                      onCancel={() => setShowAddS3Modal(false)}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Edit OpenAI Integration Modal */}
            {showEditOpenAIModal && selectedIntegration && (
              <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-2 sm:p-4 z-50 overflow-y-auto">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] flex flex-col">
                  <div className="flex justify-between items-center p-3 sm:p-4 md:p-6 border-b dark:border-gray-700">
                    <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-white">
                      {t('settings:integrations.editOpenAI')}
                    </h3>
                    <button
                      onClick={() => {
                        setShowEditOpenAIModal(false);
                        setSelectedIntegration(null);
                      }}
                      className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                      aria-label={t('common:close')}
                    >
                      <X className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                  </div>

                  <div className="p-3 sm:p-4 md:p-6 overflow-y-auto">
                    <IntegrationFormOpenAI
                      onSuccess={handleEditSuccess}
                      onCancel={() => {
                        setShowEditOpenAIModal(false);
                        setSelectedIntegration(null);
                      }}
                      integrationId={selectedIntegration.id}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Edit S3 Integration Modal */}
            {showEditS3Modal && selectedIntegration && (
              <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-2 sm:p-4 z-50 overflow-y-auto">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] flex flex-col">
                  <div className="flex justify-between items-center p-3 sm:p-4 md:p-6 border-b dark:border-gray-700">
                    <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-white">
                      {t('settings:integrations.editS3')}
                    </h3>
                    <button
                      onClick={() => {
                        setShowEditS3Modal(false);
                        setSelectedIntegration(null);
                      }}
                      className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                      aria-label={t('common:close')}
                    >
                      <X className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                  </div>

                  <div className="p-3 sm:p-4 md:p-6 overflow-y-auto">
                    <IntegrationFormS3
                      onSuccess={handleEditSuccess}
                      onCancel={() => {
                        setShowEditS3Modal(false);
                        setSelectedIntegration(null);
                      }}
                      integrationId={selectedIntegration.id}
                    />
                  </div>
                </div>
              </div>
            )}

            {showDeleteModal && integrationToDelete && (
              <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-2 sm:p-4 z-50 overflow-y-auto">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] flex flex-col">
                  <div className="p-3 sm:p-4 md:p-6 overflow-y-auto">
                    <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-white mb-3 sm:mb-4">
                      {t('settings:integrations.deleteConfirmation')}
                    </h3>
                    <div className="mt-4 sm:mt-6 flex flex-col sm:flex-row sm:justify-end space-y-2 sm:space-y-0 sm:space-x-3">
                      <button
                        onClick={() => {
                          setShowDeleteModal(false);
                          setIntegrationToDelete(null);
                        }}
                        disabled={deletingId === integrationToDelete.id}
                        className="px-3 sm:px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {t('common:cancel')}
                      </button>
                      <button
                        onClick={() => handleDelete(integrationToDelete)}
                        disabled={deletingId === integrationToDelete.id}
                        className="inline-flex items-center justify-center px-3 sm:px-4 py-2 border border-transparent rounded-md shadow-sm text-xs sm:text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {deletingId === integrationToDelete.id ? (
                          <>
                            <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 animate-spin" />
                            {t('common:deleting')}
                          </>
                        ) : (
                          t('settings:integrations.delete')
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 