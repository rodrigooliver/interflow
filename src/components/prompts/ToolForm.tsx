import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Tool, Variable, ToolAction } from '../../types/prompts';
import ToolActionForm from './ToolActionForm';
import { useAuthContext } from '../../contexts/AuthContext';
import { useTeams, useFunnels, useFlows } from '../../hooks/useQueryes';

interface ToolFormProps {
  onAddTool: (tool: Tool) => void;
  onCancel: () => void;
  variables: Variable[];
  initialTool?: Tool;
}

const ToolForm: React.FC<ToolFormProps> = ({ onAddTool, onCancel, variables, initialTool }) => {
  const { t } = useTranslation(['prompts', 'common']);
  const { currentOrganizationMember } = useAuthContext();
  const { data: teams = [] } = useTeams(currentOrganizationMember?.organization.id);
  const { data: funnels = [] } = useFunnels(currentOrganizationMember?.organization.id);
  const { data: flows = [] } = useFlows(currentOrganizationMember?.organization.id);
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

  // Carregar ferramenta inicial para edição, se fornecida
  useEffect(() => {
    if (initialTool) {
      setNewTool({
        ...initialTool,
        actions: initialTool.actions || []
      });
      setParametersText(JSON.stringify(initialTool.parameters || {}, null, 2));
    }
  }, [initialTool]);

  // Atualizar o texto do JSON quando os parâmetros mudarem
  useEffect(() => {
    setParametersText(JSON.stringify(newTool.parameters || {}, null, 2));
  }, [newTool.parameters]);

  // Função para verificar se uma variável já foi adicionada como parâmetro
  const isVariableAlreadyAdded = (variableName: string): boolean => {
    const properties = newTool.parameters?.properties || {};
    return Object.keys(properties).includes(variableName);
  };

  // Função para carregar um exemplo de ferramenta
  const loadToolExample = (exampleKey: string) => {
    const example = t(`prompts:form.examples.tools.${exampleKey}`, { returnObjects: true }) as {
      name: string;
      description: string;
      parameters: Record<string, {
        type: string;
        description: string;
        enum?: string[];
        example?: string | string[];
      }>;
    };
    
    if (example && example.name) {
      // Converter os parâmetros do exemplo para o formato esperado
      const properties: Record<string, unknown> = {};
      const required: string[] = [];
      
      Object.entries(example.parameters || {}).forEach(([key, value]) => {
        const param: Record<string, unknown> = {
          type: value.type,
          description: value.description
        };
        
        if (value.enum) {
          param.enum = value.enum;
        }
        
        // Adicionar exemplos se disponíveis
        if (value.example) {
          param.examples = Array.isArray(value.example) ? value.example : [value.example];
        }
        
        properties[key] = param;
        
        // Assumir que todos os parâmetros são obrigatórios no exemplo
        required.push(key);
      });
      
      const updatedTool = {
        name: example.name,
        description: example.description,
        parameters: {
          type: 'object',
          properties,
          required
        }
      };
      
      setNewTool(updatedTool);
      setParametersText(JSON.stringify(updatedTool.parameters || {}, null, 2));
    }
  };
  
  // Função para usar uma variável como parâmetro
  const handleUseVariable = (variable: Variable) => {
    // Criar uma cópia da ferramenta atual para modificação
    let updatedTool = { ...newTool };
    
    // Se o nome da ferramenta estiver vazio, usar o nome da variável
    if (!updatedTool.name.trim()) {
      updatedTool.name = variable.name;
    }
    
    // Se a descrição da ferramenta estiver vazia, usar a descrição da variável
    if (!updatedTool.description.trim()) {
      updatedTool.description = variable.description;
    }
    
    const param: Record<string, unknown> = {
      type: variable.type,
      description: variable.description
    };
    
    if (variable.type === 'enum' && variable.enumValues?.length) {
      param.enum = variable.enumValues;
    }
    
    const updatedProperties = {
      ...(updatedTool.parameters?.properties || {}),
      [variable.name]: param
    };
    
    // Garantir que required seja sempre um array
    let currentRequired: string[] = [];
    if (updatedTool.parameters?.required && Array.isArray(updatedTool.parameters.required)) {
      currentRequired = [...updatedTool.parameters.required];
    }
    
    // Adicionar à lista de required apenas se a variável for obrigatória e ainda não estiver na lista
    if (variable.required && !currentRequired.includes(variable.name)) {
      currentRequired.push(variable.name);
    }
    
    updatedTool = {
      ...updatedTool,
      parameters: {
        type: 'object',
        properties: updatedProperties,
        required: currentRequired
      }
    };
    
    setNewTool(updatedTool);
    // O useEffect atualizará o parametersText
  };

  // Função para tentar aplicar o JSON editado
  const applyParametersJson = () => {
    try {
      const parsed = JSON.parse(parametersText);
      setNewTool({
        ...newTool,
        parameters: parsed
      });
      return true;
    } catch (error) {
      console.error('Erro ao analisar JSON de parâmetros:', error);
      return false;
    }
  };

  // Função para atualizar as ações da ferramenta
  const handleActionsChange = (actions: ToolAction[]) => {
    setNewTool({
      ...newTool,
      actions
    });
  };

  return (
    <div className="space-y-3 overflow-y-auto pr-2" style={{ maxHeight: 'calc(100vh - 250px)' }}>
      <div>
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
          {t('prompts:form.toolName') || 'Nome da Ferramenta'} *
        </label>
        <input
          type="text"
          value={newTool.name}
          onChange={(e) => setNewTool({ ...newTool, name: e.target.value })}
          className="w-full p-2 border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500 transition-colors text-sm"
          placeholder={t('prompts:form.toolNamePlaceholder') || 'Ex: get_weather'}
        />
      </div>
      
      <div>
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
          {t('prompts:form.toolDescription') || 'Descrição da Ferramenta'} *
        </label>
        <textarea
          value={newTool.description}
          onChange={(e) => setNewTool({ ...newTool, description: e.target.value })}
          className="w-full p-2 border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500 transition-colors text-sm"
          rows={2}
          placeholder={t('prompts:form.toolDescriptionPlaceholder') || 'Ex: Obtém informações sobre o clima atual para uma localização específica'}
        />
      </div>

      {/* Exemplos de ferramentas */}
      {!initialTool && (
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('prompts:form.examples.title') || 'Exemplos'}
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => loadToolExample('weather')}
              className="p-2 text-xs border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
            >
              {t('prompts:form.examples.tools.weather.name')}
            </button>
            <button
              type="button"
              onClick={() => loadToolExample('calculator')}
              className="p-2 text-xs border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
            >
              {t('prompts:form.examples.tools.calculator.name')}
            </button>
            <button
              type="button"
              onClick={() => loadToolExample('search')}
              className="p-2 text-xs border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
            >
              {t('prompts:form.examples.tools.search.name')}
            </button>
            <button
              type="button"
              onClick={() => loadToolExample('calendar')}
              className="p-2 text-xs border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
            >
              {t('prompts:form.examples.tools.calendar.name')}
            </button>
            <button
              type="button"
              onClick={() => loadToolExample('translate')}
              className="p-2 text-xs border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
            >
              {t('prompts:form.examples.tools.translate.name')}
            </button>
          </div>
        </div>
      )}

      {/* Variáveis */}
      <div className="mt-4">
        <div className="flex justify-between items-center mb-2">
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
            {t('prompts:form.variables') || 'Variáveis'}
          </label>
        </div>
        
        {variables.length === 0 ? (
          <p className="text-xs text-gray-500 dark:text-gray-400 italic">
            {t('prompts:form.noVariables') || 'Nenhuma variável definida'}
          </p>
        ) : (
          <div className="space-y-2 max-h-[200px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent pr-2">
            {variables.map((variable, index) => {
              const isAdded = isVariableAlreadyAdded(variable.name);
              return (
                <div key={index} className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-800 rounded-md transition-all hover:shadow-sm">
                  <div>
                    <div className="text-xs font-medium text-gray-900 dark:text-white">
                      {variable.name} <span className="text-gray-500">({variable.type})</span>
                      {variable.required && <span className="ml-1 text-red-500">*</span>}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">{variable.description}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleUseVariable(variable)}
                    disabled={isAdded}
                    className={`text-xs px-2 py-1 rounded transition-colors ${
                      isAdded 
                        ? 'bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500 cursor-not-allowed' 
                        : 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800'
                    }`}
                  >
                    {isAdded 
                      ? (t('prompts:form.variableAdded') || 'Adicionada') 
                      : (t('prompts:form.useVariable') || 'Usar')}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Parâmetros */}
      <div className="mt-4">
        <div className="flex justify-between items-center mb-2">
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
            {t('prompts:form.parameters') || 'Parâmetros'}
          </label>
          <button
            type="button"
            onClick={() => {
              // Adicionar um parâmetro vazio
              const paramName = `param${Object.keys(newTool.parameters?.properties || {}).length + 1}`;
              const updatedProperties = {
                ...(newTool.parameters?.properties || {}),
                [paramName]: {
                  type: 'string',
                  description: ''
                }
              };
              
              setNewTool({
                ...newTool,
                parameters: {
                  type: 'object',
                  properties: updatedProperties,
                  required: newTool.parameters?.required || []
                }
              });
              // O useEffect atualizará o parametersText
            }}
            className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
          >
            {t('prompts:form.addParameter') || '+ Adicionar Parâmetro'}
          </button>
        </div>
        
        <div className="mt-2">
          <textarea
            value={parametersText}
            onChange={(e) => {
              setParametersText(e.target.value);
              // Não fazemos o parse aqui, apenas armazenamos o texto
            }}
            onBlur={() => {
              // Tentar aplicar o JSON quando o usuário sair do campo
              applyParametersJson();
            }}
            className="w-full p-2 border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-xs"
            rows={10}
            style={{ maxHeight: '250px', overflowY: 'auto' }}
          />
        </div>
      </div>
      
      {/* Ações da Ferramenta */}
      <div className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-4">
        <ToolActionForm 
          actions={newTool.actions || []} 
          onActionsChange={handleActionsChange}
          variables={variables}
          teams={teams}
          funnels={funnels}
          flows={flows}
        />
      </div>
      
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
            // Tentar aplicar o JSON antes de salvar
            if (applyParametersJson() && newTool.name.trim() && newTool.description.trim()) {
              onAddTool(newTool);
            }
          }}
          disabled={!newTool.name.trim() || !newTool.description.trim()}
          className="px-3 py-1.5 border border-transparent rounded-md shadow-sm text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {initialTool ? (t('common:save') || 'Salvar') : (t('common:add') || 'Adicionar')}
        </button>
      </div>
    </div>
  );
};

export default ToolForm; 