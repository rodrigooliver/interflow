import React, { useState, useCallback } from 'react';
import { Handle, Position } from 'reactflow';
import { useTranslation } from 'react-i18next';
import { createPortal } from 'react-dom';
import Select from 'react-select';
import { BaseNode } from './BaseNode';
import { useFlowEditor } from '../../../contexts/FlowEditorContext';
import { useAuthContext } from '../../../contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import { useIntegrations, usePrompts } from '../../../hooks/useQueryes';
import { Integration, Prompt } from '../../../types/database';

interface OpenAINodeProps {
  data: {
    openai?: {
      model: string;
      temperature: number;
      maxTokens: number;
      variableName: string;
      integrationId?: string;
      promptId?: string;
      promptType?: 'select' | 'custom';
      customPrompt?: string;
      apiType?: 'textGeneration' | 'audioGeneration' | 'textToSpeech';
      messageType?: 'chatMessages' | 'allClientMessages';
      voice?: string;
      tools: { 
        name: string; 
        description: string; 
        parameters: {
          type: string;
          properties: Record<string, {
            type: string;
            description: string;
            enum?: string[];
          }>;
          required?: string[];
        };
        targetNodeId?: string;
        conditions?: {
          paramName: string;
          value: string;
          targetNodeId: string;
        }[];
        defaultTargetNodeId?: string;
      }[];
    };
    variables: { id: string; name: string }[];
    nodes: { id: string; type: string; data: unknown; label: string }[];
    label?: string;
  };
  isConnectable: boolean;
  id: string;
}

const Portal = ({ children }: { children: React.ReactNode }) => {
  return createPortal(children, document.body);
};

// Adicionar logo como componente de imagem
const OpenAILogo = () => (
  <img 
    src="/images/logos/openai.svg" 
    alt="OpenAI Logo" 
    className="w-5 h-5 mr-2 transition-all dark:invert dark:brightness-200"
  />
);

