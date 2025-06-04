import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react';
import { TaskModal } from '../components/tasks/TaskModal';
import { useAuthContext } from '../contexts/AuthContext';

export default function TaskDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation('tasks');
  const { currentOrganizationMember } = useAuthContext();
  const organizationId = currentOrganizationMember?.organization.id;

  const handleClose = () => {
    navigate('/app/tasks');
  };

  if (!id || !organizationId) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            {t('error.taskNotFound', 'Tarefa não encontrada')}
          </h2>
          <button
            onClick={handleClose}
            className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          >
            {t('form.backToTasks', 'Voltar para Tarefas')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
      {/* Header com botão de voltar */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <button
            onClick={handleClose}
            className="flex items-center text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            <span className="hidden sm:inline">{t('form.backToTasks', 'Voltar para Tarefas')}</span>
          </button>
          <div className="h-6 w-px bg-gray-300 dark:bg-gray-600"></div>
          <h1 className="text-lg font-medium text-gray-900 dark:text-white">
            {t('taskDetails', 'Detalhes da Tarefa')}
          </h1>
        </div>
      </div>

      {/* Conteúdo da tarefa */}
      <div className="flex-1 overflow-y-auto pb-16 md:pb-0">
        <div className="p-2 md:p-4 max-w-6xl mx-auto">
          <TaskModal
            onClose={handleClose}
            organizationId={organizationId}
            taskId={id}
            mode="edit"
            isModal={false}
          />
        </div>
      </div>
    </div>
  );
} 