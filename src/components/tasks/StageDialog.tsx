import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, AlertTriangle } from 'lucide-react';
import { useCreateTaskStage, useUpdateTaskStage, useCurrentUserProjectAccess } from '../../hooks/useTasks';
import { TaskStage } from '../../types/tasks';

interface StageDialogProps {
  onClose: () => void;
  organizationId: string;
  stage?: TaskStage;
  positionCount: number;
  projectId?: string;
}

export function StageDialog({ onClose, organizationId, stage, positionCount, projectId }: StageDialogProps) {
  const { t } = useTranslation('tasks');
  const isEdit = !!stage;
  
  // Cores predefinidas movidas para o topo da função para reutilização
  const presetColors = [
    '#3B82F6', // blue
    '#22C55E', // green
    '#EF4444', // red
    '#F59E0B', // amber
    '#8B5CF6', // purple
    '#EC4899', // pink
    '#06B6D4', // cyan
    '#64748B', // slate
  ];
  
  // Função para selecionar uma cor aleatória da lista de cores predefinidas
  const getRandomColor = () => {
    const randomIndex = Math.floor(Math.random() * presetColors.length);
    return presetColors[randomIndex];
  };
  
  const [formData, setFormData] = useState({
    name: stage?.name || '',
    // Se não for edição, usar cor aleatória
    color: stage?.color || (isEdit ? '#3B82F6' : getRandomColor()),
    position: stage?.position !== undefined ? stage.position : positionCount
  });

  const createStage = useCreateTaskStage();
  const updateStage = useUpdateTaskStage();
  
  // Verificar permissão do usuário para o projeto atual
  const { data: accessData, isLoading: isLoadingAccess } = useCurrentUserProjectAccess(projectId);
  const canModify = !projectId || !accessData || isLoadingAccess || accessData.role === 'admin' || accessData.role === 'editor';

  // Se não tem permissão, redirecionar após o carregamento
  useEffect(() => {
    if (!isLoadingAccess && projectId && accessData && !canModify) {
      onClose();
    }
  }, [isLoadingAccess, accessData, canModify, projectId, onClose]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Verificar permissão novamente antes de submeter
    if (!canModify) return;
    
    if (isEdit && stage) {
      updateStage.mutate({
        id: stage.id,
        name: formData.name,
        color: formData.color,
        position: formData.position,
        project_id: projectId
      }, {
        onSuccess: () => onClose()
      });
    } else {
      createStage.mutate({
        name: formData.name,
        color: formData.color,
        position: formData.position,
        organizationId,
        project_id: projectId
      }, {
        onSuccess: () => onClose()
      });
    }
  };

  // Se estiver carregando ou não tiver permissão, mostrar mensagem apropriada
  if (isLoadingAccess) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md p-6">
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-300">Verificando permissões...</p>
          </div>
        </div>
      </div>
    );
  }
  
  if (projectId && accessData && !canModify) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md p-6">
          <div className="flex items-center justify-center mb-4 text-red-600 dark:text-red-400">
            <AlertTriangle size={24} className="mr-2" />
            <h2 className="text-xl font-semibold">{t('projects.accessDenied')}</h2>
          </div>
          
          <p className="text-gray-600 dark:text-gray-300 mb-6 text-center">
            {t('stages.needEditorRole')}
          </p>
          
          <div className="flex justify-center">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              {t('form.close')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {isEdit ? t('stages.editStage') : t('stages.addStage')}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('stages.name')}
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('stages.color')}
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {presetColors.map(color => (
                <button
                  key={color}
                  type="button"
                  className={`w-8 h-8 rounded-full border-2 ${
                    formData.color === color ? 'border-black dark:border-white' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: color }}
                  onClick={() => setFormData(prev => ({ ...prev, color }))}
                />
              ))}
              
              {/* Botão de cor aleatória */}
              <button
                type="button"
                className="w-8 h-8 rounded-full border-2 border-gray-300 dark:border-gray-600 flex items-center justify-center text-xs bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600"
                onClick={() => setFormData(prev => ({ ...prev, color: getRandomColor() }))}
                title={t('stages.randomColor')}
              >
                🎲
              </button>
            </div>
            <input
              type="color"
              name="color"
              value={formData.color}
              onChange={handleChange}
              className="w-full h-10 p-1 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('stages.position')}
            </label>
            <input
              type="number"
              name="position"
              value={formData.position}
              onChange={handleChange}
              min="0"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              {t('form.cancel')}
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
              disabled={createStage.isPending || updateStage.isPending}
            >
              {createStage.isPending || updateStage.isPending
                ? t('form.saving')
                : isEdit 
                  ? t('form.update')
                  : t('form.create')
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 