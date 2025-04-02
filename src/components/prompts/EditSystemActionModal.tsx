import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SystemActionType } from '../../constants/systemActions';
import { useSchedules } from '../../hooks/useQueryes';
import { useAuthContext } from '../../contexts/AuthContext';

interface EditSystemActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (action: SystemActionType) => void;
  action: SystemActionType;
}

const EditSystemActionModal: React.FC<EditSystemActionModalProps> = ({
  isOpen,
  onClose,
  onSave,
  action,
}) => {
  const { t } = useTranslation(['prompts', 'common']);
  const { currentOrganizationMember } = useAuthContext();
  const [formData, setFormData] = useState<SystemActionType>(action);
  const { data: schedules, isLoading: isLoadingSchedules } = useSchedules(currentOrganizationMember?.organization.id);

  React.useEffect(() => {
    if (action) {
      console.log('Action recebida:', action);
      setFormData({
        ...action,
        config: {
          ...action.config,
          schedule: action.config?.schedule || ''
        }
      });
    }
  }, [action]);

  if (!isOpen || !formData) return null;

  const handleScheduleChange = (scheduleId: string) => {
    console.log('Nova agenda selecionada:', scheduleId);
    console.log('FormData antes da atualização:', formData);
    const updatedFormData = {
      ...formData,
      config: {
        ...formData.config,
        schedule: scheduleId
      }
    };
    console.log('FormData após atualização:', updatedFormData);
    setFormData(updatedFormData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {t('prompts:form.editSystemAction')}
        </h2>
        
        <div className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('prompts:form.actionName')}
            </label>
            <input
              type="text"
              id="title"
              value={formData.title}
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

          <div className="flex justify-end space-x-3 mt-6">
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
                console.log('Dados sendo salvos:', formData);
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
    </div>
  );
};

export default EditSystemActionModal; 