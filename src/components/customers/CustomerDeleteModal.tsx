import React, { useState } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Customer } from '../../types/database';
import { useAuthContext } from '../../contexts/AuthContext';
import api from '../../lib/api';
import { useQueryClient } from '@tanstack/react-query';

interface CustomerDeleteModalProps {
  customer: Customer;
  onClose: () => void;
  onSuccess: (silentRefresh?: boolean) => void;
}

export function CustomerDeleteModal({ customer, onClose, onSuccess }: CustomerDeleteModalProps) {
  const { t } = useTranslation(['customers', 'common']);
  const { profile } = useAuthContext();
  const queryClient = useQueryClient();
  const { currentOrganizationMember } = useAuthContext();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [hasChats, setHasChats] = useState(false);

  async function handleDelete() {
    if (!currentOrganizationMember) return;
    
    setDeleting(true);
    setError('');
    setHasChats(false);
    
    try {
      // Chamar a API do backend para excluir o cliente
      const response = await api.delete(`/api/${currentOrganizationMember.organization.id}/customers/${customer.id}`);

      if (!response.data.success) {
        if (response.data.hasChats) {
          setHasChats(true);
          setError('Não é possível excluir o cliente pois existem atendimentos em andamento.');
        } else {
          setError(response.data.error || t('common:error'));
        }
        return;
      }

        //Invalidar cache organization após 5 segundos
        // setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['organization', profile?.id] });
        // }, 5000);

      // Chamar onSuccess com parâmetro silentRefresh=true para atualização silenciosa
      // onSuccess(true);
      onClose();
    } catch (error: unknown) {
      console.error('Error deleting customer:', error);
      
      // Tratar erros específicos da API
      if (error && typeof error === 'object' && 'response' in error) {
        const apiError = error as { response?: { data?: { error?: string; hasChats?: boolean } } };
        if (apiError.response?.data?.hasChats) {
          setHasChats(true);
          setError('Não é possível excluir o cliente pois existem atendimentos em andamento.');
        } else {
          setError(apiError.response?.data?.error || t('common:error'));
        }
      } else {
        setError(t('common:error'));
      }
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
        <div className="p-6">
          <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 dark:bg-red-900/50 rounded-full mb-4">
            <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white text-center mb-2">
            {t('customers:delete.title')}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-2">
            {t('customers:delete.confirmation', { name: customer.name })}
          </p>
          {hasChats && (
            <p className="text-sm text-red-600 dark:text-red-400 text-center mb-2">
              Este cliente possui atendimentos em andamento. Finalize todos os atendimentos antes de excluir o cliente.
            </p>
          )}
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-6">
            {t('customers:delete.warning')}
          </p>

          {error && (
            <div className="mb-4 bg-red-50 dark:bg-red-900/50 text-red-700 dark:text-red-400 p-3 rounded-md">
              {error}
            </div>
          )}

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={deleting}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              {t('common:back')}
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting || hasChats}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {deleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t('common:deleting')}
                </>
              ) : (
                t('common:confirmDelete')
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}