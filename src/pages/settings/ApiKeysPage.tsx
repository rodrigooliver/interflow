import React, { useState, useEffect } from 'react';
import { Plus, Loader2, X, AlertTriangle, Copy } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuthContext } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { ApiKey } from '../../types/database';
import { generateApiKey, hashApiKey } from '../../utils/apiKey';
import { SettingsTabs } from '../../components/settings/SettingsTabs';

export default function ApiKeysPage() {
  const { t } = useTranslation(['apiKeys', 'common']);
  const { currentOrganizationMember } = useAuthContext();
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedApiKey, setSelectedApiKey] = useState<ApiKey | null>(null);
  const [newApiKey, setNewApiKey] = useState<string>('');
  const [formData, setFormData] = useState({
    name: '',
    expiresAt: '',
  });
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 9;

  useEffect(() => {
    if (currentOrganizationMember) {
      loadApiKeys();
    }
  }, [currentOrganizationMember]);

  async function loadApiKeys() {
    if (!currentOrganizationMember) return;

    try {
      const { data, error } = await supabase
        .from('api_keys')
        .select('*')
        .eq('organization_id', currentOrganizationMember.organization.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setApiKeys(data || []);
    } catch (error) {
      console.error('Error loading API keys:', error);
      setError(t('common:error'));
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateApiKey(e: React.FormEvent) {
    e.preventDefault();
    if (!currentOrganizationMember) return;
    
    setError('');

    try {
      const newKey = generateApiKey();
      const keyHash = hashApiKey(newKey);

      const { error } = await supabase
        .from('api_keys')
        .insert([
          {
            organization_id: currentOrganizationMember.organization.id,
            name: formData.name,
            key_hash: keyHash,
            expires_at: formData.expiresAt || null,
          },
        ]);

      if (error) throw error;

      setNewApiKey(newKey);
      await loadApiKeys();
    } catch (error) {
      console.error('Error creating API key:', error);
      setError(t('common:error'));
    }
  }

  async function handleDeleteApiKey(apiKey: ApiKey) {
    try {
      const { error } = await supabase
        .from('api_keys')
        .delete()
        .eq('id', apiKey.id);

      if (error) throw error;

      await loadApiKeys();
      setShowDeleteModal(false);
      setSelectedApiKey(null);
    } catch (error) {
      console.error('Error deleting API key:', error);
      setError(t('common:error'));
    }
  }

  async function handleCopyApiKey(key: string) {
    try {
      await navigator.clipboard.writeText(key);
    } catch (error) {
      console.error('Error copying to clipboard:', error);
    }
  }

  const filteredApiKeys = apiKeys.filter(apiKey => 
    apiKey.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredApiKeys.length / itemsPerPage);
  const paginatedApiKeys = filteredApiKeys.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  if (!currentOrganizationMember) {
    return (
      <div className="p-3 sm:p-4 md:p-6">
        <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
          <SettingsTabs />
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-3 sm:p-4 md:p-6">
            <div className="flex justify-center items-center min-h-[200px]">
              <div className="flex flex-col items-center space-y-3">
                <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 animate-spin text-blue-600" />
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                  {t('common:loading')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        <SettingsTabs />
        
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-3 sm:p-4 md:p-6">
          <div className="space-y-4 sm:space-y-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-0">
              <h1 className="text-lg font-medium text-gray-900 dark:text-white">
                {t('apiKeys:title')}
              </h1>
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center justify-center px-3 sm:px-4 py-2 border border-transparent rounded-md shadow-sm text-xs sm:text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                {t('apiKeys:newKey')}
              </button>
            </div>

            <div className="mb-4 sm:mb-6">
              <input
                type="text"
                placeholder={t('apiKeys:searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3 sm:px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs sm:text-sm"
              />
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-8 sm:py-12">
                <div className="flex flex-col items-center space-y-3 sm:space-y-4">
                  <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 animate-spin text-blue-500" />
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                    {t('common:loading')}
                  </p>
                </div>
              </div>
            ) : paginatedApiKeys.length === 0 ? (
              <div className="text-center py-8 sm:py-12">
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                  {searchTerm ? t('apiKeys:noSearchResults') : t('apiKeys:noKeys')}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
                {paginatedApiKeys.map((apiKey) => (
                  <div key={apiKey.id} className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                    <div className="p-3 sm:p-4 md:p-6">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-white">
                            {apiKey.name}
                          </h3>
                        </div>
                        <button
                          onClick={() => {
                            setSelectedApiKey(apiKey);
                            setShowDeleteModal(true);
                          }}
                          className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                          aria-label={t('common:delete')}
                        >
                          <X className="w-4 h-4 sm:w-5 sm:h-5" />
                        </button>
                      </div>

                      <div className="mt-3 sm:mt-4 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                        {apiKey.expires_at && (
                          <p>{t('common:expiresAt')}: {new Date(apiKey.expires_at).toLocaleDateString()}</p>
                        )}
                        <p>{t('common:createdAt')}: {new Date(apiKey.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {totalPages > 1 && (
              <div className="mt-4 sm:mt-6 flex flex-col sm:flex-row justify-center items-center space-y-2 sm:space-y-0 sm:space-x-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="w-full sm:w-auto px-3 py-1 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-xs sm:text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50"
                >
                  {t('common:previous')}
                </button>
                
                <span className="px-3 py-1 text-xs sm:text-sm text-gray-700 dark:text-gray-300">
                  {t('common:pageOf', { current: currentPage, total: totalPages })}
                </span>

                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="w-full sm:w-auto px-3 py-1 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-xs sm:text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50"
                >
                  {t('common:next')}
                </button>
              </div>
            )}

            {/* Create API Key Modal */}
            {showCreateModal && (
              <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-2 sm:p-4 z-50">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
                  <div className="flex justify-between items-center p-3 sm:p-4 md:p-6 border-b dark:border-gray-700">
                    <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-white">
                      {t('apiKeys:newKey')}
                    </h3>
                    <button
                      onClick={() => {
                        setShowCreateModal(false);
                        setFormData({ name: '', expiresAt: '' });
                        setNewApiKey('');
                      }}
                      className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                      aria-label={t('common:close')}
                    >
                      <X className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                  </div>

                  {newApiKey ? (
                    <div className="p-3 sm:p-4 md:p-6">
                      <div className="mb-3 sm:mb-4">
                        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-2">
                          {t('apiKeys:copyKeyWarning')}
                        </p>
                        <div className="flex items-center space-x-2">
                          <code className="flex-1 p-2 bg-gray-100 dark:bg-gray-700 rounded text-xs sm:text-sm overflow-x-auto">
                            {newApiKey}
                          </code>
                          <button
                            onClick={() => handleCopyApiKey(newApiKey)}
                            className="p-1.5 sm:p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                            aria-label={t('common:copy')}
                          >
                            <Copy className="w-4 h-4 sm:w-5 sm:h-5" />
                          </button>
                        </div>
                      </div>
                      <div className="flex justify-end">
                        <button
                          onClick={() => {
                            setShowCreateModal(false);
                            setFormData({ name: '', expiresAt: '' });
                            setNewApiKey('');
                          }}
                          className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                        >
                          {t('common:done')}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={handleCreateApiKey} className="p-3 sm:p-4 md:p-6">
                      {error && (
                        <div className="mb-3 sm:mb-4 bg-red-50 dark:bg-red-900/50 text-red-700 dark:text-red-400 p-2 sm:p-3 rounded-md text-xs sm:text-sm">
                          {error}
                        </div>
                      )}

                      <div className="space-y-3 sm:space-y-4">
                        <div>
                          <label htmlFor="name" className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            {t('apiKeys:name')}
                          </label>
                          <input
                            type="text"
                            id="name"
                            required
                            className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 text-xs sm:text-sm"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          />
                        </div>

                        <div>
                          <label htmlFor="expiresAt" className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            {t('apiKeys:expiresAt')}
                          </label>
                          <input
                            type="date"
                            id="expiresAt"
                            className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 text-xs sm:text-sm"
                            value={formData.expiresAt}
                            onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                          />
                        </div>
                      </div>

                      <div className="mt-4 sm:mt-6 flex flex-col sm:flex-row sm:justify-end space-y-2 sm:space-y-0 sm:space-x-3">
                        <button
                          type="button"
                          onClick={() => {
                            setShowCreateModal(false);
                            setFormData({ name: '', expiresAt: '' });
                          }}
                          className="px-3 sm:px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                        >
                          {t('common:cancel')}
                        </button>
                        <button
                          type="submit"
                          className="px-3 sm:px-4 py-2 border border-transparent rounded-md shadow-sm text-xs sm:text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                        >
                          {t('apiKeys:generate')}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            )}

            {/* Delete API Key Modal */}
            {showDeleteModal && selectedApiKey && (
              <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-2 sm:p-4 z-50">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
                  <div className="p-3 sm:p-4 md:p-6">
                    <div className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 mx-auto bg-red-100 dark:bg-red-900/50 rounded-full mb-3 sm:mb-4">
                      <AlertTriangle className="h-5 w-5 sm:h-6 sm:w-6 text-red-600 dark:text-red-400" />
                    </div>
                    <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-white text-center mb-2">
                      {t('apiKeys:delete.title')}
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 text-center mb-4 sm:mb-6">
                      {t('apiKeys:delete.confirmation', { name: selectedApiKey.name })}
                    </p>
                    <div className="flex flex-col sm:flex-row sm:justify-end space-y-2 sm:space-y-0 sm:space-x-3">
                      <button
                        type="button"
                        onClick={() => {
                          setShowDeleteModal(false);
                          setSelectedApiKey(null);
                        }}
                        className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600"
                      >
                        {t('common:cancel')}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteApiKey(selectedApiKey)}
                        className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700"
                      >
                        {t('common:delete')}
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