import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GitFork, Plus, Loader2, X, AlertTriangle, Pencil } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useOrganizationContext } from '../../contexts/OrganizationContext';
import { supabase } from '../../lib/supabase';
import { Flow } from '../../types/database';
import { Trigger } from '../../types/flow';
import FlowEditForm from '../../components/flow/FlowEditForm';

// Default start node
const defaultStartNode = {
  id: 'start',
  type: 'start',
  position: { x: 100, y: 100 },
  data: {}
};

export default function FlowList() {
  const navigate = useNavigate();
  const { t } = useTranslation(['flows', 'common']);
  const { currentOrganization } = useOrganizationContext();
  const [flows, setFlows] = useState<Flow[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingFlow, setCreatingFlow] = useState(false);
  const [showCreateFlowModal, setShowCreateFlowModal] = useState(false);
  const [showDeleteFlowModal, setShowDeleteFlowModal] = useState(false);
  const [deletingFlow, setDeletingFlow] = useState(false);
  const [selectedFlow, setSelectedFlow] = useState<Flow | null>(null);
  const [newFlowData, setNewFlowData] = useState({ name: '', description: '' });
  const [showEditFlowModal, setShowEditFlowModal] = useState(false);

  useEffect(() => {
    if (currentOrganization) {
      loadFlows();
    }
  }, [currentOrganization]);

  async function loadFlows() {
    if (!currentOrganization) return;

    try {
      const { data: flowsData, error: flowsError } = await supabase
        .from('flows')
        .select(`
          *,
          triggers:flow_triggers(
            id,
            type,
            conditions,
            is_active,
            created_at,
            updated_at
          )
        `)
        .eq('organization_id', currentOrganization.id)
        .order('name');

      if (flowsError) throw flowsError;
      setFlows(flowsData || []);
    } catch (error) {
      console.error('Error loading flows:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateFlow() {
    if (!currentOrganization || !newFlowData.name.trim()) return;
    setCreatingFlow(true);

    try {
      // Criar o flow primeiro
      const { data: flowData, error: flowError } = await supabase
        .from('flows')
        .insert([{
          organization_id: currentOrganization.id,
          name: newFlowData.name,
          description: newFlowData.description,
          nodes: [],
          edges: [],
          draft_nodes: [defaultStartNode],
          draft_edges: [],
          variables: [],
          is_published: false
        }])
        .select()
        .single();

      if (flowError) throw flowError;

      // Criar trigger padrão para o flow
      if (flowData) {
        const { error: triggerError } = await supabase
          .from('flow_triggers')
          .insert([{
            flow_id: flowData.id,
            type: 'first_contact',
            organization_id: currentOrganization.id,
            conditions: {
              operator: 'AND',
              rules: []
            },
            is_active: true
          }]);

        if (triggerError) throw triggerError;
      }

      setNewFlowData({ name: '', description: '' });
      setShowCreateFlowModal(false);
      
      // Redirecionar para o novo flow
      if (flowData) {
        navigate(`/app/flows/${flowData.id}`);
      }
    } catch (error) {
      console.error('Error creating flow:', error);
    } finally {
      setCreatingFlow(false);
    }
  }

  async function handleDeleteFlow() {
    if (!selectedFlow) return;
    setDeletingFlow(true);

    try {
      // Os triggers serão deletados automaticamente pela foreign key cascade
      const { error } = await supabase
        .from('flows')
        .delete()
        .eq('id', selectedFlow.id);

      if (error) throw error;

      await loadFlows();
      setShowDeleteFlowModal(false);
      setSelectedFlow(null);
    } catch (error) {
      console.error('Error deleting flow:', error);
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

      await loadFlows();
      setShowEditFlowModal(false);
      setSelectedFlow(null);
    } catch (error) {
      console.error('Error editing flow:', error);
      // Mostrar erro na interface se necessário
    }
  }

  // Função para salvar os triggers
  const handleSaveTriggers = async (newTriggers: Trigger[]) => {
    if (!selectedFlow || !currentOrganization) return;

    try {
      // Excluir triggers existentes
      const { error: deleteError } = await supabase
        .from('flow_triggers')
        .delete()
        .eq('flow_id', selectedFlow.id);

      if (deleteError) throw deleteError;

      // Inserir novos triggers
      if (newTriggers.length > 0) {
        const { error: insertError } = await supabase
          .from('flow_triggers')
          .insert(
            newTriggers.map(trigger => ({
              ...trigger,
              flow_id: selectedFlow.id,
              organization_id: currentOrganization.id,
              updated_at: new Date().toISOString()
            }))
          );

        if (insertError) throw insertError;
      }

      // Atualizar a lista de flows
      await loadFlows();
      
      return Promise.resolve();
    } catch (error) {
      console.error('Error updating triggers:', error);
      return Promise.reject(error);
    }
  };

  if (!currentOrganization) {
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {flows.map((flow) => (
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
              className="flex items-center"
            >
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
            </Link>
          </div>
        ))}
      </div>

      {/* Modal de criação de fluxo */}
      {showCreateFlowModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                {t('flows:newFlow')}
              </h3>
              <button
                onClick={() => setShowCreateFlowModal(false)}
                className="text-gray-400 hover:text-gray-500 dark:text-gray-300 dark:hover:text-gray-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label htmlFor="flow-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('flows:flowName')}
                </label>
                <input
                  id="flow-name"
                  type="text"
                  value={newFlowData.name}
                  onChange={(e) => setNewFlowData({ ...newFlowData, name: e.target.value })}
                  placeholder={t('flows:flowName')}
                  className="block w-full px-4 py-2 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
              <div>
                <label htmlFor="flow-description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('flows:flowDescription')}
                </label>
                <textarea
                  id="flow-description"
                  value={newFlowData.description}
                  onChange={(e) => setNewFlowData({ ...newFlowData, description: e.target.value })}
                  placeholder={t('flows:flowDescription')}
                  className="block w-full px-4 py-2 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  rows={3}
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end space-x-2">
              <button
                onClick={() => setShowCreateFlowModal(false)}
                disabled={creatingFlow}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
              >
                {t('common:back')}
              </button>
              <button
                onClick={handleCreateFlow}
                disabled={creatingFlow}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creatingFlow && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {t('common:saving')}
              </button>
            </div>
          </div>
        </div>
      )}

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

            <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white dark:bg-gray-800 px-6 py-4">
                <FlowEditForm 
                  flowId={selectedFlow?.id || null}
                  onSave={handleEditFlow}
                  onCancel={() => {
                    setShowEditFlowModal(false);
                    setSelectedFlow(null);
                  }}
                  onSaveTriggers={handleSaveTriggers}
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