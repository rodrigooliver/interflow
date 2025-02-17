import React, { useState, useEffect } from 'react';
import { Handle, Position } from 'reactflow';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../../lib/supabase';
import { useOrganization } from '../../../hooks/useOrganization';
import { Integration, Prompt } from '../../../types/database';
import { EventBus } from '../../../lib/eventBus';
import { Plus } from 'lucide-react';


interface OpenAINodeProps {
  data: {
    openai?: {
      model: string;
      temperature: number;
      maxTokens: number;
      variableName: string;
      integrationId?: string;
      promptId?: string;
      apiType?: string;
      tools: { name: string; description: string; parameters: any }[];
    };
    variables: { id: string; name: string }[];
  };
  isConnectable: boolean;
  id: string;
}

// Adicionar logo como componente de imagem
const OpenAILogo = () => (
  <img 
    src="/openai.svg" 
    alt="OpenAI Logo" 
    className="w-5 h-5 mr-2 transition-all dark:invert dark:brightness-200"
  />
);

export function OpenAINode({ data, isConnectable, id }: OpenAINodeProps) {
  const { t } = useTranslation(['flows', 'common']);
  const { currentOrganization } = useOrganization();
  const [config, setConfig] = useState(data.openai || {
    model: 'gpt-4o',
    temperature: 0.7,
    maxTokens: 150,
    variableName: '',
    integrationId: '',
    promptId: '',
    apiType: 'chatCompletion',
    messageType: 'chatMessages',
    tools: []
  });
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('general');

  // Garantir que variables seja sempre um array
  const variables = data.variables || [];

  useEffect(() => {
    const fetchData = async () => {
      if (!currentOrganization) return;

      const { data: integrationsData, error: integrationsError } = await supabase
        .from('integrations')
        .select('*')
        .eq('type', 'openai')
        .eq('status', 'active')
        .eq('organization_id', currentOrganization.id);

      const { data: promptsData, error: promptsError } = await supabase
        .from('prompts')
        .select('*')
        .eq('organization_id', currentOrganization.id);

      if (!integrationsError && integrationsData) {
        setIntegrations(integrationsData);
      }

      if (!promptsError && promptsData) {
        setPrompts(promptsData);
      }
    };

    fetchData();
  }, [currentOrganization]);

  useEffect(() => {
    const event = new CustomEvent('updateNodeInternals', { detail: { nodeId: id } });
    document.dispatchEvent(event);
  }, [id, config]);

  const handleConfigChange = (updates: Partial<typeof config>) => {
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);
    
    const event = new CustomEvent('nodeDataChanged', {
      detail: {
        nodeId: id,
        data: { openai: newConfig }
      }
    });
    document.dispatchEvent(event);
  };

  const models = [
    { value: 'gpt-4o', label: 'GPT-4O' },
    { value: 'chatgpt-4o-latest', label: 'ChatGPT-4O Latest' },
    { value: 'gpt-4o-mini', label: 'GPT-4O Mini' },
    { value: 'o1', label: 'O1' },
    { value: 'o1-mini', label: 'O1 Mini' },
    { value: 'o3-mini', label: 'O3 Mini' },
    { value: 'o1-preview', label: 'O1 Preview' },
    { value: 'gpt-4o-realtime-preview', label: 'GPT-4O Realtime Preview' },
    { value: 'gpt-4o-mini-realtime-preview', label: 'GPT-4O Mini Realtime Preview' },
    { value: 'gpt-4o-audio-preview', label: 'GPT-4O Audio Preview' }
  ];

  const apiTypes = [
    { value: 'chatCompletion', label: t('nodes.openai.apiTypes.chatCompletion') }
  ];

  return (
    <div className="node-content">
      <Handle
        type="target"
        position={Position.Left}
        isConnectable={isConnectable}
        className="w-3 h-3 bg-gray-300 dark:bg-gray-600"
      />
      
      <div 
        className="flex items-center p-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md"
        onClick={() => setIsModalOpen(true)}
      >
        <OpenAILogo />
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {t('nodes.openai.title')}
        </span>
      </div>

      {isModalOpen && (
        <div className="absolute z-50 left-0 top-0">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setIsModalOpen(false)} />
          <div className="relative -left-1/4 top-8 bg-white dark:bg-gray-800 rounded-lg p-6 w-[600px] shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                {t('nodes.openai.title')} - {t('nodes.openai.settings')}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <span className="sr-only">Fechar</span>
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="border-b border-gray-200 dark:border-gray-700 mb-4">
              <nav className="flex space-x-4">
                <button
                  onClick={() => setActiveTab('general')}
                  className={`px-4 py-2 text-sm font-medium ${
                    activeTab === 'general'
                      ? 'border-b-2 border-blue-500 text-blue-500'
                      : 'text-gray-500 dark:text-gray-400'
                  }`}
                >
                  {t('nodes.openai.tabs.general')}
                </button>
                {config.apiType === 'chatCompletion' && (
                  <>
                    <button
                      onClick={() => setActiveTab('messages')}
                      className={`px-4 py-2 text-sm font-medium ${
                        activeTab === 'messages'
                          ? 'border-b-2 border-blue-500 text-blue-500'
                          : 'text-gray-500 dark:text-gray-400'
                      }`}
                    >
                      {t('nodes.openai.tabs.messages')}
                    </button>
                    <button
                      onClick={() => setActiveTab('tools')}
                      className={`px-4 py-2 text-sm font-medium ${
                        activeTab === 'tools'
                          ? 'border-b-2 border-blue-500 text-blue-500'
                          : 'text-gray-500 dark:text-gray-400'
                      }`}
                    >
                      {t('nodes.openai.tabs.tools')}
                    </button>
                  </>
                )}
              </nav>
            </div>

            {activeTab === 'general' ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    {t('nodes.openai.integration')}
                  </label>
                  <select
                    value={config.integrationId}
                    onChange={(e) => handleConfigChange({ integrationId: e.target.value })}
                    className="w-full p-2 text-sm border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="">{t('nodes.openai.selectIntegration')}</option>
                    {integrations.map(integration => (
                      <option key={integration.id} value={integration.id}>
                        {integration.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    {t('nodes.openai.systemPrompt')}
                  </label>
                  <select
                    value={config.promptId}
                    onChange={(e) => handleConfigChange({ promptId: e.target.value })}
                    className="w-full p-2 text-sm border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="">{t('nodes.openai.selectPrompt')}</option>
                    {prompts.map(prompt => (
                      <option key={prompt.id} value={prompt.id}>
                        {prompt.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    {t('nodes.openai.model')}
                  </label>
                  <select
                    value={config.model}
                    onChange={(e) => handleConfigChange({ model: e.target.value })}
                    className="w-full p-2 text-sm border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option key="default" value="">
                      {t('nodes.openai.selectModel')}
                    </option>
                    {models.map(model => (
                      <option key={model.value} value={model.value}>
                        {model.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    {t('nodes.openai.apiType')}
                  </label>
                  <select
                    value={config.apiType}
                    onChange={(e) => handleConfigChange({ apiType: e.target.value })}
                    className="w-full p-2 text-sm border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option key="default" value="">
                      {t('nodes.openai.selectApiType')}
                    </option>
                    {apiTypes.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    {t('nodes.openai.temperature')}
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="2"
                    step="0.1"
                    value={config.temperature}
                    onChange={(e) => handleConfigChange({ temperature: Number(e.target.value) })}
                    className="w-full p-2 text-sm border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    {t('nodes.openai.maxTokens')}
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="4000"
                    value={config.maxTokens}
                    onChange={(e) => handleConfigChange({ maxTokens: Number(e.target.value) })}
                    className="w-full p-2 text-sm border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    {t('nodes.openai.saveResponse')}
                  </label>
                  <select
                    value={config.variableName}
                    onChange={(e) => handleConfigChange({ variableName: e.target.value })}
                    className="w-full p-2 text-sm border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="">{t('nodes.variable.selectVariable')}</option>
                    {variables.map((variable) => (
                      <option key={variable.id} value={variable.name}>
                        {variable.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ) : activeTab === 'messages' ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    {t('nodes.openai.messages.type')}
                  </label>
                  <select
                    value={config.messageType}
                    onChange={(e) => handleConfigChange({ messageType: e.target.value })}
                    className="w-full p-2 text-sm border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="chatMessages">{t('nodes.openai.messages.chatMessages')}</option>
                    <option value="allClientMessages">{t('nodes.openai.messages.allClientMessages')}</option>
                  </select>
                </div>
              </div>
            ) : activeTab === 'tools' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t('nodes.openai.tools.title')}
                  </h4>
                  <button
                    onClick={() => {
                      const newTools = [...(config.tools || []), { 
                        name: '', 
                        description: '', 
                        parameters: { type: 'object', properties: {} } 
                      }];
                      handleConfigChange({ tools: newTools });
                    }}
                    className="px-3 py-1 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600"
                  >
                    {t('nodes.openai.tools.addTool')}
                  </button>
                </div>

                {(config.tools || []).map((tool, index) => (
                  <div key={index} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <div className="flex justify-between items-center mb-3">
                      <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {t('nodes.openai.tools.tool')} {index + 1}
                      </h5>
                      <button
                        onClick={() => {
                          const newTools = config.tools.filter((_, i) => i !== index);
                          handleConfigChange({ tools: newTools });
                        }}
                        className="text-red-500 hover:text-red-600"
                      >
                        <span className="sr-only">{t('common:remove')}</span>
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                          {t('nodes.openai.tools.name')}
                        </label>
                        <input
                          type="text"
                          value={tool.name}
                          onChange={(e) => {
                            const newTools = [...config.tools];
                            newTools[index] = { ...tool, name: e.target.value };
                            handleConfigChange({ tools: newTools });
                          }}
                          className="w-full p-2 text-sm border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                          {t('nodes.openai.tools.description')}
                        </label>
                        <textarea
                          value={tool.description}
                          onChange={(e) => {
                            const newTools = [...config.tools];
                            newTools[index] = { ...tool, description: e.target.value };
                            handleConfigChange({ tools: newTools });
                          }}
                          rows={3}
                          className="w-full p-2 text-sm border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                          {t('nodes.openai.tools.parameters')}
                        </label>
                        
                        <div className="space-y-4">
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {t('nodes.openai.tools.availableVariables')}:
                              </p>
                              {variables.length > 0 ? (
                              <button
                                onClick={() => {
                                  // Disparar evento para abrir o modal de variáveis
                                  console.log("rodrigo2")
                                  const event = new CustomEvent('openModalVariable', {
                                    detail: {
                                      id: 'variableModal',
                                      data: {
                                        nodeId: id,
                                        variables: variables
                                      }
                                    }
                                  });
                                  document.dispatchEvent(event);
                                }}
                                className="px-4 py-2 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
                              >
                                {t('nodes.openai.tools.createVariable')}
                              </button>
                              ) : null}
                            </div>

                            {variables.length === 0 ? (
                              <div className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-3 text-center">
                                  {t('nodes.openai.tools.noVariables')}
                                </p>
                                <button
                                  onClick={() => {
                                    // Disparar evento para abrir o modal de variáveis
                                    console.log("rodrigo2")
                                    const event = new CustomEvent('openModalVariable', {
                                      detail: {
                                        id: 'variableModal',
                                        data: {
                                          nodeId: id,
                                          variables: variables
                                        }
                                      }
                                    });
                                    document.dispatchEvent(event);
                                  }}
                                  className="px-4 py-2 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
                                >
                                  {t('nodes.openai.tools.createVariable')}
                                </button>
                              </div>
                            ) : (
                              <div className="flex flex-wrap gap-2">
                                {variables.map((variable) => {
                                  const isAlreadyAdded = tool.parameters?.properties?.[variable.name];
                                  return (
                                    <button
                                      key={variable.id}
                                      onClick={() => {
                                        try {
                                          const currentParams = {
                                            type: 'object',
                                            properties: {
                                              ...(tool.parameters?.properties || {}),
                                              [variable.name]: {
                                                type: 'string',
                                                description: `Variable: ${variable.name}`
                                              }
                                            }
                                          };
                                          const newTools = [...config.tools];
                                          newTools[index] = { ...tool, parameters: currentParams };
                                          handleConfigChange({ tools: newTools });
                                        } catch (error) {
                                          console.error('Error updating parameters:', error);
                                        }
                                      }}
                                      disabled={isAlreadyAdded}
                                      className={`px-2 py-1 text-xs rounded-md flex items-center space-x-2 ${
                                        isAlreadyAdded
                                          ? 'bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                                          : 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800'
                                      }`}
                                    >
                                      {!isAlreadyAdded && <Plus className="w-3 h-3" />}
                                      <span>{variable.name}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>

                          <div>
                            <div className="space-y-2 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                              {Object.entries(tool.parameters?.properties || {}).length === 0 ? (
                                <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                                  {t('nodes.openai.tools.noParameters')}
                                </p>
                              ) : (
                                Object.entries(tool.parameters?.properties || {}).map(([paramName, paramConfig]) => (
                                  <div 
                                    key={paramName}
                                    className="flex items-center justify-between p-2 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                                  >
                                    <div className="flex items-center space-x-2">
                                      <svg 
                                        className="h-4 w-4 text-blue-500 dark:text-blue-400" 
                                        fill="none" 
                                        viewBox="0 0 24 24" 
                                        stroke="currentColor"
                                      >
                                        <path 
                                          strokeLinecap="round" 
                                          strokeLinejoin="round" 
                                          strokeWidth={2} 
                                          d="M13 10V3L4 14h7v7l9-11h-7z"
                                        />
                                      </svg>
                                      <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                                        {paramName}
                                      </span>
                                    </div>
                                    <button
                                      onClick={() => {
                                        try {
                                          const newProperties = { ...tool.parameters.properties };
                                          delete newProperties[paramName];
                                          const currentParams = {
                                            ...tool.parameters,
                                            properties: newProperties
                                          };
                                          const newTools = [...config.tools];
                                          newTools[index] = { ...tool, parameters: currentParams };
                                          handleConfigChange({ tools: newTools });
                                        } catch (error) {
                                          console.error('Error removing parameter:', error);
                                        }
                                      }}
                                      className="p-1 hover:bg-blue-200 dark:hover:bg-blue-800 rounded-full transition-colors"
                                    >
                                      <svg 
                                        className="h-4 w-4 text-blue-500 dark:text-blue-400" 
                                        fill="none" 
                                        viewBox="0 0 24 24" 
                                        stroke="currentColor"
                                      >
                                        <path 
                                          strokeLinecap="round" 
                                          strokeLinejoin="round" 
                                          strokeWidth={2} 
                                          d="M6 18L18 6M6 6l12 12" 
                                        />
                                      </svg>
                                    </button>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <Handle
        type="source"
        position={Position.Right}
        isConnectable={isConnectable}
        className="w-3 h-3 bg-gray-300 dark:bg-gray-600"
      />
    </div>
  );
}