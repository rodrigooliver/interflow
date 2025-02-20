import React from 'react';
import { useTranslation } from 'react-i18next';
import { useFlowEditor } from '../../contexts/FlowEditorContext';

interface VariablesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function VariablesModal({ isOpen, onClose }: VariablesModalProps) {
  const { t } = useTranslation(['flows', 'common']);
  const { 
    variables, 
    setVariables, 
    handleVariableNameChange, 
    handleVariableNameBlur,
    addVariable 
  } = useFlowEditor();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          {t('flows:variables.title')}
        </h3>
        <div className="space-y-4">
          {variables.map((variable, index) => (
            <div key={index} className="flex items-center space-x-2">
              <input
                type="text"
                value={variable.name}
                onChange={(e) => handleVariableNameChange(index, e.target.value)}
                onBlur={() => handleVariableNameBlur(index)}
                placeholder={t('flows:nodes.variable.namePlaceholder')}
                className="flex-1 p-2 border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <input
                type="text"
                value={variable.value}
                onChange={(e) => {
                  const newVariables = [...variables];
                  newVariables[index].value = e.target.value;
                  setVariables(newVariables);
                }}
                placeholder={t('flows:nodes.variable.valuePlaceholder')}
                className="flex-1 p-2 border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          ))}
          <button
            onClick={addVariable}
            disabled={variables.length > 0 && !variables[variables.length - 1].name}
            className="w-full p-2 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            + {t('flows:variables.add')}
          </button>
        </div>
        <div className="mt-6 flex justify-end space-x-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
          >
            {t('common:back')}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700"
          >
            {t('common:save')}
          </button>
        </div>
      </div>
    </div>
  );
} 