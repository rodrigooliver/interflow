import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { GitMerge, Plus, Loader2, X, AlertTriangle, Pencil } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuthContext } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { CRMFunnel } from '../../types/crm';

export default function CRMFunnels() {
  const { t } = useTranslation(['crm', 'common']);
  const { currentOrganizationMember } = useAuthContext();
  const [funnels, setFunnels] = useState<CRMFunnel[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedFunnel, setSelectedFunnel] = useState<CRMFunnel | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (currentOrganizationMember) {
      loadFunnels();
    }
  }, [currentOrganizationMember]);

  async function loadFunnels() {
    if (!currentOrganizationMember) return;

    try {
      const { data, error } = await supabase
        .from('crm_funnels')
        .select('*')
        .eq('organization_id', currentOrganizationMember.organization.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFunnels(data || []);
    } catch (error) {
      console.error('Error loading funnels:', error);
      setError(t('common:error'));
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateFunnel(e: React.FormEvent) {
    e.preventDefault();
    if (!currentOrganizationMember) return;
    
    setCreating(true);
    setError('');

    try {
      const { data, error } = await supabase
        .from('crm_funnels')
        .insert([
          {
            organization_id: currentOrganizationMember.organization.id,
            name: formData.name,
            description: formData.description,
            is_active: true
          }
        ])
        .select()
        .single();

      if (error) throw error;

      // Create default stages
      const defaultStages = [
        { name: t('crm:stages.new'), color: '#3B82F6', position: 0 },
        { name: t('crm:stages.inProgress'), color: '#F59E0B', position: 1 },
        { name: t('crm:stages.completed'), color: '#10B981', position: 2 }
      ];

      await supabase
        .from('crm_stages')
        .insert(
          defaultStages.map(stage => ({
            funnel_id: data.id,
            ...stage
          }))
        );

      await loadFunnels();
      setShowCreateModal(false);
      setFormData({ name: '', description: '' });
    } catch (err) {
      console.error('Error creating funnel:', err);
      setError(t('common:error'));
    } finally {
      setCreating(false);
    }
  }

  async function handleDeleteFunnel() {
    if (!selectedFunnel || !currentOrganizationMember) return;

    setDeleting(true);
    try {
      // First check if there are any customers in any stage of this funnel
      const { data: stages } = await supabase
        .from('crm_stages')
        .select('id')
        .eq('funnel_id', selectedFunnel.id);

      if (stages && stages.length > 0) {
        const stageIds = stages.map(stage => stage.id);
        
        const { data: customersInStages, error: countError } = await supabase
          .from('customers')
          .select('id')
          .in('stage_id', stageIds);

        if (countError) throw countError;

        if (customersInStages && customersInStages.length > 0) {
          setError(t('crm:funnels.delete.hasCustomers'));
          setDeleting(false);
          return;
        }
      }

      // If no customers, delete the funnel (stages will be cascade deleted)
      const { error } = await supabase
        .from('crm_funnels')
        .delete()
        .eq('id', selectedFunnel.id)
        .eq('organization_id', currentOrganizationMember.organization.id);

      if (error) throw error;

      await loadFunnels();
      setShowDeleteModal(false);
      setSelectedFunnel(null);
      setError('');
    } catch (err) {
      console.error('Error deleting funnel:', err);
      setError(t('common:error'));
    } finally {
      setDeleting(false);
    }
  }

  async function handleEditFunnel(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedFunnel || !currentOrganizationMember) return;
    
    setEditing(true);
    setError('');

    try {
      const { error } = await supabase
        .from('crm_funnels')
        .update({
          name: formData.name,
          description: formData.description
        })
        .eq('id', selectedFunnel.id)
        .eq('organization_id', currentOrganizationMember.organization.id);

      if (error) throw error;

      await loadFunnels();
      setShowEditModal(false);
      setSelectedFunnel(null);
      setFormData({ name: '', description: '' });
    } catch (err) {
      console.error('Error editing funnel:', err);
      setError(t('common:error'));
    } finally {
      setEditing(false);
    }
  }

  if (!currentOrganizationMember) {
    return (
      <div className="p-6">
        <div className="flex justify-center items-center min-h-[200px]">
          <div className="text-gray-500 dark:text-gray-400">
            {t('common:loading')}
          </div>
        </div>
      </div>
    );
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

  if (funnels.length === 0 && !showCreateModal) {
    return (
      <div className="p-6">
        <div className="max-w-md mx-auto text-center">
          <GitMerge className="w-12 h-12 mx-auto text-gray-400 dark:text-gray-500 mb-4" />
          <h2 className="text-xl font-medium text-gray-900 dark:text-white mb-2">
            {t('crm:funnels.noFunnels')}
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            {t('crm:funnels.createFirst')}
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Plus className="w-4 h-4 mr-2" />
            {t('crm:funnels.newFunnel')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
          <GitMerge className="w-6 h-6 mr-2" />
          {t('crm:funnels.title')}
        </h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <Plus className="w-4 h-4 mr-2" />
          {t('crm:funnels.newFunnel')}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {funnels.map((funnel) => (
          <Link
            key={funnel.id}
            to={`/app/crm/${funnel.id}`}
            className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  {funnel.name}
                </h3>
                {funnel.description && (
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {funnel.description}
                  </p>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    setSelectedFunnel(funnel);
                    setFormData({
                      name: funnel.name,
                      description: funnel.description || ''
                    });
                    setShowEditModal(true);
                  }}
                  className="p-2 text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                >
                  <Pencil className="w-5 h-5" />
                </button>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    setSelectedFunnel(funnel);
                    setShowDeleteModal(true);
                  }}
                  className="p-2 text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Create Funnel Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
            <div className="flex justify-between items-center p-6 border-b dark:border-gray-700">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                {t('crm:funnels.newFunnel')}
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateFunnel} className="p-6">
              {error && (
                <div className="mb-4 bg-red-50 dark:bg-red-900/50 text-red-700 dark:text-red-400 p-3 rounded-md">
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('crm:funnels.name')}
                  </label>
                  <input
                    type="text"
                    id="name"
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 py-2 px-3"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('crm:funnels.description')}
                  </label>
                  <textarea
                    id="description"
                    rows={3}
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 py-2 px-3"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  disabled={creating}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  {t('common:back')}
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {creating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {t('common:saving')}
                    </>
                  ) : (
                    t('crm:funnels.newFunnel')
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Funnel Modal */}
      {showEditModal && selectedFunnel && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
            <div className="flex justify-between items-center p-6 border-b dark:border-gray-700">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                {t('crm:funnels.editFunnel')}
              </h3>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedFunnel(null);
                  setFormData({ name: '', description: '' });
                }}
                className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditFunnel} className="p-6">
              {error && (
                <div className="mb-4 bg-red-50 dark:bg-red-900/50 text-red-700 dark:text-red-400 p-3 rounded-md">
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label htmlFor="edit-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('crm:funnels.name')}
                  </label>
                  <input
                    type="text"
                    id="edit-name"
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 py-2 px-3"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                <div>
                  <label htmlFor="edit-description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('crm:funnels.description')}
                  </label>
                  <textarea
                    id="edit-description"
                    rows={3}
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 py-2 px-3"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedFunnel(null);
                    setFormData({ name: '', description: '' });
                  }}
                  disabled={editing}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  {t('common:back')}
                </button>
                <button
                  type="submit"
                  disabled={editing}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {editing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {t('common:saving')}
                    </>
                  ) : (
                    t('common:save')
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedFunnel && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 dark:bg-red-900/50 rounded-full mb-4">
                <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white text-center mb-2">
                {t('crm:funnels.delete.title')}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-6">
                {t('crm:funnels.delete.confirmation', { name: selectedFunnel.name })}
                <br />
                {t('crm:funnels.delete.warning')}
              </p>

              {error && (
                <div className="mb-4 bg-red-50 dark:bg-red-900/50 text-red-700 dark:text-red-400 p-3 rounded-md">
                  {error}
                </div>
              )}

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteModal(false);
                    setSelectedFunnel(null);
                    setError('');
                  }}
                  disabled={deleting}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t('common:back')}
                </button>
                <button
                  type="button"
                  onClick={handleDeleteFunnel}
                  disabled={deleting}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {deleting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {t('common:deleting')}
                    </>
                  ) : (
                    t('common:confirmDelete')
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