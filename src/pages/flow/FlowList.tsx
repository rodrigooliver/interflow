import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GitFork, Plus, Loader2, X, AlertTriangle, Pencil, ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useOrganizationContext } from '../../contexts/OrganizationContext';
import { supabase } from '../../lib/supabase';
import { Flow } from '../../types/flow';
import { FlowTriggers } from '../../components/flow/FlowTriggers';

// Default start node
const DEFAULT_START_NODE = {
  id: 'start-node',
  type: 'start',
  position: { x: 100, y: 100 },
  data: { isStart: true }
};

export default function FlowList() {
  const navigate = useNavigate();
  const { t } = useTranslation(['flows', 'common']);
  const { currentOrganization } = useOrganizationContext();
  const [flows, setFlows] = useState<Flow[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingFlow, setCreatingFlow] = useState(false);
  const [deletingFlow, setDeletingFlow] = useState(false);
  const [showNewFlowModal, setShowNewFlowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedFlow, setSelectedFlow] = useState<Flow | null>(null);
  const [newFlowData, setNewFlowData] = useState({ name: '', description: '' });
  const [error, setError] = useState('');
  const [showEditFlowModal, setShowEditFlowModal] = useState(false);
  const [editingFlow, setEditingFlow] = useState(false);
  const [editFlowData, setEditFlowData] = useState({ name: '', description: '' });
  const [editingTriggers, setEditingTriggers] = useState(false);
  const [savingTriggers, setSavingTriggers] = useState(false);

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
      setError(t('common:error'));
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
          draft_nodes: [DEFAULT_START_NODE],
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
      setShowNewFlowModal(false);
      
      // Redirecionar para o novo flow
      if (flowData) {
        navigate(`/app/flows/${flowData.id}`);
      }
    } catch (error) {
      console.error('Error creating flow:', error);
      setError(t('common:error'));
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
      setShowDeleteModal(false);
      setSelectedFlow(null);
    } catch (error) {
      console.error('Error deleting flow:', error);
      setError(t('common:error'));
    } finally {
      setDeletingFlow(false);
    }
  }

  async function handleEditFlow() {
    if (!selectedFlow) return;
    setEditingFlow(true);

    try {
      const { error } = await supabase
        .from('flows')
        .update({
          name: editFlowData.name,
          description: editFlowData.description
        })
        .eq('id', selectedFlow.id);

      if (error) throw error;

      await loadFlows();
      setShowEditFlowModal(false);
      setSelectedFlow(null);
      setEditFlowData({ name: '', description: '' });
    } catch (error) {
      console.error('Error editing flow:', error);
      setError(t('common:error'));
    } finally {
      setEditingFlow(false);
    }
  }

  const handleEditTriggers = async (newTriggers: Trigger[]) => {
    if (!selectedFlow) return;
    setSavingTriggers(true);

    try {
      // Atualizar triggers existentes
      const updatePromises = newTriggers.map(trigger => 
        supabase
          .from('flow_triggers')
          .upsert({
            ...trigger,
            flow_id: selectedFlow.id,
            updated_at: new Date().toISOString()
          })
      );

      await Promise.all(updatePromises);

      // Atualizar o flow localmente
      setSelectedFlow({ ...selectedFlow, triggers: newTriggers });
      
      // Atualizar a lista de flows
      setFlows(prevFlows => 
        prevFlows.map(flow => 
          flow.id === selectedFlow.id 
            ? { ...flow, triggers: newTriggers }
            : flow
        )
      );

    } catch (error) {
      console.error('Error updating triggers:', error);
      setError(t('common:error'));
    } finally {
      setSavingTriggers(false);
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
            onClick={() => setShowNewFlowModal(true)}
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
                  setEditFlowData({ name: flow.name, description: flow.description });
                  setShowEditFlowModal(true);
                }}
                className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  setSelectedFlow(flow);
                  setShowDeleteModal(true);
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

      {/* New Flow Modal */}
      {showNewFlowModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              {t('flows:newFlow')}
            </h3>
            <div className="space-y-4">
              <input
                type="text"
                value={newFlowData.name}
                onChange={(e) => setNewFlowData({ ...newFlowData, name: e.target.value })}
                placeholder="Nome do fluxo"
                className="w-full p-2 border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-blue-500"
              />
              <textarea
                value={newFlowData.description}
                onChange={(e) => setNewFlowData({ ...newFlowData, description: e.target.value })}
                placeholder="Descrição (opcional)"
                className="w-full p-2 border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-blue-500"
                rows={3}
              />
            </div>
            <div className="mt-4 flex justify-end space-x-2">
              <button
                onClick={() => setShowNewFlowModal(false)}
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

      {/* Delete Flow Modal */}
      {showDeleteModal && selectedFlow && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 dark:bg-red-900/50 rounded-full mb-4">
                <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white text-center mb-2">
                {t('flows:delete.title')}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-6">
                {t('flows:delete.confirmation', { name: selectedFlow.name })}
                <br />
                {t('flows:delete.warning')}
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteModal(false);
                    setSelectedFlow(null);
                  }}
                  disabled={deletingFlow}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {t('common:back')}
                </button>
                <button
                  type="button"
                  onClick={handleDeleteFlow}
                  disabled={deletingFlow}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 flex items-center"
                >
                  {deletingFlow && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {t('common:confirmDelete')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Flow Modal */}
      {showEditFlowModal && selectedFlow && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                {t('flows:editFlow')}
              </h3>
              <button
                onClick={() => {
                  setShowEditFlowModal(false);
                  setSelectedFlow(null);
                  setEditFlowData({ name: '', description: '' });
                  setEditingTriggers(false);
                }}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {!editingTriggers ? (
                <>
                  <input
                    type="text"
                    value={editFlowData.name}
                    onChange={(e) => setEditFlowData({ ...editFlowData, name: e.target.value })}
                    placeholder={t('flows:flowName')}
                    className="w-full p-2 border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-blue-500"
                  />
                  <textarea
                    value={editFlowData.description}
                    onChange={(e) => setEditFlowData({ ...editFlowData, description: e.target.value })}
                    placeholder={t('flows:flowDescription')}
                    className="w-full p-2 border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-blue-500"
                    rows={3}
                  />
                  <div className="flex justify-between items-center pt-4">
                    <button
                      onClick={() => setEditingTriggers(true)}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      {t('flows:triggers.configure')}
                    </button>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => {
                          setShowEditFlowModal(false);
                          setSelectedFlow(null);
                          setEditFlowData({ name: '', description: '' });
                        }}
                        disabled={editingFlow}
                        className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                      >
                        {t('common:back')}
                      </button>
                      <button
                        onClick={handleEditFlow}
                        disabled={editingFlow}
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {editingFlow && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        {t('common:saving')}
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="border-b border-gray-200 dark:border-gray-700 -mx-6 px-6 pb-4">
                    <button
                      onClick={() => setEditingTriggers(false)}
                      className="flex items-center text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                    >
                      <ArrowLeft className="w-4 h-4 mr-1" />
                      {t('common:back')}
                    </button>
                  </div>
                  <div className="max-h-[60vh] overflow-y-auto">
                    <FlowTriggers
                      flowId={selectedFlow.id}
                      triggers={selectedFlow.triggers || []}
                      onChange={handleEditTriggers}
                    />
                  </div>
                  {/* {savingTriggers && (
                    <div className="flex justify-center">
                      <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                    </div>
                  )} */}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}