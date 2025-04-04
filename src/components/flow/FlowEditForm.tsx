import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthContext } from '../../contexts/AuthContext';

interface FlowEditFormProps {
  flowId: string | null;
  onSave: (flowData: { name: string; description: string; debounce_time: number }) => Promise<void>;
  onCancel: () => void;
  onClose?: () => void;
}

export default function FlowEditForm({ flowId, onSave, onCancel, onClose }: FlowEditFormProps) {
  const { t } = useTranslation(['common', 'flows']);
  const queryClient = useQueryClient();
  const { currentOrganizationMember } = useAuthContext();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    debounce_time: 1000
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingFlow, setIsLoadingFlow] = useState(false);

  // Carregar dados do fluxo ao abrir o modal
  useEffect(() => {
    if (flowId) {
      loadFlowData(flowId);
    }
  }, [flowId]);

  // Função para carregar dados atualizados do fluxo
  const loadFlowData = async (id: string) => {
    setIsLoadingFlow(true);
    try {
      const { data: flowData, error: flowError } = await supabase
        .from('flows')
        .select('*')
        .eq('id', id)
        .single();

      if (flowError) throw flowError;

      setFormData({
        name: flowData.name || '',
        description: flowData.description || '',
        debounce_time: flowData.debounce_time || 1000
      });
    } catch (error) {
      console.error('Erro ao carregar dados do fluxo:', error);
    } finally {
      setIsLoadingFlow(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'debounce_time' ? parseInt(value, 10) : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSave(formData);
      // Invalidar o cache dos flows após salvar
      if (currentOrganizationMember?.organization.id) {
        await queryClient.invalidateQueries({ 
          queryKey: ['flows', currentOrganizationMember.organization.id] 
        });
      }
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoadingFlow) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-700 dark:text-gray-300">{t('common:loading')}</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="border-b border-gray-200 dark:border-gray-700 -mx-6 px-6 pb-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            {t('flows:editFlow')}
          </h3>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 dark:text-gray-300 dark:hover:text-gray-200"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4 py-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('flows:flowName')}
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            className="block w-full px-4 py-2 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('flows:flowDescription')}
          </label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={3}
            className="block w-full px-4 py-2 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
        </div>

        <div>
          <label htmlFor="debounce_time" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('flows:debounce_time')} (ms)
          </label>
          <input
            type="number"
            id="debounce_time"
            name="debounce_time"
            value={formData.debounce_time}
            onChange={handleChange}
            min={0}
            step={100}
            className="block w-full px-4 py-2 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {t('flows:debounce_time_description')}
          </p>
        </div>

        <div className="flex justify-end items-center pt-4">
          <div className="flex space-x-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={isSaving}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
            >
              {t('common:back')}
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {t('common:save')}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
} 