import React, { useState } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabase';
import { Customer } from '../../types/database';
import { useAuthContext } from '../../contexts/AuthContext';

interface CustomerDeleteModalProps {
  customer: Customer;
  onClose: () => void;
  onSuccess: (silentRefresh?: boolean) => void;
}

export function CustomerDeleteModal({ customer, onClose, onSuccess }: CustomerDeleteModalProps) {
  const { t } = useTranslation(['customers', 'common']);
  const { currentOrganizationMember } = useAuthContext();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [hasChats, setHasChats] = useState(false);

  async function handleDelete() {
    if (!currentOrganizationMember) return;
    
    setDeleting(true);
    try {
      // Check if customer has any active chats
      const { count: chatsCount, error: chatsError } = await supabase
        .from('chats')
        .select('*', { count: 'exact', head: true })
        .eq('customer_id', customer.id);

      if (chatsError) throw chatsError;
      
      if (chatsCount && chatsCount > 0) {
        setHasChats(true);
        setError('Não é possível excluir o cliente pois existem atendimentos em andamento.');
        return;
      }

      // Primeiro, excluir os contatos do cliente
      const { error: contactsError } = await supabase
        .from('customer_contacts')
        .delete()
        .eq('customer_id', customer.id);

      if (contactsError) throw contactsError;

      // Depois, excluir o cliente
      const { error: deleteError } = await supabase
        .from('customers')
        .delete()
        .eq('id', customer.id)
        .eq('organization_id', currentOrganizationMember.organization.id);

      if (deleteError) throw deleteError;

      // Chamar onSuccess com parâmetro silentRefresh=true para atualização silenciosa
      onSuccess(true);
      onClose();
    } catch (error) {
      console.error('Error deleting customer:', error);
      setError(t('common:error'));
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