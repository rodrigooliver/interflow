import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import { TaskLabel } from '../../types/tasks';
import { useTaskLabels, useCreateTaskLabel } from '../../hooks/useTasks';

interface LabelModalProps {
  onClose: () => void;
  organizationId: string;
}

export function LabelModal({ onClose, organizationId }: LabelModalProps) {
  const { t } = useTranslation('tasks');
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingLabelId, setEditingLabelId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    color: '#3B82F6'
  });
  
  const { data: labels = [], isLoading } = useTaskLabels(organizationId);
  const createLabel = useCreateTaskLabel();

  // Carregar dados da etiqueta para edição
  useEffect(() => {
    if (editingLabelId) {
      const label = labels.find(l => l.id === editingLabelId);
      if (label) {
        setFormData({
          name: label.name,
          color: label.color
        });
      }
    }
  }, [editingLabelId, labels]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      if (editingLabelId) {
        // Atualizar etiqueta existente
        const { error } = await supabase
          .from('task_labels')
          .update({
            name: formData.name,
            color: formData.color,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingLabelId);

        if (error) throw error;
        toast.success(t('labels.updated'));
      } else {
        // Criar nova etiqueta
        createLabel.mutate({
          name: formData.name,
          color: formData.color,
          organizationId
        });
      }
      
      // Limpar formulário
      setFormData({
        name: '',
        color: '#3B82F6'
      });
      setEditingLabelId(null);
      
      // Atualizar lista de etiquetas
      queryClient.invalidateQueries({ queryKey: ['task-labels', organizationId] });
    } catch (error) {
      console.error('Error submitting label:', error);
      toast.error(editingLabelId ? t('labels.updateError') : t('labels.createError'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (labelId: string) => {
    try {
      // Verificar se a etiqueta está sendo usada
      const { count, error: countError } = await supabase
        .from('task_task_labels')
        .select('*', { count: 'exact', head: true })
        .eq('label_id', labelId);
        
      if (countError) throw countError;
      
      // Se a etiqueta está sendo usada, pedir confirmação
      if (count && count > 0) {
        const confirm = window.confirm(
          t('labels.confirmDeleteInUse', { count })
        );
        if (!confirm) return;
      }
      
      // Excluir etiqueta
      const { error } = await supabase
        .from('task_labels')
        .delete()
        .eq('id', labelId);
        
      if (error) throw error;
      
      toast.success(t('labels.deleted'));
      
      // Limpar edição se estiver editando a etiqueta excluída
      if (editingLabelId === labelId) {
        setEditingLabelId(null);
        setFormData({
          name: '',
          color: '#3B82F6'
        });
      }
      
      // Atualizar lista de etiquetas
      queryClient.invalidateQueries({ queryKey: ['task-labels', organizationId] });
    } catch (error) {
      console.error('Error deleting label:', error);
      toast.error(t('labels.deleteError'));
    }
  };

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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {t('labels.manageLabels')}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('labels.name')}
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
              {t('labels.color')}
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
            </div>
            <input
              type="color"
              name="color"
              value={formData.color}
              onChange={handleChange}
              className="w-full h-10 p-1 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700"
            />
          </div>

          <div className="flex justify-end space-x-3">
            {editingLabelId && (
              <button
                type="button"
                onClick={() => {
                  setEditingLabelId(null);
                  setFormData({
                    name: '',
                    color: '#3B82F6'
                  });
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600"
                disabled={isSubmitting}
              >
                {t('form.cancel')}
              </button>
            )}
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <div className="flex items-center">
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t('form.saving')}
                </div>
              ) : (
                editingLabelId ? t('form.update') : t('form.create')
              )}
            </button>
          </div>
        </form>

        <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
          <h3 className="text-md font-medium text-gray-900 dark:text-white mb-4">
            {t('labels.existingLabels')}
          </h3>
          
          {isLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
            </div>
          ) : labels.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 italic text-center py-4">
              {t('labels.noLabels')}
            </p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
              {labels.map(label => (
                <div 
                  key={label.id}
                  className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded-md"
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: label.color }}
                    />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {label.name}
                    </span>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      type="button"
                      onClick={() => setEditingLabelId(label.id)}
                      className="p-1 text-gray-400 hover:text-blue-500 dark:hover:text-blue-400"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(label.id)}
                      className="p-1 text-gray-400 hover:text-red-500 dark:hover:text-red-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 