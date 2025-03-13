import React from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { ToolAction, Variable, ActionFilter } from '../../types/prompts';

// Definir tipos específicos para cada tipo de configuração
interface CustomerActionConfig {
  name?: string;
  funnelId?: string;
  stageId?: string;
}

interface ChatActionConfig {
  status?: string;
  teamId?: string;
  title?: string;
}

interface FlowActionConfig {
  flowId?: string;
}

// Tipo união para todas as configurações possíveis
type ActionConfig = CustomerActionConfig | ChatActionConfig | FlowActionConfig | Record<string, unknown>;

interface ToolActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (action: ToolAction) => void;
  action?: ToolAction;
  variables?: Variable[];
  teams?: { id: string; name: string }[];
  funnels?: { id: string; name: string; stages?: { id: string; name: string }[] }[];
  flows?: { id: string; name: string }[];
}

const ToolActionModal: React.FC<ToolActionModalProps> = ({
  isOpen,
  onClose,
  onSave,
  action,
  variables = [],
  teams = [],
  funnels = [],
  flows = []
}) => {
  const { t } = useTranslation(['prompts', 'common']);
  const [editingAction, setEditingAction] = React.useState<ToolAction & { config: ActionConfig }>({
    id: action?.id || '',
    name: action?.name || '',
    type: action?.type || 'update_customer',
    config: action?.config || {},
    filters: action?.filters || []
  });

  const [manualInputs, setManualInputs] = React.useState<Record<string, boolean>>({
    name: false,
    title: false
  });

  const [selectedField, setSelectedField] = React.useState<string>('');

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
    } else {
      setEditingAction({
        id: '',
        name: '',
        type: 'update_customer',
        config: {},
        filters: []
      } as ToolAction & { config: ActionConfig });
    }
  }, [action]);

  const handleSave = () => {
    if (editingAction.name.trim() === '') return;
    onSave(editingAction);
    onClose();
  };

  // Função para adicionar um novo filtro
  const handleAddFilter = () => {
    setEditingAction({
      ...editingAction,
      filters: [
        ...(editingAction.filters || []),
        { variable: '', operator: 'equals', value: '' }
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

  // Obter os campos disponíveis com base no tipo de ação
  const getAvailableFields = () => {
    switch (editingAction.type) {
      case 'update_customer':
        return [
          { id: 'name', label: t('prompts:form.examples.variables.name.label') },
          { id: 'funnelId', label: t('prompts:form.actions.types.update_customer') }
        ];
      case 'update_chat':
        return [
          { id: 'status', label: t('prompts:form.actions.chatFields') },
          { id: 'teamId', label: t('prompts:form.examples.variables.options.label') },
          { id: 'title', label: t('prompts:form.title') }
        ];
      case 'start_flow':
        return [
          { id: 'flowId', label: t('prompts:form.actions.flowId') }
        ];
      default:
        return [];
    }
  };

  // Verificar se um campo deve ser exibido
  const shouldShowField = (fieldId: string) => {
    // Se nenhum campo estiver selecionado, mostrar todos
    if (!selectedField) return true;
    
    // Se o campo for selecionado explicitamente, mostrar
    if (selectedField === fieldId) return true;
    
    return false;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Overlay */}
        <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={onClose} />
        
        {/* Modal */}
        <div className="relative w-full max-w-2xl rounded-lg bg-white dark:bg-gray-800 p-6 shadow-xl">
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
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('prompts:form.actions.name')} *
              </label>
              <input
                type="text"
                value={editingAction.name}
                onChange={(e) => setEditingAction({ ...editingAction, name: e.target.value })}
                className="w-full p-2 border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs"
                placeholder={t('prompts:form.actions.customerNamePlaceholder')}
              />
            </div>
            
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('prompts:form.actions.type')} *
              </label>
              <select
                value={editingAction.type}
                onChange={(e) => {
                  setEditingAction({ 
                    ...editingAction, 
                    type: e.target.value as ToolAction['type'],
                    config: {} // Resetar a configuração ao mudar o tipo
                  });
                  setSelectedField('');
                }}
                className="w-full p-2 border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs"
              >
                <option value="update_customer">{t('prompts:form.actions.types.update_customer')}</option>
                <option value="update_chat">{t('prompts:form.actions.types.update_chat')}</option>
                <option value="start_flow">{t('prompts:form.actions.types.start_flow')}</option>
                <option value="custom">{t('prompts:form.actions.types.custom')}</option>
              </select>
            </div>

            {editingAction.type !== 'custom' ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('prompts:form.actions.selectField')}
                  </label>
                  <select
                    value={selectedField}
                    onChange={(e) => setSelectedField(e.target.value)}
                    className="w-full p-2 border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs"
                  >
                    <option value="">{t('prompts:form.actions.showAllFields')}</option>
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
                      <div className="mt-3">
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
                            value={getConfig<CustomerActionConfig>().name || ''}
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
                            value={getConfig<CustomerActionConfig>().name || ''}
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
                            {variables.map((variable) => (
                              <option key={variable.name} value={`{{${variable.name}}}`}>{variable.name}</option>
                            ))}
                          </select>
                        )}
                      </div>
                    )}
                    
                    {shouldShowField('funnelId') && (
                      <div className="mt-3 space-y-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                            {t('prompts:form.actions.funnel')}
                          </label>
                          <select
                            value={getConfig<CustomerActionConfig>().funnelId || ''}
                            onChange={(e) => {
                              const config = getConfig<CustomerActionConfig>();
                              const newConfig = { 
                                ...editingAction.config, 
                                funnelId: e.target.value,
                                // Limpar o estágio se o funil mudar
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
                        
                        {getConfig<CustomerActionConfig>().funnelId && (
                          <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                              {t('prompts:form.actions.stage')}
                            </label>
                            <select
                              value={getConfig<CustomerActionConfig>().stageId || ''}
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
                                .find(f => f.id === getConfig<CustomerActionConfig>().funnelId)
                                ?.stages?.map((stage) => (
                                  <option key={stage.id} value={stage.id}>{stage.name}</option>
                                ))}
                            </select>
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
                      <div className="mt-3">
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                          {t('prompts:form.actions.status')}
                        </label>
                        <select
                          value={getConfig<ChatActionConfig>().status || ''}
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
                    )}
                    
                    {shouldShowField('teamId') && (
                      <div className="mt-3">
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                          {t('prompts:form.actions.team')}
                        </label>
                        <select
                          value={getConfig<ChatActionConfig>().teamId || ''}
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
                    )}
                    
                    {shouldShowField('title') && (
                      <div className="mt-3">
                        <div className="flex justify-between items-center mb-1">
                          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
                            {t('prompts:form.title')}
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
                            value={getConfig<ChatActionConfig>().title || ''}
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
                            value={getConfig<ChatActionConfig>().title || ''}
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
                            {variables.map((variable) => (
                              <option key={variable.name} value={`{{${variable.name}}}`}>{variable.name}</option>
                            ))}
                          </select>
                        )}
                      </div>
                    )}
                  </>
                )}

                {/* Campos específicos para start_flow */}
                {editingAction.type === 'start_flow' && (
                  <>
                    {shouldShowField('flowId') && (
                      <div className="mt-3">
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                          {t('prompts:form.actions.flow')}
                        </label>
                        <select
                          value={getConfig<FlowActionConfig>().flowId || ''}
                          onChange={(e) => {
                            const newConfig = { ...editingAction.config, flowId: e.target.value };
                            setEditingAction({
                              ...editingAction,
                              config: newConfig
                            });
                          }}
                          className="w-full p-2 border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs"
                        >
                          <option value="">{t('prompts:form.actions.selectFlow')}</option>
                          {flows.map((flow) => (
                            <option key={flow.id} value={flow.id}>{flow.name}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </>
                )}
              </div>
            ) : (
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('prompts:form.actions.customConfig')}
                </label>
                <textarea
                  value={JSON.stringify(editingAction.config, null, 2)}
                  onChange={(e) => {
                    try {
                      const config = JSON.parse(e.target.value);
                      setEditingAction({
                        ...editingAction,
                        config
                      });
                    } catch {
                      // Ignorar erros de parsing enquanto o usuário está digitando
                    }
                  }}
                  className="w-full p-2 border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-xs"
                  rows={4}
                  placeholder='{"name": "value", "email": "value"}'
                />
              </div>
            )}

            {/* Filters Section */}
            <div className="mt-3 space-y-2">
              <div className="flex justify-between items-center">
                <h6 className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  {t('prompts:form.actions.filters.title')}
                </h6>
                <button
                  type="button"
                  onClick={handleAddFilter}
                  className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  {t('prompts:form.actions.filters.add')}
                </button>
              </div>

              {(editingAction.filters || []).length === 0 ? (
                <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                  {t('prompts:form.actions.filters.noFilters')}
                </p>
              ) : (
                <div className="space-y-2">
                  {(editingAction.filters || []).map((filter, filterIndex) => (
                    <div key={filterIndex} className="bg-gray-50 dark:bg-gray-800 p-2 rounded space-y-2">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                            {t('prompts:form.actions.filters.selectVariable')}
                          </label>
                          <select
                            value={filter.variable}
                            onChange={(e) => handleUpdateFilter(filterIndex, 'variable', e.target.value)}
                            className="w-full text-xs p-1.5 border rounded border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
                          >
                            <option value="">{t('prompts:form.actions.filters.selectVariable')}</option>
                            {variables.filter(v => v.type === 'enum').map((variable) => (
                              <option key={variable.name} value={variable.name}>{variable.name}</option>
                            ))}
                          </select>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveFilter(filterIndex)}
                          className="ml-2 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                          {t('prompts:form.actions.filters.operator')}
                        </label>
                        <select
                          value={filter.operator}
                          onChange={(e) => handleUpdateFilter(filterIndex, 'operator', e.target.value)}
                          className="w-full text-xs p-1.5 border rounded border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
                        >
                          <option value="equals">{t('prompts:form.actions.filters.operators.equals')}</option>
                          <option value="not_equals">{t('prompts:form.actions.filters.operators.not_equals')}</option>
                          <option value="contains">{t('prompts:form.actions.filters.operators.contains')}</option>
                          <option value="not_contains">{t('prompts:form.actions.filters.operators.not_contains')}</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                          {t('prompts:form.actions.filters.selectValue')}
                        </label>
                        <select
                          value={filter.value}
                          onChange={(e) => handleUpdateFilter(filterIndex, 'value', e.target.value)}
                          className="w-full text-xs p-1.5 border rounded border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
                        >
                          <option value="">{t('prompts:form.actions.filters.selectValue')}</option>
                          {variables.find(v => v.name === filter.variable)?.enumValues?.map((value) => (
                            <option key={value} value={value}>{value}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="mt-6 flex justify-end space-x-3">
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