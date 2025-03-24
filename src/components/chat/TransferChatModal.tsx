import React, { useState, useEffect } from 'react';
import { X, Search, Loader2, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabase';
import { Customer, Chat } from '../../types/database';
import { useAuthContext } from '../../contexts/AuthContext';
import api from '../../lib/api';

interface TransferChatModalProps {
  chat: Chat;
  onClose: () => void;
  onTransfer: (newCustomerId: string) => void;
}

export function TransferChatModal({ chat, onClose, onTransfer }: TransferChatModalProps) {
  const { t } = useTranslation(['chats', 'common']);
  const { currentOrganizationMember } = useAuthContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [transferring, setTransferring] = useState(false);
  const [error, setError] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (searchTerm.length >= 2) {
      searchCustomers();
    } else {
      setCustomers([]);
    }
  }, [searchTerm]);

  const searchCustomers = async () => {
    if (!currentOrganizationMember) return;

    setLoading(true);
    setError('');

    try {
      const { data, error } = await supabase
        .from('customers')
        .select(`
          *,
          contacts:customer_contacts(
            id,
            type,
            value
          )
        `)
        .eq('organization_id', currentOrganizationMember.organization.id)
        .neq('id', chat.customer_id)
        .ilike('name', `%${searchTerm}%`)
        .limit(10);

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Error searching customers:', error);
      setError(t('common:error'));
    } finally {
      setLoading(false);
    }
  };

  const handleCustomerSelect = (customer: Customer) => {
    setSelectedCustomer(customer);
    setShowConfirm(true);
  };

  const handleTransfer = async () => {
    if (!selectedCustomer || !currentOrganizationMember) return;

    setTransferring(true);
    setError('');

    try {
      const response = await api.post(`/api/${currentOrganizationMember.organization.id}/chat/transfer`, {
        oldCustomerId: chat.customer_id,
        newCustomerId: selectedCustomer.id
      });

      if (!response.data.success) {
        throw new Error(response.data.error || 'Erro ao transferir chats');
      }

      onTransfer(selectedCustomer.id);
      onClose();
    } catch (error: any) {
      console.error('Error transferring chats:', error);
      setError(error.response?.data?.error || error.message || t('chats:transfer.error'));
    } finally {
      setTransferring(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg">
        <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">
            {t('chats:transfer.title')}
          </h2>
          <button
            onClick={onClose}
            disabled={transferring}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4">
          {!showConfirm ? (
            <>
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder={t('chats:transfer.searchPlaceholder')}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/50 text-red-600 dark:text-red-400 rounded-lg">
                  {error}
                </div>
              )}

              {loading ? (
                <div className="flex justify-center items-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                </div>
              ) : customers.length > 0 ? (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {customers.map((customer) => (
                    <button
                      key={customer.id}
                      onClick={() => handleCustomerSelect(customer)}
                      className="w-full text-left p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                      <div className="font-medium text-gray-900 dark:text-white">
                        {customer.name}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {customer.contacts?.map(c => c.value).join(', ')}
                      </div>
                    </button>
                  ))}
                </div>
              ) : searchTerm.length >= 2 ? (
                <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                  {t('chats:transfer.noResults')}
                </div>
              ) : null}
            </>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center space-x-3 p-4 bg-yellow-50 dark:bg-yellow-900/50 rounded-lg">
                <AlertCircle className="w-5 h-5 text-yellow-500" />
                <p className="text-yellow-700 dark:text-yellow-300">
                  {t('chats:transfer.confirm')}
                </p>
              </div>

              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/50 text-red-600 dark:text-red-400 rounded-lg">
                  {error}
                </div>
              )}
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowConfirm(false)}
                  disabled={transferring}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
                >
                  {t('common:cancel')}
                </button>
                <button
                  onClick={handleTransfer}
                  disabled={transferring}
                  className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 flex items-center space-x-2"
                >
                  {transferring && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>{t('common:confirm')}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 