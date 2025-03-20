import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ToolAction } from '../../types/prompts';
import { PlusCircle, Edit, Trash2 } from 'lucide-react';
import ToolActionModal from './ToolActionModal';

interface ParameterDefinition {
  type: string;
  description?: string;
  enum?: string[];
  default?: unknown;
}

interface ToolActionFormProps {
  actions: ToolAction[];
  onActionsChange: (actions: ToolAction[]) => void;
  parameters?: Record<string, ParameterDefinition>;
}

const ToolActionList: React.FC<ToolActionFormProps> = ({ 
  actions, 
  onActionsChange, 
  parameters = {}
}) => {
  const { t } = useTranslation(['prompts', 'common']);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAction, setEditingAction] = useState<ToolAction | null>(null);
  const [editingConfig, setEditingConfig] = useState<{ id: string; config: string } | null>(null);

  // Função para gerar um ID único
  const generateId = () => {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  };

  // Função para adicionar ou atualizar uma ação
  const handleSaveAction = (action: ToolAction) => {
    if (editingAction) {
      // Editando uma ação existente
      const updatedActions = actions.map(a => 
        a.id === editingAction.id ? { 
          ...a,
          ...action,
          id: editingAction.id,
          config: action.config || {},
          filters: action.filters || []
        } : a
      );
      onActionsChange(updatedActions);
    } else {
      // Adicionando uma nova ação
      const actionToAdd = {
        ...action,
        id: generateId(),
        config: action.config || {},
        filters: action.filters || []
      };
      onActionsChange([...actions, actionToAdd]);
    }
    
    setEditingAction(null);
    setIsModalOpen(false);
  };

  // Função para remover uma ação
  const handleRemoveAction = (id: string) => {
    const updatedActions = actions.filter(action => action.id !== id);
    onActionsChange(updatedActions);
  };

  // Função para iniciar a edição de uma ação
  const handleEditAction = (action: ToolAction) => {
    console.log('action', action);
    setEditingAction(action);
    setIsModalOpen(true);
  };

  // Função para iniciar a edição do config
  const handleEditConfig = (action: ToolAction) => {
    setEditingConfig({
      id: action.id,
      config: JSON.stringify(action.config || {}, null, 2)
    });
  };

  // Função para salvar as alterações do config
  const handleSaveConfig = () => {
    if (!editingConfig) return;

    try {
      const parsedConfig = JSON.parse(editingConfig.config);
      const updatedActions = actions.map(action => 
        action.id === editingConfig.id 
          ? { ...action, config: parsedConfig }
          : action
      );
      onActionsChange(updatedActions);
      setEditingConfig(null);
    } catch (error) {
      console.error('Erro ao analisar JSON do config:', error);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-medium text-gray-900 dark:text-white">
          {t('prompts:form.actions.title')}
        </h3>
        <button
          type="button"
          onClick={() => {
            setEditingAction(null);
            setIsModalOpen(true);
          }}
          className="flex items-center space-x-1 text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
        >
          <PlusCircle className="w-4 h-4" />
          <span>{t('prompts:form.actions.add')}</span>
        </button>
      </div>
      
      <p className="text-xs text-gray-600 dark:text-gray-400">
        {t('prompts:form.actions.description')}
      </p>
      
      {/* Lista de ações existentes */}
      {actions.length > 0 ? (
        <div className="space-y-2">
          {actions.map(action => (
            <div 
              key={action.id} 
              className="p-3 border border-gray-200 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-800"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                    {action.name}
                  </h4>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {action.description}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Tipo: {action.type}
                  </p>
                </div>
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => handleEditAction(action)}
                    className="text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleRemoveAction(action.id)}
                    className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Exibir/editar configuração */}
              {Object.keys(action.config || {}).length > 0 && (
                <div className="mt-2">
                  {editingConfig?.id === action.id ? (
                    <div className="space-y-2">
                      <textarea
                        value={editingConfig.config}
                        onChange={(e) => setEditingConfig({ ...editingConfig, config: e.target.value })}
                        className="w-full text-xs font-mono bg-gray-100 dark:bg-gray-900 p-2 rounded border border-gray-300 dark:border-gray-600"
                        rows={20}
                      />
                      <div className="flex justify-end space-x-2">
                        <button
                          type="button"
                          onClick={() => setEditingConfig(null)}
                          className="text-xs text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                        >
                          {t('common:cancel')}
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveConfig}
                          className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          {t('common:save')}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="relative group">
                      <pre className="text-xs bg-gray-100 dark:bg-gray-900 p-2 rounded overflow-x-auto max-h-[100px] overflow-y-auto">
                        {JSON.stringify(action.config, null, 2)}
                      </pre>
                      <button
                        type="button"
                        onClick={() => handleEditConfig(action)}
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                      >
                        {t('common:edit')}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Exibir filtros */}
              {(action.filters || []).length > 0 && (
                <div className="mt-2 space-y-1">
                  <h6 className="text-xs font-medium text-gray-700 dark:text-gray-300">
                    {t('prompts:form.actions.filters.title')}
                  </h6>
                  {(action.filters || []).map((filter, index) => (
                    <div key={index} className="text-xs text-gray-600 dark:text-gray-400">
                      {filter.variable} {t(`prompts:form.actions.filters.operators.${filter.operator}`)} {filter.value}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-500 dark:text-gray-400 italic">
          {t('prompts:form.actions.noActions')}
        </p>
      )}

      {/* Modal para adicionar/editar ação */}
      <ToolActionModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingAction(null);
        }}
        onSave={handleSaveAction}
        action={editingAction || undefined}
        parameters={parameters}
      />
    </div>
  );
};

export default ToolActionList; 