import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Variable } from '../../types/prompts';

interface VariableFormProps {
  onAddVariable: (variable: Variable) => void;
  onCancel: () => void;
  initialVariable?: Variable;
}

const VariableForm: React.FC<VariableFormProps> = ({ onAddVariable, onCancel, initialVariable }) => {
  const { t } = useTranslation(['prompts', 'common']);
  const [newVariable, setNewVariable] = useState<Variable>({
    name: '',
    type: 'string',
    description: '',
    required: false,
    enumValues: []
  });
  const [newEnumValue, setNewEnumValue] = useState('');

  // Carregar variável inicial para edição, se fornecida
  useEffect(() => {
    if (initialVariable) {
      setNewVariable(initialVariable);
    }
  }, [initialVariable]);

  // Função para carregar um exemplo de variável
  const loadVariableExample = (exampleKey: string) => {
    try {
      // Tentar obter o exemplo do arquivo de tradução
      const example = t(`prompts:form.examples.variables.${exampleKey}`, { returnObjects: true }) as Variable;
      
      if (example && example.name) {
        setNewVariable(example);
        return;
      }
    } catch (error) {
      console.warn('Erro ao carregar exemplo de variável do arquivo de tradução:', error);
    }
    
    // Exemplos padrão caso não estejam definidos no arquivo de tradução
    const defaultExamples: Record<string, Variable> = {
      'name': {
        name: 'name',
        type: 'string',
        description: 'Nome do usuário ou entidade',
        required: true,
        enumValues: []
      },
      'email': {
        name: 'email',
        type: 'string',
        description: 'Endereço de e-mail para contato',
        required: true,
        enumValues: []
      },
      'language': {
        name: 'language',
        type: 'enum',
        description: 'Idioma preferido para comunicação',
        required: false,
        enumValues: ['português', 'english', 'español', 'français', 'deutsch']
      },
      'age': {
        name: 'age',
        type: 'number',
        description: 'Idade do usuário em anos',
        required: false,
        enumValues: []
      },
      'options': {
        name: 'options',
        type: 'enum',
        description: 'Opções disponíveis para seleção',
        required: true,
        enumValues: ['opção 1', 'opção 2', 'opção 3']
      },
      'sales_stage': {
        name: 'sales_stage',
        type: 'enum',
        description: 'Estágio atual no funil de vendas',
        required: true,
        enumValues: ['Prospecção', 'Qualificação', 'Proposta', 'Negociação', 'Fechamento', 'Pós-venda']
      }
    };

    const defaultExample = defaultExamples[exampleKey];
    if (defaultExample) {
      setNewVariable(defaultExample);
    }
  };

  // Função para adicionar um valor enum
  const handleAddEnumValue = () => {
    if (!newEnumValue.trim()) return;
    
    setNewVariable({
      ...newVariable,
      enumValues: [...(newVariable.enumValues || []), newEnumValue]
    });
    setNewEnumValue('');
  };
  
  // Função para remover um valor enum
  const handleRemoveEnumValue = (index: number) => {
    const updatedEnumValues = [...(newVariable.enumValues || [])];
    updatedEnumValues.splice(index, 1);
    setNewVariable({
      ...newVariable,
      enumValues: updatedEnumValues
    });
  };

  return (
    <div className="space-y-3 overflow-y-auto pr-2" style={{ maxHeight: 'calc(100vh - 250px)' }}>
      <div>
        <label className="block text-xs text-gray-700 dark:text-gray-300 mb-1">
          {t('prompts:form.variableName') || 'Nome da Variável'}
        </label>
        <input
          type="text"
          value={newVariable.name}
          onChange={(e) => setNewVariable({ ...newVariable, name: e.target.value })}
          className="w-full p-1.5 text-xs border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        />
      </div>
      <div>
        <label className="block text-xs text-gray-700 dark:text-gray-300 mb-1">
          {t('prompts:form.variableType') || 'Tipo da Variável'}
        </label>
        <select
          value={newVariable.type}
          onChange={(e) => setNewVariable({ ...newVariable, type: e.target.value as Variable['type'] })}
          className="w-full p-1.5 text-xs border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        >
          <option value="string">string</option>
          <option value="number">number</option>
          <option value="boolean">boolean</option>
          <option value="array">array</option>
          <option value="object">object</option>
          <option value="enum">enum</option>
        </select>
      </div>
      <div>
        <label className="block text-xs text-gray-700 dark:text-gray-300 mb-1">
          {t('prompts:form.variableDescription') || 'Descrição da Variável'}
        </label>
        <input
          type="text"
          value={newVariable.description}
          onChange={(e) => setNewVariable({ ...newVariable, description: e.target.value })}
          className="w-full p-1.5 text-xs border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        />
      </div>
      <div className="flex items-center">
        <input
          type="checkbox"
          id="variable-required"
          checked={newVariable.required}
          onChange={(e) => setNewVariable({ ...newVariable, required: e.target.checked })}
          className="mr-2"
        />
        <label htmlFor="variable-required" className="text-xs text-gray-700 dark:text-gray-300">
          {t('prompts:form.variableRequired') || 'Obrigatório'}
        </label>
      </div>
      
      {/* Exemplos de variáveis */}
      {!initialVariable && (
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('prompts:form.examples.title') || 'Exemplos'}
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => loadVariableExample('name')}
              className="p-2 text-xs border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
            >
              {t('prompts:form.examples.variables.name.label') || 'Nome (string)'}
            </button>
            <button
              type="button"
              onClick={() => loadVariableExample('email')}
              className="p-2 text-xs border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
            >
              {t('prompts:form.examples.variables.email.label') || 'Email (string)'}
            </button>
            <button
              type="button"
              onClick={() => loadVariableExample('language')}
              className="p-2 text-xs border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
            >
              {t('prompts:form.examples.variables.language.label') || 'Idioma (enum)'}
            </button>
            <button
              type="button"
              onClick={() => loadVariableExample('age')}
              className="p-2 text-xs border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
            >
              {t('prompts:form.examples.variables.age.label') || 'Idade (number)'}
            </button>
            <button
              type="button"
              onClick={() => loadVariableExample('options')}
              className="p-2 text-xs border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
            >
              {t('prompts:form.examples.variables.options.label') || 'Opções (enum)'}
            </button>
            <button
              type="button"
              onClick={() => loadVariableExample('sales_stage')}
              className="p-2 text-xs border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
            >
              {t('prompts:form.examples.variables.sales_stage.label') || 'Estágio de Vendas (enum)'}
            </button>
          </div>
        </div>
      )}
      
      {newVariable.type === 'enum' && (
        <div>
          <label className="block text-xs text-gray-700 dark:text-gray-300 mb-1">
            {t('prompts:form.variableEnum') || 'Valores Possíveis (Enum)'}
          </label>
          <div className="flex space-x-2 mb-2">
            <input
              type="text"
              value={newEnumValue}
              onChange={(e) => setNewEnumValue(e.target.value)}
              placeholder={t('prompts:form.enumValuePlaceholder') || 'Novo valor'}
              className="flex-1 p-1.5 text-xs border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
            <button
              type="button"
              onClick={handleAddEnumValue}
              className="px-2 py-1 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              {t('prompts:form.addEnum') || 'Adicionar'}
            </button>
          </div>
          <div className="flex flex-wrap gap-1 max-h-[100px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent pr-2">
            {newVariable.enumValues?.map((value, idx) => (
              <div key={idx} className="flex items-center bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-xs transition-colors hover:bg-gray-200 dark:hover:bg-gray-700">
                {value}
                <button
                  type="button"
                  onClick={() => handleRemoveEnumValue(idx)}
                  className="ml-1 text-red-500 hover:text-red-700 transition-colors"
                >
                  &times;
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
      
      <div className="flex justify-end space-x-2 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
        >
          {t('common:cancel') || 'Cancelar'}
        </button>
        <button
          type="button"
          onClick={() => {
            if (newVariable.name.trim() && newVariable.description.trim()) {
              onAddVariable(newVariable);
              if (!initialVariable) {
                // Limpar o formulário apenas se estiver adicionando uma nova variável
                setNewVariable({
                  name: '',
                  type: 'string',
                  description: '',
                  required: false,
                  enumValues: []
                });
              }
            }
          }}
          disabled={!newVariable.name.trim() || !newVariable.description.trim()}
          className="px-3 py-1.5 border border-transparent rounded-md shadow-sm text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {initialVariable ? (t('common:save') || 'Salvar') : (t('common:add') || 'Adicionar')}
        </button>
      </div>
    </div>
  );
};

export default VariableForm; 