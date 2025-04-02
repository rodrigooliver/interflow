import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SystemActionType } from '../../constants/systemActions';
import { Edit2, Trash2, Calendar } from 'lucide-react';
import EditSystemActionModal from './EditSystemActionModal';
import { useSchedules } from '../../hooks/useQueryes';
import { useAuthContext } from '../../contexts/AuthContext';

interface SystemActionsListProps {
  actions: SystemActionType[];
  onRemoveAction: (index: number) => void;
  onEditAction: (index: number, updatedAction: SystemActionType) => void;
}

const SystemActionsList: React.FC<SystemActionsListProps> = ({ actions, onRemoveAction, onEditAction }) => {
  const { t } = useTranslation(['prompts', 'common']);
  const { currentOrganizationMember } = useAuthContext();
  const { data: schedules } = useSchedules(currentOrganizationMember?.organization.id);
  const [expandedActions, setExpandedActions] = useState<Record<number, boolean>>({});
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedActionIndex, setSelectedActionIndex] = useState<number | null>(null);

  // Inicializar todas as ações como minimizadas
  React.useEffect(() => {
    const initialState: Record<number, boolean> = {};
    actions.forEach((_, index) => {
      initialState[index] = false;
    });
    setExpandedActions(initialState);
  }, [actions.length]);

  // Função para alternar o estado de expansão de uma ação
  const toggleActionExpand = (index: number) => {
    setExpandedActions(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const handleEditClick = (index: number) => {
    setSelectedActionIndex(index);
    setIsEditModalOpen(true);
  };

  const handleEditSave = (updatedAction: SystemActionType) => {
    if (selectedActionIndex !== null) {
      onEditAction(selectedActionIndex, updatedAction);
    }
  };

  // Função para obter o nome da agenda
  const getScheduleName = (scheduleId: string) => {
    const schedule = schedules?.find(s => s.id === scheduleId);
    return schedule?.title || t('prompts:form.actions.config.schedule.noSchedule');
  };

  if (actions.length === 0) {
    return (
      <div className="text-sm text-gray-500 dark:text-gray-400 italic">
        {t('prompts:form.noSystemActions')}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {actions.map((action, index) => (
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
      ))}

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
    </div>
  );
};

export default SystemActionsList; 