import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SystemAction } from '../../constants/systemActions';
import { Edit2, Trash2, ChevronDown, ChevronUp } from 'lucide-react';

interface SystemActionsListProps {
  actions: SystemAction[];
  onRemoveAction: (index: number) => void;
  onEditAction: (index: number) => void;
}

const SystemActionsList: React.FC<SystemActionsListProps> = ({ actions, onRemoveAction, onEditAction }) => {
  const { t } = useTranslation(['prompts', 'common']);
  const [expandedActions, setExpandedActions] = useState<Record<number, boolean>>({});

  // Inicializar todas as ações como minimizadas
  React.useEffect(() => {
    const initialState: Record<number, boolean> = {};
    actions.forEach((_, index) => {
      initialState[index] = false;
    });
    setExpandedActions(initialState);
  }, [actions.length]);

  // Função para alternar o estado de expansão de uma ação
  const toggleActionExpand = (index: number) => {
    setExpandedActions(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  if (actions.length === 0) {
    return (
      <div className="text-sm text-gray-500 dark:text-gray-400 italic">
        {t('prompts:form.noSystemActions') || 'Nenhuma ação do sistema configurada'}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {actions.map((action, index) => (
        <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          <div className="p-4 bg-white dark:bg-gray-800">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                    {action.description}
                  </h4>
                  <button
                    type="button"
                    onClick={() => onEditAction(index)}
                    className="ml-2 p-1 text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {action.type}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => toggleActionExpand(index)}
                  className="p-1 text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400"
                >
                  {expandedActions[index] ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => onRemoveAction(index)}
                  className="p-1 text-red-400 hover:text-red-500 dark:text-red-500 dark:hover:text-red-400"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {expandedActions[index] && (
            <div className="p-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700">
              <div className="space-y-4">
                <div>
                  <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('prompts:form.toolConfig') || 'Configuração'}
                  </h5>
                  <div className="bg-white dark:bg-gray-800 p-3 rounded-md border border-gray-200 dark:border-gray-700">
                    <pre className="text-xs font-mono text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                      {JSON.stringify(action.config, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default SystemActionsList; 