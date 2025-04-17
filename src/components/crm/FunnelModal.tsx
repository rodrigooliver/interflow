import React, { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabase';
import { CRMFunnel } from '../../types/crm';
import { useQueryClient } from '@tanstack/react-query';

interface FunnelModalProps {
  onClose: () => void;
  funnel?: CRMFunnel | null;
  organizationId: string;
  onSuccess: (funnelId?: string) => Promise<void>;
}

// Interface estendida para incluir a propriedade 'default'
interface FunnelWithDefault extends CRMFunnel {
  default?: boolean;
}

export function FunnelModal({ onClose, funnel, organizationId, onSuccess }: FunnelModalProps) {
  const { t } = useTranslation(['crm', 'common']);
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: funnel?.name || '',
    description: funnel?.description || '',
    is_default: (funnel as FunnelWithDefault)?.default || false
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const isEditing = !!funnel;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organizationId) return;
    
    setLoading(true);
    setError('');

    try {
      // Se for definido como padrão, primeiro remover o padrão de outros funis
      if (formData.is_default) {
        const { error: resetError } = await supabase
          .from('crm_funnels')
          .update({ default: false })
          .eq('organization_id', organizationId)
          .eq('default', true);
        
        if (resetError) throw resetError;
      }

      let newFunnelId: string | undefined;

      if (isEditing && funnel) {
        // Atualizar funil existente
        const { error } = await supabase
          .from('crm_funnels')
          .update({
            name: formData.name,
            description: formData.description,
            default: formData.is_default
          })
          .eq('id', funnel.id)
          .eq('organization_id', organizationId);

        if (error) throw error;
        
        // Usar o ID do funil que está sendo editado
        newFunnelId = funnel.id;
      } else {
        // Criar novo funil
        const { data, error } = await supabase
          .from('crm_funnels')
          .insert([
            {
              organization_id: organizationId,
              name: formData.name,
              description: formData.description,
              is_active: true,
              default: formData.is_default
            }
          ])
          .select()
          .single();

        if (error) throw error;
        
        // Armazenar o ID do novo funil criado
        newFunnelId = data.id;

        // Criar estágios padrão para novos funis
        if (!isEditing) {
          const defaultStages = [
            { name: t('crm:stages.new'), color: '#3B82F6', position: 0 },
            { name: t('crm:stages.inProgress'), color: '#F59E0B', position: 1 },
            { name: t('crm:stages.completed'), color: '#10B981', position: 2 }
          ];

          await supabase
            .from('crm_stages')
            .insert(
              defaultStages.map(stage => ({
                funnel_id: data.id,
                ...stage
              }))
            );
        }
      }

      // Invalidar cache do React Query para funnels
      await queryClient.invalidateQueries({ queryKey: ['funnels', organizationId] });
      
      // Também invalidar cache para useFilters que inclui funnels
      await queryClient.invalidateQueries({ queryKey: ['filters', organizationId] });

      // Chamar callback de sucesso para recarregar dados e passar o ID do funil
      await onSuccess(newFunnelId);
      onClose();
    } catch (err) {
      console.error('Erro ao salvar funil:', err);
      setError(t('common:error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
        <div className="flex justify-between items-center p-6 border-b dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            {isEditing ? t('crm:funnels.editFunnel') : t('crm:funnels.newFunnel')}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <div className="mb-4 bg-red-50 dark:bg-red-900/50 text-red-700 dark:text-red-400 p-3 rounded-md">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('crm:funnels.name')}
              </label>
              <input
                type="text"
                id="name"
                required
                className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 py-2 px-3"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('crm:funnels.description')}
              </label>
              <textarea
                id="description"
                rows={3}
                className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 py-2 px-3"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="is_default"
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                checked={formData.is_default}
                onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
              />
              <label htmlFor="is_default" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                {t('crm:funnels.makeDefault')}
              </label>
            </div>
            {formData.is_default && (
              <p className="text-xs text-gray-500 dark:text-gray-400 pl-6">
                {t('crm:funnels.defaultDescription')}
              </p>
            )}
          </div>

          <div className="mt-6 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              {t('common:back')}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t('common:saving')}
                </>
              ) : (
                isEditing ? t('common:save') : t('crm:funnels.newFunnel')
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 