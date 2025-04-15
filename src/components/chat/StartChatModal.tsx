import React, { useState, useEffect, useRef } from 'react';
import { X, Loader2, Search, Plus, ArrowRight, Edit2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabase';
import { useAuthContext } from '../../contexts/AuthContext';
import { ContactType } from '../../types/database';
import { getChannelIcon } from '../../utils/channel';

interface StartChatModalProps {
  onClose: () => void;
  onAddCustomer: () => void;
  onSelectContact: (contact: {type: ContactType, value: string}, customer: Customer | null) => void;
  onEditCustomer?: (customer: Customer) => void;
}

interface Customer {
  id: string;
  name: string;
  contacts: {
    type: ContactType;
    value: string;
  }[];
}

// Interface para o retorno da função RPC search_customers
interface SearchCustomersResult {
  id: string;
  name: string;
  organization_id: string;
  stage_id: string | null;
  created_at: string;
  contacts: {
    id: string;
    customer_id: string;
    type: ContactType;
    value: string;
    created_at: string;
    updated_at: string;
  }[];
  tags: {
    id: string;
    name: string;
    color: string;
  }[];
  field_values: Record<string, string>;
  crm_stages: {
    id: string;
    name: string;
    color: string;
    position: number;
    funnel_id: string;
    created_at: string;
    crm_funnels: {
      id: string;
      name: string;
      description: string;
      created_at: string;
    } | null;
  } | null;
  total_count: number;
}

export function StartChatModal({ onClose, onAddCustomer, onSelectContact, onEditCustomer }: StartChatModalProps) {
  const { t } = useTranslation(['channels', 'common', 'customers']);
  const { currentOrganizationMember } = useAuthContext();
  
  // Estados para pesquisa de clientes
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Customer[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedContact, setSelectedContact] = useState<{type: ContactType, value: string} | null>(null);
  
  // Refs para elementos DOM
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // Estados de UI
  const [error, setError] = useState('');

  // Focar no input de pesquisa quando o modal abrir
  useEffect(() => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, []);

  // Pesquisar clientes
  const searchCustomers = async (query: string) => {
    if (!query.trim() || query.length < 3) {
      setSearchResults([]);
      return;
    }
    /**
     * const { data, error } = await supabase
  .from('customers')
  .select(`
    id, 
    name,
    contacts:customer_contacts!inner(type, value)
  `)
  .eq('organization_id', 'eec1bc30-559e-43ba-a95a-5520a6b3109f') // Substitua pelo ID da organização real
  .or(`name.ilike.%rodrigo%,customer_contacts.value.ilike.%rodrigo%`)
  .limit(20);

if (error) {
  console.error('Erro ao realizar a consulta:', error);
} else {
  console.log('Dados encontrados:', data);
}
     */

    setSearching(true);
    try {
      // Usar a função RPC search_customers para buscar clientes e seus contatos
      const { data, error } = await supabase
        .rpc('search_customers', {
          p_organization_id: currentOrganizationMember?.organization.id,
          p_search_query: query,
          p_limit: 20,
          p_offset: 0,
          p_funnel_id: null,
          p_stage_id: null,
          p_tag_ids: null,
          p_sort_column: 'name',
          p_sort_direction: 'asc',
          p_cache_buster: new Date().toISOString()
        });

      if (error) throw error;

      // Converter os dados para o formato esperado pela interface Customer
      const customersWithContacts: Customer[] = (data || []).map((customer: SearchCustomersResult) => ({
        id: customer.id,
        name: customer.name,
        contacts: customer.contacts || []
      }));

      setSearchResults(customersWithContacts);
    } catch (error) {
      console.error('Erro ao pesquisar clientes:', error);
      setError(t('common:error'));
    } finally {
      setSearching(false);
    }
  };

  // Efeito para realizar a pesquisa quando o usuário digitar
  useEffect(() => {
    const delaySearch = setTimeout(() => {
      searchCustomers(searchQuery);
    }, 800);

    return () => clearTimeout(delaySearch);
  }, [searchQuery]);

  // Selecionar um cliente da pesquisa
  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setSelectedContact(null);
  };

  // Selecionar um contato do cliente
  const handleSelectContact = (contact: {type: ContactType, value: string}) => {
    setSelectedContact(contact);
    onSelectContact(contact, selectedCustomer);
  };

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
        <div className="flex justify-between items-center p-6 border-b dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            {t('customers:searchCustomer')}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {error ? (
            <div className="mb-4 text-red-600 dark:text-red-400">{error}</div>
          ) : null}

          <div className="mb-6">
            {selectedCustomer ? (
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                    {t('customers:selectedCustomer')}
                  </h4>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setSelectedCustomer(null)}
                      className="text-sm px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-600 rounded"
                    >
                      {t('common:back')}
                    </button>
                  </div>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div className="flex items-center">
                    <p className="font-medium text-gray-900 dark:text-white flex-1">{selectedCustomer.name}</p>
                    {onEditCustomer && (
                      <button
                        onClick={() => onEditCustomer(selectedCustomer!)}
                        className="ml-2 p-1 text-blue-600 hover:bg-blue-100 dark:text-blue-400 dark:hover:bg-blue-900/30 rounded"
                        title={t('common:edit')}
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  
                  {selectedCustomer.contacts.length > 0 && (
                    <div className="mt-3 space-y-2">
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {t('customers:selectContactToStartChat')}:
                      </p>
                      
                      <div className="space-y-1 mt-2">
                        {selectedCustomer.contacts.map((contact, index) => (
                          <button
                            key={index}
                            onClick={() => handleSelectContact(contact)}
                            className="flex items-center w-full text-sm hover:bg-gray-100 dark:hover:bg-gray-700 p-2 rounded transition-colors"
                          >
                            <img 
                              src={getChannelIcon(contact.type)}
                              alt={`${contact.type} icon`}
                              className="w-5 h-5 mr-2 flex-shrink-0"
                            />
                            <span className="font-medium text-gray-700 dark:text-gray-300 flex-1 text-left truncate">
                              {contact.value}
                            </span>
                            <ArrowRight className="w-4 h-4 text-gray-400 ml-2 flex-shrink-0" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <>
                <div className="relative mb-4">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    ref={searchInputRef}
                    type="text"
                    className="block w-full pl-10 pr-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    placeholder={t('customers:searchByNameOrContact')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    autoFocus
                  />
                </div>
                
                {searching ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                  </div>
                ) : searchResults.length > 0 ? (
                  <div className="mt-2 max-h-60 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-md">
                    {searchResults.map((customer) => (
                      <button
                        key={customer.id}
                        onClick={() => handleSelectCustomer(customer)}
                        className="w-full text-left p-3 hover:bg-gray-100 dark:hover:bg-gray-700 border-b border-gray-200 dark:border-gray-700 last:border-b-0"
                      >
                        <p className="font-medium text-gray-900 dark:text-white">{customer.name}</p>
                        {customer.contacts.length > 0 && (
                          <div className="mt-1 text-sm text-gray-500 dark:text-gray-400 flex flex-wrap gap-2">
                            {customer.contacts.slice(0, 2).map((contact, index) => (
                              <div key={index} className="flex items-center">
                                <img 
                                  src={getChannelIcon(contact.type)}
                                  alt={`${contact.type} icon`}
                                  className="w-4 h-4 mr-1 flex-shrink-0"
                                />
                                <span className="truncate max-w-[150px]">{contact.value}</span>
                              </div>
                            ))}
                            {customer.contacts.length > 2 && (
                              <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                +{customer.contacts.length - 2} {t('common:more')}
                              </div>
                            )}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                ) : searchQuery.length >= 3 ? (
                  <div className="text-center py-6 border border-gray-200 dark:border-gray-700 rounded-md">
                    <p className="text-gray-500 dark:text-gray-400 mb-3">
                      {t('customers:noCustomersFound')}
                    </p>
                    <button
                      onClick={onAddCustomer}
                      className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      {t('customers:addNewCustomer')}
                    </button>
                  </div>
                ) : searchQuery.length > 0 ? (
                  <div className="text-center text-gray-500 dark:text-gray-400 py-4 border border-gray-200 dark:border-gray-700 rounded-md">
                    {t('common:continueTyping')}
                  </div>
                ) : (
                  <div className="text-center py-6 border border-gray-200 dark:border-gray-700 rounded-md">
                    <p className="text-gray-500 dark:text-gray-400 mb-3">
                      {t('customers:searchToFindCustomers')}
                    </p>
                    <button
                      onClick={onAddCustomer}
                      className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      {t('customers:addNewCustomer')}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 