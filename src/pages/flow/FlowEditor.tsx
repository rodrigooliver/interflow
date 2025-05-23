import React, { useState, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ReactFlowProvider } from 'reactflow';
import { ArrowLeft, Loader2, Variable, Send, RotateCcw, Pencil, Check, Settings, MoreVertical } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { FlowBuilder } from '../../components/flow/FlowBuilder';
import { Trigger } from '../../types/flow';
import { useAuthContext } from '../../contexts/AuthContext';
import { FlowEditorProvider, useFlowEditor } from '../../contexts/FlowEditorContext';
import { VariablesModal } from '../../components/flow/VariablesModal';
import FlowEditForm from '../../components/flow/FlowEditForm';
import { supabase } from '../../lib/supabase';

function FlowEditorContent() {
  const { t } = useTranslation(['flows', 'common']);
  const { id } = useParams();
  const navigate = useNavigate();
  const { 
    loading,
    error,
    nodes,
    edges,
    flowName,
    isPublished,
    publishedNodes,
    publishedEdges,
    lastSaved,
    loadFlow,
    publishFlow,
    restoreFlow,
    setFlowName: updateFlowName
  } = useFlowEditor();
  const { currentOrganizationMember } = useAuthContext();
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(flowName);
  const [showVariablesModal, setShowVariablesModal] = useState(false);
  const [showEditFlowModal, setShowEditFlowModal] = useState(false);
  const [flowKey] = useState(0);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  useEffect(() => {
    if (currentOrganizationMember && id) {
      loadFlow(id);
    }
  }, [currentOrganizationMember, id, loadFlow]);

  useEffect(() => {
    setEditedName(flowName);
  }, [flowName]);

  // const handleSave = useCallback(async (newNodes: FlowNode[], newEdges: FlowConnection[], newViewport: any) => {
  //   setSaving(true);

  //   try {
  //     await onSaveFlow(newNodes, newEdges, newViewport);
  //   } catch (error) {
  //     console.error('Error saving flow:', error);
  //   } finally {
  //     setSaving(false);
  //   }
  // }, [onSaveFlow]);

  const handlePublish = useCallback(async () => {
    setPublishing(true);
    try {
      await publishFlow();
    } catch (error) {
      console.error('Error publishing flow:', error);
    } finally {
      setPublishing(false);
    }
  }, [publishFlow, id]);

  const handleRestore = useCallback(async () => {
    setRestoring(true);
    try {
      await restoreFlow();
    } catch (error) {
      console.error('Error restoring flow:', error);
    } finally {
      setRestoring(false);
    }
  }, [restoreFlow]);

  const handleNameEdit = useCallback(async () => {
    if (!editedName.trim()) return;
    
    setSaving(true);
    try {
      await updateFlowName(editedName);
      setIsEditingName(false);
    } catch (error) {
      console.error('Error updating flow name:', error);
    } finally {
      setSaving(false);
    }
  }, [editedName, updateFlowName]);

  // Check if current version is different from published version
  const hasChanges = JSON.stringify(nodes) !== JSON.stringify(publishedNodes) || 
                    JSON.stringify(edges) !== JSON.stringify(publishedEdges);

  // Função para atualizar os dados do fluxo
  const handleEditFlow = async (flowData: { name: string; description: string; debounce_time: number }) => {
    if (!id) return;
    setSaving(true);
    try {
      const { error: updateError } = await supabase
        .from('flows')
        .update({
          name: flowData.name,
          description: flowData.description,
          debounce_time: flowData.debounce_time
        })
        .eq('id', id);

      if (updateError) throw updateError;

      // Atualizar o nome do fluxo no contexto
      await updateFlowName(flowData.name);
      
      // Recarregar o fluxo para obter os dados atualizados
      await loadFlow(id);
      
      setShowEditFlowModal(false);
    } catch (error) {
      console.error('Error updating flow:', error);
    } finally {
      setSaving(false);
    }
  };

  // Função para salvar os triggers
  const handleSaveTriggers = async (newTriggers: Trigger[]) => {
    if (!id || !currentOrganizationMember) return Promise.reject(new Error('Missing flow ID or organization'));

    try {
      // Excluir triggers existentes
      const { error: deleteError } = await supabase
        .from('flow_triggers')
        .delete()
        .eq('flow_id', id);

      if (deleteError) throw deleteError;

      // Inserir novos triggers
      if (newTriggers.length > 0) {
        const { error: insertError } = await supabase
          .from('flow_triggers')
          .insert(
            newTriggers.map(trigger => ({
              ...trigger,
              flow_id: id,
              organization_id: currentOrganizationMember.organization.id,
              updated_at: new Date().toISOString()
            }))
          );

        if (insertError) throw insertError;
      }
      
      return Promise.resolve();
    } catch (error) {
      console.error('Error updating triggers:', error);
      return Promise.reject(error);
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
        {/* Seção esquerda - Botão voltar e título */}
        <div className="flex items-center min-w-0 flex-1">
          <button
            onClick={() => navigate('/app/flows')}
            className="mr-3 md:mr-4 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 flex-shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          
          <div className="flex flex-col min-w-0 flex-1">
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
                  className="text-base md:text-lg font-medium text-gray-900 dark:text-white bg-transparent border-b border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-0 px-1 min-w-0 flex-1"
                  autoFocus
                />
                <button
                  onClick={handleNameEdit}
                  disabled={saving}
                  className="ml-2 p-1 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 disabled:opacity-50 flex-shrink-0"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                </button>
              </div>
            ) : (
              <div className="flex items-center min-w-0">
                <h1 className="text-base md:text-lg font-medium text-gray-900 dark:text-white truncate">
                  {flowName}
                </h1>
                <button
                  onClick={() => setIsEditingName(true)}
                  className="ml-2 p-1 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 flex-shrink-0"
                >
                  <Pencil className="w-3 h-3 md:w-4 md:h-4" />
                </button>
              </div>
            )}
            
            {/* Status e última salvação - Hidden em mobile muito pequeno */}
            <div className="hidden sm:flex items-center space-x-2">
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
        
        {/* Seção direita - Botões de ação */}
        <div className="flex items-center space-x-1 md:space-x-2 ml-2 flex-shrink-0">
          {/* Menu mobile para ações secundárias */}
          <div className="relative sm:hidden">
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="inline-flex items-center px-2 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
            
            {showMobileMenu && (
              <>
                {/* Overlay para fechar o menu */}
                <div 
                  className="fixed inset-0 z-10" 
                  onClick={() => setShowMobileMenu(false)}
                />
                
                {/* Menu dropdown */}
                <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 z-20">
                  <div className="py-1">
                    <button
                      onClick={() => {
                        setShowEditFlowModal(true);
                        setShowMobileMenu(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
                    >
                      <Settings className="w-4 h-4 mr-3" />
                      {t('flows:settings')}
                    </button>
                    
                    <button
                      onClick={() => {
                        setShowVariablesModal(true);
                        setShowMobileMenu(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
                    >
                      <Variable className="w-4 h-4 mr-3" />
                      {t('flows:variables.title')}
                    </button>
                    
                    {isPublished && hasChanges && (
                      <button
                        onClick={() => {
                          handleRestore();
                          setShowMobileMenu(false);
                        }}
                        disabled={restoring}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {restoring ? (
                          <Loader2 className="w-4 h-4 mr-3 animate-spin" />
                        ) : (
                          <RotateCcw className="w-4 h-4 mr-3" />
                        )}
                        {t('flows:restore')}
                      </button>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
          
          {/* Botão Configurações - Hidden em mobile muito pequeno */}
          <button
            onClick={() => setShowEditFlowModal(true)}
            className="hidden sm:inline-flex items-center px-2 md:px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <Settings className="w-3 h-3 md:w-4 md:h-4 md:mr-2" />
            <span className="hidden md:inline">{t('flows:settings')}</span>
          </button>
          
          {/* Botão Variáveis */}
          <button
            onClick={() => setShowVariablesModal(true)}
            className="hidden sm:inline-flex items-center px-2 md:px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <Variable className="w-3 h-3 md:w-4 md:h-4 md:mr-2" />
            <span className="hidden md:inline">{t('flows:variables.title')}</span>
          </button>
          
          {/* Botão Restaurar - Visível apenas quando necessário */}
          {isPublished && hasChanges && (
            <button
              onClick={handleRestore}
              disabled={restoring}
              className="hidden lg:inline-flex items-center px-3 md:px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {restoring ? (
                <Loader2 className="w-3 h-3 md:w-4 md:h-4 mr-2 animate-spin" />
              ) : (
                <RotateCcw className="w-3 h-3 md:w-4 md:h-4 mr-2" />
              )}
              <span className="hidden xl:inline">{t('flows:restore')}</span>
            </button>
          )}
          
          {/* Botão Publicar - Sempre visível */}
          <button
            onClick={handlePublish}
            disabled={publishing || saving || (isPublished && !hasChanges)}
            className="inline-flex items-center px-3 md:px-4 py-2 border border-transparent rounded-md shadow-sm text-xs md:text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {publishing ? (
              <Loader2 className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2 animate-spin" />
            ) : (
              <Send className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
            )}
            <span className="hidden sm:inline">{t('flows:publish')}</span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <ReactFlowProvider>
          <FlowBuilder key={flowKey} />
        </ReactFlowProvider>
      </div>

      <VariablesModal 
        isOpen={showVariablesModal}
        onClose={() => setShowVariablesModal(false)}
      />

      {/* Modal de edição de fluxo */}
      {showEditFlowModal && id && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75 dark:bg-gray-900 dark:opacity-90"></div>
            </div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

            <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-scroll shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white dark:bg-gray-800 px-6 py-4">
                <FlowEditForm 
                  flowId={id}
                  onSave={handleEditFlow}
                  onCancel={() => setShowEditFlowModal(false)}
                  onSaveTriggers={handleSaveTriggers}
                  onClose={() => setShowEditFlowModal(false)}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FlowEditor() {
  return (
    <FlowEditorProvider>
      <FlowEditorContent />
    </FlowEditorProvider>
  );
}

export default FlowEditor;