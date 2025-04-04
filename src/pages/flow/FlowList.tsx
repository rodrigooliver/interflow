import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GitFork, Plus, Loader2, X, AlertTriangle, Pencil } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuthContext } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Flow } from '../../types/database';
import FlowEditForm from '../../components/flow/FlowEditForm';
import FlowCreateModal from '../../components/flow/FlowCreateModal';
import { TriggersList } from '../../components/flow/TriggersList';
import { useQueryClient } from '@tanstack/react-query';
import { useFlows } from '../../hooks/useQueryes';

export default function FlowList() {
  const navigate = useNavigate();
  const { t } = useTranslation(['flows', 'common']);
  const { currentOrganizationMember } = useAuthContext();
  const queryClient = useQueryClient();
  const { data: flows = [], isLoading } = useFlows(currentOrganizationMember?.organization.id);
  const [showCreateFlowModal, setShowCreateFlowModal] = useState(false);
  const [showDeleteFlowModal, setShowDeleteFlowModal] = useState(false);
  const [deletingFlow, setDeletingFlow] = useState(false);
  const [selectedFlow, setSelectedFlow] = useState<Flow | null>(null);
  const [showEditFlowModal, setShowEditFlowModal] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function handleDeleteFlow() {
    if (!selectedFlow) return;
    setDeletingFlow(true);
    setDeleteError(null);

    try {
      // Primeiro excluir as sessões do fluxo
      const { error: sessionsError } = await supabase
        .from('flow_sessions')
        .delete()
        .eq('bot_id', selectedFlow.id);

      if (sessionsError) throw sessionsError;

      // Depois excluir o fluxo (os triggers serão deletados automaticamente pela foreign key cascade)
      const { error: flowError } = await supabase
        .from('flows')
        .delete()
        .eq('id', selectedFlow.id);

      if (flowError) throw flowError;

      // Invalidar o cache dos flows
      await queryClient.invalidateQueries({ queryKey: ['flows', currentOrganizationMember?.organization.id] });
      
      setShowDeleteFlowModal(false);
      setSelectedFlow(null);
    } catch (error) {
      console.error('Error deleting flow:', error);
      setDeleteError(t('flows:delete.error'));
    } finally {
      setDeletingFlow(false);
    }
  }

  async function handleEditFlow(flowData: { name: string; description: string; debounce_time: number }) {
    if (!selectedFlow) return;
    try {
      const { error: updateError } = await supabase
        .from('flows')
        .update({
          name: flowData.name,
          description: flowData.description,
          debounce_time: flowData.debounce_time
        })
        .eq('id', selectedFlow.id);

      if (updateError) throw updateError;

      // Invalidar o cache dos flows
      await queryClient.invalidateQueries({ queryKey: ['flows', currentOrganizationMember?.organization.id] });
      
      setShowEditFlowModal(false);
      setSelectedFlow(null);
    } catch (error) {
      console.error('Error editing flow:', error);
      // Mostrar erro na interface se necessário
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

  if (isLoading) {
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
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
            <GitFork className="w-6 h-6 mr-2" />
            {t('flows:title')}
          </h1>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setShowCreateFlowModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Plus className="w-4 h-4 mr-2" />
            {t('flows:newFlow')}
          </button>
        </div>
      </div>

      {flows.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {flows.map((flow: Flow) => (
            <div
              key={flow.id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors relative group"
            >
              <div className="absolute top-4 right-4 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => {
                    setSelectedFlow(flow);
                    setShowEditFlowModal(true);
                  }}
                  className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    setSelectedFlow(flow);
                    setShowDeleteFlowModal(true);
                  }}
                  className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <Link
                to={`/app/flows/${flow.id}`}
                className="flex flex-col"
              >
                <div className="flex items-center mb-3">
                  <GitFork className="w-8 h-8 text-gray-400 dark:text-gray-500 mr-3" />
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white truncate">
                      {flow.name}
                    </h3>
                    {flow.description && (
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 truncate">
                        {flow.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Adicionar TriggersList */}
                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {t('flows:triggers.startWhen')}:
                  </span>
                  <TriggersList 
                    triggers={flow.triggers || []}
                    flowId={flow.id}
                    showWarning={true}
                    onChange={() => queryClient.invalidateQueries({ queryKey: ['flows', currentOrganizationMember?.organization.id] })}
                  />
                </div>
              </Link>

              {flow.prompt && (
                <div className="mt-3 border-t border-gray-200 dark:border-gray-700 pt-3">
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {t('flows:linkedToAgent')}:
                  </div>
                  <Link
                    to={`/app/prompts/edit/${flow.prompt.id}`}
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900 transition-colors"
                  >
                    {flow.prompt.title}
                  </Link>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
          <div className="flex flex-col items-center justify-center space-y-4">
            <GitFork className="w-16 h-16 text-gray-300 dark:text-gray-600" />
            <h3 className="text-xl font-medium text-gray-900 dark:text-white">
              {t('flows:noFlowsYet')}
            </h3>
            <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
              {t('flows:noFlowsDescription')}
            </p>
            <button
              onClick={() => setShowCreateFlowModal(true)}
              className="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Plus className="w-4 h-4 mr-2" />
              {t('flows:createFirstFlow')}
            </button>
          </div>
        </div>
      )}

      {/* Modal de criação de fluxo */}
      <FlowCreateModal 
        isOpen={showCreateFlowModal}
        onClose={() => setShowCreateFlowModal(false)}
        onSuccess={(flowId) => {
          navigate(`/app/flows/${flowId}`);
        }}
      />

      {/* Modal de exclusão de fluxo */}
      {showDeleteFlowModal && selectedFlow && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  {t('flows:delete.title')}
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteFlowModal(false);
                    setSelectedFlow(null);
                  }}
                  className="text-gray-400 hover:text-gray-500 dark:text-gray-300 dark:hover:text-gray-200"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 dark:bg-red-900/50 rounded-full mb-4">
                <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              
              <p className="text-center text-gray-700 dark:text-gray-300 mb-4">
                {t('flows:delete.confirmation', { name: selectedFlow.name })}
              </p>
              <p className="text-center text-sm text-gray-500 dark:text-gray-400 mb-4">
                {t('flows:delete.warning')}
              </p>
              
              {deleteError && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/50 text-red-700 dark:text-red-300 rounded-md text-sm">
                  {deleteError}
                </div>
              )}
              
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteFlowModal(false);
                    setSelectedFlow(null);
                  }}
                  disabled={deletingFlow}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                >
                  {t('common:cancel')}
                </button>
                <button
                  type="button"
                  onClick={handleDeleteFlow}
                  disabled={deletingFlow}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {deletingFlow && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {t('common:delete')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de edição de fluxo */}
      {showEditFlowModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75 dark:bg-gray-900 dark:opacity-90"></div>
            </div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

            <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left shadow-xl transform sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white dark:bg-gray-800 px-6 py-4">
                <FlowEditForm 
                  flowId={selectedFlow?.id || null}
                  onSave={handleEditFlow}
                  onCancel={() => {
                    setShowEditFlowModal(false);
                    setSelectedFlow(null);
                  }}
                  onSaveTriggers={async () => Promise.resolve()}
                  onClose={() => {
                    setShowEditFlowModal(false);
                    setSelectedFlow(null);
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}