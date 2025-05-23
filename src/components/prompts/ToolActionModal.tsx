import React from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { ToolAction, ActionFilter } from '../../types/prompts';
import { useFunnels, useTeams } from '../../hooks/useQueryes';
import { useAuthContext } from '../../contexts/AuthContext';
import { Flow } from '../../types/database';

// Definir interface para os parâmetros
interface ParameterDefinition {
  type: string;
  description?: string;
  enum?: string[];
  default?: unknown;
}

// Definir tipos específicos para cada tipo de configuração
interface CustomerActionConfig {
  name?: string;
  funnelId?: string;
  stageId?: string;
  nameMapping?: {
    variable?: string;
    mapping?: Record<string, string>;
    nameMapping?: string;
  };
  funnelMapping?: {
    variable?: string;
    mapping?: Record<string, string>[];
    nameMapping?: string;
  };
}

interface ChatActionConfig {
  status?: string;
  teamId?: string;
  title?: string;
  teamMapping?: {
    variable?: string;
    mapping?: Record<string, string>[];
  };
  titleMapping?: {
    variable?: string;
    mapping?: Record<string, string>[];
  };
  statusMapping?: {
    variable?: string;
    mapping?: Record<string, null>[];
  };
}

interface ScheduleActionConfig {
  scheduleId?: string;
  dayVariable?: string;
  serviceVariable?: string;
  timeVariable?: string;
  notes?: string;
  appointmentIdVariable?: string;
  operation?: 'checkAvailability' | 'createAppointment' | 'checkAppointment' | 'deleteAppointment';
  operationMapping?: {
    variable?: string;
    mapping?: Record<string, 'checkAvailability' | 'createAppointment' | 'checkAppointment' | 'deleteAppointment'>;
  };
  serviceMapping?: Record<string, string>;
}

// Nova interface para a configuração da ação de nó do fluxo
interface FlowNodeActionConfig {
  flowId?: string;
  nodeId?: string;
  variables?: {
    flowVariable: string;
    promptVariable: string;
  }[];
  nodeMapping?: {
    variable?: string;
    mapping?: Record<string, string>;
  };
  selectedField?: string;
}

// Tipo união para todas as configurações possíveis
type ActionConfig = CustomerActionConfig | ChatActionConfig | ScheduleActionConfig | FlowNodeActionConfig | Record<string, unknown>;


interface FlowNode {
  id: string;
  type?: string;
  data?: {
    label?: string;
  };
}

interface ToolActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (action: ToolAction) => void;
  action?: ToolAction;
  parameters?: Record<string, ParameterDefinition>;
  linkedFlow?: Flow;
}

