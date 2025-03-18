import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { Loader2, ArrowLeft, Type, Info, MessageSquare, Thermometer, Cpu, ChevronDown, Wrench, Settings, GitBranch, Trash2, ExternalLink, ChevronUp } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthContext } from '../../contexts/AuthContext';
import { useOpenAIModels, useOpenAIIntegrations } from '../../hooks/useQueryes';
import { PromptFormData, Tool, ToolAction } from '../../types/prompts';
import { Integration } from '../../types/database';
import ContentEditor from './ContentEditor';
import ToolForm from './ToolForm';
import ToolsList from './ToolsList';
import TestChat from './TestChat';
import { Modal } from '../ui/Modal';
import { useQueryClient } from '@tanstack/react-query';

// Default OpenAI models (in case the API doesn't return any)
const DEFAULT_OPENAI_MODELS = [
  { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo' },
  { id: 'gpt-4', name: 'GPT-4' },
  { id: 'gpt-4o', name: 'GPT-4o' }
];

// Função para criar um fluxo baseado em um prompt
export async function createFlowFromPrompt(promptId: string, organizationId: string, promptTitle: string) {
  if (!promptId || !organizationId) return null;
  
  try {
    // Create new flow with default nodes
    const defaultStartNode = {
      id: 'start',
      type: 'start',
      position: { x: 100, y: 100 },
      data: {}
    };

    const agentNode = {
      id: crypto.randomUUID(),
      type: 'agenteia',
      position: { x: 400, y: 100 },
      data: {
        id: crypto.randomUUID(),
        label: 'Agente IA',
        agenteia: {
          promptId: promptId,
          variableName: 'Response'
        }
      }
    };

    const textNode = {
      id: crypto.randomUUID(),
      type: 'text',
      position: { x: 700, y: 100 },
      data: {
        id: crypto.randomUUID(),
        text: '{{Response}}',
        label: 'Send Text',
        splitParagraphs: true
      }
    };

    const inputNode = {
      id: crypto.randomUUID(),
      type: 'input',
      position: { x: 550, y: 300 },
      data: {
        id: crypto.randomUUID(),
        label: 'Await Input',
        inputConfig: {
          timeout: 5,
          variableName: 'Question',
          fallbackNodeId: ''
        }
      }
    };

    // Create edges
    const edges = [
      {
        id: `estart-${agentNode.id}--`,
        source: 'start',
        target: agentNode.id,
        sourceHandle: null,
        targetHandle: null
      },
      {
        id: `e${agentNode.id}-${textNode.id}--`,
        source: agentNode.id,
        target: textNode.id,
        sourceHandle: null,
        targetHandle: null
      },
      {
        id: `e${textNode.id}-${inputNode.id}--`,
        source: textNode.id,
        target: inputNode.id,
        sourceHandle: null,
        targetHandle: null
      },
      {
        id: `e${inputNode.id}-${agentNode.id}-text-`,
        source: inputNode.id,
        target: agentNode.id,
        sourceHandle: 'text',
        targetHandle: null
      }
    ];

    // Create variables
    const variables = [
      {
        id: crypto.randomUUID(),
        name: 'Response',
        value: ''
      },
      {
        id: crypto.randomUUID(),
        name: 'Question',
        value: ''
      }
    ];

    // Create the flow
    const { data: flowData, error: flowError } = await supabase
      .from('flows')
      .insert([{
        organization_id: organizationId,
        name: `${promptTitle}`,
        description: '',
        nodes: [defaultStartNode, agentNode, textNode, inputNode],
        edges: edges,
        draft_nodes: [defaultStartNode, agentNode, textNode, inputNode],
        draft_edges: edges,
        variables: variables,
        is_published: true,
        published_at: new Date().toISOString(),
        viewport: {
          x: -30,
          y: 266,
          zoom: 0.7
        },
        created_by_prompt: promptId
      }])
      .select()
      .single();

    if (flowError) throw flowError;
    
    return flowData;
  } catch (error) {
    console.error('Error creating flow:', error);
    return null;
  }
}

const PromptFormMain: React.FC = () => {
  const { t } = useTranslation(['prompts', 'common']);
  const navigate = useNavigate();
  const { id } = useParams(); // for editing
  const { currentOrganizationMember } = useAuthContext();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState<PromptFormData>({
    title: '',
    content: '',
    tools: [],
    destinations: {},
    config: {}
  });
  
  // Using the useOpenAIIntegrations hook to fetch available integrations
  const { 
    data: integrations = [], 
    isLoading: loadingIntegrations 
  } = useOpenAIIntegrations(currentOrganizationMember?.organization.id);
  
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);
  const [selectedModel, setSelectedModel] = useState('gpt-4o');
  const [temperature, setTemperature] = useState(0.7);
  
  // Using the useOpenAIModels hook to fetch available models
  const { 
    data: availableModels = DEFAULT_OPENAI_MODELS, 
    isLoading: loadingModels 
  } = useOpenAIModels(
    currentOrganizationMember?.organization.id, 
    selectedIntegration?.id
  );
  
  const [activeTab, setActiveTab] = useState<'general' | 'tools'>('general');
  const [showToolModal, setShowToolModal] = useState(false);
  const [editingTool, setEditingTool] = useState<{ tool: Tool, index: number } | null>(null);
  const [linkedFlow, setLinkedFlow] = useState<{ id: string; name: string } | null>(null);
  const [checkingFlow, setCheckingFlow] = useState(false);
  const [creatingFlow, setCreatingFlow] = useState(false);
  const [resettingFlow, setResettingFlow] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (id) {
      loadPrompt();
      checkLinkedFlow();
    }
  }, [id, currentOrganizationMember]);

  // Effect to select the first integration when integrations are loaded
  useEffect(() => {
    if (integrations.length > 0 && !selectedIntegration) {
      setSelectedIntegration(integrations[0]);
    }
  }, [integrations, selectedIntegration]);

  // Effect to check if the selected model is available when models are loaded
  useEffect(() => {
    if (availableModels.length > 0) {
      const modelExists = availableModels.some(model => model.id === selectedModel);
      if (!modelExists && availableModels.length > 0) {
        setSelectedModel(availableModels[0].id);
      }
    }
  }, [availableModels, selectedModel]);

  // Fechar o dropdown quando clicar fora dele
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  async function loadPrompt() {
    try {
      const { data, error } = await supabase
        .from('prompts')
        .select('*, integration:integration_id(*)')
        .eq('id', id)
        .single();

      if (error) throw error;
      if (data) {
        setFormData({
          title: data.title,
          content: data.content,
          tools: data.tools || [],
          destinations: data.destinations || {},
          config: data.config || {}
        });
        
        // Set up integration, model, and temperature if they exist
        if (data.integration) {
          setSelectedIntegration(data.integration);
        }
        
        if (data.model) {
          setSelectedModel(data.model);
        }
        
        if (data.temperature !== null && data.temperature !== undefined) {
          setTemperature(data.temperature);
        }
      }
    } catch (error) {
      console.error('Error loading prompt:', error);
      setError(t('common:error'));
    }
  }

  async function checkLinkedFlow() {
    if (!id || !currentOrganizationMember) return;
    
    setCheckingFlow(true);
    try {
      const { data, error } = await supabase
        .from('flows')
        .select('id, name')
        .eq('created_by_prompt', id)
        .maybeSingle();
      
      if (error) {
        console.error('Error checking linked flow:', error);
      }
      
      if (data) {
        setLinkedFlow(data);
      } else {
        setLinkedFlow(null);
      }
    } catch (error) {
      console.error('Error checking linked flow:', error);
    } finally {
      setCheckingFlow(false);
    }
  }

  async function createOrSyncFlow() {
    if (!id || !currentOrganizationMember) return;
    
    setCreatingFlow(true);
    try {
      if (linkedFlow) {
        // Apenas navegar para o fluxo existente
        navigate(`/app/flows/${linkedFlow.id}`);
      } else {
        // Criar novo fluxo
        const flowData = await createFlowFromPrompt(id, currentOrganizationMember.organization.id, formData.title);
        
        if (flowData) {
          setLinkedFlow(flowData);
          // Invalidar cache dos flows
          await queryClient.invalidateQueries({ queryKey: ['flows', currentOrganizationMember.organization.id] });
          setError('');
          // Mostrar mensagem de sucesso
          const successMessage = document.createElement('div');
          successMessage.className = 'fixed top-4 right-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded z-50';
          successMessage.innerHTML = `<span class="font-bold">${t('prompts:flowCreatedSuccess')}</span>`;
          document.body.appendChild(successMessage);
          setTimeout(() => {
            successMessage.remove();
          }, 3000);
        }
      }
    } catch (error) {
      console.error('Error creating/syncing flow:', error);
      setError(t('prompts:flowLinkError'));
    } finally {
      setCreatingFlow(false);
    }
  }

  async function resetFlow() {
    if (!id || !currentOrganizationMember || !linkedFlow) return;
    
    if (!window.confirm(t('prompts:resetFlowConfirm'))) {
      return;
    }
    
    setResettingFlow(true);
    try {
      // Primeiro excluir o fluxo existente
      const { error: deleteError } = await supabase
        .from('flows')
        .delete()
        .eq('id', linkedFlow.id);
        
      if (deleteError) throw deleteError;
      
      // Criar um novo fluxo
      const flowData = await createFlowFromPrompt(id, currentOrganizationMember.organization.id, formData.title);
      
      if (flowData) {
        setLinkedFlow(flowData);
        // Invalidar cache dos flows
        await queryClient.invalidateQueries({ queryKey: ['flows', currentOrganizationMember.organization.id] });
        setError('');
        // Mostrar mensagem de sucesso
        const successMessage = document.createElement('div');
        successMessage.className = 'fixed top-4 right-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded z-50';
        successMessage.innerHTML = `<span class="font-bold">${t('prompts:flowResetSuccess')}</span>`;
        document.body.appendChild(successMessage);
        setTimeout(() => {
          successMessage.remove();
        }, 3000);
      } else {
        // Se não conseguiu criar o fluxo, atualizar o estado
        setLinkedFlow(null);
      }
    } catch (error) {
      console.error('Error resetting flow:', error);
      setError(t('prompts:flowResetError'));
    } finally {
      setResettingFlow(false);
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrganizationMember) return;

    setSaving(true);
    setError('');

    try {
      // Prepare data for saving
      const updatedConfig = {
        ...formData.config
      };
      
      const promptData = {
        title: formData.title,
        content: formData.content,
        integration_id: selectedIntegration?.id || null,
        model: selectedModel,
        temperature: temperature,
        tools: formData.tools,
        destinations: formData.destinations,
        config: updatedConfig
      };

      if (id) {
        // Update
        const { error } = await supabase
          .from('prompts')
          .update({
            ...promptData,
            updated_at: new Date().toISOString()
          })
          .eq('id', id);

        if (error) throw error;
        
        // Invalidar cache dos prompts
        await queryClient.invalidateQueries({ queryKey: ['prompts', currentOrganizationMember.organization.id] });
        setError('');
      } else {
        // Create
        const { data, error } = await supabase
          .from('prompts')
          .insert([{
            organization_id: currentOrganizationMember.organization.id,
            ...promptData
          }])
          .select();

        if (error) throw error;
        
        // Invalidar cache dos prompts
        await queryClient.invalidateQueries({ queryKey: ['prompts', currentOrganizationMember.organization.id] });
        
        if (data && data.length > 0) {
          // Redirect to the edit page with the newly created ID
          navigate(`/app/prompts/edit/${data[0].id}`);
        }
      }
    } catch (error) {
      console.error('Error saving prompt:', error);
      setError(t('common:error'));
    } finally {
      setSaving(false);
    }
  };

  function handleIntegrationChange(integrationId: string) {
    const integration = integrations.find(i => i.id === integrationId) || null;
    setSelectedIntegration(integration);
  }

  const handleAddTool = (tool: Tool) => {
    if (editingTool !== null) {
      // Estamos editando uma ferramenta existente
      const updatedTools = [...formData.tools];
      updatedTools[editingTool.index] = tool;
      setFormData({
        ...formData,
        tools: updatedTools
      });
      setEditingTool(null);
    } else {
      // Estamos adicionando uma nova ferramenta
      setFormData({
        ...formData,
        tools: [...formData.tools, tool]
      });
    }
    setShowToolModal(false);
  };

  const handleEditTool = (index: number) => {
    setEditingTool({ tool: formData.tools[index], index });
    setShowToolModal(true);
  };

  const handleRemoveTool = (index: number) => {
    const updatedTools = [...formData.tools];
    updatedTools.splice(index, 1);
    setFormData({ ...formData, tools: updatedTools });
  };

  const handleDestinationsChange = (destinations: Record<string, ToolAction[]>) => {
    console.log('destinations', destinations);
    setFormData({
      ...formData,
      destinations
    });
  };

  return (
    <div className="flex flex-col h-screen">
      <div className="p-4 md:p-6 flex-grow overflow-hidden">
        <div className="flex flex-col lg:flex-row gap-6 h-full">
          <div className="flex-1 bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 flex flex-col overflow-hidden">
            <div className="flex items-center mb-4">
              <button
                onClick={() => navigate('/app/prompts')}
                className="mr-4 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                aria-label={t('common:back')}
              >
                <ArrowLeft className="w-5 h-5 text-gray-700 dark:text-gray-300" />
              </button>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {id ? t('prompts:edit') : t('prompts:add')}
              </h1>
              
              {id && (
                <div className="ml-auto flex items-center space-x-2">
                  {checkingFlow ? (
                    <div className="flex items-center text-gray-500 dark:text-gray-400">
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {t('prompts:checkingFlow')}
                    </div>
                  ) : creatingFlow ? (
                    <div className="flex items-center text-gray-500 dark:text-gray-400">
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {t('prompts:creatingFlow')}
                    </div>
                  ) : resettingFlow ? (
                    <div className="flex items-center text-gray-500 dark:text-gray-400">
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {t('prompts:resettingFlow')}
                    </div>
                  ) : (
                    <>
                      {linkedFlow ? (
                        <div className="flex items-center" ref={dropdownRef}>
                          <div className="mr-2 text-sm text-gray-600 dark:text-gray-300">
                            {t('prompts:hasLinkedFlow')}
                          </div>
                          <div className="relative">
                            <button
                              onClick={() => setDropdownOpen(!dropdownOpen)}
                              className="flex items-center px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                              <GitBranch className="w-4 h-4 mr-2" />
                              {t('prompts:flowOptions')}
                              {dropdownOpen ? (
                                <ChevronUp className="w-4 h-4 ml-2" />
                              ) : (
                                <ChevronDown className="w-4 h-4 ml-2" />
                              )}
                            </button>
                            
                            {dropdownOpen && (
                              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg z-10 border border-gray-200 dark:border-gray-700">
                                <ul className="py-1">
                                  <li>
                                    <button
                                      onClick={() => {
                                        setDropdownOpen(false);
                                        createOrSyncFlow();
                                      }}
                                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                                    >
                                      <ExternalLink className="w-4 h-4 mr-2" />
                                      {t('prompts:viewLinkedFlow')}
                                    </button>
                                  </li>
                                  <li>
                                    <button
                                      onClick={() => {
                                        setDropdownOpen(false);
                                        resetFlow();
                                      }}
                                      className="flex items-center w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                                    >
                                      <Trash2 className="w-4 h-4 mr-2" />
                                      {t('prompts:resetFlow')}
                                    </button>
                                  </li>
                                </ul>
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={createOrSyncFlow}
                          className="flex items-center px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                          <GitBranch className="w-4 h-4 mr-2" />
                          {t('prompts:createFlow')}
                        </button>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col flex-grow overflow-hidden">
              {error && (
                <div className="bg-red-50 dark:bg-red-900/50 text-red-700 dark:text-red-400 p-4 rounded-md flex items-start mb-4">
                  <Info className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <div className="mb-4">
                <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Type className="w-4 h-4 mr-2" />
                  {t('prompts:form.title')} *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full p-3 border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500 transition-colors"
                  placeholder={t('prompts:form.titlePlaceholder') || 'Digite o título do prompt'}
                />
              </div>

              {/* Tabs */}
              <div className="mb-4">
                <div className="sm:hidden">
                  <label htmlFor="tabs" className="sr-only">Selecione uma aba</label>
                  <div className="relative">
                    <select
                      id="tabs"
                      name="tabs"
                      className="block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-blue-500"
                      value={activeTab}
                      onChange={(e) => setActiveTab(e.target.value as 'general' | 'tools')}
                    >
                      <option value="general">{t('prompts:form.tabs.general') || 'Configurações Gerais'}</option>
                      <option value="tools">{t('prompts:form.tabs.tools') || 'Ferramentas'}</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700 dark:text-gray-300">
                      <ChevronDown className="h-4 w-4" />
                    </div>
                  </div>
                </div>
                <div className="hidden sm:block">
                  <div className="border-b border-gray-200 dark:border-gray-700">
                    <nav className="-mb-px flex" aria-label="Tabs">
                      <button
                        type="button"
                        onClick={() => setActiveTab('general')}
                        className={`${
                          activeTab === 'general'
                            ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:border-gray-600'
                        } w-1/2 py-2 px-1 text-center border-b-2 font-medium text-sm flex items-center justify-center`}
                      >
                        <Settings className="w-4 h-4 mr-2" />
                        {t('prompts:form.tabs.general') || 'Configurações Gerais'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab('tools')}
                        className={`${
                          activeTab === 'tools'
                            ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:border-gray-600'
                        } w-1/2 py-2 px-1 text-center border-b-2 font-medium text-sm flex items-center justify-center`}
                      >
                        <Wrench className="w-4 h-4 mr-2" />
                        {t('prompts:form.tabs.tools') || 'Ferramentas'}
                      </button>
                    </nav>
                  </div>
                </div>
              </div>

              {/* Tab Content */}
              {activeTab === 'general' && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        <MessageSquare className="w-4 h-4 mr-2" />
                        {t('prompts:form.integration')} *
                      </label>
                      <div className="relative">
                        <select
                          value={selectedIntegration?.id || ''}
                          onChange={(e) => handleIntegrationChange(e.target.value)}
                          disabled={loadingIntegrations}
                          className="w-full p-3 border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500 transition-colors disabled:opacity-50"
                        >
                          <option value="">{t('prompts:form.selectIntegration') || 'Selecione uma integração'}</option>
                          {integrations.length === 0 && !loadingIntegrations ? (
                            <option value="" disabled>{t('prompts:noIntegrationsAvailable') || 'Nenhuma integração disponível'}</option>
                          ) : (
                            integrations.map(integration => (
                              <option key={integration.id} value={integration.id} className="text-gray-900 dark:text-white">
                                OpenAI - {integration.name || integration.title || integration.id}
                              </option>
                            ))
                          )}
                        </select>
                        {loadingIntegrations && (
                          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                            <Loader2 className="w-4 h-4 animate-spin text-gray-500 dark:text-gray-400" />
                          </div>
                        )}
                      </div>
                      {loadingIntegrations && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {t('prompts:loadingIntegrations') || 'Carregando integrações...'}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        <Cpu className="w-4 h-4 mr-2" />
                        {t('prompts:model')} *
                      </label>
                      <div className="relative">
                        <select
                          value={selectedModel}
                          onChange={(e) => setSelectedModel(e.target.value)}
                          disabled={loadingModels}
                          className="w-full p-3 border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500 transition-colors disabled:opacity-50"
                        >
                          {availableModels.length === 0 && !loadingModels ? (
                            <option value="" disabled>{t('prompts:noModelsAvailable') || 'Nenhum modelo disponível'}</option>
                          ) : (
                            availableModels.map(model => (
                              <option key={model.id} value={model.id}>
                                {model.name}
                              </option>
                            ))
                          )}
                        </select>
                        {loadingModels && (
                          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                            <Loader2 className="w-4 h-4 animate-spin text-gray-500 dark:text-gray-400" />
                          </div>
                        )}
                      </div>
                      {loadingModels && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {t('prompts:loadingModels') || 'Carregando modelos disponíveis...'}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        <Thermometer className="w-4 h-4 mr-2" />
                        {t('prompts:temperature') || 'Temperatura'}: {temperature}
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="2"
                        step="0.1"
                        value={temperature}
                        onChange={(e) => setTemperature(parseFloat(e.target.value))}
                        className="w-full h-11 border border-gray-300 dark:border-gray-600 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>
                  </div>

                  <ContentEditor 
                    content={formData.content} 
                    onChange={(content) => setFormData({ ...formData, content })} 
                  />
                </>
              )}

              {activeTab === 'tools' && (
                <div className="flex-grow flex flex-col min-h-0 overflow-hidden">
                  <div className="mb-4">
                    <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
                      {t('prompts:form.toolsDescription') || 'Configure as ferramentas que o modelo pode utilizar. Ferramentas permitem que o modelo execute ações específicas durante a conversa.'}
                    </p>
                    
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-md mb-6">
                      <h3 className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-2">
                        {t('prompts:form.toolsInfo') || 'Informação sobre ferramentas'}
                      </h3>
                      <p className="text-xs text-blue-700 dark:text-blue-400">
                        {t('prompts:form.toolsInfoDescription') || 'Ferramentas permitem que o modelo chame funções específicas. Apenas os modelos GPT-4, GPT-4o e GPT-3.5-Turbo suportam ferramentas.'}
                      </p> 
                    </div>
                  </div>
                  
                  {/* Conteúdo com scroll principal */}
                  <div className="flex-1 overflow-y-auto pr-2 min-h-0 pb-4 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent" style={{ maxHeight: 'calc(100vh - 400px)' }}>
                    <div className="space-y-6">
                      {/* Seção de Ferramentas */}
                      <div>
                        <div className="flex justify-between items-center mb-3">
                          <h3 className="text-sm font-medium text-gray-900 dark:text-white flex items-center">
                            <Wrench className="w-4 h-4 mr-2" />
                            {t('prompts:form.tools') || 'Ferramentas'}
                          </h3>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingTool(null);
                              setShowToolModal(true);
                            }}
                            className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                          >
                            {t('prompts:form.addTool') || '+ Adicionar Ferramenta'}
                          </button>
                        </div>
                        
                        <ToolsList 
                          tools={formData.tools} 
                          onRemoveTool={handleRemoveTool} 
                          onEditTool={handleEditTool}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => navigate('/app/prompts')}
                  disabled={saving}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                >
                  {t('common:back')}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {t('common:save')}
                </button>
              </div>
            </form>
          </div>

          {/* Seção de teste - visível apenas em telas grandes */}
          <div className="hidden lg:flex lg:flex-col w-[450px] bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 overflow-hidden">
            <TestChat 
              selectedIntegration={selectedIntegration}
              selectedModel={selectedModel}
              temperature={temperature}
              systemPrompt={formData.content}
              loadingModels={loadingModels}
              availableModels={availableModels}
            />
          </div>
        </div>
      </div>

      {/* Modais */}
      <Modal 
        isOpen={showToolModal} 
        onClose={() => {
          setShowToolModal(false);
          setEditingTool(null);
        }}
        title={editingTool ? (t('prompts:form.editTool') || 'Editar Ferramenta') : (t('prompts:form.addTool') || 'Adicionar Ferramenta')}
      >
        <ToolForm 
          onAddTool={handleAddTool} 
          onCancel={() => {
            setShowToolModal(false);
            setEditingTool(null);
          }} 
          initialTool={editingTool?.tool} 
          destinations={formData.destinations}
          onDestinationsChange={handleDestinationsChange}
        />
      </Modal>
    </div>
  );
};

export default PromptFormMain; 