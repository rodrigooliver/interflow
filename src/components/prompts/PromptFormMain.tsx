import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Loader2, ArrowLeft, Type, Info, MessageSquare, Thermometer, Cpu, ChevronDown, Wrench, Settings, GitBranch, Trash2, ExternalLink, ChevronUp, Clock, Play, Plus, ChevronRight, AlertTriangle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthContext } from '../../contexts/AuthContext';
import { useOpenAIModels, useOpenAIIntegrations } from '../../hooks/useQueryes';
import { PromptFormData, Tool, ToolAction } from '../../types/prompts';
import { Integration } from '../../types/database';
import ContentEditor from './ContentEditor';
import ToolForm from './ToolForm';
import ToolsList from './ToolsList';
import { Modal } from '../ui/Modal';
import { useQueryClient } from '@tanstack/react-query';
import { timezones } from '../../utils/timezones';
import Select from 'react-select';
import TestPrompt from './TestPrompt';
import { IntegrationFormOpenAI } from '../settings/IntegrationFormOpenAI';
import { SYSTEM_ACTIONS, SYSTEM_ACTION_TYPES, SystemActionType } from '../../constants/systemActions';
import SystemActionsList from './SystemActionsList';
import { Trigger } from '../../types/flow';
import { TriggersList } from '../flow/TriggersList';

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
      id: 'start-node',
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
        source: 'start-node',
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
        debounce_time: 15000,
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

    // Create flow trigger
    const { error: triggerError } = await supabase
      .from('flow_triggers')
      .insert([{
        flow_id: flowData.id,
        type: 'first_contact',
        is_active: true,
        conditions: {
          rules: [],
          operator: 'AND'
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        organization_id: organizationId
      }]);

    if (triggerError) throw triggerError;
    
    return flowData;
  } catch (error) {
    console.error('Error creating flow:', error);
    return null;
  }
}

type TabType = 'general' | 'context' | 'tools' | 'test';

