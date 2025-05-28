import React, { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Plus, Loader2, Pencil, Trash2, GitMerge, Search, MessageSquare, Tag, Filter, X, Settings, ArrowUp, ArrowDown, Download } from 'lucide-react';
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
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
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

  // Estados para exportação
  const [isExporting, setIsExporting] = useState(false);
  const [showExportOptions, setShowExportOptions] = useState(false);

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
    currentOrgIdRef.current = currentOrganizationMember.organization.id || null;
    
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
      // Verificar se o termo de pesquisa mudou realmente
      if (searchTerm !== debouncedSearchTerm) {
        // Se mudou, resetamos a página para 1
        setSearchParams(prev => {
          const newParams = new URLSearchParams(prev);
          newParams.delete('page');
          return newParams;
        });
        // Atualizar o termo debounced
        setDebouncedSearchTerm(searchTerm);
      } else {
        // Mesmo sem mudança, atualizamos o debounced para garantir consistência
        setDebouncedSearchTerm(searchTerm);
      }
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
          p_sort_direction: sortConfig?.direction || 'asc'
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
        formattedCustomers.forEach((customer: Customer) => {
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
    // Encontrar o cliente correspondente ao contato
    const customer = customers.find(c => 
      c.contacts.some(contact => contact.value === value && contact.type === type)
    );
    if (customer) {
      setSelectedCustomer(customer);
    }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    // Não precisamos resetar a página aqui, isso será feito no efeito do debounce
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

  // Função auxiliar para obter valores de campo personalizado durante a exportação
  const getCustomFieldValueForExport = (customer: Customer, fieldId: string) => {
    if (customer.field_values) {
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
          // Para campos do tipo 'date', consideramos apenas a data sem interferência de fuso horário
          // Extrair partes da data (ano, mês, dia) e criar uma data local com horário às 12:00
          const [year, month, day] = value.split('-').map(Number);
          if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
            // Criar uma data usando componentes locais (evita problemas de fuso horário)
            const date = new Date(year, month - 1, day, 12, 0, 0);
            return date.toLocaleDateString();
          }
          return value;
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
    // @ts-expect-error - Ignorar erros de tipo para a função handleContactClick
    window.handleContactClick = handleContactClick;
    
    // Limpar a função ao desmontar o componente
    return () => {
      window.handleContactClick = undefined;
    };
  }, [customers]); // Adicionar customers como dependência para garantir que a função tenha acesso à lista atualizada

  // Efeito para fechar o menu de exportação quando clicar fora dele
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showExportOptions) {
        const target = event.target as HTMLElement;
        if (!target.closest('.export-menu-container')) {
          setShowExportOptions(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showExportOptions]);

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

  // Função para buscar todos os clientes para exportação
  const fetchAllCustomersForExport = async (): Promise<Customer[]> => {
    if (!currentOrganizationMember) return [];
    
    const allCustomers: Customer[] = [];
    let currentPageNum = 1;
    let hasMoreData = true;
    
    while (hasMoreData) {
      try {
        const { data, error } = await supabase
          .rpc('search_customers', {
            p_organization_id: currentOrganizationMember.organization.id,
            p_search_query: debouncedSearchTerm,
            p_limit: ITEMS_PER_PAGE,
            p_offset: (currentPageNum - 1) * ITEMS_PER_PAGE,
            p_funnel_id: selectedFunnelId,
            p_stage_id: selectedStageId,
            p_tag_ids: selectedTagIds.length > 0 ? selectedTagIds : null,
            p_sort_column: sortConfig?.key || 'name',
            p_sort_direction: sortConfig?.direction || 'asc'
          });

        if (error) {
          console.error('Erro ao buscar dados para exportação:', error);
          break;
        }
        
        if (data && data.length > 0) {
          // Processar os dados da mesma forma que em loadCustomers
          const formattedCustomers = data.map((customer: SearchCustomersResult) => {
            const formattedCustomer = {
              id: customer.id,
              name: customer.name,
              organization_id: customer.organization_id,
              stage_id: customer.stage_id,
              created_at: customer.created_at,
              updated_at: customer.created_at,
              tags: (customer.tags || []).map((tag) => ({
                id: tag.id,
                name: tag.name,
                color: tag.color
              })),
              contacts: (customer.contacts || []).map((contact) => ({
                id: contact.id,
                customer_id: contact.customer_id,
                type: contact.type,
                value: contact.value,
                created_at: contact.created_at,
                updated_at: contact.updated_at
              })),
              field_values: customer.field_values || {},
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
            
            return formattedCustomer as unknown as Customer;
          });
          
          allCustomers.push(...formattedCustomers);
          
          // Verificar se há mais dados
          if (data.length < ITEMS_PER_PAGE) {
            hasMoreData = false;
          } else {
            currentPageNum++;
          }
        } else {
          hasMoreData = false;
        }
      } catch (err) {
        console.error('Erro inesperado ao buscar dados para exportação:', err);
        break;
      }
    }
    
    return allCustomers;
  };

  // Função para exportar para CSV
  const exportToCSV = async () => {
    setIsExporting(true);
    try {
      const allCustomers = await fetchAllCustomersForExport();
      
      // Obter apenas as colunas visíveis
      const visibleColumns = columnConfigs.filter(col => col.visible);
      
      // Tipos de contato disponíveis
      const contactTypes = ['email', 'whatsapp', 'phone', 'instagram', 'facebook', 'telegram'];
      
      // Criar cabeçalhos
      const headers: string[] = [];
      visibleColumns.forEach(col => {
        if (col.id === 'contacts') {
          // Adicionar uma coluna para cada tipo de contato
          contactTypes.forEach(type => {
            headers.push(`${col.name} - ${type.charAt(0).toUpperCase() + type.slice(1)}`);
          });
        } else {
          headers.push(col.name);
        }
      });
      
      // Criar linhas de dados
      const rows = allCustomers.map(customer => {
        const row: string[] = [];
        
        visibleColumns.forEach(column => {
          if (column.id === 'name') {
            row.push(customer.name);
          } else if (column.id === 'stage') {
            row.push(customer.crm_stages?.name || '');
          } else if (column.id === 'stage_progress') {
            row.push(customer.crm_stages?.name || '');
          } else if (column.id === 'tags') {
            row.push(customer.tags.map(tag => tag.name).join(', '));
          } else if (column.id === 'contacts') {
            // Agrupar contatos por tipo
            contactTypes.forEach(type => {
              const contactsOfType = customer.contacts
                .filter(contact => contact.type === type)
                .map(contact => contact.value);
              row.push(contactsOfType.join('; '));
            });
          } else if (column.isCustomField && column.field_id) {
            row.push(getCustomFieldValueForExport(customer, column.field_id));
          } else {
            row.push('');
          }
        });
        
        return row;
      });
      
      // Criar conteúdo CSV
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
      ].join('\n');
      
      // Download do arquivo
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `clientes_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Mostrar notificação de sucesso
      const feedbackElement = document.createElement('div');
      feedbackElement.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded shadow-lg z-50';
      feedbackElement.textContent = `CSV exportado com sucesso! ${allCustomers.length} clientes exportados.`;
      document.body.appendChild(feedbackElement);
      
      setTimeout(() => {
        feedbackElement.remove();
      }, 3000);
      
    } catch (error) {
      console.error('Erro ao exportar CSV:', error);
      
      // Mostrar notificação de erro
      const feedbackElement = document.createElement('div');
      feedbackElement.className = 'fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded shadow-lg z-50';
      feedbackElement.textContent = 'Erro ao exportar CSV. Tente novamente.';
      document.body.appendChild(feedbackElement);
      
      setTimeout(() => {
        feedbackElement.remove();
      }, 3000);
    } finally {
      setIsExporting(false);
      setShowExportOptions(false);
    }
  };

  // Função para exportar para Excel
  const exportToExcel = async () => {
    setIsExporting(true);
    try {
      // Importar dinamicamente a biblioteca xlsx
      const XLSX = await import('xlsx');
      
      const allCustomers = await fetchAllCustomersForExport();
      
      // Obter apenas as colunas visíveis
      const visibleColumns = columnConfigs.filter(col => col.visible);
      
      // Tipos de contato disponíveis
      const contactTypes = ['email', 'whatsapp', 'phone', 'instagram', 'facebook', 'telegram'];
      
      // Criar dados para o Excel
      const excelData = allCustomers.map(customer => {
        const row: Record<string, string> = {};
        
        visibleColumns.forEach(column => {
          if (column.id === 'name') {
            row[column.name] = customer.name;
          } else if (column.id === 'stage') {
            row[column.name] = customer.crm_stages?.name || '';
          } else if (column.id === 'stage_progress') {
            row[column.name] = customer.crm_stages?.name || '';
          } else if (column.id === 'tags') {
            row[column.name] = customer.tags.map(tag => tag.name).join(', ');
          } else if (column.id === 'contacts') {
            // Agrupar contatos por tipo
            contactTypes.forEach(type => {
              const contactsOfType = customer.contacts
                .filter(contact => contact.type === type)
                .map(contact => contact.value);
              const columnName = `${column.name} - ${type.charAt(0).toUpperCase() + type.slice(1)}`;
              row[columnName] = contactsOfType.join('; ');
            });
          } else if (column.isCustomField && column.field_id) {
            row[column.name] = getCustomFieldValueForExport(customer, column.field_id);
          } else {
            row[column.name] = '';
          }
        });
        
        return row;
      });
      
      // Criar workbook e worksheet
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(excelData);
      
      // Adicionar worksheet ao workbook
      XLSX.utils.book_append_sheet(wb, ws, 'Clientes');
      
      // Download do arquivo
      XLSX.writeFile(wb, `clientes_${new Date().toISOString().split('T')[0]}.xlsx`);
      
      // Mostrar notificação de sucesso
      const feedbackElement = document.createElement('div');
      feedbackElement.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded shadow-lg z-50';
      feedbackElement.textContent = `Excel exportado com sucesso! ${allCustomers.length} clientes exportados.`;
      document.body.appendChild(feedbackElement);
      
      setTimeout(() => {
        feedbackElement.remove();
      }, 3000);
      
    } catch (error) {
      console.error('Erro ao exportar Excel:', error);
      
      // Mostrar notificação de erro
      const feedbackElement = document.createElement('div');
      feedbackElement.className = 'fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded shadow-lg z-50';
      feedbackElement.textContent = 'Erro ao exportar Excel. Tente novamente.';
      document.body.appendChild(feedbackElement);
      
      setTimeout(() => {
        feedbackElement.remove();
      }, 3000);
    } finally {
      setIsExporting(false);
      setShowExportOptions(false);
    }
  };

  // Função para exportar para JSON
  const exportToJSON = async () => {
    setIsExporting(true);
    try {
      const allCustomers = await fetchAllCustomersForExport();
      
      // Obter apenas as colunas visíveis
      const visibleColumns = columnConfigs.filter(col => col.visible);
      
      // Tipos de contato disponíveis
      const contactTypes = ['email', 'whatsapp', 'phone', 'instagram', 'facebook', 'telegram'];
      
      // Criar dados JSON com apenas as colunas visíveis
      const jsonData = allCustomers.map(customer => {
        const customerData: Record<string, string | CustomerTag[] | CustomerContact[] | Record<string, string[]>> = {};
        
        visibleColumns.forEach(column => {
          if (column.id === 'name') {
            customerData.name = customer.name;
          } else if (column.id === 'stage') {
            customerData.stage = customer.crm_stages?.name || '';
          } else if (column.id === 'stage_progress') {
            customerData.stage_progress = customer.crm_stages?.name || '';
          } else if (column.id === 'tags') {
            customerData.tags = customer.tags;
          } else if (column.id === 'contacts') {
            // Para JSON, criar um objeto com contatos agrupados por tipo
            const contactsByType: Record<string, string[]> = {};
            contactTypes.forEach(type => {
              const contactsOfType = customer.contacts
                .filter(contact => contact.type === type)
                .map(contact => contact.value);
              if (contactsOfType.length > 0) {
                contactsByType[type] = contactsOfType;
              }
            });
            customerData.contacts = contactsByType;
          } else if (column.isCustomField && column.field_id) {
            customerData[column.name] = getCustomFieldValueForExport(customer, column.field_id);
          }
        });
        
        return customerData;
      });
      
      // Download do arquivo
      const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `clientes_${new Date().toISOString().split('T')[0]}.json`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Mostrar notificação de sucesso
      const feedbackElement = document.createElement('div');
      feedbackElement.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded shadow-lg z-50';
      feedbackElement.textContent = `JSON exportado com sucesso! ${allCustomers.length} clientes exportados.`;
      document.body.appendChild(feedbackElement);
      
      setTimeout(() => {
        feedbackElement.remove();
      }, 3000);
      
    } catch (error) {
      console.error('Erro ao exportar JSON:', error);
      
      // Mostrar notificação de erro
      const feedbackElement = document.createElement('div');
      feedbackElement.className = 'fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded shadow-lg z-50';
      feedbackElement.textContent = 'Erro ao exportar JSON. Tente novamente.';
      document.body.appendChild(feedbackElement);
      
      setTimeout(() => {
        feedbackElement.remove();
      }, 3000);
    } finally {
      setIsExporting(false);
      setShowExportOptions(false);
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header Mobile Melhorado */}
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="px-4 py-3">
          {/* Título e contador */}
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                {t('customers:title')}
              </h1>
              {!loading && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                  {totalCustomers} {totalCustomers === 1 ? 'cliente' : 'clientes'}
                </p>
              )}
            </div>
            
            {/* Botão adicionar - sempre visível no mobile */}
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center justify-center w-10 h-10 bg-blue-600 hover:bg-blue-700 rounded-full shadow-lg transition-colors"
            >
              <Plus className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* Barra de pesquisa melhorada */}
          <div className="relative mb-3">
            <input
              type="text"
              placeholder={t('customers:searchPlaceholder')}
              value={searchTerm}
              onChange={handleSearch}
              className="w-full h-10 pl-10 pr-4 bg-gray-100 dark:bg-gray-700 border-0 rounded-full focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 text-sm"
            />
            {searchTerm !== debouncedSearchTerm ? (
              <Loader2 className="absolute left-3 top-2.5 w-5 h-5 text-blue-500 animate-spin" />
            ) : (
              <Search className="absolute left-3 top-2.5 w-5 h-5 text-gray-400 dark:text-gray-500" />
            )}
          </div>

          {/* Botões de ação secundários */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  selectedFunnelId || selectedStageId || selectedTagIds.length > 0
                    ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700"
                    : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                }`}
              >
                <Filter className="w-3 h-3 mr-1" />
                {t('customers:filters')}
                {(selectedFunnelId || selectedStageId || selectedTagIds.length > 0) && (
                  <span className="ml-1 flex items-center justify-center w-4 h-4 text-xs bg-blue-600 text-white rounded-full">
                    {(selectedFunnelId ? 1 : 0) + (selectedStageId ? 1 : 0) + (selectedTagIds.length > 0 ? 1 : 0)}
                  </span>
                )}
              </button>

              <Link
                to="/app/crm"
                className="flex items-center px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full text-xs font-medium"
              >
                <GitMerge className="w-3 h-3 mr-1" />
                CRM
              </Link>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowColumnSelector(true)}
                className="flex items-center justify-center w-8 h-8 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full"
              >
                <Settings className="w-4 h-4" />
              </button>
              
              <div className="relative export-menu-container">
                <button
                  onClick={() => setShowExportOptions(!showExportOptions)}
                  disabled={isExporting}
                  className="flex items-center justify-center w-8 h-8 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full disabled:opacity-50"
                >
                  {isExporting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                </button>
                
                {/* Menu suspenso de opções de exportação */}
                {showExportOptions && (
                  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-20">
                    <div className="py-1">
                      <button
                        onClick={exportToCSV}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        Exportar como CSV
                      </button>
                      <button
                        onClick={exportToExcel}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        Exportar como Excel
                      </button>
                      <button
                        onClick={exportToJSON}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        Exportar como JSON
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Conteúdo principal */}
      <div className={isMobileView ? "px-0" : "p-4 md:p-6 max-w-full overflow-hidden pb-20 md:pb-6"}>
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

        <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden pb-16 md:pb-0">
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
                <div>
                  {sortedCustomers.map((customer, index) => (
                    <div 
                      key={customer.id} 
                      className={`border-b border-gray-100 dark:border-gray-700 last:border-b-0 ${
                        index === 0 ? '' : ''
                      }`}
                    >
                      <div className="px-4 py-4 active:bg-gray-50 dark:active:bg-gray-700 transition-colors">
                        {/* Linha principal com nome e ações */}
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center">
                              {/* Avatar com inicial */}
                              <div className="flex-shrink-0 w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mr-3">
                                <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                                  {customer.name.charAt(0).toUpperCase()}
                                </span>
                              </div>
                              
                              {/* Nome e estágio */}
                              <div className="flex-1 min-w-0">
                                <h3 className="text-base font-medium text-gray-900 dark:text-white truncate">
                                  {customer.name}
                                </h3>
                                {customer.crm_stages && (
                                  <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                                    {customer.crm_stages.name}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          {/* Botões de ação */}
                          <div className="flex items-center space-x-1 ml-2">
                            <Link
                              to={`/app/customers/${customer.id}/chats`}
                              className="p-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full transition-colors"
                            >
                              <MessageSquare className="w-5 h-5" />
                            </Link>
                            <button
                              onClick={() => {
                                setSelectedCustomer(customer);
                                setShowEditModal(true);
                              }}
                              className="p-2 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-full transition-colors"
                            >
                              <Pencil className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedCustomer(customer);
                                setShowDeleteModal(true);
                              }}
                              className="p-2 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                        
                        {/* Informações de contato */}
                        {customer.contacts && customer.contacts.length > 0 && (
                          <div className="ml-13 mb-2">
                            <div className="flex flex-wrap gap-2">
                              {customer.contacts.slice(0, 2).map((contact, contactIndex) => (
                                <div 
                                  key={contactIndex}
                                  className="flex items-center text-sm text-gray-600 dark:text-gray-400"
                                >
                                  <span className="truncate max-w-[200px]">
                                    {contact.value}
                                  </span>
                                  {contactIndex === 0 && customer.contacts.length > 1 && (
                                    <span className="ml-1 text-xs text-gray-400">
                                      +{customer.contacts.length - 1}
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Tags */}
                        {customer.tags && customer.tags.length > 0 && (
                          <div className="ml-13">
                            <div className="flex flex-wrap gap-1">
                              {customer.tags.slice(0, 3).map((tag, tagIndex) => (
                                <span
                                  key={tagIndex}
                                  className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                                  style={{ 
                                    backgroundColor: `${tag.color}20`,
                                    color: tag.color,
                                    border: `1px solid ${tag.color}30`
                                  }}
                                >
                                  {tag.name}
                                </span>
                              ))}
                              {customer.tags.length > 3 && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                                  +{customer.tags.length - 3}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                        
                        {/* Data de registro - apenas se não houver tags */}
                        {(!customer.tags || customer.tags.length === 0) && (
                          <div className="ml-13">
                            <div className="text-xs text-gray-400 dark:text-gray-500">
                              {t('customers:registeredOn')}: {new Date(customer.created_at).toLocaleDateString()}
                            </div>
                          </div>
                        )}
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
            customer={convertToTagRelations(selectedCustomer)}
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
            customer={convertToTagRelations(selectedCustomer)}
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
    </div>
  );
}