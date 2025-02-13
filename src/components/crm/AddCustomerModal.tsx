import React, { useState, useEffect } from 'react';
import { Search, X, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Customer } from '../../types/database';
import { supabase } from '../../lib/supabase';

interface AddCustomerModalProps {
  onAdd: (customerId: string) => Promise<void>;
  onClose: () => void;
  customers: Customer[];
  stageName: string;
  loading: boolean;
  funnelId: string;
}

export function AddCustomerModal({ onAdd, onClose, customers, stageName, loading, funnelId }: AddCustomerModalProps) {
  const { t } = useTranslation(['crm', 'common']);
  const [searchTerm, setSearchTerm] = useState('');
  const [customersInFunnel, setCustomersInFunnel] = useState<string[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const [addedCustomers, setAddedCustomers] = useState<string[]>([]);
  const [loadingCustomerId, setLoadingCustomerId] = useState<string | null>(null);

  useEffect(() => {
    loadCustomersInFunnel();
  }, [funnelId]);

  async function loadCustomersInFunnel() {
    try {
      const { data: stages } = await supabase
        .from('crm_stages')
        .select('id')
        .eq('funnel_id', funnelId);

      if (stages && stages.length > 0) {
        const stageIds = stages.map(stage => stage.id);
        
        const { data: customerStages } = await supabase
          .from('crm_customer_stages')
          .select('customer_id')
          .in('stage_id', stageIds);

        if (customerStages) {
          setCustomersInFunnel(customerStages.map(cs => cs.customer_id));
        }
      }
    } catch (error) {
      console.error('Error loading customers in funnel:', error);
    } finally {
      setLoadingCustomers(false);
    }
  }

  const handleAddCustomer = async (customerId: string) => {
    try {
      setLoadingCustomerId(customerId);
      await onAdd(customerId);
      setAddedCustomers(prev => [...prev, customerId]);
    } catch (error) {
      console.error('Error adding customer:', error);
    } finally {
      setLoadingCustomerId(null);
    }
  };

  const filteredCustomers = customers.filter(customer => 
    !customersInFunnel.includes(customer.id) &&
    !addedCustomers.includes(customer.id) &&
    (customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (customer.email && customer.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (customer.phone && customer.phone.toLowerCase().includes(searchTerm.toLowerCase())))
  );

  if (loadingCustomers) {
    return (
      <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
          <div className="flex justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
        <div className="flex justify-between items-center p-6 border-b dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            {t('crm:customers.addToStage', { stage: stageName })}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <div className="relative mb-4">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t('crm:customers.searchPlaceholder')}
              className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-700 border-0 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
            />
            <Search className="absolute left-3 top-2.5 w-5 h-5 text-gray-400 dark:text-gray-500" />
          </div>

          <div className="max-h-96 overflow-y-auto">
            {filteredCustomers.length === 0 ? (
              <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                {t('common:noResults')}
              </div>
            ) : (
              filteredCustomers.map(customer => (
                <button
                  key={customer.id}
                  onClick={() => handleAddCustomer(customer.id)}
                  disabled={loadingCustomerId === customer.id}
                  className="w-full flex items-center p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg transition-colors"
                >
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                      {customer.name}
                    </h4>
                    {(customer.email || customer.phone) && (
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {customer.email || customer.phone}
                      </p>
                    )}
                  </div>
                  {loadingCustomerId === customer.id && (
                    <Loader2 className="w-5 h-5 text-gray-400 dark:text-gray-500 animate-spin" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}