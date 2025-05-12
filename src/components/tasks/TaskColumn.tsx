import { Pencil, Trash2, MoreVertical, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useDroppable } from '@dnd-kit/core';
import { TaskStage, TaskWithRelations } from '../../types/tasks';
import { TaskCard } from './TaskCard';
import { useState, useRef, useEffect } from 'react';

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
  // Usar o ID do estágio como identificador dropável
  const { setNodeRef, isOver } = useDroppable({
    id: stage.id,
    data: {
      type: 'column',
      stage: stage,
      isEmpty: tasks.length === 0
    }
  });
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Fechar o menu quando clicar fora dele
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  // Verificar se a coluna está vazia
  const isEmpty = tasks.length === 0;

  return (
    <div
      ref={setNodeRef}
      className={`flex-shrink-0 w-80 bg-gray-100 dark:bg-gray-800/50 rounded-lg flex flex-col h-full ${
        isOver ? 'bg-blue-50/50 dark:bg-blue-900/5' : ''
      }`}
      data-is-empty={isEmpty}
      data-id={stage.id}
      data-column-type="stage"
    >
      <div className="p-4 flex flex-col h-full overflow-hidden">
        <div className="flex justify-between items-start mb-4">
          <div className="flex flex-col">
            <div className="flex items-center">
              <div
                className="w-3 h-3 rounded-full mr-2"
                style={{ backgroundColor: stage.color }}
              />
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                {stage.name}
              </h3>
              <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                ({tasks.length})
              </span>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={onAddTask}
              className="p-2 rounded-full text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
              title={t('tasks:addTaskToStage', { stage: stage.name })}
            >
              <Plus className="w-4 h-4" />
            </button>
            <div className="relative" ref={menuRef}>
              <button 
                onClick={toggleMenu}
                className="p-2 rounded-full text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
              {isMenuOpen && (
                <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 z-10">
                  <button
                    onClick={() => {
                      onEdit();
                      setIsMenuOpen(false);
                    }}
                    className="w-full px-4 py-2 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
                  >
                    <Pencil className="w-4 h-4 mr-2" />
                    {t('tasks:stages.editStage')}
                  </button>
                  <button
                    onClick={() => {
                      onDelete();
                      setIsMenuOpen(false);
                    }}
                    className="w-full px-4 py-2 text-sm text-left text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    {t('tasks:stages.deleteStage')}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div 
          className={`space-y-3 overflow-y-auto flex-1 pr-1 custom-scrollbar`}
          data-column-content={stage.id}
        >
          {isEmpty ? (
            <div 
              className={`h-48 border-2 border-dashed transition-all ${
                isOver 
                  ? 'border-blue-300/70 dark:border-blue-600/70 bg-blue-50/50 dark:bg-blue-900/10'
                  : 'border-gray-200 dark:border-gray-700'
              } rounded-md flex items-center justify-center`}
              data-empty-placeholder="true"
              data-column-id={stage.id}
            >
              <span className={`text-sm ${
                isOver 
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-gray-400 dark:text-gray-500'
              }`}>
                {isOver 
                  ? t('tasks:dropHere') 
                  : t('tasks:noTasksInStage')}
              </span>
            </div>
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
            </>
          )}
        </div>
      </div>
    </div>
  );
} 