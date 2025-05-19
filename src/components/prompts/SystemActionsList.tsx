import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { SYSTEM_ACTIONS, SystemActionType } from '../../constants/systemActions';
import { Edit2, Trash2, Calendar, Database, Plus, AlertCircle } from 'lucide-react';
import EditSystemActionModal from './EditSystemActionModal';
import { useSchedules } from '../../hooks/useQueryes';
import { useAuthContext } from '../../contexts/AuthContext';
import { Modal } from '../ui/Modal';

// Lista de tipos de ações que podem ser adicionadas apenas uma vez
const UNIQUE_ACTION_TYPES = ['changeCustomerName', 'transferToTeam', 'unknownResponse'];

interface SystemActionsListProps {
  actions: SystemActionType[];
  onRemoveAction: (index: number) => void;
  onEditAction: (index: number, updatedAction: SystemActionType) => void;
  onAddAction: (action: SystemActionType) => void;
}

const SystemActionsList: React.FC<SystemActionsListProps> = ({ actions, onRemoveAction, onEditAction, onAddAction }) => {
  const { t } = useTranslation(['prompts', 'common']);
  const { currentOrganizationMember } = useAuthContext();
  const { data: schedules } = useSchedules(currentOrganizationMember?.organization.id);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedActionIndex, setSelectedActionIndex] = useState<number | null>(null);
  const [isSystemActionModalOpen, setIsSystemActionModalOpen] = useState(false);

  // Criar um mapa de ações já adicionadas para controle de unicidade
  const existingActionTypes = useMemo(() => {
    return actions.reduce<Record<string, boolean>>((acc, action) => {
      acc[action.type] = true;
      return acc;
    }, {});
  }, [actions]);

  const handleEditClick = (index: number) => {
    setSelectedActionIndex(index);
    setIsEditModalOpen(true);
  };

  const handleEditSave = (updatedAction: SystemActionType) => {
    if (selectedActionIndex !== null) {
      // console.log('selectedActionIndex:', selectedActionIndex);
      onEditAction(selectedActionIndex, updatedAction);
    }
  };

  const handleAddAndEditSystemAction = (action: SystemActionType) => {
    onAddAction(action);
    setIsSystemActionModalOpen(false);
    
    setTimeout(() => {
      const newIndex = actions.length;
      setSelectedActionIndex(newIndex);
      setIsEditModalOpen(true);
    }, 100);
  };

  // Função para obter o nome da agenda
  const getScheduleName = (scheduleId: string) => {
    const schedule = schedules?.find(s => s.id === scheduleId);
    return schedule?.title || t('prompts:form.actions.config.schedule.noSchedule');
  };

  // Verifica se uma ação pode ser adicionada (se única, verifica se já existe)
  const canAddAction = (actionType: string) => {
    if (UNIQUE_ACTION_TYPES.includes(actionType)) {
      return !existingActionTypes[actionType];
    }
    return true;
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-3">
        <div>
          <h3 className="text-sm font-medium text-gray-900 dark:text-white flex items-center">
            {actions.length === 0 && t('prompts:form.noSystemActions')}
          </h3>
        </div>
        <button
          type="button"
          onClick={() => setIsSystemActionModalOpen(true)}
          className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
        >
          {t('prompts:form.addSystemAction')}
        </button>
      </div>

      {actions.length === 0 ? (
        <div className="text-sm text-gray-500 dark:text-gray-400 italic">
          {t('prompts:form.noSystemActions')}
        </div>
      ) : (
        actions.map((action, index) => (
          <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <div className="p-4 bg-white dark:bg-gray-800">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                      {action.title}
                    </h4>
                    <button
                      type="button"
                      onClick={() => handleEditClick(index)}
                      className="ml-2 p-1 text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {action.description}
                  </p>
                  {action.type === 'schedule' && action.config?.schedule && (
                    <div className="mt-2 flex items-center text-sm text-blue-600 dark:text-blue-400">
                      <Calendar className="w-4 h-4 mr-1" />
                      {getScheduleName(action.config.schedule)}
                    </div>
                  )}
                  {action.type === 'updateCustomerCustomData' && action.config?.customFields && action.config.customFields.length > 0 && (
                    <div className="mt-2">
                      <div className="flex items-center text-sm text-green-600 dark:text-green-400">
                        <Database className="w-4 h-4 mr-1" />
                        {t('prompts:form.actions.config.customFields.selectedFields')}:
                      </div>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {(action.config.customFields as Array<{ id: string; name: string; selected?: boolean }>).map((field, fieldIndex) => (
                          <span 
                            key={fieldIndex} 
                            className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                          >
                            {field.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {action.type === 'unknownResponse' && action.config?.unknownResponse && (
                    <div className="mt-2">
                      <div className="flex flex-col gap-1">
                        {action.config.unknownResponse.pauseAgent && (
                          <span className="inline-flex items-center text-xs text-amber-600 dark:text-amber-400">
                            <AlertCircle className="w-3 h-3 mr-1" />
                            {t('prompts:form.systemActionTypes.unknownResponse.options.pauseAgent')}
                          </span>
                        )}
                        {action.config.unknownResponse.saveQuestion && (
                          <span className="inline-flex items-center text-xs text-blue-600 dark:text-blue-400">
                            <Database className="w-3 h-3 mr-1" />
                            {t('prompts:form.systemActionTypes.unknownResponse.options.saveQuestion')}
                          </span>
                        )}
                        {action.config.unknownResponse.tryToAnswer && (
                          <span className="inline-flex items-center text-xs text-green-600 dark:text-green-400">
                            <Plus className="w-3 h-3 mr-1" />
                            {t('prompts:form.systemActionTypes.unknownResponse.options.tryToAnswer')}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {action.type === 'changeFunnel' && (
                    <>
                      {action.config?.sourceStages && action.config.sourceStages.length > 0 && (
                        <div className="mt-2">
                          <div className="flex items-center text-sm text-blue-600 dark:text-blue-400">
                            <Database className="w-4 h-4 mr-1" />
                            {t('prompts:form.actions.config.changeFunnel.sourceStages')}:
                          </div>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {(action.config.sourceStages as Array<{ id: string; name: string; funnelName: string; description?: string; selected?: boolean }>).map((stage, stageIndex) => (
                              <span 
                                key={stageIndex} 
                                className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                                title={stage.description ? `${stage.funnelName}: ${stage.name} - ${stage.description}` : `${stage.funnelName}: ${stage.name}`}
                              >
                                {stage.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {action.config?.targetStages && action.config.targetStages.length > 0 && (
                        <div className="mt-2">
                          <div className="flex items-center text-sm text-indigo-600 dark:text-indigo-400">
                            <Database className="w-4 h-4 mr-1" />
                            {t('prompts:form.actions.config.changeFunnel.targetStages')}:
                          </div>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {(action.config.targetStages as Array<{ id: string; name: string; funnelName: string; description?: string; selected?: boolean }>).map((stage, stageIndex) => (
                              <span 
                                key={stageIndex} 
                                className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200"
                                title={stage.description ? `${stage.funnelName}: ${stage.name} - ${stage.description}` : `${stage.funnelName}: ${stage.name}`}
                              >
                                {stage.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
                <div className="flex items-center space-x-2">
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
          </div>
        ))
      )}

      {/* Modal de Edição de Ação */}
      {selectedActionIndex !== null && (
        <EditSystemActionModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedActionIndex(null);
          }}
          onSave={handleEditSave}
          action={actions[selectedActionIndex]}
        />
      )}

      {/* Modal de Adicionar Ação do Sistema */}
      <Modal
        isOpen={isSystemActionModalOpen}
        onClose={() => setIsSystemActionModalOpen(false)}
        title={t('prompts:form.systemActions')}
      >
        <div className="grid grid-cols-1 gap-2">
          {SYSTEM_ACTIONS.map((action) => {
            const isDisabled = !canAddAction(action.type);
            
            // Não mostrar a ação se ela não puder ser adicionada novamente e for do tipo único
            if (isDisabled && UNIQUE_ACTION_TYPES.includes(action.type)) {
              return null;
            }
            
            return (
              <button
                key={action.type}
                onClick={() => !isDisabled && handleAddAndEditSystemAction(action)}
                className={`flex items-center justify-between p-3 text-left rounded-lg ${
                  isDisabled 
                    ? 'opacity-50 cursor-not-allowed bg-gray-100 dark:bg-gray-700' 
                    : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
                disabled={isDisabled}
              >
                <div className="flex items-center">
                  <span>{t(`prompts:form.systemActionTypes.${action.type}.name`)}</span>
                  {isDisabled && (
                    <div className="ml-2 flex items-center text-amber-500" title={t('prompts:form.actionAlreadyAdded')}>
                      <AlertCircle className="w-4 h-4" />
                    </div>
                  )}
                </div>
                <Plus className={`w-5 h-5 ${isDisabled ? 'text-gray-400' : 'text-gray-500'}`} />
              </button>
            );
          })}
        </div>
      </Modal>
    </div>
  );
};

export default SystemActionsList; 