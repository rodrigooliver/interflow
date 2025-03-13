import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Pencil, Trash2, ChevronDown, ChevronUp, PlayCircle } from 'lucide-react';
import { Tool } from '../../types/prompts';

interface ToolsListProps {
  tools: Tool[];
  onRemoveTool: (index: number) => void;
  onEditTool: (index: number) => void;
}

const ToolsList: React.FC<ToolsListProps> = ({ tools, onRemoveTool, onEditTool }) => {
  const { t } = useTranslation(['prompts', 'common']);
  const [expandedTools, setExpandedTools] = useState<Record<number, boolean>>({});
  const [expandedActions, setExpandedActions] = useState<Record<string, boolean>>({});

  // Inicializar todas as ferramentas como minimizadas
  useEffect(() => {
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

  // Função para alternar o estado de expansão das ações de uma ferramenta
  const toggleActionsExpand = (toolIndex: number) => {
    const key = `tool-${toolIndex}`;
    setExpandedActions(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  return (
    <div className="space-y-4">
      {tools.map((tool, index) => (
        <div key={index} className="border border-gray-300 dark:border-gray-600 rounded-md p-4 transition-all hover:shadow-sm">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white">{tool.name}</h4>
                <button
                  type="button"
                  onClick={() => toggleToolExpand(index)}
                  className="ml-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors"
                  title={expandedTools[index] ? t('prompts:form.collapse') || 'Minimizar' : t('prompts:form.expand') || 'Expandir'}
                >
                  {expandedTools[index] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{tool.description}</p>
            </div>
            <div className="flex space-x-2 ml-4">
              <button
                type="button"
                onClick={() => onEditTool(index)}
                className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                title={t('common:edit') || 'Editar'}
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => onRemoveTool(index)}
                className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                title={t('common:remove') || 'Remover'}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          {expandedTools[index] && (
            <div className="mt-3 space-y-3">
              {/* Parâmetros */}
              {tool.parameters && (
                <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                  <h5 className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('prompts:form.parameters') || 'Parâmetros'}:
                  </h5>
                  <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded overflow-x-auto max-h-[200px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent">
                    {JSON.stringify(tool.parameters, null, 2)}
                  </pre>
                </div>
              )}
              
              {/* Ações */}
              {tool.actions && tool.actions.length > 0 && (
                <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between mb-1">
                    <h5 className="text-xs font-medium text-gray-700 dark:text-gray-300">
                      {t('prompts:form.actions.title') || 'Ações'}:
                    </h5>
                    <button
                      type="button"
                      onClick={() => toggleActionsExpand(index)}
                      className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors"
                      title={expandedActions[`tool-${index}`] ? t('prompts:form.collapse') || 'Minimizar' : t('prompts:form.expand') || 'Expandir'}
                    >
                      {expandedActions[`tool-${index}`] ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                  </div>
                  
                  {expandedActions[`tool-${index}`] ? (
                    <div className="space-y-2">
                      {tool.actions.map((action) => (
                        <div key={action.id} className="bg-gray-100 dark:bg-gray-800 p-2 rounded">
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="text-xs font-medium text-gray-900 dark:text-white">{action.name}</span>
                              <span className="ml-2 text-xs text-gray-600 dark:text-gray-400">
                                {t(`prompts:form.actions.types.${action.type}`) || action.type}
                              </span>
                            </div>
                            <PlayCircle className="w-3 h-3 text-green-600 dark:text-green-400" />
                          </div>
                          
                          {/* Exibir filtros */}
                          {action.filters && action.filters.length > 0 && (
                            <div className="mt-1 border-t border-gray-200 dark:border-gray-700 pt-1">
                              <div className="text-xs text-gray-600 dark:text-gray-400">
                                {t('prompts:form.actions.filters.title') || 'Filtros'}:
                              </div>
                              <div className="space-y-1">
                                {action.filters.map((filter, filterIndex) => (
                                  <div key={filterIndex} className="text-xs text-gray-700 dark:text-gray-300">
                                    <span className="font-medium">{filter.variable}</span>
                                    {' '}
                                    <span className="text-gray-500">
                                      {t(`prompts:form.actions.filters.operators.${filter.operator}`) || filter.operator}
                                    </span>
                                    {' '}
                                    <span className="font-medium">{filter.value}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          <pre className="mt-1 text-xs bg-gray-200 dark:bg-gray-900 p-1 rounded overflow-x-auto">
                            {JSON.stringify(action.config, null, 2)}
                          </pre>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      {tool.actions.length} {tool.actions.length === 1 ? 
                        (t('prompts:form.actions.actionSingular') || 'ação configurada') : 
                        (t('prompts:form.actions.actionPlural') || 'ações configuradas')}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      ))}
      
      {tools.length === 0 && (
        <div className="text-center py-6 border border-dashed border-gray-300 dark:border-gray-600 rounded-md">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t('prompts:form.noTools') || 'Nenhuma ferramenta configurada'}
          </p>
        </div>
      )}
    </div>
  );
};

export default ToolsList; 