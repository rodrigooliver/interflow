import React, { useState, useCallback } from 'react';
import { Handle, Position } from 'reactflow';
import { useTranslation } from 'react-i18next';
import { createPortal } from 'react-dom';
import { BaseNode } from './BaseNode';
import { useFlowEditor } from '../../../contexts/FlowEditorContext';
import { Loader2 } from 'lucide-react';

interface AgenteIANodeProps {
  data: {
    agenteia?: {
      promptId?: string;
      variableName: string;
    };
    variables: { id: string; name: string }[];
    label?: string;
  };
  isConnectable: boolean;
  id: string;
}

const Portal = ({ children }: { children: React.ReactNode }) => {
  return createPortal(children, document.body);
};

// Logo do Agente IA
const AgenteIALogo = () => (
  <img 
    src="/images/logos/agenteia.svg" 
    alt="Agente IA Logo" 
    className="w-5 h-5 mr-2 transition-all dark:invert dark:brightness-200"
  />
);

export function AgenteIANode({ id, data, isConnectable }: AgenteIANodeProps) {
  const { t } = useTranslation('flows');
  const { prompts, variables, updateNodeData } = useFlowEditor();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading] = useState(false);
  const [localConfig, setLocalConfig] = useState(data.agenteia || {
    promptId: '',
    variableName: ''
  });

  // Atualiza estado local
  const handleConfigChange = (updates: Partial<typeof localConfig>) => {
    setLocalConfig(prev => ({ ...prev, ...updates }));
  };

  // Salva no banco quando perde o foco
  const handleConfigBlur = useCallback(() => {
    updateNodeData(id, {
      ...data,
      agenteia: localConfig
    });
  }, [id, data, localConfig, updateNodeData]);

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
          <AgenteIALogo />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {data.label || t('nodes.agenteia.defaultLabel')}
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
                    icon={<AgenteIALogo />}
                  />
                </div>

                <div className="space-y-4 mt-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                      {t('nodes.agenteia.prompt')}
                    </label>
                    <select
                      value={localConfig.promptId}
                      onChange={(e) => handleConfigChange({ promptId: e.target.value })}
                      onBlur={handleConfigBlur}
                      className="w-full p-2 text-sm border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-blue-500"
                    >
                      <option value="">{t('nodes.agenteia.selectPrompt')}</option>
                      {prompts.map(prompt => (
                        <option key={prompt.id} value={prompt.id}>
                          {prompt.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                      {t('nodes.agenteia.saveResponse')}
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
              </div>
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
} 