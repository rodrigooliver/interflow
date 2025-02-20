import React, { useState, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ReactFlowProvider } from 'reactflow';
import { ArrowLeft, Save, Loader2, Variable, Send, RotateCcw, Pencil, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { FlowBuilder } from '../../components/flow/FlowBuilder';
import { FlowNode, FlowConnection, Variable as FlowVariable } from '../../types/flow';
import { supabase } from '../../lib/supabase';
import { useOrganizationContext } from '../../contexts/OrganizationContext';

function FlowEditor() {
  const { t } = useTranslation(['flows', 'common']);
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentOrganization } = useOrganizationContext();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [nodes, setNodes] = useState<FlowNode[]>([]);
  const [edges, setEdges] = useState<FlowConnection[]>([]);
  const [publishedNodes, setPublishedNodes] = useState<FlowNode[]>([]);
  const [publishedEdges, setPublishedEdges] = useState<FlowConnection[]>([]);
  const [variables, setVariables] = useState<FlowVariable[]>([]);
  const [viewport, setViewport] = useState({ x: 0, y: 0, zoom: 0.7 });
  const [flowName, setFlowName] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [isPublished, setIsPublished] = useState(false);
  const [showVariablesModal, setShowVariablesModal] = useState(false);
  const [error, setError] = useState('');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [flowKey, setFlowKey] = useState(0);

  useEffect(() => {
    if (currentOrganization && id) {
      loadFlow();
    }
  }, [currentOrganization, id]);

  useEffect(() => {
    // Adicionar listener para o evento openModalVariable
    const handleOpenModal = (event: CustomEvent) => {
      if (event.detail?.id === 'variableModal') {
        setShowVariablesModal(true);
      }
    };

    // Registrar o listener
    document.addEventListener('openModalVariable', handleOpenModal as EventListener);

    // Cleanup ao desmontar o componente
    return () => {
      document.removeEventListener('openModalVariable', handleOpenModal as EventListener);
    };
  }, []);

  async function loadFlow() {
    try {
      const { data: flow, error } = await supabase
        .from('flows')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      if (flow) {
        setNodes(flow.draft_nodes?.length ? flow.draft_nodes : flow.nodes || []);
        setEdges(flow.draft_edges?.length ? flow.draft_edges : flow.edges || []);
        setPublishedNodes(flow.nodes || []);
        setPublishedEdges(flow.edges || []);
        setVariables(flow.variables || []);
        setViewport(flow.viewport || { x: 0, y: 0, zoom: 0.7 });
        setFlowName(flow.name);
        setEditedName(flow.name);
        setIsPublished(flow.is_published || false);
        setFlowKey(prev => prev + 1);
      }
    } catch (error) {
      console.error('Error loading flow:', error);
      setError(t('common:error'));
    } finally {
      setLoading(false);
    }
  }

  const handleSave = useCallback(async (newNodes: FlowNode[], newEdges: FlowConnection[], newViewport: any) => {
    if (!currentOrganization || !id) return;
    
    setSaving(true);
    setError('');

    try {
      const { error } = await supabase
        .from('flows')
        .update({
          draft_nodes: newNodes,
          draft_edges: newEdges,
          variables,
          viewport: newViewport,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;

      setNodes(newNodes);
      setEdges(newEdges);
      setViewport(newViewport);
      setLastSaved(new Date());
    } catch (error) {
      console.error('Error saving flow:', error);
      setError(t('common:error'));
    } finally {
      setSaving(false);
    }
  }, [currentOrganization, id, variables]);

  const handlePublish = useCallback(async () => {
    if (!currentOrganization || !id) return;
    
    setPublishing(true);
    setError('');

    try {
      const { error } = await supabase
        .from('flows')
        .update({
          nodes: nodes,
          edges: edges,
          draft_nodes: nodes,
          draft_edges: edges,
          variables,
          viewport,
          is_published: true,
          published_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;
      
      setIsPublished(true);
      setPublishedNodes(nodes);
      setPublishedEdges(edges);
    } catch (error) {
      console.error('Error publishing flow:', error);
      setError(t('common:error'));
    } finally {
      setPublishing(false);
    }
  }, [currentOrganization, id, nodes, edges, variables, viewport]);

  const handleRestore = useCallback(async () => {
    if (!currentOrganization || !id) return;
    
    setRestoring(true);
    setError('');

    try {
      const { error } = await supabase
        .from('flows')
        .update({
          draft_nodes: publishedNodes,
          draft_edges: publishedEdges,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;

      setNodes(publishedNodes);
      setEdges(publishedEdges);
      setLastSaved(new Date());
      setFlowKey(prev => prev + 1);
    } catch (error) {
      console.error('Error restoring flow:', error);
      setError(t('common:error'));
    } finally {
      setRestoring(false);
    }
  }, [currentOrganization, id, publishedNodes, publishedEdges]);

  const handleVariablesUpdate = useCallback((newVariables: FlowVariable[]) => {
    setVariables(newVariables);
  }, []);

  const handleNameEdit = useCallback(async () => {
    if (!currentOrganization || !id || !editedName.trim()) return;
    
    setSaving(true);
    setError('');

    try {
      const { error } = await supabase
        .from('flows')
        .update({
          name: editedName.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;

      setFlowName(editedName.trim());
      setIsEditingName(false);
      setLastSaved(new Date());
    } catch (error) {
      console.error('Error updating flow name:', error);
      setError(t('common:error'));
    } finally {
      setSaving(false);
    }
  }, [currentOrganization, id, editedName]);

  // Check if current version is different from published version
  const hasChanges = JSON.stringify(nodes) !== JSON.stringify(publishedNodes) || 
                    JSON.stringify(edges) !== JSON.stringify(publishedEdges);

  const formatVariableName = (name: string): string => {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove acentos
      .replace(/[^a-z0-9]+/g, '_')     // Substitui caracteres especiais e espaços por underscore
      .replace(/^_+|_+$/g, '');        // Remove underscores do início e fim
  };

  const handleVariableNameChange = (index: number, newName: string) => {
    const newVariables = [...variables];
    newVariables[index].name = formatVariableName(newName);
    setVariables(newVariables);
  };

  const handleVariableNameBlur = (index: number) => {
    const currentVariable = variables[index];
    
    // Verifica se já existe uma variável com este nome (exceto a atual)
    const isDuplicate = variables.some((v, i) => 
      i !== index && v.name === currentVariable.name
    );

    if (isDuplicate) {
      // Se encontrou duplicata, reverte para string vazia
      const newVariables = [...variables];
      newVariables[index].name = '';
      setVariables(newVariables);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex justify-center items-center min-h-[200px]">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 dark:bg-red-900/50 text-red-700 dark:text-red-400 p-4 rounded-lg">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <div className="h-16 flex-shrink-0 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 flex items-center justify-between">
        <div className="flex items-center">
          <button
            onClick={() => navigate('/app/flows')}
            className="mr-4 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex flex-col">
            {isEditingName ? (
              <div className="flex items-center">
                <input
                  type="text"
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleNameEdit();
                    } else if (e.key === 'Escape') {
                      setIsEditingName(false);
                      setEditedName(flowName);
                    }
                  }}
                  className="text-lg font-medium text-gray-900 dark:text-white bg-transparent border-b border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-0 px-1"
                  autoFocus
                />
                <button
                  onClick={handleNameEdit}
                  disabled={saving}
                  className="ml-2 p-1 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                </button>
              </div>
            ) : (
              <div className="flex items-center">
                <h1 className="text-lg font-medium text-gray-900 dark:text-white">
                  {flowName}
                </h1>
                <button
                  onClick={() => setIsEditingName(true)}
                  className="ml-2 p-1 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  <Pencil className="w-4 h-4" />
                </button>
              </div>
            )}
            <div className="flex items-center space-x-2">
              {isPublished && (
                <span className="text-xs px-2 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                  {t('flows:published')}
                </span>
              )}
              {lastSaved && (
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {t('flows:lastSaved', { time: lastSaved.toLocaleTimeString() })}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowVariablesModal(true)}
            className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <Variable className="w-4 h-4 mr-2" />
            {t('flows:variables.title')}
          </button>
          {isPublished && hasChanges && (
            <button
              onClick={handleRestore}
              disabled={restoring}
              className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {restoring ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RotateCcw className="w-4 h-4 mr-2" />
              )}
              {t('flows:restore')}
            </button>
          )}
          <button
            onClick={handlePublish}
            disabled={publishing || saving}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {publishing ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Send className="w-4 h-4 mr-2" />
            )}
            {t('flows:publish')}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <ReactFlowProvider>
          <FlowBuilder
            key={flowKey}
            initialNodes={nodes}
            initialEdges={edges}
            initialVariables={variables}
            initialViewport={viewport}
            onSave={handleSave}
            onVariablesUpdate={handleVariablesUpdate}
          />
        </ReactFlowProvider>
      </div>

      {/* Variables Modal */}
      {showVariablesModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              {t('flows:variables.title')}
            </h3>
            <div className="space-y-4">
              {variables.map((variable, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={variable.name}
                    onChange={(e) => handleVariableNameChange(index, e.target.value)}
                    onBlur={() => handleVariableNameBlur(index)}
                    placeholder={t('flows:nodes.variable.namePlaceholder')}
                    className="flex-1 p-2 border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                  <input
                    type="text"
                    value={variable.value}
                    onChange={(e) => {
                      const newVariables = [...variables];
                      newVariables[index].value = e.target.value;
                      setVariables(newVariables);
                    }}
                    placeholder={t('flows:nodes.variable.valuePlaceholder')}
                    className="flex-1 p-2 border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              ))}
              <button
                onClick={() => setVariables([...variables, { id: crypto.randomUUID(), name: '', value: '' }])}
                disabled={variables.length > 0 && !variables[variables.length - 1].name}
                className="w-full p-2 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                + {t('flows:variables.add')}
              </button>
            </div>
            <div className="mt-6 flex justify-end space-x-2">
              <button
                onClick={() => setShowVariablesModal(false)}
                className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
              >
                {t('common:back')}
              </button>
              <button
                onClick={() => {
                  handleVariablesUpdate(variables);
                  setShowVariablesModal(false);
                }}
                className="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                {t('common:saving')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default FlowEditor;