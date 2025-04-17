import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { GitMerge, Plus, Loader2, X, AlertTriangle, Pencil } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuthContext } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { CRMFunnel } from '../../types/crm';
import { FunnelModal } from '../../components/crm/FunnelModal';
import { useQueryClient } from '@tanstack/react-query';

export default function CRMFunnels() {
  const { t } = useTranslation(['crm', 'common']);
  const { currentOrganizationMember } = useAuthContext();
  const [funnels, setFunnels] = useState<CRMFunnel[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedFunnel, setSelectedFunnel] = useState<CRMFunnel | null>(null);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);
  const queryClient = useQueryClient();

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

      // Invalidar cache do React Query para funnels
      await queryClient.invalidateQueries({ queryKey: ['funnels', currentOrganizationMember.organization.id] });
      
      // Também invalidar cache para useFilters que inclui funnels
      await queryClient.invalidateQueries({ queryKey: ['filters', currentOrganizationMember.organization.id] });

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
                    setShowCreateModal(true);
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

      {/* FunnelModal para criação e edição */}
      {showCreateModal && currentOrganizationMember && (
        <FunnelModal 
          onClose={() => {
            setShowCreateModal(false);
            setSelectedFunnel(null);
          }}
          funnel={selectedFunnel}
          organizationId={currentOrganizationMember.organization.id}
          onSuccess={loadFunnels}
        />
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