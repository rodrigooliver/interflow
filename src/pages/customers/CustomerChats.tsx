import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuthContext } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Customer } from '../../types/database';
import { CustomerChatsList } from '../../components/chat/CustomerChatsList';

export default function CustomerChats() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation(['customers', 'chats', 'common']);
  const { currentOrganizationMember } = useAuthContext();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentOrganizationMember && id) {
      loadCustomer();
    }
  }, [currentOrganizationMember, id]);

  async function loadCustomer() {
    try {
      // Load customer details
      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .select('*')
        .eq('id', id)
        .single();

      if (customerError) throw customerError;
      setCustomer(customerData);
    } catch (error) {
      console.error('Error loading customer:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex justify-center items-center min-h-[200px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (!customer || !id) {
    return (
      <div className="p-6">
        <div className="text-center text-gray-500 dark:text-gray-400">
          {t('customers:notFound')}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <button
              onClick={() => navigate(-1)}
              className="mr-4 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {customer.name}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {customer.contacts?.find(c => c.type === 'email')?.value || 
                 customer.contacts?.find(c => c.type === 'whatsapp')?.value}
              </p>
            </div>
          </div>
        </div>

        <CustomerChatsList 
          customerId={id}
          organizationId={currentOrganizationMember?.organization.id || ''}
        />
      </div>
    </div>
  );
}