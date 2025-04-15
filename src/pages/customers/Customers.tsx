import React, { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Plus, Loader2, Pencil, Trash2, GitMerge, Search, MessageSquare, Tag, Filter, X, Settings, ArrowUp, ArrowDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabase';
import { useAuthContext } from '../../contexts/AuthContext';
import { CustomerAddModal } from '../../components/customers/CustomerAddModal';
import { CustomerEditModal } from '../../components/customers/CustomerEditModal';
import { CustomerDeleteModal } from '../../components/customers/CustomerDeleteModal';
import { CRMStage } from '../../types/crm';
import StageProgressBar from '../../components/customers/StageProgressBar';
import CustomerTags from '../../components/customers/CustomerTags';
import CustomerContacts from '../../components/customers/CustomerContacts';
import { useTags, useCustomFieldDefinitions, useFunnels } from '../../hooks/useQueryes';

interface ContactModalState {
  type: 'email' | 'whatsapp' | 'phone' | 'instagram' | 'facebook' | 'telegram';
  value: string;
}

interface CustomerContact {
  id: string;
  customer_id: string;
  type: string; // 'email', 'whatsapp', 'phone', etc.
  value: string;
  created_at?: string;
  updated_at?: string;
}

interface CustomerTag {
  id: string;
  name: string;
  color: string;
}

// Interface para representar um funil de CRM
interface CRMFunnel {
  id: string;
  name: string;
  description: string;
  created_at: string;
}

// Interface para representar um estágio de CRM com seu funil
interface CRMStageWithFunnel extends CRMStage {
  crm_funnels: CRMFunnel | null;
}

// Adaptar a interface para que seja compatível com nosso processamento
interface Customer {
  id: string;
  organization_id: string;
  name: string;
  stage_id: string | null;
  created_at: string;
  updated_at: string;
  crm_stages: CRMStageWithFunnel | null;
  tags: CustomerTag[];
  contacts: CustomerContact[];
  field_values: Record<string, string>;
}

// Adicionar interface para configuração de colunas
interface ColumnConfig {
  id: string;
  name: string;
  visible: boolean;
  isCustomField?: boolean;
  field_id?: string;
}

// Adicionar uma interface específica para os modais
interface CustomerWithTagRelations extends Omit<Customer, 'tags'> {
  tags: { 
    tag_id: string;
    tags: {
      id: string;
      name: string;
      color: string;
    };
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
    type: string; // Tipo string para compatibilidade com a API
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

const ITEMS_PER_PAGE = 10;

export default function Customers() {
  const { t } = useTranslation(['customers', 'common']);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { currentOrganizationMember } = useAuthContext();
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [contactModalState, setContactModalState] = useState<ContactModalState | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [totalCustomers, setTotalCustomers] = useState(0);
  
  // Adicionar useSearchParams para gerenciar parâmetros da URL
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Obter página atual da URL ou usar 1 como padrão
  const currentPage = parseInt(searchParams.get('page') || '1', 10);
  
  // Usando os hooks de consulta para funis, estágios e tags
  const { data: funnelsData, isLoading: loadingCRM } = useFunnels(currentOrganizationMember?.organization.id);
  const funnels = funnelsData || [];
  const stages = React.useMemo(() => {
    return funnels.flatMap(funnel => funnel.stages || []);
  }, [funnels]);
  
  const { data: tagsData, isLoading: loadingTags } = useTags(currentOrganizationMember?.organization.id);
  const availableTags = tagsData || [];
  
  const { data: customFieldDefinitionsData } = useCustomFieldDefinitions(currentOrganizationMember?.organization.id);
  const customFieldDefinitions = customFieldDefinitionsData || [];
  
  // Estado para controlar a visualização em dispositivos móveis
  const [isMobileView, setIsMobileView] = useState(window.innerWidth < 768);
  // Estados para os filtros
  const [showFilters, setShowFilters] = useState(false);
  const [selectedFunnelId, setSelectedFunnelId] = useState<string | null>(null);
  const [selectedStageId, setSelectedStageId] = useState<string | null>(null);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  
  // Estados para gerenciar colunas personalizadas
  const [columnConfigs, setColumnConfigs] = useState<ColumnConfig[]>([]);
  const [showColumnSelector, setShowColumnSelector] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'name', direction: 'asc' });

  // Referência para armazenar o ID da organização atual
  const currentOrgIdRef = useRef<string | null>(null);
  
  // Estado para armazenar valores de campos personalizados por cliente e campo
  const [customFieldValues, setCustomFieldValues] = useState<{
    [customerId: string]: {
      [fieldId: string]: string;
    };
  }>({});

  // Efeito para carregar configurações de colunas quando a organização mudar
  useEffect(() => {
    if (!currentOrganizationMember) return;
    
    // Se o ID da organização for o mesmo que já foi carregado, não recarregar
    if (currentOrgIdRef.current === currentOrganizationMember.organization.id) return;
    
    // Atualizar a referência com o ID da organização atual
    currentOrgIdRef.current = currentOrganizationMember.organization.id;
    
    // Carregar configurações de colunas
    loadColumnConfigs();
    
    // Limpar a referência quando o componente for desmontado
    return () => {
      currentOrgIdRef.current = null;
    };
  }, [currentOrganizationMember?.organization.id]);

  // Implementar debounce para o termo de pesquisa
  useEffect(() => {
    const timerId = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500); // 500ms de delay

    return () => {
      clearTimeout(timerId);
    };
  }, [searchTerm]);

  // Efeito para carregar clientes quando a organização, página, termo de pesquisa ou filtros mudam
  useEffect(() => {
    if (currentOrganizationMember) {
      loadCustomers();
    }
  }, [currentOrganizationMember, currentPage, debouncedSearchTerm, selectedFunnelId, selectedStageId, selectedTagIds, sortConfig]);

  useEffect(() => {
    // Função para atualizar o estado de visualização móvel
    const handleResize = () => {
      setIsMobileView(window.innerWidth < 768);
    };

    // Adicionar listener para redimensionamento da janela
    window.addEventListener('resize', handleResize);

    // Limpar listener ao desmontar o componente
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Função para carregar configurações de colunas
  const loadColumnConfigs = () => {
    if (!currentOrganizationMember) return;
    
    // Verificar se já existem configurações salvas
    const savedConfigs = localStorage.getItem(`columnConfigs_${currentOrganizationMember.organization.id}`);
    
    if (savedConfigs) {
      // Usar as configurações salvas
      const parsedConfigs = JSON.parse(savedConfigs);
      
      // Verificar se há novos campos personalizados que não estão nas configurações salvas
      const existingCustomFieldIds = parsedConfigs
        .filter((c: ColumnConfig) => c.isCustomField && c.field_id)
        .map((c: ColumnConfig) => c.field_id);
      
      // Adicionar apenas os novos campos personalizados
      const newCustomColumns = (customFieldDefinitions || [])
        .filter(field => !existingCustomFieldIds.includes(field.id))
        .map(field => ({
          id: `custom_${field.id}`,
          name: field.name,
          visible: false,
          isCustomField: true,
          field_id: field.id
        }));
      
      if (newCustomColumns.length > 0) {
        // Adicionar novos campos às configurações existentes
        const updatedConfigs = [...parsedConfigs, ...newCustomColumns];
        setColumnConfigs(updatedConfigs);
        // Salvar as configurações atualizadas
        localStorage.setItem(`columnConfigs_${currentOrganizationMember.organization.id}`, JSON.stringify(updatedConfigs));
      } else {
        // Usar as configurações existentes sem alterações
        setColumnConfigs(parsedConfigs);
      }
    } else {
      // Não há configurações salvas, criar novas
      const defaultColumns: ColumnConfig[] = [
        { id: 'name', name: 'Nome', visible: true },
        { id: 'stage_progress', name: 'Estágio', visible: true },
        { id: 'tags', name: 'Tags', visible: true },
        { id: 'contacts', name: 'Contatos', visible: true },
      ];
      
      // Adicionar colunas personalizadas
      const customColumns = (customFieldDefinitions || []).map(field => ({
        id: `custom_${field.id}`,
        name: field.name,
        visible: false,
        isCustomField: true,
        field_id: field.id
      }));
      
      const newConfigs = [...defaultColumns, ...customColumns];
      setColumnConfigs(newConfigs);
      // Salvar as novas configurações
      localStorage.setItem(`columnConfigs_${currentOrganizationMember.organization.id}`, JSON.stringify(newConfigs));
    }
  };
  
  // Função para ordenar clientes
  const handleSort = (columnId: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    
    if (sortConfig && sortConfig.key === columnId) {
      direction = sortConfig.direction === 'asc' ? 'desc' : 'asc';
    }
    
    setSortConfig({ key: columnId, direction });
    
    // Resetar para a primeira página ao mudar a ordenação
    setSearchParams(prev => {
      prev.delete('page');
      return prev;
    });
  };
  
  // Ordenar clientes com base na configuração de ordenação
  const sortedCustomers = React.useMemo(() => {
    if (!sortConfig) return customers;
    
    return [...customers].sort((a, b) => {
      if (sortConfig.key === 'name') {
        return sortConfig.direction === 'asc' 
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name);
      }
      
      if (sortConfig.key === 'stage') {
        const stageA = a.crm_stages?.name || '';
        const stageB = b.crm_stages?.name || '';
        return sortConfig.direction === 'asc'
          ? stageA.localeCompare(stageB)
          : stageB.localeCompare(stageA);
      }
      
      // Ordenação para campos personalizados
      if (sortConfig.key.startsWith('custom_')) {
        const fieldId = columnConfigs.find(col => col.id === sortConfig.key)?.field_id || '';
        
        // Obter valores para comparação usando customFieldValues em vez de field_values
        const valueA = customFieldValues[a.id]?.[fieldId] || '';
        const valueB = customFieldValues[b.id]?.[fieldId] || '';
        
        return sortConfig.direction === 'asc'
          ? valueA.localeCompare(valueB)
          : valueB.localeCompare(valueA);
      }
      
      return 0;
    });
  }, [customers, sortConfig, columnConfigs, customFieldValues]);

  // Função para atualizar o estágio do cliente
  const handleStageChange = async (customerId: string, stageId: string) => {
    if (!currentOrganizationMember) return;
    
    try {
      // Atualizar o estágio do cliente no banco de dados
      const { error } = await supabase
        .from('customers')
        .update({ stage_id: stageId })
        .eq('id', customerId)
        .eq('organization_id', currentOrganizationMember.organization.id);
        
      if (error) throw error;
      
      // Adicionar ao histórico de estágios
      const { error: historyError } = await supabase
        .from('customer_stage_history')
        .insert({
          customer_id: customerId,
          stage_id: stageId,
          organization_id: currentOrganizationMember.organization.id
        });
        
      if (historyError) throw historyError;
      
      // Atualizar a lista de clientes localmente
      setCustomers(prevCustomers => 
        prevCustomers.map(customer => {
          if (customer.id === customerId) {
            // Encontrar o estágio para atualizar o objeto crm_stages
            const newStage = stages.find(s => s.id === stageId);
            
            // Se estivermos usando useFunnels, precisamos adaptar o estágio para o formato esperado
            const adaptedStage = newStage ? {
              id: newStage.id,
              name: newStage.name,
              color: newStage.color,
              position: newStage.position,
              funnel_id: newStage.funnel_id,
              // Adicionar apenas o campo created_at para compatibilidade com CRMStage
              created_at: new Date().toISOString()
            } : null;
            
            return {
              ...customer,
              stage_id: stageId,
              crm_stages: adaptedStage
            } as Customer; // Forçando o tipo Customer para evitar erro de tipo
          }
          return customer;
        })
      );
      
      // Mostrar feedback visual temporário
      const feedbackElement = document.createElement('div');
      feedbackElement.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded shadow-lg z-50';
      feedbackElement.textContent = 'Estágio atualizado';
      document.body.appendChild(feedbackElement);
      
      setTimeout(() => {
        feedbackElement.remove();
      }, 1500);
      
    } catch (error) {
      console.error('Erro ao atualizar estágio:', error);
      
      // Mostrar mensagem de erro
      const feedbackElement = document.createElement('div');
      feedbackElement.className = 'fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded shadow-lg z-50';
      feedbackElement.textContent = 'Erro ao atualizar estágio';
      document.body.appendChild(feedbackElement);
      
      setTimeout(() => {
        feedbackElement.remove();
      }, 3000);
    }
  };

  const loadCustomers = async (isSilent: boolean = false) => {
    if (!currentOrganizationMember) return;
    
    if (!isSilent) setLoading(true);
    setError('');
    
    try {
      // Usar a função RPC search_customers para buscar clientes e seus contatos
      const { data, error } = await supabase
        .rpc('search_customers', {
          p_organization_id: currentOrganizationMember.organization.id,
          p_search_query: debouncedSearchTerm,
          p_limit: ITEMS_PER_PAGE,
          p_offset: (currentPage - 1) * ITEMS_PER_PAGE,
          p_funnel_id: selectedFunnelId,
          p_stage_id: selectedStageId,
          p_tag_ids: selectedTagIds.length > 0 ? selectedTagIds : null,
          p_sort_column: sortConfig?.key || 'name',
          p_sort_direction: sortConfig?.direction || 'asc',
          p_cache_buster: new Date().toISOString() // Adicionar timestamp atual para evitar cache
        });

      if (error) {
        console.error('Erro ao buscar dados dos clientes:', error);
        setError('Erro ao carregar clientes. Por favor, tente novamente.');
        if (!isSilent) setLoading(false);
        return;
      }
      
      if (data && data.length > 0) {
        // Processar os dados retornados
        const formattedCustomers = data.map((customer: SearchCustomersResult) => {
          // Converter os tipos de dados para o formato esperado pela interface Customer
          const formattedCustomer = {
            id: customer.id,
            name: customer.name,
            organization_id: customer.organization_id,
            stage_id: customer.stage_id,
            created_at: customer.created_at,
            updated_at: customer.created_at, // Usamos created_at como fallback já que updated_at não existe
            // Converter tags de JSONB para o formato esperado
            tags: (customer.tags || []).map((tag) => ({
              id: tag.id,
              name: tag.name,
              color: tag.color
            })),
            // Converter contacts de JSONB para o formato esperado
            contacts: (customer.contacts || []).map((contact) => ({
              id: contact.id,
              customer_id: contact.customer_id,
              type: contact.type,
              value: contact.value,
              created_at: contact.created_at,
              updated_at: contact.updated_at
            })),
            // Converter field_values de JSONB para o formato esperado
            field_values: customer.field_values || {},
            // Converter crm_stages de JSONB para o formato esperado
            crm_stages: customer.crm_stages ? {
              id: customer.crm_stages.id,
              name: customer.crm_stages.name,
              color: customer.crm_stages.color,
              position: customer.crm_stages.position,
              funnel_id: customer.crm_stages.funnel_id,
              created_at: customer.crm_stages.created_at,
              crm_funnels: customer.crm_stages.crm_funnels ? {
                id: customer.crm_stages.crm_funnels.id,
                name: customer.crm_stages.crm_funnels.name,
                description: customer.crm_stages.crm_funnels.description,
                created_at: customer.crm_stages.crm_funnels.created_at
              } : null
            } : null
          };
          
          // Usar uma conversão de tipo explícita para evitar erros de tipo
          return formattedCustomer as unknown as Customer;
        });
        
        setCustomers(formattedCustomers);
        
        // Obter o total de clientes do primeiro resultado (todos têm o mesmo valor)
        if (data.length > 0) {
          setTotalCustomers(data[0].total_count || 0);
        }
        
        // Construir mapa de valores de campo personalizado
        const newCustomFieldValues: Record<string, Record<string, string>> = {};
        formattedCustomers.forEach(customer => {
          if (customer.field_values) {
            newCustomFieldValues[customer.id] = customer.field_values;
          }
        });
        setCustomFieldValues(newCustomFieldValues);
      } else {
        setCustomers([]);
        setTotalCustomers(0);
      }
      
      if (!isSilent) setLoading(false);
    } catch (err) {
      console.error('Erro inesperado ao carregar clientes:', err);
      setError('Ocorreu um erro inesperado. Por favor, tente novamente.');
      if (!isSilent) setLoading(false);
    }
  };

  const handleContactClick = (type: 'email' | 'whatsapp' | 'phone' | 'instagram' | 'facebook' | 'telegram', value: string) => {
    setContactModalState({ type, value });
    // Encontrar o cliente correspondente ao contato
    const customer = customers.find(c => 
      c.contacts.some(contact => contact.value === value && contact.type === type)
    );
    if (customer) {
      setSelectedCustomer(customer);
    }
    setShowContactModal(true);
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    // Não resetamos a página aqui, isso será feito no efeito do debouncedSearchTerm
  };

  // Registrar o totalPages para fins de depuração
  const totalPages = Math.max(1, Math.ceil(totalCustomers / ITEMS_PER_PAGE));

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      const newPage = currentPage - 1;
      setSearchParams(prev => {
        prev.set('page', newPage.toString());
        return prev;
      });
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      const newPage = currentPage + 1;
      setSearchParams(prev => {
        prev.set('page', newPage.toString());
        return prev;
      });
    }
  };

  // Função para limpar todos os filtros
  const clearFilters = () => {
    setSelectedFunnelId(null);
    setSelectedStageId(null);
    setSelectedTagIds([]);
    setSearchParams(prev => {
      prev.delete('page');
      return prev;
    });
  };

  // Função para alternar a seleção de uma tag
  const toggleTagSelection = (tagId: string) => {
    setSelectedTagIds(prev => {
      if (prev.includes(tagId)) {
        return prev.filter(id => id !== tagId);
      } else {
        return [...prev, tagId];
      }
    });
    setSearchParams(prev => {
      prev.delete('page');
      return prev;
    });
  };

  // Função para salvar configurações de colunas
  const saveColumnConfigs = (configs: ColumnConfig[]) => {
    if (!currentOrganizationMember) return;
    localStorage.setItem(`columnConfigs_${currentOrganizationMember.organization.id}`, JSON.stringify(configs));
  };

  // Efeito para atualizar as definições de coluna quando as definições de campo mudarem
  useEffect(() => {
    if (customFieldDefinitions.length > 0 && columnConfigs.length > 0) {
      const allFieldIds = customFieldDefinitions.map(def => def.id);
      const configuredFieldIds = columnConfigs
        .filter(col => col.isCustomField)
        .map(col => col.field_id)
        .filter(Boolean) as string[];
      
      // Verificar se há novos campos que precisam ser adicionados
      const newFields = allFieldIds.filter(id => !configuredFieldIds.includes(id));
      
      if (newFields.length > 0) {
        // Adicionar novas colunas para os campos novos
        const newColumns: ColumnConfig[] = newFields.map(fieldId => {
          const fieldDef = customFieldDefinitions.find(def => def.id === fieldId);
          return {
            id: `custom_field_${fieldId}`,
            name: fieldDef?.name || 'Campo Personalizado',
            visible: false,
            isCustomField: true,
            field_id: fieldId
          };
        });
        
        const updatedConfigs = [...columnConfigs, ...newColumns];
        setColumnConfigs(updatedConfigs);
        
        // Salvar as configurações atualizadas
        saveColumnConfigs(updatedConfigs);
      }
    }
  }, [customFieldDefinitions, columnConfigs]);

  // Esta função agora usa o mapa de valores que já foi construído durante o carregamento dos clientes
  const getCustomFieldValue = (customerId: string, fieldId: string) => {
    // Verificar se temos valores para este cliente
    const customer = customers.find(c => c.id === customerId);
    if (customer?.field_values) {
      return customer.field_values[fieldId] || '';
    }
    return '';
  };

  // Função para renderizar o valor de uma coluna
  const renderColumnValue = (column: ColumnConfig, customer: Customer) => {
    if (column.isCustomField && column.field_id) {
      const value = getCustomFieldValue(customer.id, column.field_id);
      
      // Formatar o valor com base no tipo do campo
      const fieldDef = customFieldDefinitions.find(def => def.id === column.field_id);
      if (fieldDef?.type === 'date' && value) {
        try {
          const date = new Date(value);
          return date.toLocaleDateString();
        } catch {
          return value;
        }
      }
      
      return value;
    }
    
    switch (column.id) {
      case 'name':
        return customer.name;
      case 'stage':
        return customer.crm_stages?.name || 'Sem estágio';
      case 'contact': {
        // Sem is_primary, usamos o primeiro contato como principal
        return customer.contacts && customer.contacts.length > 0 ? customer.contacts[0].value : '';
      }
      case 'contact_email': {
        // Encontrar o primeiro contato do tipo 'email'
        const emailContact = customer.contacts?.find(c => c.type === 'email');
        return emailContact ? emailContact.value : '';
      }
      case 'contact_phone': {
        // Encontrar o primeiro contato do tipo 'phone' ou 'whatsapp'
        const phoneContact = customer.contacts?.find(c => c.type === 'phone' || c.type === 'whatsapp');
        return phoneContact ? phoneContact.value : '';
      }
      default:
        return '';
    }
  };

  // Função para alternar a visibilidade de uma coluna
  const toggleColumnVisibility = (columnId: string) => {
    const updatedConfigs = columnConfigs.map(column => {
      if (column.id === columnId) {
        return { ...column, visible: !column.visible };
      }
      return column;
    });
    
    setColumnConfigs(updatedConfigs);
    saveColumnConfigs(updatedConfigs);
  };

  // Função para converter entre os formatos de tag
  const convertToTagRelations = (customer: Customer): CustomerWithTagRelations => {
    return {
      ...customer,
      tags: customer.tags.map(tag => ({
        tag_id: tag.id,
        tags: {
          id: tag.id,
          name: tag.name,
          color: tag.color
        }
      }))
    };
  };

  // Função para resetar as configurações de colunas
  const handleResetColumnConfigs = () => {
    if (!currentOrganizationMember) return;
    
    // Remover as configurações do localStorage
    localStorage.removeItem(`columnConfigs_${currentOrganizationMember.organization.id}`);
    
    // Recarregar as configurações padrão
    loadColumnConfigs();
    
    // Fechar o modal
    setShowColumnSelector(false);

    // Mostrar notificação de sucesso
    const feedbackElement = document.createElement('div');
    feedbackElement.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded shadow-lg z-50';
    feedbackElement.textContent = t('customers:settingsReset');
    document.body.appendChild(feedbackElement);
    
    setTimeout(() => {
      feedbackElement.remove();
    }, 3000);
  };

  // Configurar a função de manipulação de contato no objeto window para que o componente CustomerContacts possa acessá-la
  useEffect(() => {
    // @ts-ignore - Ignorar erros de tipo para a função handleContactClick
    window.handleContactClick = handleContactClick;
    
    // Limpar a função ao desmontar o componente
    return () => {
      window.handleContactClick = undefined;
    };
  }, [customers]); // Adicionar customers como dependência para garantir que a função tenha acesso à lista atualizada

  // Função para ajustar a página após exclusão
  const adjustPageAfterDeletion = (totalItems: number) => {
    const maxPage = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));
    if (currentPage > maxPage) {
      setSearchParams(prev => {
        prev.set('page', maxPage.toString());
        return prev;
      });
    }
  };

  if (!currentOrganizationMember) {
    return (
      <div className="p-4 md:p-6">
        <div className="flex justify-center items-center min-h-[200px]">
          <div className="text-gray-500 dark:text-gray-400">
            {t('common:loading')}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-full overflow-hidden pb-20 md:pb-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
          {t('customers:title')}
        </h1>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center justify-center h-9 rounded-md bg-blue-600 px-3 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 flex-1 sm:flex-none"
            >
              <Plus className="mr-1 h-4 w-4" />
              {t('customers:addCustomer')}
            </button>
            
            <button
              onClick={() => setShowColumnSelector(true)}
              className="inline-flex items-center justify-center h-9 rounded-md bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 px-3 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 flex-1 sm:flex-none"
            >
              <Settings className="mr-1 h-4 w-4" />
              {t('customers:columns')}
            </button>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Link
              to="/app/crm"
              className="inline-flex items-center justify-center px-3 py-1.5 md:px-4 md:py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex-1 sm:flex-none"
            >
              <GitMerge className="w-4 h-4 md:w-5 md:h-5 mr-1 md:mr-2" />
              <span className="whitespace-nowrap">{t('customers:viewCRM')}</span>
            </Link>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`inline-flex items-center justify-center px-3 py-1.5 md:px-4 md:py-2 border rounded-md shadow-sm text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex-1 sm:flex-none ${
                selectedFunnelId || selectedStageId || selectedTagIds.length > 0
                  ? "border-blue-500 text-white bg-blue-500 hover:bg-blue-600"
                  : "border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
              }`}
            >
              <Filter className="w-4 h-4 md:w-5 md:h-5 mr-1 md:mr-2" />
              <span className="whitespace-nowrap">{t('customers:filters')}</span>
              {(selectedFunnelId || selectedStageId || selectedTagIds.length > 0) && (
                <span className="ml-1.5 flex items-center justify-center w-5 h-5 text-xs bg-white text-blue-600 rounded-full">
                  {(selectedFunnelId ? 1 : 0) + (selectedStageId ? 1 : 0) + (selectedTagIds.length > 0 ? 1 : 0)}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Painel de filtros */}
      {showFilters && (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg mb-6 overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">{t('customers:filters')}</h3>
            <div className="flex items-center gap-2">
              {(selectedFunnelId || selectedStageId || selectedTagIds.length > 0) && (
                <button
                  onClick={clearFilters}
                  className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  {t('customers:clearFilters')}
                </button>
              )}
              <button
                onClick={() => setShowFilters(false)}
                className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
          
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Filtro de Funil e Estágio */}
            <div>
              
              {/* Seleção de Funil */}
              <div className="mb-4">
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('crm:funnel')}</label>
                <select
                  value={selectedFunnelId || ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    setSelectedFunnelId(value || null);
                    setSelectedStageId(null); // Resetar estágio ao mudar de funil
                    setSearchParams(prev => {
                      prev.delete('page');
                      return prev;
                    });
                  }}
                  className="w-full p-2 bg-gray-100 dark:bg-gray-700 border-0 rounded-md focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                >
                  <option value="">{t('crm:allFunnels')}</option>
                  {funnels.map(funnel => (
                    <option key={funnel.id} value={funnel.id}>{funnel.name}</option>
                  ))}
                </select>
              </div>
              
              {/* Seleção de Estágio (apenas se um funil estiver selecionado) */}
              {selectedFunnelId && (
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('crm:stage')}</label>
                  <select
                    value={selectedStageId || ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      setSelectedStageId(value || null);
                      setSearchParams(prev => {
                        prev.delete('page');
                        return prev;
                      });
                    }}
                    className="w-full p-2 bg-gray-100 dark:bg-gray-700 border-0 rounded-md focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                  >
                    <option value="">{t('crm:allStages')}</option>
                    {stages
                      .filter(stage => stage.funnel_id === selectedFunnelId)
                      .sort((a, b) => a.position - b.position)
                      .map(stage => (
                        <option key={stage.id} value={stage.id}>{stage.name}</option>
                      ))}
                  </select>
                </div>
              )}
            </div>
            
            {/* Filtro de Tags */}
            <div>
              {loadingTags ? (
                <div className="flex justify-center p-4">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                </div>
              ) : availableTags.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('customers:noTagsAvailable')}</p>
              ) : (
                <div className="flex flex-wrap gap-2 max-h-[200px] overflow-y-auto p-2">
                  {availableTags.map(tag => (
                    <button
                      key={tag.id}
                      onClick={() => toggleTagSelection(tag.id)}
                      className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                        selectedTagIds.includes(tag.id)
                          ? 'ring-2 ring-offset-1 ring-blue-500'
                          : ''
                      }`}
                      style={{ 
                        backgroundColor: `${tag.color}30`,
                        color: tag.color,
                        border: `1px solid ${tag.color}`
                      }}
                    >
                      <Tag className="w-3 h-3 mr-1 flex-shrink-0" />
                      <span>{tag.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          <div className="p-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700 flex justify-end">
            <button
              onClick={() => {
                setShowFilters(false);
              }}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              {t('common:close')}
            </button>
          </div>
        </div>
      )}

      {/* Configurações de colunas visíveis acima da tabela */}
      {showColumnSelector && (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg mb-6 overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              {t('customers:configureVisibleColumns')}
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={handleResetColumnConfigs}
                className="text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
              >
                {t('customers:resetSettings')}
              </button>
              <button
                onClick={() => setShowColumnSelector(false)}
                className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
          
          <div className="p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {columnConfigs.map((column, index) => (
              <div key={`${column.id}-${index}`} className="flex items-center">
                <input
                  type="checkbox"
                  id={`column-${column.id}-${index}`}
                  checked={column.visible}
                  onChange={() => toggleColumnVisibility(column.id)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label
                  htmlFor={`column-${column.id}-${index}`}
                  className="ml-2 block text-sm text-gray-900 dark:text-gray-300"
                >
                  {column.name}
                </label>
              </div>
            ))}
          </div>
          
          <div className="p-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700 flex justify-end">
            <button
              onClick={() => setShowColumnSelector(false)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              {t('common:close')}
            </button>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
        <div className="p-3 md:p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="relative">
            <input
              type="text"
              placeholder={t('customers:searchPlaceholder')}
              value={searchTerm}
              onChange={handleSearch}
              className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-700 border-0 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
            />
            {searchTerm !== debouncedSearchTerm ? (
              <Loader2 className="absolute left-3 top-2.5 w-5 h-5 text-blue-500 animate-spin" />
            ) : (
            <Search className="absolute left-3 top-2.5 w-5 h-5 text-gray-400 dark:text-gray-500" />
            )}
          </div>
        </div>

        {/* Exibir filtros ativos */}
        {(selectedFunnelId || selectedStageId || selectedTagIds.length > 0) && (
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-100 dark:border-blue-800/30">
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-xs text-blue-700 dark:text-blue-300">{t('customers:activeFilters')}:</span>
              
              {selectedFunnelId && (
                <div className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 dark:bg-blue-800/40 text-blue-800 dark:text-blue-200">
                  <span className="mr-1">{t('crm:funnel')}: {funnels.find(f => f.id === selectedFunnelId)?.name}</span>
                  <button 
                    onClick={() => {
                      setSelectedFunnelId(null);
                      setSelectedStageId(null);
                      setSearchParams(prev => {
                        prev.delete('page');
                        return prev;
                      });
                    }}
                    className="text-blue-500 hover:text-blue-700 dark:text-blue-300 dark:hover:text-blue-100"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
              
              {selectedStageId && (
                <div className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 dark:bg-blue-800/40 text-blue-800 dark:text-blue-200">
                  <span className="mr-1">{t('crm:stage')}: {stages.find(s => s.id === selectedStageId)?.name}</span>
                  <button 
                    onClick={() => {
                      setSelectedStageId(null);
                      setSearchParams(prev => {
                        prev.delete('page');
                        return prev;
                      });
                    }}
                    className="text-blue-500 hover:text-blue-700 dark:text-blue-300 dark:hover:text-blue-100"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
              
              {selectedTagIds.length > 0 && (
                <div className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 dark:bg-blue-800/40 text-blue-800 dark:text-blue-200">
                  <span className="mr-1">{t('customers:tags.title')}: {selectedTagIds.length}</span>
                  <button 
                    onClick={() => {
                      setSelectedTagIds([]);
                      setSearchParams(prev => {
                        prev.delete('page');
                        return prev;
                      });
                    }}
                    className="text-blue-500 hover:text-blue-700 dark:text-blue-300 dark:hover:text-blue-100"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
              
              <button
                onClick={clearFilters}
                className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 ml-auto"
              >
                {t('customers:clearAll')}
              </button>
            </div>
          </div>
        )}

        {error ? (
          <div className="p-4 text-red-600 dark:text-red-400">{error}</div>
        ) : loading || loadingCRM ? (
          <div className="p-8 flex justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : customers.length === 0 ? (
          <div className="p-4 text-center text-gray-500 dark:text-gray-400">
            {searchTerm || selectedFunnelId || selectedStageId || selectedTagIds.length > 0 
              ? t('common:noResults') 
              : t('customers:noCustomers')}
          </div>
        ) : (
          <>
            {/* Visualização em tabela para desktop */}
            {!isMobileView && (
              <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      {/* Coluna de nome sempre visível */}
                      <th 
                        scope="col" 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer"
                        onClick={() => handleSort('name')}
                      >
                        <div className="flex items-center">
                    {t('customers:name')}
                          {sortConfig?.key === 'name' && (
                            sortConfig.direction === 'asc' 
                              ? <ArrowUp className="w-4 h-4 ml-1" /> 
                              : <ArrowDown className="w-4 h-4 ml-1" />
                          )}
                        </div>
                  </th>
                      
                      {/* Colunas configuráveis */}
                      {columnConfigs
                        .filter(col => col.visible && col.id !== 'name')
                        .map(column => (
                          <th 
                            key={column.id}
                            scope="col" 
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer"
                            onClick={() => handleSort(column.id)}
                          >
                            <div className="flex items-center">
                              {column.name}
                              {sortConfig?.key === column.id && (
                                sortConfig.direction === 'asc' 
                                  ? <ArrowUp className="w-4 h-4 ml-1" /> 
                                  : <ArrowDown className="w-4 h-4 ml-1" />
                              )}
                            </div>
                  </th>
                        ))
                      }
                      
                      {/* Coluna de ações sempre visível */}
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        {t('common:actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {sortedCustomers.map(customer => (
                      <tr 
                        key={customer.id} 
                        className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                      >
                        {/* Coluna de nome */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {customer.name}
                      </div>
                    </td>
                        
                        {/* Colunas configuráveis */}
                        {columnConfigs
                          .filter(col => col.visible && col.id !== 'name')
                          .map(column => (
                            <td key={column.id} className="px-6 py-4 whitespace-nowrap">
                              {column.id === 'stage' && (
                                <div className="text-sm text-gray-900 dark:text-white">
                                  {customer.crm_stages?.name || '-'}
                          </div>
                        )}
                              
                              {column.id === 'stage_progress' && (
                                <div className="w-full max-w-xs">
                                  {customer.crm_stages && (
                                    <StageProgressBar 
                                      customer={customer} 
                                      funnels={funnels} 
                                      stages={stages}
                                      onStageChange={handleStageChange}
                                    />
                                  )}
                          </div>
                        )}
                              
                              {column.id === 'tags' && (
                                <div className="flex flex-wrap gap-1">
                                  <CustomerTags tags={customer.tags} />
                      </div>
                              )}
                              
                              {column.id === 'contacts' && (
                                <div>
                                  <CustomerContacts contacts={customer.contacts} customer={customer} />
                                </div>
                              )}
                              
                              {column.isCustomField && column.field_id && (
                                <div className="text-sm text-gray-900 dark:text-white">
                                  {renderColumnValue(column, customer)}
                                </div>
                              )}
                    </td>
                          ))
                        }
                        
                        {/* Coluna de ações */}
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end items-center space-x-3">
                        <Link
                          to={`/app/customers/${customer.id}/chats`}
                          className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                              title="Atendimentos"
                        >
                              <MessageSquare className="w-5 h-5" />
                        </Link>
                            
                        <button
                          onClick={() => {
                            setSelectedCustomer(customer);
                            setShowEditModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                              title="Editar"
                        >
                              <Pencil className="w-5 h-5" />
                        </button>
                            
                        <button
                          onClick={() => {
                            setSelectedCustomer(customer);
                            setShowDeleteModal(true);
                          }}
                          className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                              title="Excluir"
                        >
                              <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
                          </div>
                        )}

            {/* Visualização em cards para mobile */}
            {isMobileView && (
              <div className="grid grid-cols-1 gap-4 p-4 mb-16 md:mb-0">
                {sortedCustomers.map((customer) => (
                  <div 
                    key={customer.id} 
                    className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm overflow-hidden"
                  >
                    <div className="p-4">
                      <div className="flex justify-between items-start mb-3">
                        <h3 
                          onClick={() => {
                            setSelectedCustomer(customer);
                            setShowEditModal(true);
                          }}
                          className="text-base font-semibold text-gray-900 dark:text-white truncate pr-2 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400"
                        >
                          {customer.name}
                        </h3>
                        <div className="flex space-x-2">
                        <Link
                          to={`/app/customers/${customer.id}/chats`}
                            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 p-1"
                          title="Ver atendimentos"
                        >
                            <MessageSquare className="w-5 h-5" />
                        </Link>
                <button
                          onClick={() => {
                            setSelectedCustomer(customer);
                            setShowEditModal(true);
                          }}
                            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 p-1"
                        >
                            <Pencil className="w-5 h-5" />
                </button>
                <button
                          onClick={() => {
                            setSelectedCustomer(customer);
                            setShowDeleteModal(true);
                          }}
                            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 p-1"
                        >
                            <Trash2 className="w-5 h-5" />
                </button>
              </div>
                </div>
                      
                      {/* Informações de contato */}
                      <div className="mb-3">
                        <CustomerContacts contacts={customer.contacts} />
                      </div>
                      
                      {/* Tags */}
                      {customer.tags && customer.tags.length > 0 && (
                        <div className="mb-3">
                          <CustomerTags tags={customer.tags} />
                        </div>
                      )}
                      
                      {/* Data de registro */}
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                        {t('customers:registeredOn')}: {new Date(customer.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            <div className="px-6 py-4 flex items-center justify-between border-t border-gray-200 dark:border-gray-700 flex-wrap gap-2">
              <div className="flex-1 flex justify-between">
                    <button
                      onClick={handlePreviousPage}
                      disabled={currentPage === 1}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                  {t('common:previous')}
                    </button>
                <div className="mx-2 flex items-center">
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {currentPage} {t('common:of')} {totalPages}
                    </span>
                </div>
                    <button
                      onClick={handleNextPage}
                      disabled={currentPage >= totalPages}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                  {t('common:next')}
                    </button>
                </div>
              <div className="hidden md:block">
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    {t('common:showing')} <span className="font-medium">{Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, totalCustomers)}</span> {t('common:to')}{' '}
                    <span className="font-medium">{Math.min(currentPage * ITEMS_PER_PAGE, totalCustomers)}</span> {t('common:of')}{' '}
                    <span className="font-medium">{totalCustomers}</span> {t('common:results')}
                  </p>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Add Customer Modal */}
      {showAddModal && (
        <CustomerAddModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => loadCustomers()}
        />
      )}

      {/* Edit Customer Modal */}
      {showEditModal && selectedCustomer && (
        <CustomerEditModal
          customer={convertToTagRelations(selectedCustomer) as any}
          onClose={() => {
            setShowEditModal(false);
            setSelectedCustomer(null);
            // loadCustomers(true);
          }}
          onSuccess={(silentRefresh = false) => {
            if (!silentRefresh) {
              loadCustomers(true);
            }
          }}
        />
      )}

      {/* Delete Customer Modal */}
      {showDeleteModal && selectedCustomer && (
        <CustomerDeleteModal
          customer={convertToTagRelations(selectedCustomer) as any}
          onClose={() => {
            setShowDeleteModal(false);
            setSelectedCustomer(null);
          }}
          onSuccess={() => {
            loadCustomers(true);
            // Ajustar a página após a exclusão
            adjustPageAfterDeletion(totalCustomers - 1);
          }}
        />
      )}

    </div>
  );
}