const PromptFormMain: React.FC = () => {
  const { t } = useTranslation(['prompts', 'common', 'flows']);
  const navigate = useNavigate();
  const { id } = useParams(); // for editing
  const [searchParams] = useSearchParams();
  const { currentOrganizationMember } = useAuthContext();
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState<PromptFormData>({
    title: '',
    content: '',
    tools: [],
    destinations: {},
    actions: [],
    config: {}
  });
  
  // Adicionar estado para timezone usando o fuso horário padrão do navegador
  const [timezone, setTimezone] = useState(() => {
    try {
      // Tenta obter o timezone do navegador usando Intl.DateTimeFormat
      const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      
      // Verifica se o timezone do navegador está na nossa lista, caso contrário usa UTC
      const isValidTimezone = timezones.some(tz => tz.value === browserTimezone);
      return isValidTimezone ? browserTimezone : 'UTC';
    } catch (error) {
      console.error('Erro ao obter o timezone do navegador:', error);
      return 'UTC';
    }
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
  
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    const tabParam = searchParams.get('tab');
    return (tabParam as TabType) || 'general';
  });
  const [showToolModal, setShowToolModal] = useState(false);
  const [editingTool, setEditingTool] = useState<{ tool: Tool, index: number } | null>(null);
  const [linkedFlow, setLinkedFlow] = useState<{ id: string; name: string; triggers: Trigger[] } | null>(null);
  const [creatingFlow, setCreatingFlow] = useState(false);
  const [resettingFlow, setResettingFlow] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [tabsDropdownOpen, setTabsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const [showIntegrationModal, setShowIntegrationModal] = useState(false);
  const [isSystemActionModalOpen, setIsSystemActionModalOpen] = useState(false);
  const [triggers, setTriggers] = useState<Trigger[]>([]);

  useEffect(() => {
    if (id) {
      loadPrompt();
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
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('prompts')
        .select(`
          *,
          integration:integration_id(*),
          flows:flows!created_by_prompt(
            id,
            name,
            triggers:flow_triggers(*)
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      if (data) {
        setFormData({
          title: data.title,
          content: data.content,
          tools: data.tools || [],
          destinations: data.destinations || {},
          actions: data.actions || [],
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
        
        // Carregar timezone do config se existir
        if (data.config && data.config.timezone) {
          setTimezone(data.config.timezone);
        }

        // Configurar o fluxo vinculado e seus triggers
        if (data.flows && data.flows.length > 0) {
          const flow = data.flows[0];
          setLinkedFlow({
            id: flow.id,
            name: flow.name,
            triggers: flow.triggers || []
          });
          setTriggers(flow.triggers || []);
        } else {
          setLinkedFlow(null);
        }
      }
    } catch (error) {
      console.error('Error loading prompt:', error);
      setError(t('common:error'));
    } finally {
      setLoading(false);
    }
  }

  // Função para salvar os triggers
  const handleSaveTriggers = async (newTriggers: Trigger[]) => {
    if (!linkedFlow?.id || !currentOrganizationMember) return;

    try {
      // Excluir triggers existentes
      const { error: deleteError } = await supabase
        .from('flow_triggers')
        .delete()
        .eq('flow_id', linkedFlow.id);

      if (deleteError) throw deleteError;

      // Inserir novos triggers
      if (newTriggers.length > 0) {
        const { error: insertError } = await supabase
          .from('flow_triggers')
          .insert(
            newTriggers.map(trigger => ({
              ...trigger,
              flow_id: linkedFlow.id,
              organization_id: currentOrganizationMember.organization.id,
              updated_at: new Date().toISOString()
            }))
          );

        if (insertError) throw insertError;
      }

      // Atualizar o estado local com os novos triggers
      setLinkedFlow(prev => prev ? { ...prev, triggers: newTriggers } : null);
      
      // Recarregar os dados do prompt para garantir que tudo está sincronizado
      await loadPrompt();
    } catch (error) {
      console.error('Erro ao salvar triggers:', error);
    }
  };

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
        await queryClient.invalidateQueries({ queryKey: ['flows', currentOrganizationMember.organization.id] });
        
        if (flowData) {
          setLinkedFlow(flowData);
          // Invalidar cache dos flows
          setError('');
          // Mostrar mensagem de sucesso
          const successMessage = document.createElement('div');
          successMessage.className = 'fixed top-4 right-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded z-50';
          successMessage.innerHTML = `<span class="font-bold">${t('prompts:flowCreatedSuccess')}</span>`;
          document.body.appendChild(successMessage);
          setTimeout(() => {
            successMessage.remove();
          }, 3000);

          // Recarregar os dados do prompt para garantir que tudo está sincronizado
          await loadPrompt();
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
        ...formData.config,
        timezone: timezone
      };
      
      const promptData = {
        title: formData.title,
        content: formData.content,
        integration_id: selectedIntegration?.id || null,
        model: selectedModel,
        temperature: temperature,
        tools: formData.tools,
        destinations: formData.destinations,
        actions: formData.actions,
        config: updatedConfig
      };

      let promptId = id;
      
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
          promptId = data[0].id;
          
          // Criar o flow logo após criar o prompt
          if (promptId) {
            const flowData = await createFlowFromPrompt(promptId, currentOrganizationMember.organization.id, formData.title);
            
            if (flowData) {
              // Invalidar cache dos flows
              await queryClient.invalidateQueries({ queryKey: ['flows', currentOrganizationMember.organization.id] });
              
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

          // Redirecionar para a página de edição
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

  const handleIntegrationSuccess = async () => {
    setShowIntegrationModal(false);
    // Invalidar cache das integrações para recarregar a lista
    await queryClient.invalidateQueries({ queryKey: ['integrations', currentOrganizationMember?.organization.id] });
  };

  const handleAddSystemAction = (actionType: SystemActionType) => {
    const action = SYSTEM_ACTIONS.find(a => a.type === actionType);
    if (action) {
      // Verifica se a ação já existe
      const actionExists = formData.actions.some(a => a.type === actionType);
      if (!actionExists) {
        // Cria uma cópia da ação com a descrição traduzida
        const translatedAction = {
          ...action,
          description: t(action.description)
        };
        setFormData(prev => ({
          ...prev,
          actions: [...prev.actions, translatedAction]
        }));
      }
    }
    setIsSystemActionModalOpen(false);
  };

  // Função para lidar com o botão voltar
  const handleBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      navigate('/app/prompts');
    }
  };

  return (
    <div className="flex flex-col h-screen pb-16 md:pb-0">
      <div className="p-4 md:p-6 flex-grow overflow-hidden">
        <div className="flex flex-col lg:flex-row gap-6 h-full">
          <div className="flex-1 bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 flex flex-col overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-0 mb-4">
              <div className="flex items-center justify-between w-full sm:w-auto">
                <div className="flex items-center">
                  <button
                    onClick={handleBack}
                    className="mr-4 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                    aria-label={t('common:back')}
                  >
                    <ArrowLeft className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                  </button>
                  <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white truncate">
                    {id ? t('prompts:edit') : t('prompts:add')}
                  </h1>
                </div>
              </div>
              
              {id && (
                <div className="hidden sm:flex items-center space-x-2 ml-auto">
                  {creatingFlow ? (
                    <div className="flex items-center text-gray-500 dark:text-gray-400 text-sm">
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {t('prompts:creatingFlow')}
                    </div>
                  ) : resettingFlow ? (
                    <div className="flex items-center text-gray-500 dark:text-gray-400 text-sm">
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {t('prompts:resettingFlow')}
                    </div>
                  ) : null}
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

              {loading ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="flex flex-col items-center space-y-4">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {t('common:loading')}
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  {/* Tabs */}
                  <div className="mb-4">
                    <div className="sm:hidden">
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setTabsDropdownOpen(!tabsDropdownOpen)}
                          className="w-full flex items-center justify-between bg-white dark:bg-gray-900 rounded-lg shadow-sm p-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                          <div className="flex items-center space-x-2">
                            {activeTab === 'general' && <Settings className="w-4 h-4 text-blue-600 dark:text-blue-400" />}
                            {activeTab === 'context' && <Info className="w-4 h-4 text-blue-600 dark:text-blue-400" />}
                            {activeTab === 'tools' && <Wrench className="w-4 h-4 text-blue-600 dark:text-blue-400" />}
                            {activeTab === 'test' && <Play className="w-4 h-4 text-blue-600 dark:text-blue-400" />}
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                              {activeTab === 'general' && (t('prompts:form.tabs.general') || 'Configurações Gerais')}
                              {activeTab === 'context' && (t('prompts:form.tabs.context') || 'Contexto')}
                              {activeTab === 'tools' && (t('prompts:form.tabs.tools') || 'Ferramentas')}
                              {activeTab === 'test' && (t('prompts:form.tabs.test') || 'Testar')}
                            </span>
                          </div>
                          <ChevronDown className={`w-5 h-5 text-gray-500 dark:text-gray-400 transition-transform ${tabsDropdownOpen ? 'rotate-180' : ''}`} />
                        </button>
                        
                        {tabsDropdownOpen && (
                          <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
                            <div className="py-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveTab('general');
                                  setTabsDropdownOpen(false);
                                }}
                                className={`w-full flex items-center px-4 py-3 text-sm ${
                                  activeTab === 'general'
                                    ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
                                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                }`}
                              >
                                <Settings className="w-4 h-4 mr-2" />
                                {t('prompts:form.tabs.general') || 'Configurações Gerais'}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveTab('context');
                                  setTabsDropdownOpen(false);
                                }}
                                className={`w-full flex items-center px-4 py-3 text-sm ${
                                  activeTab === 'context'
                                    ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
                                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                }`}
                              >
                                <Info className="w-4 h-4 mr-2" />
                                {t('prompts:form.tabs.context') || 'Contexto'}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveTab('tools');
                                  setTabsDropdownOpen(false);
                                }}
                                className={`w-full flex items-center px-4 py-3 text-sm ${
                                  activeTab === 'tools'
                                    ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
                                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                }`}
                              >
                                <Wrench className="w-4 h-4 mr-2" />
                                {t('prompts:form.tabs.tools') || 'Ferramentas'}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveTab('test');
                                  setTabsDropdownOpen(false);
                                }}
                                className={`w-full flex items-center px-4 py-3 text-sm ${
                                  activeTab === 'test'
                                    ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
                                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                }`}
                              >
                                <Play className="w-4 h-4 mr-2" />
                                {t('prompts:form.tabs.test') || 'Testar'}
                              </button>
                            </div>
                          </div>
                        )}
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
                            } w-1/4 py-2 px-1 text-center border-b-2 font-medium text-sm flex items-center justify-center`}
                          >
                            <Settings className="w-4 h-4 mr-2" />
                            {t('prompts:form.tabs.general') || 'Configurações Gerais'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setActiveTab('context')}
                            className={`${
                              activeTab === 'context'
                                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:border-gray-600'
                            } w-1/4 py-2 px-1 text-center border-b-2 font-medium text-sm flex items-center justify-center`}
                          >
                            <Info className="w-4 h-4 mr-2" />
                            {t('prompts:form.tabs.context') || 'Contexto'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setActiveTab('tools')}
                            className={`${
                              activeTab === 'tools'
                                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:border-gray-600'
                            } w-1/4 py-2 px-1 text-center border-b-2 font-medium text-sm flex items-center justify-center`}
                          >
                            <Wrench className="w-4 h-4 mr-2" />
                            {t('prompts:form.tabs.tools') || 'Ferramentas'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setActiveTab('test')}
                            className={`${
                              activeTab === 'test'
                                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:border-gray-600'
                            } w-1/4 py-2 px-1 text-center border-b-2 font-medium text-sm flex items-center justify-center`}
                          >
                            <Play className="w-4 h-4 mr-2" />
                            {t('prompts:form.tabs.test') || 'Testar'}
                          </button>
                        </nav>
                      </div>
                    </div>
                  </div>

                  {/* Tab Content */}
                  {activeTab === 'general' && (
                    <div className="mb-6">
                      {/* Título */}
                      <div className="mb-6">
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

                      {/* Configurações de IA */}
                      <div className="">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Integração */}
                          <div>
                            <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              <MessageSquare className="w-4 h-4 mr-2" />
                              {t('prompts:form.integration')} *
                            </label>
                            <div className="relative">
                              <select
                                value={selectedIntegration?.id || ''}
                                onChange={(e) => {
                                  if (e.target.value === 'add_new') {
                                    setShowIntegrationModal(true);
                                    return;
                                  }
                                  handleIntegrationChange(e.target.value);
                                }}
                                disabled={loadingIntegrations}
                                className="w-full p-3 border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500 transition-colors disabled:opacity-50"
                              >
                                <option value="">{t('prompts:form.selectIntegration')}</option>
                                {integrations.length === 0 && !loadingIntegrations ? (
                                  <option value="add_new" className="text-blue-600 dark:text-blue-400">
                                    {t('settings:integrations.addNew')}
                                  </option>
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
                              {integrations.length === 0 && !loadingIntegrations && (
                                <button
                                  type="button"
                                  onClick={() => setShowIntegrationModal(true)}
                                  className="absolute right-3 top-1/2 transform -translate-y-1/2 p-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                                  title={t('settings:integrations.addNew')}
                                >
                                  <Plus className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                            {loadingIntegrations && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                {t('prompts:loadingIntegrations')}
                              </p>
                            )}
                          </div>

                          {/* Modelo */}
                          <div>
                            <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              <Cpu className="w-4 h-4 mr-2" />
                              {t('prompts:form.model')} *
                            </label>
                            <div className="relative">
                              <select
                                value={selectedModel}
                                onChange={(e) => setSelectedModel(e.target.value)}
                                disabled={loadingModels}
                                className="w-full p-3 border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500 transition-colors disabled:opacity-50"
                              >
                                {availableModels.length === 0 && !loadingModels ? (
                                  <option value="" disabled>{t('prompts:noModelsAvailable')}</option>
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
                                {t('prompts:loadingModels')}
                              </p>
                            )}
                          </div>

                          {/* Temperatura */}
                          <div>
                            <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              <Thermometer className="w-4 h-4 mr-2" />
                              {t('prompts:form.temperature')}
                            </label>
                            <div className="flex items-center space-x-4">
                              <input
                                type="range"
                                min="0"
                                max="2"
                                step="0.1"
                                value={temperature}
                                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                                className="flex-1 h-2 border border-gray-300 dark:border-gray-600 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
                              />
                              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 min-w-[3rem] text-right">
                                {temperature}
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              {t('prompts:form.temperatureDescription')}
                            </p>
                          </div>

                          {/* Timezone */}
                          <div>
                            <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              <Clock className="w-4 h-4 mr-2" />
                              {t('prompts:timezone')}
                            </label>
                            <Select
                              value={{ value: timezone, label: `${timezones.find(tz => tz.value === timezone)?.label || timezone} (${timezones.find(tz => tz.value === timezone)?.offset || 'UTC'})` }}
                              onChange={(selected) => setTimezone(selected?.value || 'UTC')}
                              options={timezones.map(tz => ({ 
                                value: tz.value, 
                                label: `${tz.label} (${tz.offset})` 
                              }))}
                              className="react-select-container"
                              classNamePrefix="react-select"
                              placeholder={t('prompts:selectTimezone')}
                              isSearchable={true}
                              noOptionsMessage={() => t('prompts:noTimezoneFound')}
                              styles={{
                                control: (base, state) => ({
                                  ...base,
                                  backgroundColor: 'var(--select-bg, #fff)',
                                  borderColor: state.isFocused ? 'var(--select-focus-border, #3b82f6)' : 'var(--select-border, #d1d5db)',
                                  '&:hover': {
                                    borderColor: 'var(--select-hover-border, #9ca3af)'
                                  },
                                  boxShadow: state.isFocused ? '0 0 0 1px #3b82f6' : 'none',
                                  borderRadius: '0.375rem'
                                }),
                                menu: (base) => ({
                                  ...base,
                                  backgroundColor: 'var(--select-bg, #fff)',
                                  border: '1px solid var(--select-border, #d1d5db)',
                                  zIndex: 50
                                }),
                                option: (base, { isFocused, isSelected }) => ({
                                  ...base,
                                  backgroundColor: isSelected 
                                    ? 'var(--select-selected-bg, #2563eb)'
                                    : isFocused 
                                      ? 'var(--select-hover-bg, #dbeafe)'
                                      : 'transparent',
                                  color: isSelected 
                                    ? 'var(--select-selected-text, white)'
                                    : 'var(--select-text, #111827)'
                                }),
                                singleValue: (base) => ({
                                  ...base,
                                  color: 'var(--select-text, #111827)'
                                })
                              }}
                            />
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              {t('prompts:timezoneDescription')}
                            </p>
                          </div>
                        </div>

                        {/* Seção de Fluxo */}
                        {id && (
                          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                            <div className="flex items-center justify-between mb-4">
                              <div>
                                <h3 className="text-sm font-medium text-gray-900 dark:text-white flex items-center">
                                  <GitBranch className="w-4 h-4 mr-2" />
                                  {t('prompts:form.flow.title')}
                                </h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                  {t('prompts:form.flow.description') || 'Configure os gatilhos para que este agente IA possa ser acionado'}
                                </p>
                              </div>
                              {creatingFlow ? (
                                <div className="flex items-center text-gray-500 dark:text-gray-400 text-sm">
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  {t('prompts:creatingFlow')}
                                </div>
                              ) : resettingFlow ? (
                                <div className="flex items-center text-gray-500 dark:text-gray-400 text-sm">
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  {t('prompts:resettingFlow')}
                                </div>
                              ) : (
                                <div className="flex items-center space-x-2">
                                  {linkedFlow ? (
                                    <div className="flex items-center" ref={dropdownRef}>
                                      <div className="relative">
                                        <button
                                          type="button"
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
                                                  className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 text-left"
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
                                                  className="flex items-center w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 text-left"
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
                                </div>
                              )}
                            </div>

                            {/* Status do Fluxo */}
                            <div className="mt-4">
                              {linkedFlow ? (
                                <TriggersList 
                                  triggers={triggers}
                                  flowId={linkedFlow.id}
                                  onChange={setTriggers}
                                />
                              ) : (
                                <div className="flex items-center space-x-2 text-yellow-600 dark:text-yellow-400">
                                  <AlertTriangle className="w-4 h-4" />
                                  <div>
                                    <div className="text-sm font-medium">
                                      {t('flows:triggers.noFlow')}
                                    </div>
                                    <div className="text-xs">
                                      {t('flows:triggers.noFlowDescription')}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Botão para editar contexto */}
                        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                          <button
                            type="button"
                            onClick={() => setActiveTab('context')}
                            className="w-full flex items-center justify-between p-4 bg-white dark:bg-gray-700 rounded-lg shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                          >
                            <div className="flex items-start space-x-4">
                              <div className="flex-shrink-0">
                                <Info className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                                  {t('prompts:form.tabs.context')}
                                </h4>
                                <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                                  {formData.content || t('prompts:form.contentPlaceholder')}
                                </p>
                              </div>
                            </div>
                            <div className="flex-shrink-0 ml-4">
                              <ChevronRight className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                            </div>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'context' && (
                    <div className="flex-grow flex flex-col min-h-0 overflow-hidden mb-6">
                      <div className="mb-4 hidden sm:block">
                        <p className="text-sm text-gray-700 dark:text-gray-300 mb-0">
                          {t('prompts:form.contextDescription') || 'Configure o contexto que será enviado ao modelo. Este contexto define o comportamento e o ambiente do modelo durante a conversa.'}
                        </p>
                      </div>
                      
                      <ContentEditor 
                        content={formData.content} 
                        onChange={(content) => setFormData({ ...formData, content })} 
                      />
                    </div>
                  )}

                  {activeTab === 'tools' && (
                    <div className="flex-grow flex flex-col min-h-0 overflow-hidden mb-2">
                      {/* Conteúdo com scroll principal */}
                      <div className="flex-1 overflow-y-auto pr-2 min-h-0 pb-4 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent">
                        <div className="space-y-6">
                          {/* Descrição e Informações */}
                          <div>
                            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-md mb-6">
                              <p className="text-sm text-blue-700 dark:text-blue-400">
                                {t('prompts:form.toolsDescription')}
                              </p>
                            </div>
                          </div>

                          {/* Ações do Sistema */}
                          <div>
                            <div className="flex justify-between items-center mb-3">
                              <div>
                                <h3 className="text-sm font-medium text-gray-900 dark:text-white flex items-center">
                                  <Settings className="w-4 h-4 mr-2" />
                                  {t('prompts:form.systemActions')}
                                </h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                  {t('prompts:form.systemActionsDescription')}
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => setIsSystemActionModalOpen(true)}
                                className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                              >
                                {t('prompts:form.addSystemAction')}
                              </button>
                            </div>
                            
                            {formData.actions.length === 0 ? (
                              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                  {t('prompts:form.noSystemActions')}
                                </p>
                              </div>
                            ) : (
                              <SystemActionsList 
                                actions={formData.actions} 
                                onRemoveAction={(index) => {
                                  const newActions = [...formData.actions];
                                  newActions.splice(index, 1);
                                  setFormData({ ...formData, actions: newActions });
                                }}
                                onEditAction={() => {
                                  // Implementar edição de ação do sistema se necessário
                                }}
                              />
                            )}
                          </div>

                          {/* Ações Personalizadas */}
                          <div>
                            <div className="flex justify-between items-center mb-3">
                              <div>
                                <h3 className="text-sm font-medium text-gray-900 dark:text-white flex items-center">
                                  <Wrench className="w-4 h-4 mr-2" />
                                  {t('prompts:form.customActions')}
                                </h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                  {t('prompts:form.customActionsDescription')}
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingTool(null);
                                  setShowToolModal(true);
                                }}
                                className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                              >
                                {t('prompts:form.addTool')}
                              </button>
                            </div>
                            
                            {formData.tools.length === 0 ? (
                              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                  {t('prompts:form.noCustomActions')}
                                </p>
                              </div>
                            ) : (
                              <ToolsList 
                                tools={formData.tools} 
                                onRemoveTool={handleRemoveTool} 
                                onEditTool={handleEditTool}
                              />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'test' && (
                    <div className="flex-grow flex flex-col min-h-0 overflow-hidden mb-2">
                      <TestPrompt
                        selectedIntegration={selectedIntegration}
                        selectedModel={selectedModel}
                        temperature={temperature}
                        systemPrompt={formData.content}
                      />
                    </div>
                  )}

                  {activeTab !== 'test' && (
                    <div className="flex justify-end space-x-3">
                      <button
                        type="button"
                        onClick={handleBack}
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
                  )}
                </>
              )}
            </form>
          </div>

          {/* Seção de teste - visível apenas em telas grandes */}
          <div className="hidden sm:hidden md:hidden lg:hidden xl:hidden 2xl:flex 2xl:flex-col w-[450px] p-6 bg-white dark:bg-gray-800 rounded-lg">
            <TestPrompt
              selectedIntegration={selectedIntegration}
              selectedModel={selectedModel}
              temperature={temperature}
              systemPrompt={formData.content}
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

      <Modal
        isOpen={showIntegrationModal}
        onClose={() => setShowIntegrationModal(false)}
        title={t('settings:integrations.addNew') || 'Adicionar Nova Integração'}
      >
        <IntegrationFormOpenAI
          onSuccess={handleIntegrationSuccess}
          onCancel={() => setShowIntegrationModal(false)}
        />
      </Modal>

      {/* Modal de Ações do Sistema */}
      <Modal
        isOpen={isSystemActionModalOpen}
        onClose={() => setIsSystemActionModalOpen(false)}
        title={t('prompts:form.systemActions')}
      >
        <div className="grid grid-cols-1 gap-2">
          {Object.entries(SYSTEM_ACTION_TYPES).map(([type, translationKey]) => (
            <button
              key={type}
              onClick={() => handleAddSystemAction(type as SystemActionType)}
              className="flex items-center justify-between p-3 text-left rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <span>{t(translationKey)}</span>
              <Plus className="w-5 h-5 text-gray-500" />
            </button>
          ))}
        </div>
      </Modal>
    </div>
  );
};

export default PromptFormMain; 