export function OpenAINode({ id, data, isConnectable }: OpenAINodeProps) {
  const { t } = useTranslation('flows');
  const { variables, nodes, updateNodeData } = useFlowEditor();
  const { currentOrganizationMember } = useAuthContext();
  const { data: integrations = [] } = useIntegrations(currentOrganizationMember?.organization.id);
  const { data: prompts = [] } = usePrompts(currentOrganizationMember?.organization.id);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [loading] = useState(false);
  const [localConfig, setLocalConfig] = useState(data.openai || {
    model: 'gpt-4o',
    temperature: 0.7,
    maxTokens: 150,
    variableName: '',
    integrationId: '',
    promptId: '',
    promptType: 'select' as const,
    customPrompt: '',
    apiType: 'textGeneration' as const,
    messageType: 'chatMessages' as const,
    voice: 'alloy',
    tools: []
  });

  // Atualiza estado local
  const handleConfigChange = useCallback((updates: Partial<typeof localConfig>) => {
    setLocalConfig(prev => ({ ...prev, ...updates }));
  }, []);

  // Salva no banco quando perde o foco
  const handleConfigBlur = useCallback(() => {
    updateNodeData(id, {
      ...data,
      openai: localConfig
    });
  }, [id, data, localConfig, updateNodeData]);

  const textGenerationModels = [
    { value: 'gpt-4o', label: 'GPT-4O' },
    { value: 'chatgpt-4o-latest', label: 'ChatGPT-4O Latest' },
    { value: 'gpt-4o-mini', label: 'GPT-4O Mini' },
    { value: 'o1', label: 'O1' },
    { value: 'o1-mini', label: 'O1 Mini' },
    { value: 'o3-mini', label: 'O3 Mini' },
    { value: 'o1-preview', label: 'O1 Preview' },
    { value: 'gpt-4o-realtime-preview', label: 'GPT-4O Realtime Preview' },
    { value: 'gpt-4o-mini-realtime-preview', label: 'GPT-4O Mini Realtime Preview' },
  ];

  const audioGenerationModels = [
    { value: 'gpt-4o-audio-preview', label: 'GPT-4O Audio Preview' }
  ];

  const textToSpeechModels = [
    { value: 'tts-1', label: 'TTS-1' }
  ];

  const apiTypes = [
    { value: 'textGeneration', label: t('nodes.openai.apiTypes.textGeneration') },
    { value: 'audioGeneration', label: t('nodes.openai.apiTypes.audioGeneration') },
    { value: 'textToSpeech', label: t('nodes.openai.apiTypes.textToSpeech') }
  ];

  const voices = [
    { value: 'alloy', label: 'Alloy' },
    { value: 'ash', label: 'Ash' },
    { value: 'coral', label: 'Coral' },
    { value: 'echo', label: 'Echo' },
    { value: 'fable', label: 'Fable' },
    { value: 'onyx', label: 'Onyx' },
    { value: 'nova', label: 'Nova' },
    { value: 'sage', label: 'Sage' },
    { value: 'shimmer', label: 'Shimmer' }
  ];

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800">
        <div className="flex items-center justify-center p-4">
          <Loader2 className="w-4 h-4 animate-spin text-gray-500 dark:text-gray-400" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800">
      <div 
        onClick={() => setIsModalOpen(true)}
        className="flex items-center p-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md"
      >
        <div className="flex items-center space-x-2">
          <OpenAILogo />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {data.label || t('nodes.openai.defaultLabel')}
          </span>
        </div>
      </div>

      <div className="node-content">
        <Handle
          type="target"
          position={Position.Left}
          isConnectable={isConnectable}
          className="w-3 h-3 bg-gray-300 dark:bg-gray-600"
        />

        <Handle
          type="source"
          position={Position.Right}
          isConnectable={isConnectable}
          className="w-3 h-3 bg-gray-300 dark:bg-gray-600"
        />
      </div>

      {isModalOpen && (
        <Portal>
          <div className="fixed inset-0 z-50">
            <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setIsModalOpen(false)} />
            <div className="fixed right-0 top-0 h-full bg-white dark:bg-gray-800 w-[600px] shadow-xl overflow-y-auto">
              <div className="p-6">
                <div className="relative mb-1">
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="absolute right-0 top-0 z-10 text-gray-400 hover:text-gray-500"
                  >
                    <span className="sr-only">Fechar</span>
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                  
                  <BaseNode 
                    id={id} 
                    data={data} 
                    onLabelChange={(newLabel) => {
                      const event = new CustomEvent('nodeDataChanged', {
                        detail: { nodeId: id, data: { ...data, label: newLabel } }
                      });
                      document.dispatchEvent(event);
                    }}
                    icon={<OpenAILogo />}
                  />
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
                    {localConfig.apiType === 'textGeneration' && (
                      <>
                        <button
                          onClick={() => setActiveTab('prompts')}
                          className={`px-4 py-2 text-sm font-medium ${
                            activeTab === 'prompts'
                              ? 'border-b-2 border-blue-500 text-blue-500'
                              : 'text-gray-500 dark:text-gray-400'
                          }`}
                        >
                          {t('nodes.openai.tabs.prompts')}
                        </button>
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
                        value={localConfig.integrationId}
                        onChange={(e) => handleConfigChange({ integrationId: e.target.value })}
                        onBlur={handleConfigBlur}
                        className="w-full p-2 text-sm border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-blue-500"
                      >
                        <option value="">{t('nodes.openai.selectIntegration')}</option>
                        {integrations.map((integration: Integration) => (
                          <option key={integration.id} value={integration.id}>
                            {integration.title}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                        {t('nodes.openai.apiType')}
                      </label>
                      <select
                        value={localConfig.apiType}
                        onChange={(e) => handleConfigChange({ apiType: e.target.value as 'textGeneration' | 'audioGeneration' | 'textToSpeech' })}
                        onBlur={handleConfigBlur}
                        className="w-full p-2 text-sm border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-blue-500"
                      >
                        <option value="">{t('nodes.openai.selectApiType')}</option>
                        {apiTypes.map(type => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                        {t('nodes.openai.model')}
                      </label>
                      <select
                        value={localConfig.model}
                        onChange={(e) => handleConfigChange({ model: e.target.value })}
                        onBlur={handleConfigBlur}
                        className="w-full p-2 text-sm border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-blue-500"
                      >
                        <option key="default" value="">
                          {t('nodes.openai.selectModel')}
                        </option>
                        {(localConfig.apiType === 'textGeneration' 
                          ? textGenerationModels 
                          : localConfig.apiType === 'audioGeneration'
                          ? audioGenerationModels
                          : textToSpeechModels).map(model => (
                          <option key={model.value} value={model.value}>
                            {model.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {localConfig.apiType === 'textToSpeech' && (
                      <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                          {t('nodes.openai.voice')}
                        </label>
                        <select
                          value={localConfig.voice || 'alloy'}
                          onChange={(e) => handleConfigChange({ voice: e.target.value })}
                          onBlur={handleConfigBlur}
                          className="w-full p-2 text-sm border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-blue-500"
                        >
                          {voices.map(voice => (
                            <option key={voice.value} value={voice.value}>
                              {voice.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                        {t('nodes.openai.temperature')}
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="2"
                        step="0.1"
                        value={localConfig.temperature}
                        onChange={(e) => handleConfigChange({ temperature: Number(e.target.value) })}
                        onBlur={handleConfigBlur}
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
                        value={localConfig.maxTokens}
                        onChange={(e) => handleConfigChange({ maxTokens: Number(e.target.value) })}
                        onBlur={handleConfigBlur}
                        className="w-full p-2 text-sm border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                        {t('nodes.openai.saveResponse')}
                      </label>
                      <select
                        value={localConfig.variableName}
                        onChange={(e) => handleConfigChange({ variableName: e.target.value })}
                        onBlur={handleConfigBlur}
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
                ) : activeTab === 'prompts' ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                        {t('nodes.openai.promptType')}
                      </label>
                      <select
                        value={localConfig.promptType}
                        onChange={(e) => handleConfigChange({ promptType: e.target.value as 'select' | 'custom' })}
                        onBlur={handleConfigBlur}
                        className="w-full p-2 text-sm border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-blue-500"
                      >
                        <option value="select">{t('nodes.openai.selectPrompt')}</option>
                        <option value="custom">{t('nodes.openai.customPrompt')}</option>
                      </select>
                    </div>

                    {localConfig.promptType === 'select' ? (
                      <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                          {t('nodes.openai.systemPrompt')}
                        </label>
                        <select
                          value={localConfig.promptId}
                          onChange={(e) => handleConfigChange({ promptId: e.target.value })}
                          onBlur={handleConfigBlur}
                          className="w-full p-2 text-sm border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-blue-500"
                        >
                          <option value="">{t('nodes.openai.selectPrompt')}</option>
                          {prompts.map((prompt: Prompt) => (
                            <option key={prompt.id} value={prompt.id}>
                              {prompt.title}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                          {t('nodes.openai.customPrompt')}
                        </label>
                        <textarea
                          defaultValue={localConfig.customPrompt ?? ''}
                          onChange={(e) => handleConfigChange({ customPrompt: e.target.value })}
                          onBlur={handleConfigBlur}
                          rows={20}
                          className="w-full p-2 text-sm border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-blue-500"
                          placeholder={t('nodes.openai.enterCustomPrompt')}
                        />
                      </div>
                    )}
                  </div>
                ) : activeTab === 'messages' ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                        {t('nodes.openai.messages.type')}
                      </label>
                      <select
                        value={localConfig.messageType}
                        onChange={(e) => handleConfigChange({ messageType: e.target.value as 'chatMessages' | 'allClientMessages' })}
                        onBlur={handleConfigBlur}
                        className="w-full p-2 text-sm border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-blue-500"
                      >
                        <option value="chatMessages">{t('nodes.openai.messages.chatMessages')}</option>
                        <option value="allClientMessages">{t('nodes.openai.messages.allClientMessages')}</option>
                      </select>
                    </div>
                  </div>
                ) : activeTab === 'tools' && (
                  <div className="space-y-4">
                    {(localConfig.tools || []).map((tool, index) => (
                      <div key={index} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                        <div className="flex justify-between items-center mb-3">
                          <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {t('nodes.openai.tools.tool')} {index + 1}
                          </h5>
                          <button
                            onClick={() => {
                              const newTools = localConfig.tools.filter((_, i) => i !== index);
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
                              defaultValue={tool.name ?? ''}
                              onChange={(e) => {
                                const newTools = [...localConfig.tools];
                                newTools[index] = { ...tool, name: e.target.value };
                                handleConfigChange({ tools: newTools });
                              }}
                              onBlur={handleConfigBlur}
                              className="w-full p-2 text-sm border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                              {t('nodes.openai.tools.description')}
                            </label>
                            <textarea
                              defaultValue={tool.description ?? ''}
                              onChange={(e) => {
                                const newTools = [...localConfig.tools];
                                newTools[index] = { ...tool, description: e.target.value };
                                handleConfigChange({ tools: newTools });
                              }}
                              onBlur={handleConfigBlur}
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
                                    className="text-sm text-blue-700 dark:text-blue-300"
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
                                                    description: ''
                                                  }
                                                },
                                                required: tool.parameters?.required || []
                                              };
                                              const newTools = [...localConfig.tools];
                                              newTools[index] = { ...tool, parameters: currentParams };
                                              handleConfigChange({ tools: newTools });
                                              handleConfigBlur(); // Salva as alterações ao adicionar um novo valor
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
                                    Object.entries(tool.parameters?.properties || {}).map(([paramName, paramConfig]: [string, {
                                      type: string;
                                      description: string;
                                      enum?: string[];
                                    }]) => (
                                      <div 
                                        key={paramName}
                                        className="flex flex-col p-2 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                                      >
                                          <div className="flex items-center justify-between">
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
                                              <div className="flex items-center">
                                                <input
                                                  type="checkbox"
                                                  checked={tool.parameters?.required?.includes(paramName)}
                                                  onChange={(e) => {
                                                    try {
                                                      const currentParams = { ...tool.parameters };
                                                      const required = currentParams.required || [];
                                                      
                                                      if (e.target.checked) {
                                                        currentParams.required = [...required, paramName];
                                                      } else {
                                                        currentParams.required = required.filter(name => name !== paramName);
                                                      }

                                                      const newTools = [...localConfig.tools];
                                                      newTools[index] = { ...tool, parameters: currentParams };
                                                      handleConfigChange({ tools: newTools });
                                                    } catch (error) {
                                                      console.error('Error updating required parameter:', error);
                                                    }
                                                  }}
                                                  className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                                />
                                                <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                                                  {t('nodes.openai.tools.required')}
                                                </span>
                                              </div>
                                            </div>
                                            <button
                                              onClick={() => {
                                                try {
                                                const newProperties = { ...tool.parameters?.properties };
                                                if (newProperties) {
                                                  delete newProperties[paramName];
                                                  
                                                  const currentParams = {
                                                    type: 'object',
                                                    properties: newProperties,
                                                    required: (tool.parameters?.required || []).filter(name => name !== paramName)
                                                  };
                                                  
                                                  const newTools = [...(localConfig.tools || [])].map((t, idx) => {
                                                    if (idx === index) {
                                                      return {
                                                        ...t,
                                                        parameters: currentParams
                                                      };
                                                    }
                                                    return t;
                                                  });
                                                  
                                                  handleConfigChange({ tools: newTools });
                                                }
                                                } catch (error) {
                                                  console.error('Error removing parameter:', error);
                                                }
                                              }}
                                              className="p-1 hover:bg-blue-200 dark:hover:bg-blue-800 rounded-full transition-colors"
                                            >
                                            <svg className="h-4 w-4 text-blue-500 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                              </svg>
                                            </button>
                                          </div>
                                          
                                        <div className="mt-2">
                                          <textarea
                                            defaultValue={paramConfig.description}
                                            onChange={(e) => {
                                              try {
                                                const currentParams = { ...tool.parameters };
                                                if (currentParams.properties && currentParams.properties[paramName]) {
                                                  currentParams.properties[paramName].description = e.target.value;
                                                  
                                                const newTools = [...localConfig.tools];
                                                newTools[index] = { ...tool, parameters: currentParams };
                                                handleConfigChange({ tools: newTools });
                                                }
                                              } catch (error) {
                                                console.error('Error updating parameter description:', error);
                                              }
                                            }}
                                            onBlur={handleConfigBlur}
                                            rows={2}
                                            className="w-full p-2 text-xs border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                            placeholder={t('nodes.openai.tools.parameterDescription')}
                                          />
                                        </div>
                                        
                                        {/* Seção de Enum */}
                                        <div className="mt-2">
                                          <div className="flex items-center justify-between">
                                            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                                              {t('nodes.openai.tools.enumValues')}
                                            </label>
                                            <button
                                              type="button"
                                              onClick={() => {
                                                try {
                                                  // Cria uma cópia profunda dos parâmetros para evitar modificar o objeto original
                                                  const currentParams = { ...tool.parameters };
                                                  
                                                  if (currentParams.properties && currentParams.properties[paramName]) {
                                                    // Inicializar o array enum se não existir
                                                    if (!currentParams.properties[paramName].enum) {
                                                      currentParams.properties[paramName].enum = [];
                                                    }
                                                    
                                                    // Adicionar um novo valor vazio ao enum
                                                    currentParams.properties[paramName].enum = [
                                                      ...(currentParams.properties[paramName].enum || []),
                                                      ''
                                                    ];
                                                    
                                                    // Atualiza as ferramentas com os novos parâmetros
                                                    const newTools = [...localConfig.tools];
                                                    newTools[index] = { ...tool, parameters: currentParams };
                                                    handleConfigChange({ tools: newTools });
                                                    handleConfigBlur(); // Salva as alterações ao adicionar um novo valor enum
                                                  }
                                                } catch (error) {
                                                  console.error('Error adding enum value:', error);
                                                }
                                              }}
                                              className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                                            >
                                              + {t('nodes.openai.tools.addEnumValue')}
                                            </button>
                                          </div>
                                          
                                          {paramConfig.enum && paramConfig.enum.length > 0 ? (
                                            <div className="mt-1 space-y-1">
                                              {paramConfig.enum.map((enumValue, enumIndex) => (
                                                <div key={enumIndex} className="flex items-center space-x-2">
                                                  <input
                                                    type="text"
                                                    value={enumValue}
                                                    onChange={(e) => {
                                                      try {
                                                        // Cria uma cópia profunda dos parâmetros para evitar modificar o objeto original
                                                        const currentParams = { ...tool.parameters };
                                                        
                                                        if (currentParams.properties && 
                                                            currentParams.properties[paramName] && 
                                                            currentParams.properties[paramName].enum) {
                                                          
                                                          // Cria uma cópia do array enum
                                                          const newEnumValues = [...currentParams.properties[paramName].enum];
                                                          
                                                          // Atualiza o valor no índice especificado
                                                          newEnumValues[enumIndex] = e.target.value;
                                                          
                                                          // Atualiza o array enum com os novos valores
                                                          currentParams.properties[paramName].enum = newEnumValues;
                                                          
                                                          // Atualiza as ferramentas com os novos parâmetros
                                                          const newTools = [...localConfig.tools];
                                                          newTools[index] = { ...tool, parameters: currentParams };
                                                          handleConfigChange({ tools: newTools });
                                                        }
                                                      } catch (error) {
                                                        console.error('Error updating enum value:', error);
                                                      }
                                                    }}
                                                    onBlur={handleConfigBlur}
                                                    className="flex-1 p-1 text-xs border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                                  />
                                                  <button
                                                    type="button"
                                                    onClick={() => {
                                                      try {
                                                        // Cria uma cópia profunda dos parâmetros para evitar modificar o objeto original
                                                        const currentParams = { ...tool.parameters };
                                                        
                                                        if (currentParams.properties && 
                                                            currentParams.properties[paramName] && 
                                                            currentParams.properties[paramName].enum) {
                                                          
                                                          // Filtra o array enum para remover o valor no índice especificado
                                                          const newEnumValues = currentParams.properties[paramName].enum.filter(
                                                            (_, i) => i !== enumIndex
                                                          );
                                                          
                                                          // Atualiza o array enum com os novos valores
                                                          currentParams.properties[paramName].enum = newEnumValues;
                                                          
                                                          // Atualiza as ferramentas com os novos parâmetros
                                                          const newTools = [...localConfig.tools];
                                                          newTools[index] = { ...tool, parameters: currentParams };
                                                          handleConfigChange({ tools: newTools });
                                                          handleConfigBlur(); // Salva as alterações ao remover um valor enum
                                                        }
                                                      } catch (error) {
                                                        console.error('Error removing enum value:', error);
                                                      }
                                                    }}
                                                    className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-full transition-colors"
                                                  >
                                                    <svg className="h-3 w-3 text-red-500 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                  </button>
                                                </div>
                                              ))}
                                            </div>
                                          ) : (
                                            <p className="text-xs text-gray-500 dark:text-gray-400 italic mt-1">
                                              {t('nodes.openai.tools.noEnumValues')}
                                            </p>
                                          )}
                                        </div>
                                      </div>
                                    ))
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Seção de Condições */}
                          <div className="mt-4">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                {t('nodes.openai.tools.conditions')}
                              </h4>
                              {(() => {
                                // Verifica se existem parâmetros com enum
                                const hasEnumParams = tool.parameters?.properties 
                                  ? Object.values(tool.parameters.properties).some(
                                      param => param.enum && Array.isArray(param.enum) && param.enum.length > 0
                                    )
                                  : false;
                                
                                return hasEnumParams ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const newTools = [...localConfig.tools];
                                      const toolCopy = { ...newTools[index] };
                                      
                                      // Inicializa o array de condições se não existir
                                      if (!toolCopy.conditions) {
                                        toolCopy.conditions = [];
                                      }
                                      
                                      // Encontra o primeiro parâmetro com enum
                                      let firstEnumParam = '';
                                      let firstEnumValue = '';
                                      
                                      if (toolCopy.parameters && toolCopy.parameters.properties) {
                                        for (const [paramName, paramConfig] of Object.entries(toolCopy.parameters.properties)) {
                                          if (paramConfig.enum && paramConfig.enum.length > 0) {
                                            firstEnumParam = paramName;
                                            firstEnumValue = paramConfig.enum[0];
                                            break;
                                          }
                                        }
                                      }
                                      
                                      // Adiciona uma nova condição
                                      toolCopy.conditions.push({
                                        paramName: firstEnumParam,
                                        value: firstEnumValue,
                                        targetNodeId: ''
                                      });
                                      
                                      newTools[index] = toolCopy;
                                      handleConfigChange({ tools: newTools });
                                      handleConfigBlur(); // Salva as alterações ao adicionar uma nova condição
                                    }}
                                    className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                                  >
                                    + {t('nodes.openai.tools.addCondition')}
                                  </button>
                                ) : (
                                  <span className="text-xs text-gray-500 dark:text-gray-400 italic">
                                    {t('nodes.openai.tools.addEnumFirst')}
                                  </span>
                                );
                              })()}
                            </div>
                            
                            {tool.conditions && tool.conditions.length > 0 ? (
                              <div className="space-y-2">
                                {tool.conditions.map((condition, conditionIndex) => {
                                  // Encontra os parâmetros com enum
                                  const enumParams = [];
                                  const selectedParamValues = [];
                                  
                                  if (tool.parameters && tool.parameters.properties) {
                                    for (const [paramName, paramConfig] of Object.entries(tool.parameters.properties)) {
                                      if (paramConfig.enum && paramConfig.enum.length > 0) {
                                        enumParams.push({
                                          name: paramName,
                                          values: paramConfig.enum
                                        });
                                        
                                        if (paramName === condition.paramName) {
                                          selectedParamValues.push(...paramConfig.enum);
                                        }
                                      }
                                    }
                                  }
                                  
                                  return (
                                    <div 
                                      key={conditionIndex}
                                      className="p-2 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-md"
                                    >
                                      <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center space-x-2">
                                          <span className="text-xs text-gray-500 dark:text-gray-400">
                                            {t('nodes.openai.tools.ifParameter')}
                                          </span>
                                          
                                          {/* Seletor de Parâmetro */}
                                          <select
                                            value={condition.paramName}
                                            onChange={(e) => {
                                              const newTools = [...localConfig.tools];
                                              const toolCopy = { ...newTools[index] };
                                              const conditionsCopy = [...(toolCopy.conditions || [])];
                                              
                                              // Encontra o primeiro valor do enum para o novo parâmetro
                                              let firstValue = '';
                                              if (tool.parameters && tool.parameters.properties) {
                                                const paramConfig = tool.parameters.properties[e.target.value];
                                                if (paramConfig && paramConfig.enum && paramConfig.enum.length > 0) {
                                                  firstValue = paramConfig.enum[0];
                                                }
                                              }
                                              
                                              conditionsCopy[conditionIndex] = {
                                                ...conditionsCopy[conditionIndex],
                                                paramName: e.target.value,
                                                value: firstValue
                                              };
                                              
                                              toolCopy.conditions = conditionsCopy;
                                              newTools[index] = toolCopy;
                                              handleConfigChange({ tools: newTools });
                                            }}
                                            onBlur={handleConfigBlur}
                                            className="text-xs p-1 border rounded border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                          >
                                            {enumParams.map((param) => (
                                              <option key={param.name} value={param.name}>
                                                {param.name}
                                              </option>
                                            ))}
                                          </select>
                                          
                                          <span className="text-xs text-gray-500 dark:text-gray-400">
                                            {t('nodes.openai.tools.equals')}
                                          </span>
                                          
                                          {/* Seletor de Valor */}
                                          <select
                                            value={condition.value}
                                            onChange={(e) => {
                                              const newTools = [...localConfig.tools];
                                              const toolCopy = { ...newTools[index] };
                                              const conditionsCopy = [...(toolCopy.conditions || [])];
                                              
                                              conditionsCopy[conditionIndex] = {
                                                ...conditionsCopy[conditionIndex],
                                                value: e.target.value
                                              };
                                              
                                              toolCopy.conditions = conditionsCopy;
                                              newTools[index] = toolCopy;
                                              handleConfigChange({ tools: newTools });
                                            }}
                                            onBlur={handleConfigBlur}
                                            className="text-xs p-1 border rounded border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                          >
                                            {selectedParamValues.map((value) => (
                                              <option key={value} value={value}>
                                                {value}
                                              </option>
                                            ))}
                                          </select>
                                          
                                          <span className="text-xs text-gray-500 dark:text-gray-400">
                                            {t('nodes.openai.tools.goTo')}
                                          </span>
                                        </div>
                                        
                                        {/* Botão de Remover */}
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const newTools = [...localConfig.tools];
                                            const toolCopy = { ...newTools[index] };
                                            const conditionsCopy = [...(toolCopy.conditions || [])];
                                            
                                            conditionsCopy.splice(conditionIndex, 1);
                                            
                                            toolCopy.conditions = conditionsCopy;
                                            newTools[index] = toolCopy;
                                            handleConfigChange({ tools: newTools });
                                            handleConfigBlur(); // Salva as alterações ao remover uma condição
                                          }}
                                          className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-full transition-colors"
                                        >
                                          <svg className="h-3 w-3 text-red-500 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                          </svg>
                                        </button>
                                      </div>
                                      
                                      {/* Seletor de Nó de Destino */}
                                      <Select
                                        value={nodes
                                          .filter(node => node.id === condition.targetNodeId)
                                          .map(node => ({
                                            value: node.id,
                                            label: `${node.data?.label || node.type}`
                                          }))[0]}
                                        onChange={(selected) => {
                                          const newTools = [...localConfig.tools];
                                          const toolCopy = { ...newTools[index] };
                                          const conditionsCopy = [...(toolCopy.conditions || [])];
                                          
                                          conditionsCopy[conditionIndex] = {
                                            ...conditionsCopy[conditionIndex],
                                            targetNodeId: selected ? selected.value : ''
                                          };
                                          
                                          toolCopy.conditions = conditionsCopy;
                                          newTools[index] = toolCopy;
                                          handleConfigChange({ tools: newTools });
                                        }}
                                        onBlur={handleConfigBlur}
                                        options={nodes
                                          .filter(node => node.id !== id && node.type !== 'start')
                                          .map(node => ({
                                            value: node.id,
                                            label: `${node.data?.label || node.type}`
                                          }))}
                                        className="react-select-container"
                                        classNamePrefix="react-select"
                                        placeholder={t('nodes.openai.tools.selectTargetNode')}
                                        isClearable
                                        styles={{
                                          control: (base, state) => ({
                                            ...base,
                                            backgroundColor: 'var(--select-bg)',
                                            borderColor: 'var(--select-border)',
                                            boxShadow: state.isFocused ? '0 0 0 1px var(--select-focus)' : 'none',
                                            '&:hover': {
                                              borderColor: 'var(--select-border-hover)'
                                            }
                                          }),
                                          menu: (base) => ({
                                            ...base,
                                            backgroundColor: 'var(--select-bg)',
                                            zIndex: 9999
                                          }),
                                          option: (base, state) => ({
                                            ...base,
                                            backgroundColor: state.isSelected
                                              ? 'var(--select-option-selected-bg)'
                                              : state.isFocused
                                                ? 'var(--select-option-focus-bg)'
                                                : 'var(--select-bg)',
                                            color: state.isSelected
                                              ? 'var(--select-option-selected-text)'
                                              : 'var(--select-text)'
                                          })
                                        }}
                                      />
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                                {t('nodes.openai.tools.noConditions')}
                              </p>
                            )}
                          </div>
                          
                          {/* Rota Padrão */}
                          <div className="mt-4">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              {t('nodes.openai.tools.defaultRoute')}
                            </label>
                            <Select
                              value={nodes
                                .filter(node => node.id === (tool.defaultTargetNodeId || tool.targetNodeId))
                                .map(node => ({
                                  value: node.id,
                                  label: `${node.data?.label || node.type}`
                                }))[0]}
                              onChange={(selected) => {
                                const newTools = [...localConfig.tools];
                                newTools[index] = { 
                                  ...tool, 
                                  defaultTargetNodeId: selected ? selected.value : undefined,
                                  // Mantém compatibilidade com versões anteriores
                                  targetNodeId: selected ? selected.value : undefined 
                                };
                                handleConfigChange({ tools: newTools });
                              }}
                              onBlur={handleConfigBlur}
                              options={nodes
                                .filter(node => node.id !== id && node.type !== 'start')
                                .map(node => ({
                                  value: node.id,
                                  label: `${node.data?.label || node.type}`
                                }))}
                              className="react-select-container"
                              classNamePrefix="react-select"
                              placeholder={t('nodes.openai.tools.selectTargetNode')}
                              isClearable
                              styles={{
                                control: (base, state) => ({
                                  ...base,
                                  backgroundColor: 'var(--select-bg)',
                                  borderColor: 'var(--select-border)',
                                  boxShadow: state.isFocused ? '0 0 0 1px var(--select-focus)' : 'none',
                                  '&:hover': {
                                    borderColor: 'var(--select-border-hover)'
                                  }
                                }),
                                menu: (base) => ({
                                  ...base,
                                  backgroundColor: 'var(--select-bg)',
                                  zIndex: 9999
                                }),
                                option: (base, state) => ({
                                  ...base,
                                  backgroundColor: state.isSelected
                                    ? 'var(--select-option-selected-bg)'
                                    : state.isFocused
                                      ? 'var(--select-option-focus-bg)'
                                      : 'var(--select-bg)',
                                  color: state.isSelected
                                    ? 'var(--select-option-selected-text)'
                                    : 'var(--select-text)'
                                })
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}

                    <div className="flex justify-center mt-4">
                      <button
                        onClick={() => {
                          const newTools = [...(localConfig.tools || []), { 
                            name: '', 
                            description: '', 
                            parameters: { type: 'object', properties: {} },
                            targetNodeId: '',
                            defaultTargetNodeId: '',
                            conditions: []
                          }];
                          handleConfigChange({ tools: newTools });
                        }}
                        className="px-3 py-1 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600"
                      >
                        {t('nodes.openai.tools.addTool')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
}