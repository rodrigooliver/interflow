import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Tool, Variable, Parameters, ParameterProperty, ToolAction } from '../../types/prompts';
import VariableForm from './VariableForm';
import ToolActionList from './ToolActionList';
import { Modal } from '../ui/Modal';
import { Pencil } from 'lucide-react';

interface ToolExample {
  label: string;
  name: string;
  description: string;
  parameters: Parameters;
}

interface ToolFormProps {
  onAddTool: (tool: Tool) => void;
  onCancel: () => void;
  initialTool?: Tool;
  destinations?: Record<string, ToolAction[]>;
  onDestinationsChange?: (destinations: Record<string, ToolAction[]>) => void;
}

const ToolForm: React.FC<ToolFormProps> = ({ 
  onAddTool, 
  onCancel, 
  initialTool,
  destinations = {},
  onDestinationsChange,
}) => {
  const { t } = useTranslation(['prompts', 'common']);
  const [newTool, setNewTool] = useState<Tool>({
    name: '',
    description: '',
    parameters: {
      type: 'object',
      properties: {},
      required: []
    },
    actions: []
  });
  
  // Estado separado para o texto do JSON de parâmetros
  const [parametersText, setParametersText] = useState('');
  const [showVariableModal, setShowVariableModal] = useState(false);
  const [parametersViewMode, setParametersViewMode] = useState<'json' | 'list' | 'actions'>('list');
  const [editingVariable, setEditingVariable] = useState<{ name: string; property: ParameterProperty } | null>(null);

  // Carregar ferramenta inicial para edição, se fornecida
  useEffect(() => {
    if (initialTool) {
      setNewTool({
        ...initialTool,
        actions: initialTool.actions || [],
        parameters: initialTool.parameters || {
          type: 'object',
          properties: {},
          required: []
        }
      });
      setParametersText(JSON.stringify(initialTool.parameters || {}, null, 2));
    }
  }, [initialTool]);

  // Atualizar o texto do JSON quando os parâmetros mudarem
  useEffect(() => {
    setParametersText(JSON.stringify(newTool.parameters || {}, null, 2));
  }, [newTool.parameters]);

  // Função para aplicar o JSON dos parâmetros
  const applyParametersJson = (parametersText: string) => {
    try {
      const parsedParameters = JSON.parse(parametersText) as Parameters;
      setNewTool({
        ...newTool,
        parameters: parsedParameters
      });
    } catch (error) {
      console.error('Erro ao analisar JSON dos parâmetros:', error);
    }
  };

  // Função para adicionar uma variável aos parâmetros
  const handleAddVariable = (variable: Variable) => {
    const currentParameters: Parameters = newTool.parameters || {
      type: 'object',
      properties: {},
      required: []
    };

    const updatedParameters: Parameters = {
      type: currentParameters.type,
      properties: {
        ...currentParameters.properties,
        [variable.name]: {
          type: variable.type,
          description: variable.description,
          ...(variable.enumValues && variable.enumValues.length > 0 && { enum: variable.enumValues })
        }
      },
      required: variable.required 
        ? [...currentParameters.required, variable.name]
        : currentParameters.required
    };

    setNewTool({
      ...newTool,
      parameters: updatedParameters
    });
    setShowVariableModal(false);
    setEditingVariable(null);
  };

  // Função para editar uma variável
  const handleEditVariable = (name: string, property: ParameterProperty) => {
    setEditingVariable({ name, property });
    setShowVariableModal(true);
  };

  // Função para remover uma variável dos parâmetros
  const handleRemoveVariable = (variableName: string) => {
    const currentParameters = newTool.parameters;
    const updatedProperties = { ...currentParameters.properties };
    delete updatedProperties[variableName];
    
    setNewTool({
      ...newTool,
      parameters: {
        ...currentParameters,
        properties: updatedProperties,
        required: currentParameters.required.filter(name => name !== variableName)
      }
    });
  };

  const handleSubmit = () => {
    // Se estiver editando JSON, tenta aplicar as mudanças
    if (parametersViewMode === 'json' && parametersText) {
      applyParametersJson(parametersText);
    }
    onAddTool(newTool);
  };

  // Função para carregar um exemplo de ferramenta
  const loadToolExample = (exampleKey: string) => {
    const example = t(`prompts:form.examples.tools.${exampleKey}`, { returnObjects: true }) as ToolExample;
    setNewTool({
      name: example.name,
      description: example.description,
      parameters: example.parameters,
      actions: []
    });
  };

  // Função para atualizar as ações da ferramenta
  const handleActionsChange = (actions: ToolAction[]) => {
    // console.log('actions', onDestinationsChange, actions);
    if (onDestinationsChange) {
      const updatedDestinations = {
        ...destinations,
        [newTool.name]: actions
      };
      onDestinationsChange(updatedDestinations);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-h-[80vh] overflow-auto p-1">
      {/* Abas de visualização */}
      <div className="border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10 py-1">
        <nav className="-mb-px flex" aria-label="Tabs">
          <button
            type="button"
            onClick={() => setParametersViewMode('list')}
            className={`${
              parametersViewMode === 'list'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:border-gray-600'
            } flex-1 py-2 px-1 text-center border-b-2 font-medium text-sm`}
          >
            {t('prompts:form.viewAsList') || 'Visualização em Lista'}
          </button>
          <button
            type="button"
            onClick={() => setParametersViewMode('json')}
            className={`${
              parametersViewMode === 'json'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:border-gray-600'
            } flex-1 py-2 px-1 text-center border-b-2 font-medium text-sm`}
          >
            {t('prompts:form.viewAsJson') || 'Visualização em JSON'}
          </button>
          
          <button
            type="button"
            onClick={() => setParametersViewMode('actions')}
            className={`${
              parametersViewMode === 'actions'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:border-gray-600'
            } flex-1 py-2 px-1 text-center border-b-2 font-medium text-sm`}
          >
            {t('prompts:form.actions.title') || 'Ações'}
          </button>
          
        </nav>
      </div>

      {parametersViewMode === 'json' ? (
        <div>
          <textarea
            value={JSON.stringify(newTool, null, 2)}
            onChange={(e) => {
              try {
                const parsedTool = JSON.parse(e.target.value) as Tool;
                setNewTool(parsedTool);
              } catch (error) {
                console.error('Erro ao analisar JSON da ferramenta:', error);
              }
            }}
            onBlur={(e) => {
              try {
                const parsedTool = JSON.parse(e.target.value) as Tool;
                setNewTool(parsedTool);
              } catch (error) {
                console.error('Erro ao analisar JSON da ferramenta:', error);
              }
            }}
            className="w-full p-2 font-mono text-sm border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            rows={15}
            placeholder={t('prompts:form.toolJsonHelp') || 'Defina a ferramenta completa usando o formato JSON.'}
          />
        </div>
      ) : parametersViewMode === 'actions' ? (
        <ToolActionList
          actions={destinations[newTool.name] || []}
          onActionsChange={handleActionsChange}
          parameters={newTool.parameters.properties}
        />
      ) : (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('prompts:form.toolName') || 'Nome da Ferramenta'}
            </label>
            <input
              type="text"
              value={newTool.name}
              onChange={(e) => setNewTool({ ...newTool, name: e.target.value })}
              className="w-full p-2 border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder={t('prompts:form.toolNamePlaceholder') || 'Ex: get_weather'}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('prompts:form.toolDescription') || 'Descrição da Ferramenta'}
            </label>
            <textarea
              value={newTool.description}
              onChange={(e) => setNewTool({ ...newTool, description: e.target.value })}
              className="w-full p-2 border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder={t('prompts:form.toolDescriptionPlaceholder') || 'Ex: Obtém informações sobre o clima atual para uma localização específica'}
              rows={3}
            />
          </div>

          {/* Exemplos de ferramentas */}
          {!initialTool && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('prompts:form.examples.title') || 'Exemplos'}
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => loadToolExample('weather')}
                  className="p-2 text-xs border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                >
                  {t('prompts:form.examples.tools.weather.label') || 'Clima (get_weather)'}
                </button>
                <button
                  type="button"
                  onClick={() => loadToolExample('search')}
                  className="p-2 text-xs border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                >
                  {t('prompts:form.examples.tools.search.label') || 'Busca (web_search)'}
                </button>
                <button
                  type="button"
                  onClick={() => loadToolExample('calculator')}
                  className="p-2 text-xs border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                >
                  {t('prompts:form.examples.tools.calculator.label') || 'Calculadora (calculate)'}
                </button>
              </div>
            </div>
          )}

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('prompts:form.toolParameters') || 'Parâmetros'}
              </label>
              <button
                type="button"
                onClick={() => setShowVariableModal(true)}
                className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
              >
                {t('prompts:form.addVariable') || '+ Adicionar Variável'}
              </button>
            </div>
            
            <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
              {Object.entries(newTool.parameters.properties).map(([name, property]) => (
                <div key={name} className="flex items-start justify-between p-2 border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700">
                  <div className="flex-1">
                    <div className="flex items-center">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{name}</span>
                      {newTool.parameters.required.includes(name) && (
                        <span className="ml-1 text-xs text-red-500">*</span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {property.description}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Tipo: {property.type}
                      {property.enum && property.enum.length > 0 && (
                        <span className="ml-1">
                          ({property.enum.join(', ')})
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => handleEditVariable(name, property)}
                      className="text-blue-500 hover:text-blue-700"
                      title={t('prompts:form.editVariable') || 'Editar variável'}
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveVariable(name)}
                      className="text-red-500 hover:text-red-700"
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}
              {Object.keys(newTool.parameters.properties).length === 0 && (
                <div className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                  {t('prompts:form.noParameters') || 'Nenhum parâmetro definido'}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      <div className="flex justify-end space-x-3 pt-4 sticky bottom-0 bg-white dark:bg-gray-800 z-10 border-t border-gray-200 dark:border-gray-700 mt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          {t('common:cancel')}
        </button>
        <button
          type="submit"
          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          {t('common:save')}
        </button>
      </div>

      {/* Modal para adicionar/editar variável */}
      <Modal
        isOpen={showVariableModal}
        onClose={() => {
          setShowVariableModal(false);
          setEditingVariable(null);
        }}
        title={editingVariable 
          ? (t('prompts:form.editVariable') || 'Editar Variável')
          : (t('prompts:form.addVariable') || 'Adicionar Variável')}
        size="md"
      >
        <VariableForm
          onAddVariable={handleAddVariable}
          onCancel={() => {
            setShowVariableModal(false);
            setEditingVariable(null);
          }}
          initialVariable={editingVariable ? {
            name: editingVariable.name,
            type: editingVariable.property.type as Variable['type'],
            description: editingVariable.property.description,
            required: newTool.parameters.required.includes(editingVariable.name),
            enumValues: editingVariable.property.enum || []
          } : undefined}
        />
      </Modal>
    </form>
  );
};

export default ToolForm; 