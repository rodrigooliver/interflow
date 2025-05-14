import { Pencil, Plus, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useDroppable } from '@dnd-kit/core';
import { TaskWithRelations, TaskStage } from '../../types/tasks';
import { TaskCard } from './TaskCard';

interface TaskColumnProps {
  stage: TaskStage;
  tasks: TaskWithRelations[];
  onEdit: () => void;
  onDelete: () => void;
  onAddTask: () => void;
  onEditTask: (task: TaskWithRelations) => void;
  onRemoveTask: (task: TaskWithRelations) => void;
  onToggleArchived: (task: TaskWithRelations) => void;
  onUpdateTaskStatus?: (taskId: string, status: 'pending' | 'in_progress' | 'completed' | 'cancelled') => void;
}

export function TaskColumn({
  stage,
  tasks,
  onEdit,
  onDelete,
  onAddTask,
  onEditTask,
  onRemoveTask,
  onToggleArchived,
  onUpdateTaskStatus
}: TaskColumnProps) {
  const { t } = useTranslation(['tasks', 'common']);
  const { setNodeRef, isOver } = useDroppable({
    id: stage.id,
    data: {
      type: 'column',
      stageId: stage.id
    }
  });

  const isEmpty = tasks.length === 0;

  return (
    <div
      ref={setNodeRef}
      className={`flex-shrink-0 w-[280px] sm:w-80 bg-gray-100 dark:bg-gray-800/50 rounded-lg flex flex-col h-full ${
        isOver ? 'bg-blue-50/50 dark:bg-blue-900/5' : ''
      }`}
      data-is-empty={isEmpty}
      data-id={stage.id}
      data-column-type="stage"
    >
      <div className="p-2 sm:p-4 flex flex-col h-full overflow-hidden">
        <div className="flex justify-between items-start mb-2 sm:mb-4">
          <div className="flex flex-col">
            <div className="flex items-center">
              <div
                className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full mr-1.5 sm:mr-2"
                style={{ backgroundColor: stage.color }}
              />
              <h3 className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white">
                {stage.name}
              </h3>
              <span className="ml-1.5 sm:ml-2 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                ({tasks.length})
              </span>
            </div>
          </div>

          {/* Botões de ação */}
          <div className="flex space-x-1 ml-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAddTask();
              }}
              className="p-1 text-blue-600 hover:text-blue-700 dark:text-blue-500 dark:hover:text-blue-400"
              title={t('tasks:addTask')}
            >
              <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              title={t('tasks:editStage')}
            >
              <Pencil className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              title={t('tasks:deleteStage')}
            >
              <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          </div>
        </div>

        <div 
          className={`space-y-2 sm:space-y-3 overflow-y-auto flex-1 pr-1 custom-scrollbar`}
          data-column-content={stage.id}
        >
          {isEmpty ? (
            <>
              <div 
                className={`h-36 sm:h-48 border-2 border-dashed transition-all ${
                  isOver 
                    ? 'border-blue-300/70 dark:border-blue-600/70 bg-blue-50/50 dark:bg-blue-900/10'
                    : 'border-gray-200 dark:border-gray-700'
                } rounded-md flex items-center justify-center mb-3`}
                data-empty-placeholder="true"
                data-column-id={stage.id}
              >
                <span className={`text-xs sm:text-sm ${
                  isOver 
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-gray-400 dark:text-gray-500'
                }`}>
                  {isOver 
                    ? t('tasks:dropHere') 
                    : t('tasks:noTasksInStage')}
                </span>
              </div>
              
              {/* Botão adicionar tarefa para coluna vazia */}
              <button
                onClick={onAddTask}
                className="w-full py-2 px-3 border-2 border-dashed flex items-center justify-center gap-1.5 text-xs rounded-md 
                  border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 
                  hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:text-blue-600 dark:hover:text-blue-400
                  transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{t('tasks:addTask')}</span>
              </button>
            </>
          ) : (
            <>
              {tasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onEdit={() => onEditTask(task)}
                  onRemove={() => onRemoveTask(task)}
                  onToggleArchived={() => onToggleArchived(task)}
                  onUpdateStatus={onUpdateTaskStatus}
                />
              ))}
              
              {/* Botão adicionar tarefa no final da coluna */}
              <button
                onClick={onAddTask}
                className="w-full py-2 px-3 border-2 border-dashed flex items-center justify-center gap-1.5 text-xs rounded-md 
                  border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 
                  hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:text-blue-600 dark:hover:text-blue-400
                  transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{t('tasks:addTask')}</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
} 