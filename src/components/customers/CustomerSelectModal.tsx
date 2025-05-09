import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, X, Plus, User } from 'lucide-react';
import { debounce } from 'lodash';
import { supabase } from '../../lib/supabase';
import { useAuthContext } from '../../contexts/AuthContext';

// Definindo um tipo estendido do Customer com os campos que estamos utilizando
interface CustomerWithDetails {
  id: string;
  name: string;
  avatar_url?: string;
  organization_id: string;
  created_at: string;
  updated_at: string;
  customer_contacts: CustomerContact[];
  [key: string]: unknown; // Para outros campos que possam existir
}

interface CustomerContact {
  type: string;
  value: string;
  id?: string;
}

interface CustomerSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCustomer: (customer: CustomerWithDetails) => void;
  onCreateCustomer?: () => void;
  initialSearchTerm?: string;
}

const CustomerSelectModal: React.FC<CustomerSelectModalProps> = ({
  isOpen,
  onClose,
  onSelectCustomer,
  onCreateCustomer,
  initialSearchTerm = ''
}) => {
  const { t } = useTranslation(['common', 'medical', 'customers']);
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm);
  const [customers, setCustomers] = useState<CustomerWithDetails[]>([]);
  const [loading, setLoading] = useState(false);
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const observer = useRef<IntersectionObserver | null>(null);
  const { currentOrganizationMember } = useAuthContext();
  const organizationId = currentOrganizationMember?.organization_id;
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  const ITEMS_PER_PAGE = 10;

  // Ref para o último item da lista para implementar rolagem infinita
  const lastCustomerElementRef = useCallback((node: HTMLDivElement | null) => {
    if (loading) return;
    if (observer.current) observer.current.disconnect();
    
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        setPage(prevPage => prevPage + 1);
      }
    });
    
    if (node) observer.current.observe(node);
  }, [loading, hasMore]);

  // Função para buscar clientes com debounce
  const fetchCustomers = useCallback(async (term: string, pageNumber: number, replace: boolean = false) => {
    if (!organizationId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      let query = supabase
        .from('customers')
        .select('*, customer_contacts(type, value)')
        .eq('organization_id', organizationId)
        .order('name', { ascending: true })
        .range(pageNumber * ITEMS_PER_PAGE, (pageNumber * ITEMS_PER_PAGE) + ITEMS_PER_PAGE - 1);
      
      // Adicionar filtro de pesquisa se existir termo
      if (term) {
        query = query.ilike('name', `%${term}%`);
      }
      
      const { data, error: apiError } = await query;
      
      if (apiError) throw apiError;
      
      if (data) {
        // Processar os dados para adicionar informações de contato facilmente acessíveis
        const processedData = data.map(customer => {
          const contacts = customer.customer_contacts || [];
          const emailContact = contacts.find((c: CustomerContact) => c.type === 'EMAIL');
          const phoneContact = contacts.find((c: CustomerContact) => c.type === 'PHONE' || c.type === 'WHATSAPP');
          
          return {
            ...customer,
            email: emailContact?.value,
            phone: phoneContact?.value
          };
        });
        
        if (replace) {
          setCustomers(processedData);
        } else {
          setCustomers(prev => [...prev, ...processedData]);
        }
        setHasMore(data.length === ITEMS_PER_PAGE);
      }
      
      setIsFirstLoad(false);
    } catch (err) {
      console.error('Erro ao buscar clientes:', err);
      setError(t('common:errorFetchingData'));
      setIsFirstLoad(false);
    } finally {
      setLoading(false);
    }
  }, [organizationId, t]);
  
  // Atualizar searchTerm quando initialSearchTerm mudar
  useEffect(() => {
    if (initialSearchTerm !== undefined) {
      setSearchTerm(initialSearchTerm);
    }
  }, [initialSearchTerm]);

  // Iniciar busca quando o modal é aberto
  useEffect(() => {
    if (isOpen) {
      // Focus no input de busca quando o modal abre
      setTimeout(() => {
        if (searchInputRef.current) {
          searchInputRef.current.focus();
        }
      }, 100);
      
      if (isFirstLoad) {
        setCustomers([]);
        setPage(0);
        setHasMore(true);
        fetchCustomers(searchTerm, 0, true);
      }
    } else {
      // Reset do estado quando o modal é fechado
      setIsFirstLoad(true);
    }
  }, [isOpen, fetchCustomers, searchTerm, isFirstLoad]);
  
  // Buscar mais clientes quando a página muda
  useEffect(() => {
    if (page > 0) {
      fetchCustomers(searchTerm, page);
    }
  }, [page, searchTerm, fetchCustomers]);
  
  // Configurar debounce para pesquisa
  const debouncedSearch = useCallback(
    debounce((term: string) => {
      setPage(0);
      setIsFirstLoad(true);
      fetchCustomers(term, 0, true);
    }, 1000),
    [fetchCustomers]
  );
  
  // Manipular mudança no campo de pesquisa
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    debouncedSearch(value);
  };
  
  // Limpar pesquisa
  const handleClearSearch = () => {
    setSearchTerm('');
    setPage(0);
    setIsFirstLoad(true);
    fetchCustomers('', 0, true);
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-lg p-6 bg-white rounded-lg shadow-lg dark:bg-gray-800">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {t('medical:selectPatient')}
          </h2>
          <button
            type="button"
            className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
            onClick={onClose}
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        {/* Campo de Pesquisa */}
        <div className="relative mb-4">
          <input
            ref={searchInputRef}
            type="text"
            className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            placeholder={t('customers:searchPatients')}
            value={searchTerm}
            onChange={handleSearchChange}
          />
          <div className="absolute inset-y-0 left-0 flex items-center pl-3">
            <Search className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          </div>
          {searchTerm && (
            <button
              className="absolute inset-y-0 right-0 flex items-center pr-3"
              onClick={handleClearSearch}
            >
              <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            </button>
          )}
        </div>
        
        {/* Botão para criar novo cliente */}
        {onCreateCustomer && (
          <button
            type="button"
            className="flex items-center justify-center w-full px-4 py-2 mb-4 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-blue-700 dark:hover:bg-blue-600"
            onClick={onCreateCustomer}
          >
            <Plus className="w-4 h-4 mr-2" />
            {t('customers:newPatient')}
          </button>
        )}
        
        {/* Mensagem de erro */}
        {error && (
          <div className="p-4 mb-4 text-sm text-red-700 bg-red-100 rounded-lg dark:bg-red-900 dark:text-red-300">
            {error}
          </div>
        )}
        
        {/* Lista de clientes */}
        <div className="max-h-80 overflow-y-auto">
          {customers.length === 0 && !loading && !isFirstLoad ? (
            <div className="flex flex-col items-center justify-center p-6 text-gray-500 dark:text-gray-400">
              <User className="w-12 h-12 mb-2 text-gray-300 dark:text-gray-700" />
              <p>{t('customers:noResultsFound')}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {customers.map((customer, index) => {
                const isLastElement = index === customers.length - 1;
                
                return (
                  <div
                    key={customer.id}
                    ref={isLastElement ? lastCustomerElementRef : null}
                    className="flex items-center px-4 py-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700"
                    onClick={() => onSelectCustomer(customer)}
                  >
                    <div className="flex-shrink-0 w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center dark:bg-gray-700">
                      {customer.avatar_url ? (
                        <img
                          src={customer.avatar_url}
                          alt={customer.name}
                          className="rounded-full w-10 h-10 object-cover"
                        />
                      ) : (
                        <User className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                      )}
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {customer.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {customer.customer_contacts.map((contact: CustomerContact) => contact.value).join(', ')}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          
          {/* Indicador de carregamento */}
          {loading && isFirstLoad && (
            <div className="flex items-center justify-center p-4">
              <div className="w-6 h-6 border-2 border-blue-600 rounded-full animate-spin border-t-transparent"></div>
              <span className="ml-2 text-gray-600 dark:text-gray-300">{t('common:loading')}</span>
            </div>
          )}
          
          {/* Indicador de carregamento no final da lista */}
          {loading && !isFirstLoad && hasMore && (
            <div className="flex items-center justify-center p-2 mt-2">
              <div className="w-4 h-4 border-2 border-blue-600 rounded-full animate-spin border-t-transparent"></div>
              <span className="ml-2 text-sm text-gray-600 dark:text-gray-300">{t('common:loadingMore')}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomerSelectModal; 