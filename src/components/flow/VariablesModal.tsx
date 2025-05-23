import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useFlowEditor } from '../../contexts/FlowEditorContext';
import { Search, X, Plus, Trash2 } from 'lucide-react';

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

  const [searchTerm, setSearchTerm] = useState('');
  const [filteredVariables, setFilteredVariables] = useState(variables);

  // Atualizar variáveis filtradas quando as variáveis ou o termo de pesquisa mudar
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredVariables(variables);
    } else {
      const filtered = variables.filter(
        variable => 
          variable.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
          variable.value.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (variable.testValue && variable.testValue.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      setFilteredVariables(filtered);
    }
  }, [variables, searchTerm]);

  const handleDeleteVariable = (index: number) => {
    const newVariables = [...variables];
    newVariables.splice(index, 1);
    setVariables(newVariables);
  };

  const getVariableIndex = (filteredIndex: number) => {
    if (searchTerm.trim() === '') return filteredIndex;
    
    const filteredVar = filteredVariables[filteredIndex];
    return variables.findIndex(v => 
      v.name === filteredVar.name && 
      v.value === filteredVar.value && 
      v.testValue === filteredVar.testValue
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            {t('flows:variables.title')} ({variables.length})
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 dark:text-gray-300 dark:hover:text-gray-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Barra de pesquisa */}
        <div className="relative mb-4">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t('common:search')}
            className="pl-10 pr-4 py-2 w-full border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
            >
              <X className="h-4 w-4 text-gray-400 hover:text-gray-500" />
            </button>
          )}
        </div>

        {/* Lista de variáveis com rolagem */}
        <div className="max-h-[50vh] overflow-y-auto pr-2 mb-4">
          <div className="grid grid-cols-[1fr,1fr,1fr,auto] gap-2">
            {/* Cabeçalho */}
            <div className="text-sm font-medium text-gray-700 dark:text-gray-300 px-2">
              {t('common:name')}
            </div>
            <div className="text-sm font-medium text-gray-700 dark:text-gray-300 px-2">
              {t('flows:variables.valueDefault')}
            </div>
            <div className="text-sm font-medium text-gray-700 dark:text-gray-300 px-2">
              {t('flows:variables.valueTest')}
            </div>
            <div className="w-8"></div>

            {/* Variáveis */}
            {filteredVariables.length > 0 ? (
              filteredVariables.map((variable, filteredIndex) => {
                const originalIndex = getVariableIndex(filteredIndex);
                return (
                  <React.Fragment key={filteredIndex}>
                    <input
                      type="text"
                      value={variable.name}
                      onChange={(e) => handleVariableNameChange(originalIndex, e.target.value)}
                      onBlur={() => handleVariableNameBlur(originalIndex)}
                      placeholder={t('flows:nodes.variable.namePlaceholder')}
                      className="px-4 py-2 border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                    <input
                      type="text"
                      value={variable.value}
                      onChange={(e) => {
                        const newVariables = [...variables];
                        newVariables[originalIndex].value = e.target.value;
                        setVariables(newVariables);
                      }}
                      placeholder={t('flows:variables.valueDefault')}
                      className="px-4 py-2 border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                    <input
                      type="text"
                      value={variable.testValue || ''}
                      onChange={(e) => {
                        const newVariables = [...variables];
                        newVariables[originalIndex].testValue = e.target.value;
                        setVariables(newVariables);
                      }}
                      placeholder={t('flows:variables.valueTest')}
                      className="px-4 py-2 border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                    <button
                      onClick={() => handleDeleteVariable(originalIndex)}
                      className="flex items-center justify-center w-8 h-8 text-gray-400 hover:text-red-500 dark:text-gray-300 dark:hover:text-red-400"
                      title={t('common:delete')}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </React.Fragment>
                );
              })
            ) : (
              <div className="col-span-4 py-4 text-center text-gray-500 dark:text-gray-400">
                {searchTerm ? t('common:noResults') : t('flows:variables.noVariables')}
              </div>
            )}
          </div>
        </div>

        {/* Botão para adicionar variável */}
        <button
          onClick={addVariable}
          disabled={variables.length > 0 && !variables[variables.length - 1].name}
          className="flex items-center justify-center w-full px-4 py-2 mb-4 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/30 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="w-4 h-4 mr-2" />
          {t('flows:variables.add')}
        </button>

        {/* Botões de ação */}
        <div className="flex justify-end space-x-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
          >
            {t('common:close')}
          </button>
        </div>
      </div>
    </div>
  );
} 