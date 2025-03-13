import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Pencil, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { Variable } from '../../types/prompts';

interface VariablesListProps {
  variables: Variable[];
  onEditVariable: (index: number) => void;
  onRemoveVariable: (index: number) => void;
}

const VariablesList: React.FC<VariablesListProps> = ({ variables, onEditVariable, onRemoveVariable }) => {
  const { t } = useTranslation(['prompts', 'common']);
  const [expandedVariables, setExpandedVariables] = useState<Record<number, boolean>>({});

  // Inicializar todas as variáveis como minimizadas
  useEffect(() => {
    const initialState: Record<number, boolean> = {};
    variables.forEach((_, index) => {
      initialState[index] = false;
    });
    setExpandedVariables(initialState);
  }, [variables.length]);

  // Função para alternar o estado de expansão de uma variável
  const toggleVariableExpand = (index: number) => {
    setExpandedVariables(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  return (
    <div className="space-y-2">
      {variables.map((variable, index) => (
        <div 
          key={index} 
          className="border border-gray-200 dark:border-gray-700 rounded-md p-3 bg-gray-50 dark:bg-gray-800 transition-all hover:shadow-sm"
        >
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center">
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {variable.name}
                </span>
                <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                  {variable.type}
                </span>
                {variable.required && (
                  <span className="ml-2 text-xs text-red-500">*</span>
                )}
                <button
                  type="button"
                  onClick={() => toggleVariableExpand(index)}
                  className="ml-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors"
                  title={expandedVariables[index] ? t('prompts:form.collapse') || 'Minimizar' : t('prompts:form.expand') || 'Expandir'}
                >
                  {expandedVariables[index] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                {variable.description}
              </p>
            </div>
            <div className="flex space-x-2 ml-4">
              <button
                type="button"
                onClick={() => onEditVariable(index)}
                className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                title={t('common:edit') || 'Editar'}
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => onRemoveVariable(index)}
                className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                title={t('common:remove') || 'Remover'}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          {expandedVariables[index] && variable.type === 'enum' && variable.enumValues && variable.enumValues.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
              <h5 className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('prompts:form.enumValues') || 'Valores Possíveis'}:
              </h5>
              <div className="mt-1 flex flex-wrap gap-1">
                {variable.enumValues.map((value, idx) => (
                  <span 
                    key={idx} 
                    className="px-1.5 py-0.5 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded"
                  >
                    {value}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
      
      {variables.length === 0 && (
        <div className="text-center py-6 border border-dashed border-gray-300 dark:border-gray-600 rounded-md">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t('prompts:form.noVariables') || 'Nenhuma variável configurada'}
          </p>
        </div>
      )}
    </div>
  );
};

export default VariablesList; 