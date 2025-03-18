import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Tool } from '../../types/prompts';
import { Edit2, Trash2, ChevronDown, ChevronUp } from 'lucide-react';

interface ToolsListProps {
  tools: Tool[];
  onRemoveTool: (index: number) => void;
  onEditTool: (index: number) => void;
}

const ToolsList: React.FC<ToolsListProps> = ({ tools, onRemoveTool, onEditTool }) => {
  const { t } = useTranslation(['prompts', 'common']);
  const [expandedTools, setExpandedTools] = useState<Record<number, boolean>>({});

  // Inicializar todas as ferramentas como minimizadas
  React.useEffect(() => {
    const initialState: Record<number, boolean> = {};
    tools.forEach((_, index) => {
      initialState[index] = false;
    });
    setExpandedTools(initialState);
  }, [tools.length]);

  // Função para alternar o estado de expansão de uma ferramenta
  const toggleToolExpand = (index: number) => {
    setExpandedTools(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  if (tools.length === 0) {
    return (
      <div className="text-sm text-gray-500 dark:text-gray-400 italic">
        {t('prompts:form.noTools') || 'Nenhuma ferramenta configurada'}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {tools.map((tool, index) => (
        <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          <div className="p-4 bg-white dark:bg-gray-800">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                    {tool.name}
                  </h4>
                  <button
                    type="button"
                    onClick={() => onEditTool(index)}
                    className="ml-2 p-1 text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {tool.description}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => toggleToolExpand(index)}
                  className="p-1 text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400"
                >
                  {expandedTools[index] ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => onRemoveTool(index)}
                  className="p-1 text-red-400 hover:text-red-500 dark:text-red-500 dark:hover:text-red-400"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {expandedTools[index] && (
            <div className="p-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700">
              <div className="space-y-4">
                <div>
                  <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('prompts:form.toolParameters') || 'Parâmetros'}
                  </h5>
                  <div className="bg-white dark:bg-gray-800 p-3 rounded-md border border-gray-200 dark:border-gray-700">
                    <pre className="text-xs font-mono text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                      {JSON.stringify(tool.parameters, null, 2)}
                    </pre>
                  </div>
                </div>

                {tool.actions && tool.actions.length > 0 && (
                  <div>
                    <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t('prompts:form.toolActions') || 'Ações'}
                    </h5>
                    <div className="space-y-2">
                      {tool.actions.map((action, actionIndex) => (
                        <div
                          key={actionIndex}
                          className="bg-white dark:bg-gray-800 p-3 rounded-md border border-gray-200 dark:border-gray-700"
                        >
                          <div className="text-xs text-gray-700 dark:text-gray-300">
                            {action.type}
                          </div>
                          {action.config && (
                            <pre className="mt-1 text-xs font-mono text-gray-500 dark:text-gray-400 whitespace-pre-wrap">
                              {JSON.stringify(action.config, null, 2)}
                            </pre>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default ToolsList; 