const ToolActionModal: React.FC<ToolActionModalProps> = ({
  isOpen,
  onClose,
  onSave,
  action,
  parameters = {},
  linkedFlow
}) => {
  const { t } = useTranslation(['prompts', 'common']);
  const { currentOrganizationMember } = useAuthContext();
  const { data: funnels = [] } = useFunnels(currentOrganizationMember?.organization.id);
  const { data: teams = [] } = useTeams(currentOrganizationMember?.organization.id);
  const [editingAction, setEditingAction] = React.useState<ToolAction & { config: ActionConfig }>({
    id: action?.id || '',
    name: action?.name || '',
    type: action?.type || '',
    config: action?.config || {},
    filters: action?.filters || []
  });

  console.log(linkedFlow)

  const [manualInputs, setManualInputs] = React.useState<Record<string, boolean>>({
    name: false,
    title: false,
    notes: false
  });

  const [selectedField, setSelectedField] = React.useState<string>(typeof action?.config?.selectedField === 'string' ? action?.config?.selectedField : '');

  const toggleManualInput = (field: string) => {
    setManualInputs({
      ...manualInputs,
      [field]: !manualInputs[field]
    });
  };

  React.useEffect(() => {
    if (action) {
      setEditingAction({
        id: action.id,
        name: action.name,
        type: action.type,
        config: action.config || {},
        filters: action.filters || []
      } as ToolAction & { config: ActionConfig });
      setSelectedField(`${action.config?.selectedField }` || '');
    } else {
      setEditingAction({
        id: '',
        name: '',
        type: '',
        config: {},
        filters: []
      } as ToolAction & { config: ActionConfig });
      setSelectedField('');
    }
  }, [action]);

  const handleSave = () => {
    if (editingAction.name.trim() === '') return;
    
    const newAction = {
      ...editingAction,
      id: editingAction.id || `action-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      description: editingAction.name,
      config: {
        ...editingAction.config,
        selectedField
      }
    };

    onSave(newAction);
    onClose();
  };

  // Função para adicionar um novo filtro
  const handleAddFilter = () => {
    setEditingAction({
      ...editingAction,
      filters: [
        ...(editingAction.filters || []),
        { variable: '', operator: 'exists', value: '' }
      ]
    });
  };

  // Função para remover um filtro
  const handleRemoveFilter = (filterIndex: number) => {
    setEditingAction({
      ...editingAction,
      filters: (editingAction.filters || []).filter((_, index) => index !== filterIndex)
    });
  };

  // Função para atualizar um filtro
  const handleUpdateFilter = (filterIndex: number, field: keyof ActionFilter, value: string) => {
    const updatedFilters = [...(editingAction.filters || [])];
    updatedFilters[filterIndex] = {
      ...updatedFilters[filterIndex],
      [field]: value
    };
    
    setEditingAction({
      ...editingAction,
      filters: updatedFilters
    });
  };

  // Função auxiliar para obter a configuração tipada com base no tipo de ação
  const getConfig = <T extends ActionConfig>(): T => {
    return editingAction.config as T;
  };

  // Função auxiliar para acessar mapping com type safety
  const safeGetMapping = <T,>(obj: T | undefined | null, key: string): string | undefined => {
    if (!obj) return undefined;
    // Uso de Record<string, unknown> para evitar 'any' explícito
    const record = obj as Record<string, unknown>;
    const value = record[key];
    return typeof value === 'string' ? value : undefined;
  };

  // Obter os campos disponíveis com base no tipo de ação
  const getAvailableFields = () => {
    switch (editingAction.type) {
      case 'update_customer':
        return [
          { id: 'name', label: t('prompts:form.actions.customerName') },
          { id: 'funnelId', label: t('prompts:form.actions.funnel') }
        ];
      case 'update_chat':
        return [
          { id: 'status', label: t('prompts:form.actions.status') },
          { id: 'teamId', label: t('prompts:form.actions.team') },
          { id: 'title', label: t('prompts:form.actions.chatFieldTitle') }
        ];
      case 'check_schedule':
        return [
          { id: 'scheduleId', label: t('prompts:form.actions.schedule') }
        ];
      case 'go_to_flow_node':
        return [
          { id: 'nodeId', label: t('prompts:form.actions.flowNode') }
        ];
      default:
        return [];
    }
  };

  // Verificar se um campo deve ser exibido
  const shouldShowField = (fieldId: string) => {
    // Se nenhum campo estiver selecionado, não mostrar nenhum
    if (!selectedField) return false;
    
    // Se o campo for selecionado explicitamente, mostrar
    if (selectedField === fieldId) return true;
    
    return false;
  };

  // Função para obter os parâmetros disponíveis
  const getAvailableParameters = () => {
    return Object.entries(parameters).map(([key, value]) => {
      // Começar com o nome e descrição
      let label = `${key} - ${value.description || key}`;
      
      // Se tiver valores enum, adicionar entre parênteses, independente do tipo
      if (Array.isArray(value.enum) && value.enum.length > 0) {
        label = `${label} (${value.enum.join(', ')})`;
      }
      
      return {
        name: key,
        description: value.description || key,
        label
      };
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={onClose} />
    
        {/* Modal */}
        <div className="relative w-full max-w-2xl rounded-lg bg-white dark:bg-gray-800 p-6 shadow-xl max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              {action ? t('prompts:form.actions.editAction') : t('prompts:form.actions.addAction')}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="space-y-4">
            {/* Filters Section */}
            <div className="space-y-3">
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="flex justify-between items-center p-3 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center space-x-2">
                    <h6 className="text-sm font-semibold text-gray-900 dark:text-white">
                      {t('prompts:form.actions.filters.title')}
                    </h6>
                    <span className="text-red-500">*</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddFilter}
                    className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 bg-blue-50 dark:bg-blue-900/30 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                  >
                    {t('prompts:form.actions.filters.add')}
                  </button>
                </div>

                <div className="p-3">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                    {t('prompts:form.actions.filters.description')}
                  </p>

                  {(editingAction.filters || []).length === 0 ? (
                    <div className="bg-white dark:bg-gray-700 p-4 rounded-md">
                      <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                        {t('prompts:form.actions.filters.noFilters')}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {(editingAction.filters || []).map((filter: ActionFilter, filterIndex: number) => (
                        <div key={filterIndex} className="bg-white dark:bg-gray-700 p-3 rounded-md">
                          <div className="flex items-start space-x-3">
                            <div className="flex-1">
                              <select
                                value={filter.variable}
                                onChange={(e) => handleUpdateFilter(filterIndex, 'variable', e.target.value)}
                                className="w-full text-xs p-2 border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                              >
                                <option value="">{t('prompts:form.actions.filters.selectVariable')}</option>
                                {/* Variáveis do tipo enum */}
                                {Object.entries(parameters)
                                  .filter(([, param]) => param.type === 'enum')
                                  .map(([key]) => (
                                    <option key={key} value={key}>{key}</option>
                                ))}
                                {/* Parâmetros */}
                                {getAvailableParameters().map((param) => (
                                  <option key={param.name} value={param.name}>{param.label}</option>
                                ))}
                              </select>
                            </div>

                            {filter.variable && (
                              <div className="flex-1">
                                <select
                                  value={filter.operator}
                                  onChange={(e) => handleUpdateFilter(filterIndex, 'operator', e.target.value)}
                                  className="w-full text-xs p-2 border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                >
                                  {(() => {
                                    // Verificar se é um parâmetro do tipo enum
                                    const selectedParam = Object.entries(parameters).find(([key]) => key === filter.variable);
                                    const isEnum = selectedParam && (selectedParam[1].type === 'enum' || Array.isArray(selectedParam[1].enum));

                                    if (isEnum) {
                                      return (
                                        <>
                                          <option value="exists">{t('prompts:form.actions.filters.operators.exists')}</option>
                                          <option value="not_exists">{t('prompts:form.actions.filters.operators.notExists')}</option>
                                          <option value="equals">{t('prompts:form.actions.filters.operators.equals')}</option>
                                          <option value="not_equals">{t('prompts:form.actions.filters.operators.notEquals')}</option>
                                        </>
                                      );
                                    }

                                    return (
                                      <>
                                        <option value="exists">{t('prompts:form.actions.filters.operators.exists')}</option>
                                        <option value="not_exists">{t('prompts:form.actions.filters.operators.notExists')}</option>
                                        <option value="equals">{t('prompts:form.actions.filters.operators.equals')}</option>
                                        <option value="not_equals">{t('prompts:form.actions.filters.operators.notEquals')}</option>
                                        <option value="contains">{t('prompts:form.actions.filters.operators.contains')}</option>
                                        <option value="not_contains">{t('prompts:form.actions.filters.operators.notContains')}</option>
                                        <option value="starts_with">{t('prompts:form.actions.filters.operators.startsWith')}</option>
                                        <option value="ends_with">{t('prompts:form.actions.filters.operators.endsWith')}</option>
                                        <option value="greater_than">{t('prompts:form.actions.filters.operators.greaterThan')}</option>
                                        <option value="less_than">{t('prompts:form.actions.filters.operators.lessThan')}</option>
                                        <option value="greater_than_or_equal">{t('prompts:form.actions.filters.operators.greaterThanOrEqual')}</option>
                                        <option value="less_than_or_equal">{t('prompts:form.actions.filters.operators.lessThanOrEqual')}</option>
                                      </>
                                    );
                                  })()}
                                </select>
                              </div>
                            )}

                            {filter.variable && filter.operator && filter.operator !== 'exists' && filter.operator !== 'not_exists' && (
                              <div className="flex-1">
                                {(() => {
                                  // Verificar se a variável selecionada é um parâmetro
                                  const selectedParam = Object.entries(parameters).find(([key]) => key === filter.variable);
                                  
                                  // Se for um parâmetro com enum, mostrar select
                                  if (selectedParam && Array.isArray(selectedParam[1].enum) && selectedParam[1].enum.length > 0) {
                                    return (
                                      <select
                                        value={filter.value}
                                        onChange={(e) => handleUpdateFilter(filterIndex, 'value', e.target.value)}
                                        className="w-full text-xs p-2 border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                      >
                                        <option value="">{t('prompts:form.actions.filters.selectValue')}</option>
                                        {selectedParam[1].enum.map((value: string) => (
                                          <option key={value} value={value}>{value}</option>
                                        ))}
                                      </select>
                                    );
                                  }
                                  
                                  // Caso contrário, mostrar input de texto
                                  return (
                                    <input
                                      type="text"
                                      value={filter.value}
                                      onChange={(e) => handleUpdateFilter(filterIndex, 'value', e.target.value)}
                                      className="w-full text-xs p-2 border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                      placeholder={t('prompts:form.actions.filters.enterValue')}
                                    />
                                  );
                                })()}
                              </div>
                            )}

                            <button
                              type="button"
                              onClick={() => handleRemoveFilter(filterIndex)}
                              className="mt-1 p-1 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-md transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('prompts:form.actions.type')} *
                </label>
                <select
                  value={editingAction.type}
                  onChange={(e) => {
                    const newType = e.target.value as ToolAction['type'];
                    const newName = !editingAction.name || editingAction.type !== newType
                      ? t(`prompts:form.actions.types.${newType}`)
                      : editingAction.name;

                    setEditingAction({ 
                      ...editingAction, 
                      type: newType,
                      name: newName,
                      config: {} // Resetar a configuração ao mudar o tipo
                    });
                    setSelectedField('');
                  }}
                  className="w-full p-2 border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs"
                >
                  <option value="">{t('prompts:form.actions.selectType')}</option>
                  <option value="update_customer">{t('prompts:form.actions.types.update_customer')}</option>
                  <option value="update_chat">{t('prompts:form.actions.types.update_chat')}</option>
                  <option value="check_schedule">{t('prompts:form.actions.types.check_schedule')}</option>
                  <option value="go_to_flow_node">{t('prompts:form.actions.types.go_to_flow_node')}</option>
                </select>
              </div>

              {editingAction.type == 'update_customer' || editingAction.type == 'update_chat' || editingAction.type == 'check_schedule' ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {t('prompts:form.actions.selectField')}
                    </label>
                    <select
                      value={selectedField}
                      onChange={(e) => {
                        const newField = e.target.value;
                        setSelectedField(newField);
                        
                        // Atualizar as configurações baseado no campo selecionado
                        if (newField) {
                          const currentConfig = { ...editingAction.config };
                          switch (editingAction.type) {
                            case 'update_customer': {
                              const customerConfig = currentConfig as CustomerActionConfig;
                              if (newField === 'name') {
                                customerConfig.name = '';
                              } else if (newField === 'funnelId') {
                                customerConfig.funnelId = '';
                                customerConfig.stageId = '';
                              }
                              break;
                            }
                            case 'update_chat': {
                              const chatConfig = currentConfig as ChatActionConfig;
                              if (newField === 'status') {
                                chatConfig.status = '';
                              } else if (newField === 'teamId') {
                                chatConfig.teamId = '';
                              } else if (newField === 'title') {
                                chatConfig.title = '';
                              }
                              break;
                            }
                          }
                          
                          setEditingAction({
                            ...editingAction,
                            config: currentConfig
                          });
                        }
                      }}
                      className="w-full p-2 border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs"
                    >
                      <option value="">{t('prompts:form.actions.selectField')}</option>
                      {getAvailableFields()
                        .map(field => (
                          <option key={field.id} value={field.id}>{field.label}</option>
                        ))}
                    </select>
                  </div>

                  {/* Campos específicos para update_customer */}
                  {editingAction.type === 'update_customer' && (
                    <>
                      {shouldShowField('name') && (
                        <div className="mt-3 space-y-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                              {t('prompts:form.examples.variables.name.label')}
                            </label>
                            <div className="space-y-2">
                              <div className="flex items-center space-x-2">
                                <input
                                  type="radio"
                                  id="direct-name"
                                  name="name-type"
                                  checked={!getConfig<CustomerActionConfig>().nameMapping}
                                  onChange={() => {
                                    const newConfig = { 
                                      ...editingAction.config, 
                                      nameMapping: undefined,
                                      name: ''
                                    };
                                    setEditingAction({
                                      ...editingAction,
                                      config: newConfig
                                    });
                                  }}
                                  className="text-blue-600 focus:ring-blue-500"
                                />
                                <label htmlFor="direct-name" className="text-xs text-gray-700 dark:text-gray-300">
                                  {t('prompts:form.actions.directName')}
                                </label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <input
                                  type="radio"
                                  id="mapped-name"
                                  name="name-type"
                                  checked={!!getConfig<CustomerActionConfig>().nameMapping}
                                  onChange={() => {
                                    const newConfig = { 
                                      ...editingAction.config, 
                                      nameMapping: {
                                        variable: '',
                                        mapping: {}
                                      },
                                      name: ''
                                    };
                                    setEditingAction({
                                      ...editingAction,
                                      config: newConfig
                                    });
                                  }}
                                  className="text-blue-600 focus:ring-blue-500"
                                />
                                <label htmlFor="mapped-name" className="text-xs text-gray-700 dark:text-gray-300">
                                  {t('prompts:form.actions.mappedName')}
                                </label>
                              </div>
                            </div>
                          </div>

                          {!getConfig<CustomerActionConfig>().nameMapping ? (
                            <div>
                              <div className="flex justify-between items-center mb-1">
                                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
                                  {t('prompts:form.examples.variables.name.label')}
                                </label>
                                <button
                                  type="button"
                                  onClick={() => toggleManualInput('name')}
                                  className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                                >
                                  {manualInputs.name ? t('prompts:form.actions.useVariable') : t('prompts:form.actions.manualInput')}
                                </button>
                              </div>
                              {manualInputs.name ? (
                                <input
                                  type="text"
                                  value={safeGetMapping(getConfig<CustomerActionConfig>().nameMapping, 'name') || ''}
                                  onChange={(e) => {
                                    const newConfig = { ...editingAction.config, name: e.target.value };
                                    setEditingAction({
                                      ...editingAction,
                                      config: newConfig
                                    });
                                  }}
                                  className="w-full p-2 border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs"
                                  placeholder={t('prompts:form.actions.customerNamePlaceholder')}
                                />
                              ) : (
                                <select
                                  value={safeGetMapping(getConfig<CustomerActionConfig>().nameMapping, 'name') || ''}
                                  onChange={(e) => {
                                    const newConfig = { ...editingAction.config, name: e.target.value };
                                    setEditingAction({
                                      ...editingAction,
                                      config: newConfig
                                    });
                                  }}
                                  className="w-full p-2 border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs"
                                >
                                  <option value="">{t('prompts:form.actions.selectVariable')}</option>
                                  {getAvailableParameters()
                                    .filter(param => {
                                      const enumValues = parameters[param.name]?.enum;
                                      return Array.isArray(enumValues) && enumValues.length > 0;
                                    })
                                    .map((param) => (
                                      <option key={param.name} value={`{{${param.name}}}`}>{param.label}</option>
                                    ))}
                                </select>
                              )}
                            </div>
                          ) : (
                            <div className="space-y-3">
                              <div>
                                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                  {t('prompts:form.actions.selectVariable')}
                                </label>
                                <select
                                  value={safeGetMapping(getConfig<CustomerActionConfig>().nameMapping, 'variable') || ''}
                                  onChange={(e) => {
                                    const newConfig = {
                                      ...editingAction.config,
                                      nameMapping: {
                                        variable: e.target.value,
                                        mapping: {}
                                      }
                                    };
                                    setEditingAction({
                                      ...editingAction,
                                      config: newConfig
                                    });
                                  }}
                                  className="w-full p-2 border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs"
                                >
                                  <option value="">{t('prompts:form.actions.selectVariable')}</option>
                                  {getAvailableParameters()
                                    .filter(param => {
                                      const enumValues = parameters[param.name]?.enum;
                                      return Array.isArray(enumValues) && enumValues.length > 0;
                                    })
                                    .map((param) => (
                                      <option key={param.name} value={param.name}>{param.label}</option>
                                    ))}
                                </select>
                              </div>

                              {safeGetMapping(getConfig<CustomerActionConfig>().nameMapping, 'variable') && (
                                <div className="mt-3">
                                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    {t('prompts:form.actions.nameMapping')}
                                  </label>
                                  <div className="space-y-2">
                                    {(() => {
                                      const selectedVariable = safeGetMapping(getConfig<CustomerActionConfig>().nameMapping, 'variable');
                                      const enumValues = parameters[selectedVariable!]?.enum || [];

                                      return enumValues.map((enumValue: string) => (
                                        <div key={enumValue} className="flex items-center space-x-2">
                                          <span className="text-xs text-gray-600 dark:text-gray-400 min-w-[100px]">
                                            {enumValue}:
                                          </span>
                                          <div className="flex-1">
                                            <div className="flex justify-end mb-1">
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  const newManualInputs = { ...manualInputs };
                                                  newManualInputs[`name_${enumValue}`] = !manualInputs[`name_${enumValue}`];
                                                  setManualInputs(newManualInputs);
                                                }}
                                                className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                                              >
                                                {manualInputs[`name_${enumValue}`] ? t('prompts:form.actions.useVariable') : t('prompts:form.actions.manualInput')}
                                              </button>
                                            </div>
                                            {manualInputs[`name_${enumValue}`] ? (
                                              <input
                                                type="text"
                                                value={safeGetMapping(getConfig<CustomerActionConfig>().nameMapping?.mapping, enumValue) || ''}
                                                onChange={(e) => {
                                                  const newMapping = {
                                                    ...(getConfig<CustomerActionConfig>().nameMapping?.mapping || {}),
                                                    [enumValue]: e.target.value
                                                  };
                                                  const newConfig = {
                                                    ...editingAction.config,
                                                    nameMapping: {
                                                      ...getConfig<CustomerActionConfig>().nameMapping!,
                                                      mapping: newMapping
                                                    }
                                                  };
                                                  setEditingAction({
                                                    ...editingAction,
                                                    config: newConfig
                                                  });
                                                }}
                                                className="w-full p-2 border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs"
                                                placeholder={t('prompts:form.actions.customerNamePlaceholder')}
                                              />
                                            ) : (
                                              <select
                                                value={safeGetMapping(getConfig<CustomerActionConfig>().nameMapping?.mapping, enumValue) || ''}
                                                onChange={(e) => {
                                                  const newMapping = {
                                                    ...(getConfig<CustomerActionConfig>().nameMapping?.mapping || {}),
                                                    [enumValue]: e.target.value
                                                  };
                                                  const newConfig = {
                                                    ...editingAction.config,
                                                    nameMapping: {
                                                      ...getConfig<CustomerActionConfig>().nameMapping!,
                                                      mapping: newMapping
                                                    }
                                                  };
                                                  setEditingAction({
                                                    ...editingAction,
                                                    config: newConfig
                                                  });
                                                }}
                                                className="w-full p-2 border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs"
                                              >
                                                <option value="">{t('prompts:form.actions.selectVariable')}</option>
                                                {getAvailableParameters()
                                                  .filter(param => {
                                                    const enumValues = parameters[param.name]?.enum;
                                                    return Array.isArray(enumValues) && enumValues.length > 0;
                                                  })
                                                  .map((param) => (
                                                    <option key={param.name} value={`{{${param.name}}}`}>{param.label}</option>
                                                  ))}
                                              </select>
                                            )}
                                          </div>
                                        </div>
                                      ));
                                    })()}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                      
                      {shouldShowField('funnelId') && (
                        <div className="mt-3 space-y-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                              {t('prompts:form.actions.funnel')}
                            </label>
                            <div className="space-y-2">
                              <div className="flex items-center space-x-2">
                                <input
                                  type="radio"
                                  id="direct-funnel"
                                  name="funnel-type"
                                  checked={!getConfig<CustomerActionConfig>().funnelMapping}
                                  onChange={() => {
                                    const newConfig = { 
                                      ...editingAction.config, 
                                      funnelMapping: undefined,
                                      funnelId: '',
                                      stageId: ''
                                    };
                                    setEditingAction({
                                      ...editingAction,
                                      config: newConfig
                                    });
                                  }}
                                  className="text-blue-600 focus:ring-blue-500"
                                />
                                <label htmlFor="direct-funnel" className="text-xs text-gray-700 dark:text-gray-300">
                                  {t('prompts:form.actions.directFunnel')}
                                </label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <input
                                  type="radio"
                                  id="mapped-funnel"
                                  name="funnel-type"
                                  checked={!!getConfig<CustomerActionConfig>().funnelMapping}
                                  onChange={() => {
                                    const newConfig = { 
                                      ...editingAction.config, 
                                      funnelMapping: {
                                        variable: '',
                                        mapping: {}
                                      },
                                      funnelId: '',
                                      stageId: ''
                                    };
                                    setEditingAction({
                                      ...editingAction,
                                      config: newConfig
                                    });
                                  }}
                                  className="text-blue-600 focus:ring-blue-500"
                                />
                                <label htmlFor="mapped-funnel" className="text-xs text-gray-700 dark:text-gray-300">
                                  {t('prompts:form.actions.mappedFunnel')}
                                </label>
                              </div>
                            </div>
                          </div>

                          {!getConfig<CustomerActionConfig>().funnelMapping ? (
                            <>
                              <div>
                                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                  {t('prompts:form.actions.selectFunnel')}
                                </label>
                                <select
                                  value={safeGetMapping(getConfig<CustomerActionConfig>().funnelMapping, 'funnelId') || ''}
                                  onChange={(e) => {
                                    const config = getConfig<CustomerActionConfig>();
                                    const newConfig = { 
                                      ...editingAction.config, 
                                      funnelId: e.target.value,
                                      stageId: e.target.value !== config.funnelId ? '' : config.stageId
                                    };
                                    setEditingAction({
                                      ...editingAction,
                                      config: newConfig
                                    });
                                  }}
                                  className="w-full p-2 border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs"
                                >
                                  <option value="">{t('prompts:form.actions.selectFunnel')}</option>
                                  {funnels.map((funnel) => (
                                    <option key={funnel.id} value={funnel.id}>{funnel.name}</option>
                                  ))}
                                </select>
                              </div>
                              
                              {safeGetMapping(getConfig<CustomerActionConfig>().funnelMapping, 'funnelId') && (
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    {t('prompts:form.actions.selectStage')}
                                  </label>
                                  <select
                                    value={safeGetMapping(getConfig<CustomerActionConfig>().funnelMapping, 'stageId') || ''}
                                    onChange={(e) => {
                                      const newConfig = { ...editingAction.config, stageId: e.target.value };
                                      setEditingAction({
                                        ...editingAction,
                                        config: newConfig
                                      });
                                    }}
                                    className="w-full p-2 border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs"
                                  >
                                    <option value="">{t('prompts:form.actions.selectStage')}</option>
                                    {funnels
                                      .find(f => f.id === safeGetMapping(getConfig<CustomerActionConfig>().funnelMapping, 'funnelId'))
                                      ?.stages?.map((stage) => (
                                        <option key={stage.id} value={stage.id}>{stage.name}</option>
                                      ))}
                                  </select>
                                </div>
                              )}
                            </>
                          ) : (
                            <div className="space-y-3">
                              <div>
                                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                  {t('prompts:form.actions.selectVariable')}
                                </label>
                                <select
                                  value={safeGetMapping(getConfig<CustomerActionConfig>().funnelMapping, 'variable') || ''}
                                  onChange={(e) => {
                                    const newConfig = {
                                      ...editingAction.config,
                                      funnelMapping: {
                                        variable: e.target.value,
                                        mapping: {}
                                      }
                                    };
                                    setEditingAction({
                                      ...editingAction,
                                      config: newConfig
                                    });
                                  }}
                                  className="w-full p-2 border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs"
                                >
                                  <option value="">{t('prompts:form.actions.selectVariable')}</option>
                                  {getAvailableParameters()
                                    .filter(param => {
                                      const enumValues = parameters[param.name]?.enum;
                                      return Array.isArray(enumValues) && enumValues.length > 0;
                                    })
                                    .map((param) => (
                                      <option key={param.name} value={param.name}>{param.label}</option>
                                    ))}
                                </select>
                              </div>

                              {safeGetMapping(getConfig<CustomerActionConfig>().funnelMapping, 'variable') && safeGetMapping(getConfig<CustomerActionConfig>().funnelMapping, 'funnelId') && (
                                <div className="mt-3">
                                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    {t('prompts:form.actions.stageMapping')}
                                  </label>
                                  <div className="space-y-2">
                                    {(() => {
                                      const selectedVariable = safeGetMapping(getConfig<CustomerActionConfig>().funnelMapping, 'variable');
                                      const enumValues = parameters[selectedVariable!]?.enum || [];
                                      const selectedFunnel = funnels.find(f => f.id === safeGetMapping(getConfig<CustomerActionConfig>().funnelMapping, 'funnelId'));
                                      const availableStages = selectedFunnel?.stages || [];

                                      return enumValues.map((enumValue: string) => (
                                        <div key={enumValue} className="flex items-center space-x-2">
                                          <span className="text-xs text-gray-600 dark:text-gray-400 min-w-[100px]">
                                            {enumValue}:
                                          </span>
                                          <select
                                            value={safeGetMapping(getConfig<CustomerActionConfig>().funnelMapping?.mapping, enumValue) || ''}
                                            onChange={(e) => {
                                              const newMapping = {
                                                ...(getConfig<CustomerActionConfig>().funnelMapping?.mapping || {}),
                                                [enumValue]: e.target.value
                                              };
                                              const newConfig = {
                                                ...editingAction.config,
                                                funnelMapping: {
                                                  ...getConfig<CustomerActionConfig>().funnelMapping!,
                                                  mapping: newMapping
                                                }
                                              };
                                              setEditingAction({
                                                ...editingAction,
                                                config: newConfig
                                              });
                                            }}
                                            className="flex-1 p-2 border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs"
                                          >
                                            <option value="">{t('prompts:form.actions.selectStage')}</option>
                                            {availableStages.map((stage) => (
                                              <option key={stage.id} value={stage.id}>
                                                {stage.name}
                                              </option>
                                            ))}
                                          </select>
                                        </div>
                                      ));
                                    })()}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}

                  {/* Campos específicos para update_chat */}
                  {editingAction.type === 'update_chat' && (
                    <>
                      {shouldShowField('status') && (
                        <div className="mt-3 space-y-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                              {t('prompts:form.actions.status')}
                            </label>
                            <div className="space-y-2">
                              <div className="flex items-center space-x-2">
                                <input
                                  type="radio"
                                  id="direct-status"
                                  name="status-type"
                                  checked={!getConfig<ChatActionConfig>().statusMapping}
                                  onChange={() => {
                                    const newConfig = { 
                                      ...editingAction.config, 
                                      statusMapping: undefined,
                                      status: ''
                                    };
                                    setEditingAction({
                                      ...editingAction,
                                      config: newConfig
                                    });
                                  }}
                                  className="text-blue-600 focus:ring-blue-500"
                                />
                                <label htmlFor="direct-status" className="text-xs text-gray-700 dark:text-gray-300">
                                  {t('prompts:form.actions.directStatus')}
                                </label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <input
                                  type="radio"
                                  id="mapped-status"
                                  name="status-type"
                                  checked={!!getConfig<ChatActionConfig>().statusMapping}
                                  onChange={() => {
                                    const newConfig = { 
                                      ...editingAction.config, 
                                      statusMapping: {
                                        variable: '',
                                        mapping: {}
                                      },
                                      status: ''
                                    };
                                    setEditingAction({
                                      ...editingAction,
                                      config: newConfig
                                    });
                                  }}
                                  className="text-blue-600 focus:ring-blue-500"
                                />
                                <label htmlFor="mapped-status" className="text-xs text-gray-700 dark:text-gray-300">
                                  {t('prompts:form.actions.mappedStatus')}
                                </label>
                              </div>
                            </div>
                          </div>

                          {!getConfig<ChatActionConfig>().statusMapping ? (
                            <div>
                              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                {t('prompts:form.actions.selectStatus')}
                              </label>
                              <select
                                value={safeGetMapping(getConfig<ChatActionConfig>(), 'status') || ''}
                                onChange={(e) => {
                                  const newConfig = { ...editingAction.config, status: e.target.value };
                                  setEditingAction({
                                    ...editingAction,
                                    config: newConfig
                                  });
                                }}
                                className="w-full p-2 border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs"
                              >
                                <option value="">{t('prompts:form.actions.selectStatus')}</option>
                                <option value="pending">{t('prompts:form.actions.statusPending')}</option>
                                <option value="in_progress">{t('prompts:form.actions.statusInProgress')}</option>
                                <option value="closed">{t('prompts:form.actions.statusClosed')}</option>
                              </select>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              <div>
                                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                  {t('prompts:form.actions.selectVariable')}
                                </label>
                                <select
                                  value={safeGetMapping(getConfig<ChatActionConfig>().statusMapping, 'variable') || ''}
                                  onChange={(e) => {
                                    const newConfig = {
                                      ...editingAction.config,
                                      statusMapping: {
                                        variable: e.target.value,
                                        mapping: {}
                                      }
                                    };
                                    setEditingAction({
                                      ...editingAction,
                                      config: newConfig
                                    });
                                  }}
                                  className="w-full p-2 border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs"
                                >
                                  <option value="">{t('prompts:form.actions.selectVariable')}</option>
                                  {getAvailableParameters()
                                    .filter(param => {
                                      const enumValues = parameters[param.name]?.enum;
                                      return Array.isArray(enumValues) && enumValues.length > 0;
                                    })
                                    .map((param) => (
                                      <option key={param.name} value={param.name}>{param.label}</option>
                                    ))}
                                </select>
                              </div>

                              {safeGetMapping(getConfig<ChatActionConfig>().statusMapping, 'variable') && (
                                <div className="mt-3">
                                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    {t('prompts:form.actions.statusMapping')}
                                  </label>
                                  <div className="space-y-2">
                                    {(() => {
                                      const selectedVariable = safeGetMapping(getConfig<ChatActionConfig>().statusMapping, 'variable');
                                      const enumValues = parameters[selectedVariable!]?.enum || [];
                                      const availableStatuses = [
                                        { value: 'pending', label: t('prompts:form.actions.statusPending') },
                                        { value: 'in_progress', label: t('prompts:form.actions.statusInProgress') },
                                        { value: 'closed', label: t('prompts:form.actions.statusClosed') }
                                      ];

                                      return enumValues.map((enumValue: string) => (
                                        <div key={enumValue} className="flex items-center space-x-2">
                                          <span className="text-xs text-gray-600 dark:text-gray-400 min-w-[100px]">
                                            {enumValue}:
                                          </span>
                                          <select
                                            value={safeGetMapping(getConfig<ChatActionConfig>().statusMapping?.mapping, enumValue) || ''}
                                            onChange={(e) => {
                                              const newMapping = {
                                                ...(getConfig<ChatActionConfig>().statusMapping?.mapping || {}),
                                                [enumValue]: e.target.value
                                              };
                                              const newConfig = {
                                                ...editingAction.config,
                                                statusMapping: {
                                                  ...getConfig<ChatActionConfig>().statusMapping!,
                                                  mapping: newMapping
                                                }
                                              };
                                              setEditingAction({
                                                ...editingAction,
                                                config: newConfig
                                              });
                                            }}
                                            className="flex-1 p-2 border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs"
                                          >
                                            <option value="">{t('prompts:form.actions.selectStatus')}</option>
                                            {availableStatuses.map((status) => (
                                              <option key={status.value} value={status.value}>
                                                {status.label}
                                              </option>
                                            ))}
                                          </select>
                                        </div>
                                      ));
                                    })()}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                      
                      {shouldShowField('teamId') && (
                        <div className="mt-3 space-y-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                              {t('prompts:form.actions.team')}
                            </label>
                            <div className="space-y-2">
                              <div className="flex items-center space-x-2">
                                <input
                                  type="radio"
                                  id="direct-team"
                                  name="team-type"
                                  checked={!getConfig<ChatActionConfig>().teamMapping}
                                  onChange={() => {
                                    const newConfig = { 
                                      ...editingAction.config, 
                                      teamMapping: undefined,
                                      teamId: ''
                                    };
                                    setEditingAction({
                                      ...editingAction,
                                      config: newConfig
                                    });
                                  }}
                                  className="text-blue-600 focus:ring-blue-500"
                                />
                                <label htmlFor="direct-team" className="text-xs text-gray-700 dark:text-gray-300">
                                  {t('prompts:form.actions.directTeam')}
                                </label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <input
                                  type="radio"
                                  id="mapped-team"
                                  name="team-type"
                                  checked={!!getConfig<ChatActionConfig>().teamMapping}
                                  onChange={() => {
                                    const newConfig = { 
                                      ...editingAction.config, 
                                      teamMapping: {
                                        variable: '',
                                        mapping: {}
                                      },
                                      teamId: ''
                                    };
                                    setEditingAction({
                                      ...editingAction,
                                      config: newConfig
                                    });
                                  }}
                                  className="text-blue-600 focus:ring-blue-500"
                                />
                                <label htmlFor="mapped-team" className="text-xs text-gray-700 dark:text-gray-300">
                                  {t('prompts:form.actions.mappedTeam')}
                                </label>
                              </div>
                            </div>
                          </div>

                          {!getConfig<ChatActionConfig>().teamMapping ? (
                            <div>
                              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                {t('prompts:form.actions.selectTeam')}
                              </label>
                              <select
                                value={safeGetMapping(getConfig<ChatActionConfig>(), 'teamId') || ''}
                                onChange={(e) => {
                                  const newConfig = { ...editingAction.config, teamId: e.target.value };
                                  setEditingAction({
                                    ...editingAction,
                                    config: newConfig
                                  });
                                }}
                                className="w-full p-2 border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs"
                              >
                                <option value="">{t('prompts:form.actions.selectTeam')}</option>
                                {teams.map((team) => (
                                  <option key={team.id} value={team.id}>{team.name}</option>
                                ))}
                              </select>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              <div>
                                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                  {t('prompts:form.actions.selectVariable')}
                                </label>
                                <select
                                  value={safeGetMapping(getConfig<ChatActionConfig>().teamMapping, 'variable') || ''}
                                  onChange={(e) => {
                                    const newConfig = {
                                      ...editingAction.config,
                                      teamMapping: {
                                        variable: e.target.value,
                                        mapping: {}
                                      }
                                    };
                                    setEditingAction({
                                      ...editingAction,
                                      config: newConfig
                                    });
                                  }}
                                  className="w-full p-2 border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs"
                                >
                                  <option value="">{t('prompts:form.actions.selectVariable')}</option>
                                  {getAvailableParameters()
                                    .filter(param => {
                                      const enumValues = parameters[param.name]?.enum;
                                      return Array.isArray(enumValues) && enumValues.length > 0;
                                    })
                                    .map((param) => (
                                      <option key={param.name} value={param.name}>{param.label}</option>
                                    ))}
                                </select>
                              </div>

                              {safeGetMapping(getConfig<ChatActionConfig>().teamMapping, 'variable') && (
                                <div className="mt-3">
                                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    {t('prompts:form.actions.teamMapping')}
                                  </label>
                                  <div className="space-y-2">
                                    {(() => {
                                      const selectedVariable = safeGetMapping(getConfig<ChatActionConfig>().teamMapping, 'variable');
                                      const enumValues = parameters[selectedVariable!]?.enum || [];

                                      return enumValues.map((enumValue: string) => (
                                        <div key={enumValue} className="flex items-center space-x-2">
                                          <span className="text-xs text-gray-600 dark:text-gray-400 min-w-[100px]">
                                            {enumValue}:
                                          </span>
                                          <div className="flex-1">
                                            <div className="flex justify-end mb-1">
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  const newManualInputs = { ...manualInputs };
                                                  newManualInputs[`team_${enumValue}`] = !manualInputs[`team_${enumValue}`];
                                                  setManualInputs(newManualInputs);
                                                }}
                                                className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                                              >
                                                {manualInputs[`team_${enumValue}`] ? t('prompts:form.actions.useVariable') : t('prompts:form.actions.manualInput')}
                                              </button>
                                            </div>
                                            {manualInputs[`team_${enumValue}`] ? (
                                              <input
                                                type="text"
                                                value={safeGetMapping(getConfig<ChatActionConfig>().teamMapping?.mapping, enumValue) || ''}
                                                onChange={(e) => {
                                                  const newMapping = {
                                                    ...(getConfig<ChatActionConfig>().teamMapping?.mapping || {}),
                                                    [enumValue]: e.target.value
                                                  };
                                                  const newConfig = {
                                                    ...editingAction.config,
                                                    teamMapping: {
                                                      ...getConfig<ChatActionConfig>().teamMapping!,
                                                      mapping: newMapping
                                                    }
                                                  };
                                                  setEditingAction({
                                                    ...editingAction,
                                                    config: newConfig
                                                  });
                                                }}
                                                className="w-full p-2 border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs"
                                                placeholder={t('prompts:form.actions.teamNamePlaceholder')}
                                              />
                                            ) : (
                                              <select
                                                value={safeGetMapping(getConfig<ChatActionConfig>().teamMapping?.mapping, enumValue) || ''}
                                                onChange={(e) => {
                                                  const newMapping = {
                                                    ...(getConfig<ChatActionConfig>().teamMapping?.mapping || {}),
                                                    [enumValue]: e.target.value
                                                  };
                                                  const newConfig = {
                                                    ...editingAction.config,
                                                    teamMapping: {
                                                      ...getConfig<ChatActionConfig>().teamMapping!,
                                                      mapping: newMapping
                                                    }
                                                  };
                                                  setEditingAction({
                                                    ...editingAction,
                                                    config: newConfig
                                                  });
                                                }}
                                                className="w-full p-2 border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs"
                                              >
                                                <option value="">{t('prompts:form.actions.selectTeam')}</option>
                                                {teams.map((team) => (
                                                  <option key={team.id} value={team.id}>
                                                    {team.name}
                                                  </option>
                                                ))}
                                              </select>
                                            )}
                                          </div>
                                        </div>
                                      ));
                                    })()}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {shouldShowField('title') && (
                        <div className="mt-3 space-y-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                              {t('prompts:form.actions.chatFieldTitle')}
                            </label>
                            <div className="space-y-2">
                              <div className="flex items-center space-x-2">
                                <input
                                  type="radio"
                                  id="direct-title"
                                  name="title-type"
                                  checked={!getConfig<ChatActionConfig>().titleMapping}
                                  onChange={() => {
                                    const newConfig = { 
                                      ...editingAction.config, 
                                      titleMapping: undefined,
                                      title: ''
                                    };
                                    setEditingAction({
                                      ...editingAction,
                                      config: newConfig
                                    });
                                  }}
                                  className="text-blue-600 focus:ring-blue-500"
                                />
                                <label htmlFor="direct-title" className="text-xs text-gray-700 dark:text-gray-300">
                                  {t('prompts:form.actions.directTitle')}
                                </label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <input
                                  type="radio"
                                  id="mapped-title"
                                  name="title-type"
                                  checked={!!getConfig<ChatActionConfig>().titleMapping}
                                  onChange={() => {
                                    const newConfig = { 
                                      ...editingAction.config, 
                                      titleMapping: {
                                        variable: '',
                                        mapping: {}
                                      },
                                      title: ''
                                    };
                                    setEditingAction({
                                      ...editingAction,
                                      config: newConfig
                                    });
                                  }}
                                  className="text-blue-600 focus:ring-blue-500"
                                />
                                <label htmlFor="mapped-title" className="text-xs text-gray-700 dark:text-gray-300">
                                  {t('prompts:form.actions.mappedTitle')}
                                </label>
                              </div>
                            </div>
                          </div>

                          {!getConfig<ChatActionConfig>().titleMapping ? (
                            <div>
                              <div className="flex justify-between items-center mb-1">
                                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
                                  {t('prompts:form.actions.chatFieldTitle')}
                                </label>
                                <button
                                  type="button"
                                  onClick={() => toggleManualInput('title')}
                                  className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                                >
                                  {manualInputs.title ? t('prompts:form.actions.useVariable') : t('prompts:form.actions.manualInput')}
                                </button>
                              </div>
                              {manualInputs.title ? (
                                <input
                                  type="text"
                                  value={safeGetMapping(getConfig<ChatActionConfig>(), 'title') || ''}
                                  onChange={(e) => {
                                    const newConfig = { ...editingAction.config, title: e.target.value };
                                    setEditingAction({
                                      ...editingAction,
                                      config: newConfig
                                    });
                                  }}
                                  className="w-full p-2 border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs"
                                  placeholder={t('prompts:form.actions.chatTitlePlaceholder')}
                                />
                              ) : (
                                <select
                                  value={safeGetMapping(getConfig<ChatActionConfig>(), 'title') || ''}
                                  onChange={(e) => {
                                    const newConfig = { ...editingAction.config, title: e.target.value };
                                    setEditingAction({
                                      ...editingAction,
                                      config: newConfig
                                    });
                                  }}
                                  className="w-full p-2 border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs"
                                >
                                  <option value="">{t('prompts:form.actions.selectVariable')}</option>
                                  {getAvailableParameters()
                                    .filter(param => {
                                      const enumValues = parameters[param.name]?.enum;
                                      return Array.isArray(enumValues) && enumValues.length > 0;
                                    })
                                    .map((param) => (
                                      <option key={param.name} value={`{{${param.name}}}`}>{param.label}</option>
                                    ))}
                                </select>
                              )}
                            </div>
                          ) : (
                            <div className="space-y-3">
                              <div>
                                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                  {t('prompts:form.actions.selectVariable')}
                                </label>
                                <select
                                  value={safeGetMapping(getConfig<ChatActionConfig>(), 'variable') || ''}
                                  onChange={(e) => {
                                    const newConfig = {
                                      ...editingAction.config,
                                      titleMapping: {
                                        variable: e.target.value,
                                        mapping: {}
                                      }
                                    };
                                    setEditingAction({
                                      ...editingAction,
                                      config: newConfig
                                    });
                                  }}
                                  className="w-full p-2 border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs"
                                >
                                  <option value="">{t('prompts:form.actions.selectVariable')}</option>
                                  {getAvailableParameters()
                                    .filter(param => {
                                      const enumValues = parameters[param.name]?.enum;
                                      return Array.isArray(enumValues) && enumValues.length > 0;
                                    })
                                    .map((param) => (
                                      <option key={param.name} value={param.name}>{param.label}</option>
                                    ))}
                                </select>
                              </div>

                              {safeGetMapping(getConfig<ChatActionConfig>(), 'variable') && (
                                <div className="mt-3">
                                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    {t('prompts:form.actions.titleMapping')}
                                  </label>
                                  <div className="space-y-2">
                                    {(() => {
                                      const selectedVariable = safeGetMapping(getConfig<ChatActionConfig>(), 'variable');
                                      const enumValues = parameters[selectedVariable!]?.enum || [];

                                      return enumValues.map((enumValue: string) => (
                                        <div key={enumValue} className="flex items-center space-x-2">
                                          <span className="text-xs text-gray-600 dark:text-gray-400 min-w-[100px]">
                                            {enumValue}:
                                          </span>
                                          <div className="flex-1">
                                            <div className="flex justify-end mb-1">
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  const newManualInputs = { ...manualInputs };
                                                  newManualInputs[`title_${enumValue}`] = !manualInputs[`title_${enumValue}`];
                                                  setManualInputs(newManualInputs);
                                                }}
                                                className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                                              >
                                                {manualInputs[`title_${enumValue}`] ? t('prompts:form.actions.useVariable') : t('prompts:form.actions.manualInput')}
                                              </button>
                                            </div>
                                            {manualInputs[`title_${enumValue}`] ? (
                                              <input
                                                type="text"
                                                value={safeGetMapping(getConfig<ChatActionConfig>().titleMapping?.mapping, enumValue) || ''}
                                                onChange={(e) => {
                                                  const newMapping = {
                                                    ...(getConfig<ChatActionConfig>().titleMapping?.mapping || {}),
                                                    [enumValue]: e.target.value
                                                  };
                                                  const newConfig = {
                                                    ...editingAction.config,
                                                    titleMapping: {
                                                      ...getConfig<ChatActionConfig>().titleMapping!,
                                                      mapping: newMapping
                                                    }
                                                  };
                                                  setEditingAction({
                                                    ...editingAction,
                                                    config: newConfig
                                                  });
                                                }}
                                                className="w-full p-2 border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs"
                                                placeholder={t('prompts:form.actions.chatTitlePlaceholder')}
                                              />
                                            ) : (
                                              <select
                                                value={safeGetMapping(getConfig<ChatActionConfig>().titleMapping?.mapping, enumValue) || ''}
                                                onChange={(e) => {
                                                  const newMapping = {
                                                    ...(getConfig<ChatActionConfig>().titleMapping?.mapping || {}),
                                                    [enumValue]: e.target.value
                                                  };
                                                  const newConfig = {
                                                    ...editingAction.config,
                                                    titleMapping: {
                                                      ...getConfig<ChatActionConfig>().titleMapping!,
                                                      mapping: newMapping
                                                    }
                                                  };
                                                  setEditingAction({
                                                    ...editingAction,
                                                    config: newConfig
                                                  });
                                                }}
                                                className="w-full p-2 border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs"
                                              >
                                                <option value="">{t('prompts:form.actions.selectVariable')}</option>
                                                {getAvailableParameters()
                                                  .filter(param => {
                                                    const enumValues = parameters[param.name]?.enum;
                                                    return Array.isArray(enumValues) && enumValues.length > 0;
                                                  })
                                                  .map((param) => (
                                                    <option key={param.name} value={`{{${param.name}}}`}>{param.label}</option>
                                                  ))}
                                              </select>
                                            )}
                                          </div>
                                        </div>
                                      ));
                                    })()}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              ) : null}
              {/* Campos específicos para go_to_flow_node */}
              {editingAction.type === 'go_to_flow_node' && (
                <>
                  <div className="mt-3 space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {t('prompts:form.actions.selectNode')}
                      </label>
                      <select
                        value={safeGetMapping(getConfig<FlowNodeActionConfig>(), 'nodeId') || ''}
                        onChange={(e) => {
                          const newConfig = { 
                            ...editingAction.config, 
                            nodeId: e.target.value
                          };
                          setEditingAction({
                            ...editingAction,
                            config: newConfig
                          });
                        }}
                        className="w-full p-2 border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs"
                      >
                        <option value="">{t('prompts:form.actions.selectNode')}</option>
                        {linkedFlow?.nodes
                          ?.filter((node: FlowNode) => node.type !== 'group')
                          ?.map((node: FlowNode) => (
                            <option key={node.id} value={node.id}>{node.data?.label || node.id}</option>
                          ))}
                      </select>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Footer - Movido para dentro do modal */}
          <div className="mt-6 flex justify-end space-x-3 sticky bottom-0 bg-white dark:bg-gray-800 py-3 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 dark:text-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:hover:bg-gray-600"
            >
              {t('common:cancel')}
            </button>
            <button
              onClick={handleSave}
              disabled={!editingAction.name.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t('common:save')}
            </button>
          </div>
        </div>
      </div>

      
    </div>
  );
};

export default ToolActionModal; 