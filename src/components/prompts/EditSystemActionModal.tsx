import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { SystemActionType } from '../../constants/systemActions';
import { useSchedules, useCustomFieldDefinitions, useFunnels } from '../../hooks/useQueryes';
import { useAuthContext } from '../../contexts/AuthContext';

interface EditSystemActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (action: SystemActionType) => void;
  action: SystemActionType;
}

interface Stage {
  id: string;
  name: string;
  funnelName: string;
  selected: boolean;
  description?: string;
}

interface Funnel {
  id: string;
  name: string;
  stages: {
    id: string;
    name: string;
    description?: string;
  }[];
}

interface StageSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (stages: Stage[]) => void;
  isSource: boolean;
  currentStages: Stage[];
  funnels: Funnel[];
  isLoading: boolean;
}

// Modal para seleção de estágios
const StageSelectModal: React.FC<StageSelectModalProps> = ({
  isOpen,
  onClose,
  onSave,
  isSource,
  currentStages,
  funnels,
  isLoading
}) => {
  const { t } = useTranslation(['prompts', 'common', 'crm']);
  const [selectedStages, setSelectedStages] = useState<Stage[]>(currentStages || []);

  const isStageSelected = (stageId: string) => {
    return selectedStages.some(stage => stage.id === stageId);
  };

  const handleStageToggle = (stageId: string, stageName: string, funnelName: string, description?: string) => {
    const stageIndex = selectedStages.findIndex(stage => stage.id === stageId);
    
    if (stageIndex === -1) {
      // Adiciona o estágio se não existir
      setSelectedStages([...selectedStages, { 
        id: stageId, 
        name: stageName, 
        funnelName: funnelName,
        selected: true,
        description: description || ''
      }]);
    } else {
      // Remove o estágio se já existir
      const newStages = [...selectedStages];
      newStages.splice(stageIndex, 1);
      setSelectedStages(newStages);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {isSource 
            ? t('prompts:form.actions.config.changeFunnel.sourceStages')
            : t('prompts:form.actions.config.changeFunnel.targetStages')}
        </h2>
        
        {isLoading ? (
          <div className="flex justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
          </div>
        ) : funnels && funnels.length > 0 ? (
          <div className="space-y-3 overflow-y-auto flex-grow">
            {funnels.map((funnel) => (
              <div key={funnel.id} className="space-y-1">
                <div className="font-medium text-xs text-gray-500 dark:text-gray-400">
                  {funnel.name}
                </div>
                <div className="pl-3 space-y-1">
                  {funnel.stages && funnel.stages.map((stage) => (
                    <div key={stage.id} className="flex items-start">
                      <div className="flex-shrink-0 pt-1">
                        <input
                          type="checkbox"
                          id={`stage-${stage.id}`}
                          checked={isStageSelected(stage.id)}
                          onChange={() => handleStageToggle(stage.id, stage.name, funnel.name, stage.description)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                      </div>
                      <div className="ml-2 truncate">
                        <label htmlFor={`stage-${stage.id}`} className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          {stage.name}
                        </label>
                        {stage.description && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate" title={stage.description}>
                            {stage.description}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t('crm:funnels.noFunnels')}
          </p>
        )}

        <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"
          >
            {t('common:cancel')}
          </button>
          <button
            type="button"
            onClick={() => {
              onSave(selectedStages);
              onClose();
            }}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            {t('common:save')}
          </button>
        </div>
      </div>
    </div>
  );
};

const EditSystemActionModal: React.FC<EditSystemActionModalProps> = ({
  isOpen,
  onClose,
  onSave,
  action,
}) => {
  const { t } = useTranslation(['prompts', 'common', 'customers', 'crm']);
  const { currentOrganizationMember } = useAuthContext();
  const [formData, setFormData] = useState<SystemActionType>(action);
  const { data: schedules, isLoading: isLoadingSchedules } = useSchedules(currentOrganizationMember?.organization.id);
  const { data: customFields, isLoading: isLoadingCustomFields } = useCustomFieldDefinitions(currentOrganizationMember?.organization.id);
  const { data: funnels, isLoading: isLoadingFunnels } = useFunnels(currentOrganizationMember?.organization.id);
  
  // Estados para controlar a exibição dos modais secundários
  const [showSourceStagesModal, setShowSourceStagesModal] = useState(false);
  const [showTargetStagesModal, setShowTargetStagesModal] = useState(false);
  const [editingStageId, setEditingStageId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (action) {
      setFormData({
        ...action,
        config: {
          ...action.config,
          schedule: action.config?.schedule || '',
          customFields: action.config?.customFields || [],
          sourceStages: action.config?.sourceStages || [],
          targetStages: action.config?.targetStages || []
        }
      });
    }
  }, [action]);

  // Adicione este useEffect para dar foco ao input quando o modo de edição for ativado
  useEffect(() => {
    if (editingStageId && inputRef.current) {
      // Pequeno timeout para garantir que o input esteja visível
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [editingStageId]);

  if (!isOpen || !formData) return null;

  const handleScheduleChange = (scheduleId: string) => {
    const updatedFormData = {
      ...formData,
      config: {
        ...formData.config,
        schedule: scheduleId
      }
    };
    setFormData(updatedFormData);
  };

  const handleCustomFieldToggle = (fieldId: string, fieldName: string, checked: boolean) => {
    const updatedCustomFields = formData.config?.customFields || [];
    const fieldIndex = updatedCustomFields.findIndex(field => field.id === fieldId);
    
    if (checked) {
      if (fieldIndex === -1) {
        updatedCustomFields.push({ id: fieldId, name: fieldName, selected: true });
      }
    } else {
      if (fieldIndex !== -1) {
        updatedCustomFields.splice(fieldIndex, 1);
      }
    }
    
    const updatedFormData = {
      ...formData,
      config: {
        ...formData.config,
        customFields: updatedCustomFields
      },
      title: t(`prompts:form.systemActionTypes.${formData.type}.nameInsert`, {
        fields: updatedCustomFields.map(field => field.name).join(', ') || '...'
      }),
      description: t(`prompts:form.systemActionTypes.${formData.type}.description`, {
        fields: updatedCustomFields.map(field => field.name).join(', ') || '...'
      })
    };
    
    setFormData(updatedFormData);
  };

  const isFieldSelected = (fieldId: string) => {
    return (formData.config?.customFields || []).some(field => field.id === fieldId);
  };

  // Função para atualizar as descrições dos estágios
  const handleStageDescriptionChange = (stageId: string, description: string) => {
    if (formData.config?.targetStages) {
      const stages = [...formData.config.targetStages];
      const stageIndex = stages.findIndex(s => s.id === stageId);
      if (stageIndex !== -1) {
        stages[stageIndex] = {
          ...stages[stageIndex],
          description
        };
        setFormData({
          ...formData,
          config: {
            ...formData.config,
            targetStages: stages
          }
        });
      }
    }
  };

  // Função para salvar estágios selecionados no modal secundário
  const handleSaveStages = (stages: Stage[], isSource: boolean) => {
    const configKey = isSource ? 'sourceStages' : 'targetStages';
    setFormData({
      ...formData,
      config: {
        ...formData.config,
        [configKey]: stages
      }
    });
  };

  // Função para iniciar edição da descrição de um estágio
  const startEditingStage = (stageId: string) => {
    setEditingStageId(stageId);
  };

  // Função para parar edição da descrição
  const stopEditingStage = () => {
    setEditingStageId(null);
  };

  // Função para obter a descrição de um estágio de destino
  const getStageDescription = (stageId: string) => {
    if (formData.config?.targetStages) {
      const stage = formData.config.targetStages.find(s => s.id === stageId);
      return stage?.description || '';
    }
    return '';
  };

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md max-h-[90vh] flex flex-col">
          <div className="overflow-y-auto flex-grow">
            <div className="space-y-4">
              <div>
                <input
                  type="text"
                  id="title"
                  value={formData.title || ''}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm px-4 py-2"
                  required
                />
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('prompts:form.actionDescription')}
                </label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm px-4 py-2"
                  required
                />
              </div>

              {formData.type === 'schedule' && (
                <div>
                  <label htmlFor="schedule" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('prompts:form.actions.config.schedule.selectSchedule')}
                  </label>
                  <select
                    id="schedule"
                    value={formData.config?.schedule || ''}
                    onChange={(e) => handleScheduleChange(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm px-4 py-2"
                    required
                    disabled={isLoadingSchedules}
                  >
                    <option value="">{t('prompts:form.actions.config.schedule.selectSchedule')}</option>
                    {schedules?.map((schedule) => (
                      <option key={schedule.id} value={schedule.id}>
                        {schedule.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {formData.type === 'changeFunnel' && (
                <>
                  {/* Seleção de estágios de origem - apenas para seleção */}
                  <div className="border border-gray-200 dark:border-gray-700 rounded-md p-4">
                    <div className="flex justify-between items-center mb-3">
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {t('prompts:form.actions.config.changeFunnel.sourceStagesDescription', 
                            'A alteração de funil só será aplicada a clientes que estejam em um destes estágios')}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowSourceStagesModal(true)}
                        className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 whitespace-nowrap ml-2"
                      >
                        {formData.config?.sourceStages?.length ? t('common:edit') : t('common:select')}
                      </button>
                    </div>
                    
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {formData.config?.sourceStages && formData.config.sourceStages.length > 0 ? (
                        formData.config.sourceStages.map((stage) => (
                          <div key={stage.id} className="bg-gray-50 dark:bg-gray-700 p-3 rounded-md">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                  {stage.name}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                          {t('common:noItemsSelected')}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Seleção de estágios de destino - com edição de descrição */}
                  <div className="border border-gray-200 dark:border-gray-700 rounded-md p-4">
                    <div className="flex justify-between items-center mb-3">
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {t('prompts:form.actions.config.changeFunnel.targetStagesDescription', 
                            'Estágios para os quais a IA poderá mover os clientes (defina descrições claras)')}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowTargetStagesModal(true)}
                        className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 whitespace-nowrap ml-2"
                      >
                        {formData.config?.targetStages?.length ? t('common:edit') : t('common:select')}
                      </button>
                    </div>
                    
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {formData.config?.targetStages && formData.config.targetStages.length > 0 ? (
                        formData.config.targetStages.map((stage) => (
                          <div key={stage.id} className="bg-gray-50 dark:bg-gray-700 p-3 rounded-md">
                            <div className="flex items-center justify-between mb-2">
                              <div>
                                <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                  {stage.name}
                                </div>
                              </div>
                              {editingStageId === stage.id ? (
                                <button
                                  type="button"
                                  onClick={stopEditingStage}
                                  className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-800 text-blue-600 dark:text-blue-200 rounded hover:bg-blue-200 dark:hover:bg-blue-700"
                                >
                                  {t('common:ok')}
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => startEditingStage(stage.id)}
                                  className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-200 rounded hover:bg-gray-200 dark:hover:bg-gray-500"
                                >
                                  {t('common:edit')}
                                </button>
                              )}
                            </div>
                            
                            {editingStageId === stage.id ? (
                              <div>
                                <input
                                  ref={inputRef}
                                  type="text"
                                  value={getStageDescription(stage.id)}
                                  onChange={(e) => handleStageDescriptionChange(stage.id, e.target.value)}
                                  className="w-full text-sm rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                  placeholder={t('crm:stages.stageDescription') || 'Descrição do estágio'}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      stopEditingStage();
                                    }
                                  }}
                                />
                              </div>
                            ) : stage.description ? (
                              <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                                {stage.description}
                              </p>
                            ) : (
                              <p className="text-xs italic text-gray-400 dark:text-gray-500 mt-1">
                                {t('common:noDescription')}
                              </p>
                            )}
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                          {t('common:noItemsSelected')}
                        </p>
                      )}
                    </div>
                  </div>
                </>
              )}

              {formData.type === 'updateCustomerCustomData' && (
                <div className="border border-gray-200 dark:border-gray-700 rounded-md p-4">
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    {t('customers:customFields.title')}
                  </h3>
                  
                  {isLoadingCustomFields ? (
                    <div className="flex justify-center py-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                    </div>
                  ) : customFields && customFields.length > 0 ? (
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {customFields.map((field) => (
                        <div key={field.id} className="flex items-center">
                          <input
                            type="checkbox"
                            id={`field-${field.id}`}
                            checked={isFieldSelected(field.id)}
                            onChange={(e) => handleCustomFieldToggle(field.id, field.name, e.target.checked)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <label htmlFor={`field-${field.id}`} className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                            {field.name}
                          </label>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {t('customers:customFields.noFields')}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"
            >
              {t('common:cancel')}
            </button>
            <button
              type="button"
              onClick={() => {
                onSave(formData);
                onClose();
              }}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              {t('common:save')}
            </button>
          </div>
        </div>
      </div>

      {/* Modal para seleção de estágios de origem */}
      <StageSelectModal
        isOpen={showSourceStagesModal}
        onClose={() => setShowSourceStagesModal(false)}
        onSave={(stages) => handleSaveStages(stages, true)}
        isSource={true}
        currentStages={formData.config?.sourceStages as Stage[] || []}
        funnels={funnels || []}
        isLoading={isLoadingFunnels}
      />

      {/* Modal para seleção de estágios de destino */}
      <StageSelectModal
        isOpen={showTargetStagesModal}
        onClose={() => setShowTargetStagesModal(false)}
        onSave={(stages) => handleSaveStages(stages, false)}
        isSource={false}
        currentStages={formData.config?.targetStages as Stage[] || []}
        funnels={funnels || []}
        isLoading={isLoadingFunnels}
      />
    </>
  );
};

export default EditSystemActionModal; 