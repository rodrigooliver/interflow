import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Mail, Phone, Loader2, Pencil, Trash2, GitMerge, Search, ChevronLeft, ChevronRight, MessageSquare, Tag, Filter, X, Instagram, Facebook, Settings, ArrowUp, ArrowDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabase';
import { useOrganizationContext } from '../../contexts/OrganizationContext';
import { CustomerRegistrationModal } from '../../components/customers/CustomerRegistrationModal';
import { CustomerEditModal } from '../../components/customers/CustomerEditModal';
import { CustomerDeleteModal } from '../../components/customers/CustomerDeleteModal';
import { ContactChannelModal } from '../../components/customers/ContactChannelModal';
import { CRMFunnel, CRMStage } from '../../types/crm';
import * as Tooltip from '@radix-ui/react-tooltip';
import { CustomFieldDefinition } from '../../types/database';

interface ContactModalState {
  type: 'email' | 'whatsapp' | 'phone' | 'instagram' | 'facebook' | 'telegram';
  value: string;
}

interface CustomerContact {
  id: string;
  type: 'email' | 'whatsapp' | 'phone' | 'instagram' | 'instagramId' | 'facebook' | 'facebookId' | 'telegram' | 'other';
  value: string;
  label?: string | null;
}

interface CustomerTag {
  id: string;
  name: string;
  color: string;
}

// Estendendo a interface Customer para incluir tags
interface Customer {
  id: string;
  organization_id: string;
  name: string;
  stage_id: string | null;
  created_at: string;
  crm_stages: CRMStage | null;
  tags?: CustomerTag[];
  contacts?: CustomerContact[];
}

// Adicionar interface para configuração de colunas
interface ColumnConfig {
  id: string;
  name: string;
  visible: boolean;
  isCustomField?: boolean;
  field_id?: string;
}

const ITEMS_PER_PAGE = 10;

// Componente para exibir a barra de progresso do estágio
function StageProgressBar({ 
  customer, 
  funnels, 
  stages,
  onStageChange
}: { 
  customer: Customer; 
  funnels: CRMFunnel[];
  stages: CRMStage[];
  onStageChange?: (customerId: string, stageId: string) => void;
}) {
  const { t } = useTranslation(['crm', 'common']);
  const [showFunnelList, setShowFunnelList] = useState(false);
  
  // Se o cliente não tem estágio, mostrar o primeiro funil disponível
  if (!customer.stage_id && funnels.length > 0) {
    const firstFunnel = funnels[0];
    const firstFunnelStages = stages
      .filter(s => s.funnel_id === firstFunnel.id)
      .sort((a, b) => a.position - b.position);
    
    return (
      <div className="w-full">
        <div 
          className="text-sm text-gray-700 dark:text-gray-300 mb-1 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 flex items-center"
          onClick={() => setShowFunnelList(!showFunnelList)}
        >
          <span className="font-medium">{firstFunnel.name}</span>
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className={`h-4 w-4 ml-1 transition-transform ${showFunnelList ? 'rotate-180' : ''}`}
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
        
        {showFunnelList ? (
          <div className="space-y-2 mt-2">
            {funnels.map(funnel => (
              <div key={funnel.id} className="rounded-md overflow-hidden">
                <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {funnel.name}
                </div>
                <Tooltip.Provider delayDuration={200}>
                  <div className="h-6 bg-gray-100 dark:bg-gray-700 rounded-md overflow-hidden flex">
                    {stages.filter(s => s.funnel_id === funnel.id).sort((a, b) => a.position - b.position).map((stage, index, filteredStages) => {
                      const width = `${100 / filteredStages.length}%`;
                      
                      return (
                        <Tooltip.Root key={stage.id}>
                          <Tooltip.Trigger asChild>
                            <div 
                              className="h-full flex items-center justify-center transition-all relative group cursor-pointer"
                              style={{ 
                                width,
                                backgroundColor: 'transparent'
                              }}
                              onClick={() => onStageChange && onStageChange(customer.id, stage.id)}
                            >
                              {/* Efeito de hover */}
                              <div 
                                className="absolute inset-0 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                                style={{ backgroundColor: `${stage.color}60` }}
                              >
                                <span className="text-xs font-medium text-white z-10 px-1 truncate">
                                  {stage.name}
                                </span>
                              </div>
                              
                              {/* Divisor entre estágios */}
                              {index < filteredStages.length - 1 && (
                                <div className="absolute right-0 top-0 h-full w-0.5 bg-white dark:bg-gray-800 z-10"></div>
                              )}
                            </div>
                          </Tooltip.Trigger>
                          <Tooltip.Portal>
                            <Tooltip.Content
                              className="px-2 py-1 text-xs rounded bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                              sideOffset={5}
                            >
                              {stage.name}
                              <Tooltip.Arrow className="fill-gray-900 dark:fill-white" />
                            </Tooltip.Content>
                          </Tooltip.Portal>
                        </Tooltip.Root>
                      );
                    })}
                  </div>
                </Tooltip.Provider>
              </div>
            ))}
          </div>
        ) : (
          <Tooltip.Provider delayDuration={200}>
            <div className="h-6 bg-gray-100 dark:bg-gray-700 rounded-md overflow-hidden flex">
              {firstFunnelStages.map((stage, index) => {
                const width = `${100 / firstFunnelStages.length}%`;
                
                return (
                  <Tooltip.Root key={stage.id}>
                    <Tooltip.Trigger asChild>
                      <div 
                        className="h-full flex items-center justify-center transition-all relative group cursor-pointer"
                        style={{ 
                          width,
                          backgroundColor: 'transparent'
                        }}
                        onClick={() => onStageChange && onStageChange(customer.id, stage.id)}
                      >
                        {/* Efeito de hover */}
                        <div 
                          className="absolute inset-0 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                          style={{ backgroundColor: `${stage.color}60` }}
                        >
                          <span className="text-xs font-medium text-white z-10 px-1 truncate">
                            {stage.name}
                          </span>
                        </div>
                        
                        {/* Divisor entre estágios */}
                        {index < firstFunnelStages.length - 1 && (
                          <div className="absolute right-0 top-0 h-full w-0.5 bg-white dark:bg-gray-800 z-10"></div>
                        )}
                      </div>
                    </Tooltip.Trigger>
                    <Tooltip.Portal>
                      <Tooltip.Content
                        className="px-2 py-1 text-xs rounded bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                        sideOffset={5}
                      >
                        {stage.name}
                        <Tooltip.Arrow className="fill-gray-900 dark:fill-white" />
                      </Tooltip.Content>
                    </Tooltip.Portal>
                  </Tooltip.Root>
                );
              })}
            </div>
          </Tooltip.Provider>
        )}
      </div>
    );
  }
  
  // Se o cliente não tem estágio e não há funis disponíveis
  if (!customer.stage_id) {
    return <div className="text-sm text-gray-500 dark:text-gray-400">{t('crm:stages.noStageSelected')}</div>;
  }
  
  // Encontrar o estágio atual do cliente
  const currentStage = customer.crm_stages;
  
  if (!currentStage) {
    return <div className="text-sm text-gray-500 dark:text-gray-400">{t('crm:stages.stageNotFound')}</div>;
  }
  
  // Encontrar o funil do estágio
  const currentFunnel = funnels.find(f => f.id === currentStage.funnel_id);
  
  if (!currentFunnel) {
    return <div className="text-sm text-gray-500 dark:text-gray-400">{t('crm:stages.funnelNotFound')}</div>;
  }
  
  // Filtrar os estágios do funil atual
  const funnelStages = stages
    .filter(s => s.funnel_id === currentStage.funnel_id)
    .sort((a, b) => a.position - b.position);
  
  return (
    <div className="w-full">
      <div 
        className="text-sm text-gray-700 dark:text-gray-300 mb-1 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 flex items-center"
        onClick={() => setShowFunnelList(!showFunnelList)}
      >
        <span className="font-medium">{currentFunnel.name}</span>
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          className={`h-4 w-4 ml-1 transition-transform ${showFunnelList ? 'rotate-180' : ''}`}
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
      
      {showFunnelList ? (
        <div className="space-y-2 mt-2">
          {funnels.map(funnel => (
            <div key={funnel.id} className="rounded-md overflow-hidden">
              <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                {funnel.name}
              </div>
              <Tooltip.Provider delayDuration={200}>
                <div className="h-6 bg-gray-100 dark:bg-gray-700 rounded-md overflow-hidden flex">
                  {stages.filter(s => s.funnel_id === funnel.id).sort((a, b) => a.position - b.position).map((stage, index, filteredStages) => {
                    const isCurrentStage = stage.id === customer.stage_id;
                    const width = `${100 / filteredStages.length}%`;
                    
                    // Determinar a posição do estágio no funil
                    const stagePosition = filteredStages.findIndex(s => s.id === customer.stage_id);
                    const isCompleted = funnel.id === currentFunnel.id && stagePosition > -1 && index < stagePosition;
                    
                    return (
                      <Tooltip.Root key={stage.id}>
                        <Tooltip.Trigger asChild>
                          <div 
                            className="h-full flex items-center justify-center transition-all relative group cursor-pointer"
                            style={{ 
                              width,
                              backgroundColor: isCurrentStage 
                                ? stage.color 
                                : isCompleted 
                                  ? `${stage.color}80` // Cor com opacidade para estágios completados
                                  : 'transparent'
                            }}
                            onClick={() => onStageChange && onStageChange(customer.id, stage.id)}
                          >
                            {isCurrentStage && (
                              <span className="text-xs font-medium text-white z-10 px-1 truncate">
                                {stage.name}
                              </span>
                            )}
                            
                            {/* Efeito de hover */}
                            {!isCurrentStage && (
                              <div 
                                className="absolute inset-0 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                                style={{ backgroundColor: `${stage.color}60` }}
                              >
                                <span className="text-xs font-medium text-white z-10 px-1 truncate">
                                  {stage.name}
                                </span>
                              </div>
                            )}
                            
                            {/* Divisor entre estágios */}
                            {index < filteredStages.length - 1 && (
                              <div className="absolute right-0 top-0 h-full w-0.5 bg-white dark:bg-gray-800 z-10"></div>
                            )}
                          </div>
                        </Tooltip.Trigger>
                        <Tooltip.Portal>
                          <Tooltip.Content
                            className="px-2 py-1 text-xs rounded bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                            sideOffset={5}
                          >
                            {stage.name}
                            <Tooltip.Arrow className="fill-gray-900 dark:fill-white" />
                          </Tooltip.Content>
                        </Tooltip.Portal>
                      </Tooltip.Root>
                    );
                  })}
                </div>
              </Tooltip.Provider>
            </div>
          ))}
        </div>
      ) : (
        <Tooltip.Provider delayDuration={200}>
          <div className="h-6 bg-gray-100 dark:bg-gray-700 rounded-md overflow-hidden flex">
            {funnelStages.map((stage, index) => {
              const isCurrentStage = stage.id === customer.stage_id;
              const width = `${100 / funnelStages.length}%`;
              
              // Determinar a posição do estágio no funil
              const stagePosition = funnelStages.findIndex(s => s.id === customer.stage_id);
              const isCompleted = index < stagePosition;
              
              return (
                <Tooltip.Root key={stage.id}>
                  <Tooltip.Trigger asChild>
                    <div 
                      className="h-full flex items-center justify-center transition-all relative group cursor-pointer"
                      style={{ 
                        width,
                        backgroundColor: isCurrentStage 
                          ? stage.color 
                          : isCompleted 
                            ? `${stage.color}80` // Cor com opacidade para estágios completados
                            : 'transparent'
                      }}
                      onClick={() => onStageChange && onStageChange(customer.id, stage.id)}
                    >
                      {isCurrentStage && (
                        <span className="text-xs font-medium text-white z-10 px-1 truncate">
                          {stage.name}
                        </span>
                      )}
                      
                      {/* Efeito de hover */}
                      {!isCurrentStage && (
                        <div 
                          className="absolute inset-0 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                          style={{ backgroundColor: `${stage.color}60` }}
                        >
                          <span className="text-xs font-medium text-white z-10 px-1 truncate">
                            {stage.name}
                          </span>
                        </div>
                      )}
                      
                      {/* Divisor entre estágios */}
                      {index < funnelStages.length - 1 && (
                        <div className="absolute right-0 top-0 h-full w-0.5 bg-white dark:bg-gray-800 z-10"></div>
                      )}
                    </div>
                  </Tooltip.Trigger>
                  <Tooltip.Portal>
                    <Tooltip.Content
                      className="px-2 py-1 text-xs rounded bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                      sideOffset={5}
                    >
                      {stage.name}
                      <Tooltip.Arrow className="fill-gray-900 dark:fill-white" />
                    </Tooltip.Content>
                  </Tooltip.Portal>
                </Tooltip.Root>
              );
            })}
          </div>
        </Tooltip.Provider>
      )}
    </div>
  );
}

// Componente para exibir as tags do cliente
function CustomerTags({ tags }: { tags?: CustomerTag[] }) {
  const { t } = useTranslation(['customers', 'common']);
  
  if (!tags || tags.length === 0) {
    return <span className="text-gray-400 dark:text-gray-500 text-xs md:text-sm italic">{t('customers:noTags')}</span>;
  }

  return (
    <div className="flex flex-wrap gap-1">
      {tags.map((tag) => {
        // Verificar se a tag é válida
        if (!tag || typeof tag !== 'object' || !('id' in tag)) {
          return null;
        }
        
        return (
          <span
            key={tag.id}
            className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium truncate max-w-[100px] md:max-w-[150px]"
            style={{ 
              backgroundColor: `${tag.color}30`,
              color: tag.color,
              border: `1px solid ${tag.color}`
            }}
          >
            <Tag className="w-2.5 h-2.5 md:w-3 md:h-3 mr-0.5 md:mr-1 flex-shrink-0" />
            <span className="truncate">{tag.name}</span>
          </span>
        );
      })}
    </div>
  );
}

// Componente para exibir os contatos do cliente
function CustomerContacts({ contacts }: { contacts?: CustomerContact[] }) {
  const { t } = useTranslation(['customers', 'common']);
  
  if (!contacts || contacts.length === 0) {
    return <span className="text-gray-400 dark:text-gray-500 text-xs md:text-sm italic">{t('customers:noContacts')}</span>;
  }

  // Função para renderizar o ícone correto para cada tipo de contato
  const getContactIcon = (type: string) => {
    switch (type) {
      case 'email':
        return <Mail className="w-4 h-4 mr-1 flex-shrink-0" />;
      case 'whatsapp':
      case 'phone':
        return <Phone className="w-4 h-4 mr-1 flex-shrink-0" />;
      case 'instagram':
      case 'instagramId':
        return <Instagram className="w-4 h-4 mr-1 flex-shrink-0" />;
      case 'facebook':
      case 'facebookId':
        return <Facebook className="w-4 h-4 mr-1 flex-shrink-0" />;
      default:
        return <Mail className="w-4 h-4 mr-1 flex-shrink-0" />;
    }
  };

  // Função para determinar se um contato pode ser clicado para iniciar conversa
  const isClickableContact = (type: string) => {
    return ['email', 'whatsapp', 'phone', 'telegram'].includes(type);
  };

  // Função para obter o tipo de contato para o modal
  const getContactModalType = (type: string): 'email' | 'whatsapp' | 'phone' | 'instagram' | 'facebook' | 'telegram' => {
    if (type === 'email') return 'email';
    if (type === 'whatsapp') return 'whatsapp';
    if (type === 'phone') return 'phone';
    if (type === 'instagram' || type === 'instagramId') return 'instagram';
    if (type === 'facebook' || type === 'facebookId') return 'facebook';
    if (type === 'telegram') return 'telegram';
    return 'email'; // fallback
  };

  return (
    <div className="flex flex-col space-y-1">
      {contacts.map((contact) => (
        <div key={contact.id} className="flex items-center text-sm text-gray-500 dark:text-gray-400">
          {getContactIcon(contact.type)}
          <span className="mr-2 truncate" title={contact.label || undefined}>
            {contact.value}
          </span>
          {isClickableContact(contact.type) && (
            <button
              onClick={() => handleContactClick(getContactModalType(contact.type), contact.value)}
              className="p-1 text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full flex items-center ml-auto"
              title={t('customers:startConversation')}
            >
              <img 
                src={contact.type === 'email' ? "/email.svg" : 
                     contact.type === 'whatsapp' ? "/whatsapp.svg" : 
                     contact.type === 'telegram' ? "/telegram.svg" : "/chat.svg"} 
                alt={contact.type} 
                className="w-4 h-4" 
              />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

export default function Customers() {
  const { t } = useTranslation(['customers', 'common']);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { currentOrganization } = useOrganizationContext();
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [contactModalState, setContactModalState] = useState<ContactModalState | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [funnels, setFunnels] = useState<CRMFunnel[]>([]);
  const [stages, setStages] = useState<CRMStage[]>([]);
  const [loadingCRM, setLoadingCRM] = useState(true);
  const [updatingStage, setUpdatingStage] = useState(false);
  // Estado para controlar a visualização em dispositivos móveis
  const [isMobileView, setIsMobileView] = useState(window.innerWidth < 768);
  // Estados para os filtros
  const [showFilters, setShowFilters] = useState(false);
  const [selectedFunnelId, setSelectedFunnelId] = useState<string | null>(null);
  const [selectedStageId, setSelectedStageId] = useState<string | null>(null);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<CustomerTag[]>([]);
  const [loadingTags, setLoadingTags] = useState(false);
  // Estados para gerenciar colunas personalizadas
  const [customFieldDefinitions, setCustomFieldDefinitions] = useState<CustomFieldDefinition[]>([]);
  const [loadingCustomFields, setLoadingCustomFields] = useState(false);
  const [columnConfigs, setColumnConfigs] = useState<ColumnConfig[]>([]);
  const [showColumnSelector, setShowColumnSelector] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ column: string; direction: 'asc' | 'desc' } | null>(null);
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, Record<string, string>>>({});

  // Implementar debounce para o termo de pesquisa
  useEffect(() => {
    const timerId = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500); // 500ms de delay

    return () => {
      clearTimeout(timerId);
    };
  }, [searchTerm]);

  // Efeito para carregar clientes quando a organização, página ou termo de pesquisa com debounce mudam
  useEffect(() => {
    if (currentOrganization) {
      loadCustomers();
      // Resetar para a primeira página quando o termo de pesquisa mudar
      if (currentPage !== 1 && debouncedSearchTerm !== '') {
        setCurrentPage(1);
      }
    }
  }, [currentOrganization, currentPage, debouncedSearchTerm]);

  // Efeito para recarregar clientes quando os filtros mudam
  useEffect(() => {
    if (currentOrganization) {
      loadCustomers();
    }
  }, [selectedFunnelId, selectedStageId, selectedTagIds]);

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

  // Efeito separado para carregar funis e estágios apenas quando a organização muda
  useEffect(() => {
    if (currentOrganization) {
      loadFunnelsAndStages();
      loadAvailableTags();
    }
  }, [currentOrganization]);

  const loadFunnelsAndStages = async () => {
    try {
      setLoadingCRM(true);
      
      // Carregar os funis
      const { data: funnelsData, error: funnelsError } = await supabase
        .from('crm_funnels')
        .select('*')
        .eq('organization_id', currentOrganization?.id)
        .order('name');
        
      if (funnelsError) throw funnelsError;
      
      // Carregar os estágios
      const { data: stagesData, error: stagesError } = await supabase
        .from('crm_stages')
        .select('*')
        .order('position');
        
      if (stagesError) throw stagesError;
      
      setFunnels(funnelsData || []);
      setStages(stagesData || []);
    } catch (error) {
      console.error('Erro ao carregar funis e estágios:', error);
    } finally {
      setLoadingCRM(false);
    }
  };

  // Função para carregar todas as tags disponíveis
  const loadAvailableTags = async () => {
    if (!currentOrganization) return;
    
    try {
      setLoadingTags(true);
      
      const { data, error } = await supabase
        .from('tags')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .order('name');
        
      if (error) throw error;
      
      setAvailableTags(data || []);
    } catch (error) {
      console.error('Erro ao carregar tags:', error);
    } finally {
      setLoadingTags(false);
    }
  };

  // Função para atualizar o estágio do cliente silenciosamente
  const handleStageChange = async (customerId: string, stageId: string) => {
    if (!currentOrganization || updatingStage) return;
    
    try {
      setUpdatingStage(true);
      
      // Atualizar o estágio do cliente no banco de dados
      const { error: updateError } = await supabase
        .from('customers')
        .update({ stage_id: stageId })
        .eq('id', customerId)
        .eq('organization_id', currentOrganization.id);
        
      if (updateError) throw updateError;
      
      // Registrar a mudança de estágio no histórico
      await supabase
        .from('customer_stage_history')
        .insert({
          customer_id: customerId,
          stage_id: stageId,
          organization_id: currentOrganization.id
        });
      
      // Atualizar a lista de clientes localmente
      setCustomers(prevCustomers => 
        prevCustomers.map(customer => {
          if (customer.id === customerId) {
            // Encontrar o estágio para atualizar o objeto crm_stages
            const newStage = stages.find(s => s.id === stageId);
            return {
              ...customer,
              stage_id: stageId,
              crm_stages: newStage || null
            };
          }
          return customer;
        })
      );
      
      // Mostrar feedback visual temporário
      const feedbackElement = document.createElement('div');
      feedbackElement.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded shadow-lg z-50';
      feedbackElement.textContent = t('common:saved');
      document.body.appendChild(feedbackElement);
      
      setTimeout(() => {
        feedbackElement.remove();
      }, 2000);
      
    } catch (error) {
      console.error('Erro ao atualizar estágio do cliente:', error);
      
      // Mostrar mensagem de erro
      const errorElement = document.createElement('div');
      errorElement.className = 'fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded shadow-lg z-50';
      errorElement.textContent = t('common:error');
      document.body.appendChild(errorElement);
      
      setTimeout(() => {
        errorElement.remove();
      }, 2000);
      
    } finally {
      setUpdatingStage(false);
    }
  };

  // Função para carregar definições de campos personalizados
  const loadCustomFieldDefinitions = async () => {
    if (!currentOrganization) return;
    
    try {
      setLoadingCustomFields(true);
      
      const { data, error } = await supabase
        .from('custom_fields_definition')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .order('name');
        
      if (error) throw error;
      
      setCustomFieldDefinitions(data || []);
      
      // Verificar se já existem configurações salvas
      const savedConfigs = localStorage.getItem(`columnConfigs_${currentOrganization.id}`);
      
      if (savedConfigs) {
        // Usar as configurações salvas
        const parsedConfigs = JSON.parse(savedConfigs);
        
        // Verificar se a coluna de progresso do estágio existe
        const hasStageProgressColumn = parsedConfigs.some((c: any) => c.id === 'stage_progress');
        
        // Se não existir, adicionar
        if (!hasStageProgressColumn) {
          parsedConfigs.push({
            id: 'stage_progress',
            name: 'Progresso do Estágio',
            visible: true
          });
        }
        
        // Verificar se há novos campos personalizados que não estão nas configurações salvas
        const existingCustomFieldIds = parsedConfigs
          .filter((c: any) => c.isCustomField && c.field_id)
          .map((c: any) => c.field_id);
        
        // Adicionar apenas os novos campos personalizados
        const newCustomColumns = (data || [])
          .filter(field => !existingCustomFieldIds.includes(field.id))
          .map(field => ({
            id: `custom_${field.id}`,
            name: field.name,
            visible: false,
            isCustomField: true,
            field_id: field.id
          }));
        
        if (newCustomColumns.length > 0 || !hasStageProgressColumn) {
          // Adicionar novos campos às configurações existentes
          const updatedConfigs = [...parsedConfigs, ...newCustomColumns];
          setColumnConfigs(updatedConfigs);
          // Salvar as configurações atualizadas
          localStorage.setItem(`columnConfigs_${currentOrganization.id}`, JSON.stringify(updatedConfigs));
        } else {
          // Usar as configurações existentes sem alterações
          setColumnConfigs(parsedConfigs);
        }
      } else {
        // Não há configurações salvas, criar novas
        const defaultColumns = [
          { id: 'name', name: t('customers:name'), visible: true },
          { id: 'stage', name: t('crm:stage'), visible: true },
          { id: 'stage_progress', name: t('crm:stageProgress'), visible: true },
          { id: 'tags', name: t('customers:tags'), visible: true },
          { id: 'contacts', name: t('customers:contacts'), visible: true },
        ];
        
        // Adicionar colunas personalizadas
        const customColumns = (data || []).map(field => ({
          id: `custom_${field.id}`,
          name: field.name,
          visible: false,
          isCustomField: true,
          field_id: field.id
        }));
        
        const newConfigs = [...defaultColumns, ...customColumns];
        setColumnConfigs(newConfigs);
        // Salvar as novas configurações
        localStorage.setItem(`columnConfigs_${currentOrganization.id}`, JSON.stringify(newConfigs));
      }
      
    } catch (error) {
      console.error('Erro ao carregar definições de campos personalizados:', error);
    } finally {
      setLoadingCustomFields(false);
    }
  };
  
  // Otimizando a função loadCustomFieldValues para evitar carregamentos repetidos
  const loadCustomFieldValues = async (customerIds: string[]) => {
    if (!currentOrganization || customerIds.length === 0 || customFieldDefinitions.length === 0) {
      return;
    }
    
    try {
      setLoadingCustomFields(true);
      
      // Armazenar IDs dos campos personalizados para a consulta
      const fieldIds = customFieldDefinitions.map(def => def.id);
      
      // Consulta única para obter todos os valores de campos personalizados
      const { data: fieldValues, error } = await supabase
        .from('customer_field_values')
          .select('*')
        .in('customer_id', customerIds)
        .in('field_definition_id', fieldIds);

      if (error) {
        console.error('Erro ao carregar valores de campos personalizados:', error);
        return;
      }

      // Organizar os valores por cliente e campo para acesso rápido
      const valuesByCustomerAndField: Record<string, Record<string, any>> = {};
      
      fieldValues?.forEach(value => {
        if (!valuesByCustomerAndField[value.customer_id]) {
          valuesByCustomerAndField[value.customer_id] = {};
        }
        valuesByCustomerAndField[value.customer_id][value.field_definition_id] = value.value;
      });

      setCustomFieldValues(valuesByCustomerAndField);
    } catch (error) {
      console.error('Erro ao processar valores de campos personalizados:', error);
    } finally {
      setLoadingCustomFields(false);
    }
  };
  
  // Função para salvar configurações de colunas
  const saveColumnConfigs = (configs: ColumnConfig[]) => {
    if (!currentOrganization) return;
    localStorage.setItem(`columnConfigs_${currentOrganization.id}`, JSON.stringify(configs));
    setColumnConfigs(configs);
  };
  
  // Função para alternar visibilidade de uma coluna
  const toggleColumnVisibility = (columnId: string) => {
    const newConfigs = columnConfigs.map(col => 
      col.id === columnId ? { ...col, visible: !col.visible } : col
    );
    saveColumnConfigs(newConfigs);
  };
  
  // Função para resetar configurações de colunas
  const resetColumnConfigs = () => {
    if (!currentOrganization) return;
    
    // Remover configurações do localStorage
    localStorage.removeItem(`columnConfigs_${currentOrganization.id}`);
    
    // Recriar configurações padrão
    const defaultColumns = [
      { id: 'name', name: t('customers:name'), visible: true },
      { id: 'stage', name: t('crm:stage'), visible: true },
      { id: 'stage_progress', name: t('crm:stageProgress'), visible: true },
      { id: 'tags', name: t('customers:tags'), visible: true },
      { id: 'contacts', name: t('customers:contacts'), visible: true },
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
    
    // Mostrar feedback visual temporário
    const feedbackElement = document.createElement('div');
    feedbackElement.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded shadow-lg z-50';
    feedbackElement.textContent = t('customers:settingsReset');
    document.body.appendChild(feedbackElement);
    
    setTimeout(() => {
      feedbackElement.remove();
    }, 2000);
  };
  
  // Função para ordenar clientes
  const handleSort = (columnId: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    
    if (sortConfig && sortConfig.column === columnId) {
      direction = sortConfig.direction === 'asc' ? 'desc' : 'asc';
    }
    
    setSortConfig({ column: columnId, direction });
    
    // Resetar para a primeira página ao mudar a ordenação
    setCurrentPage(1);
    
    // Recarregar os clientes com a nova ordenação
    loadCustomers(false, { column: columnId, direction });
  };
  
  // Função para obter o valor de um campo personalizado
  const getCustomFieldValue = (customerId: string, fieldId: string) => {
    return customFieldValues[customerId]?.[fieldId] || '';
  };
  
  // Efeito para carregar definições de campos personalizados
  useEffect(() => {
    if (currentOrganization) {
      loadCustomFieldDefinitions();
    }
  }, [currentOrganization]);
  
  // Ordenar clientes com base na configuração de ordenação
  const sortedCustomers = React.useMemo(() => {
    if (!sortConfig) return customers;
    
    return [...customers].sort((a, b) => {
      if (sortConfig.column === 'name') {
        return sortConfig.direction === 'asc' 
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name);
      }
      
      if (sortConfig.column === 'stage') {
        const stageA = a.crm_stages?.name || '';
        const stageB = b.crm_stages?.name || '';
        return sortConfig.direction === 'asc'
          ? stageA.localeCompare(stageB)
          : stageB.localeCompare(stageA);
      }
      
      // Ordenação para campos personalizados
      if (sortConfig.column.startsWith('custom_')) {
        const fieldId = columnConfigs.find(col => col.id === sortConfig.column)?.field_id || '';
        const valueA = getCustomFieldValue(a.id, fieldId);
        const valueB = getCustomFieldValue(b.id, fieldId);
        
        return sortConfig.direction === 'asc'
          ? valueA.localeCompare(valueB)
          : valueB.localeCompare(valueA);
      }
      
      return 0;
    });
  }, [customers, sortConfig, customFieldValues, columnConfigs]);

  async function loadCustomers(
    isSilent = false, 
    sortOptions: { column: string; direction: 'asc' | 'desc' } | null = sortConfig
  ) {
    if (!currentOrganization) return;

    if (!isSilent) {
      setLoading(true);
    }
    
    try {
      let query = supabase
        .from('customers')
        .select(`
          *,
          crm_stages (
            id,
            name,
            color,
            funnel_id,
            position
          )
        `, { count: 'exact' })
        .eq('organization_id', currentOrganization.id);

      // Apply search filter if there's a search term
      if (debouncedSearchTerm) {
        query = query.or(`name.ilike.%${debouncedSearchTerm}%`);
      }

      // Aplicar filtro de estágio se selecionado
      if (selectedStageId) {
        query = query.eq('stage_id', selectedStageId);
      } 
      // Aplicar filtro de funil se selecionado (e não tiver estágio específico)
      else if (selectedFunnelId) {
        // Buscar todos os estágios do funil selecionado
        const funnelStages = stages.filter(stage => stage.funnel_id === selectedFunnelId);
        const stageIds = funnelStages.map(stage => stage.id);
        
        if (stageIds.length > 0) {
          query = query.in('stage_id', stageIds);
        }
      }

      // Aplicar ordenação com base na configuração
      if (sortOptions) {
        if (sortOptions.column === 'name') {
          // Ordenação direta pelo nome
          query = query.order('name', { ascending: sortOptions.direction === 'asc' });
        } 
        else if (sortOptions.column === 'stage') {
          // Ordenação pelo nome do estágio através da relação
          query = query.order('crm_stages(name)', { ascending: sortOptions.direction === 'asc' });
        }
        // Para campos personalizados, a ordenação será aplicada após carregar os dados
        // pois não podemos ordenar diretamente por campos em outras tabelas
      } else {
        // Ordenação padrão por nome se não houver configuração específica
        query = query.order('name', { ascending: true });
      }

      // Add pagination
      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;
      
      const { data, count, error } = await query.range(from, to);

      if (error) throw error;
      
      // Carregar as tags para cada cliente em uma única consulta
      if (data && data.length > 0) {
        const customerIds = data.map(customer => customer.id);
        
        // Consulta para obter as tags dos clientes
        const { data: customerTagsData, error: tagsError } = await supabase
          .from('customer_tags')
          .select(`
            customer_id,
            tag_id,
            tag:tags (
              id,
              name,
              color
            )
          `)
          .in('customer_id', customerIds);
          
        if (tagsError) throw tagsError;
        
        // Consulta para obter os contatos dos clientes
        const { data: customerContactsData, error: contactsError } = await supabase
          .from('customer_contacts')
          .select('*')
          .in('customer_id', customerIds);
          
        if (contactsError) throw contactsError;
        
        // Agrupar as tags por cliente
        const tagsByCustomer: Record<string, CustomerTag[]> = {};
        
        customerTagsData?.forEach(relation => {
          if (!tagsByCustomer[relation.customer_id]) {
            tagsByCustomer[relation.customer_id] = [];
          }
          
          // Verificar se a tag existe e é um objeto válido
          if (relation.tag && typeof relation.tag === 'object' && 'id' in relation.tag) {
            tagsByCustomer[relation.customer_id].push({
              id: relation.tag.id as string,
              name: relation.tag.name as string,
              color: relation.tag.color as string
            });
          }
        });
        
        // Agrupar os contatos por cliente
        const contactsByCustomer: Record<string, CustomerContact[]> = {};
        
        customerContactsData?.forEach(contact => {
          if (!contactsByCustomer[contact.customer_id]) {
            contactsByCustomer[contact.customer_id] = [];
          }
          
          contactsByCustomer[contact.customer_id].push({
            id: contact.id,
            type: contact.type,
            value: contact.value,
            label: contact.label
          });
        });
        
        // Adicionar as tags e contatos aos clientes
        let customersWithRelations = data.map(customer => ({
          ...customer,
          tags: tagsByCustomer[customer.id] || [],
          contacts: contactsByCustomer[customer.id] || []
        }));
        
        // Filtrar por tags selecionadas, se houver
        if (selectedTagIds.length > 0) {
          customersWithRelations = customersWithRelations.filter(customer => {
            // Verificar se o cliente tem pelo menos uma das tags selecionadas
            return customer.tags?.some((tag: CustomerTag) => selectedTagIds.includes(tag.id));
          });
        }
        
        // Filtrar por termo de busca em contatos, se houver
        if (debouncedSearchTerm) {
          const searchTermLower = debouncedSearchTerm.toLowerCase();
          const filteredByContacts = customersWithRelations.filter(customer => 
            // Verificar se algum contato contém o termo de busca
            customer.contacts?.some((contact: CustomerContact) => 
              contact.value.toLowerCase().includes(searchTermLower)
            )
          );
          
          // Combinar os resultados filtrados por nome (já feito na query) com os filtrados por contato
          const customerIdsFilteredByName = new Set(customersWithRelations.map(c => c.id));
          const customerIdsFilteredByContacts = new Set(filteredByContacts.map(c => c.id));
          
          // União dos conjuntos
          const allFilteredCustomerIds = new Set([...customerIdsFilteredByName, ...customerIdsFilteredByContacts]);
          
          customersWithRelations = customersWithRelations.filter(customer => 
            allFilteredCustomerIds.has(customer.id)
          );
        }
        
        // Usar os mesmos IDs de clientes para carregar valores de campos personalizados
        // Não redeclarar customerIds aqui, usar a variável já existente
        if (customFieldDefinitions.length > 0) {
          await loadCustomFieldValues(customerIds);
        }
        
        setCustomers(customersWithRelations);
        setTotalCustomers(selectedTagIds.length > 0 ? customersWithRelations.length : (count || 0));
      } else {
      setCustomers(data || []);
      setTotalCustomers(count || 0);
      }
    } catch (error) {
      console.error('Error loading customers:', error);
      setError(t('common:error'));
    } finally {
      if (!isSilent) {
        setLoading(false);
      }
    }
  }

  const handleContactClick = (type: 'email' | 'whatsapp' | 'phone' | 'instagram' | 'facebook' | 'telegram', value: string) => {
      setContactModalState({ type, value });
      setShowContactModal(true);
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    // Não resetamos a página aqui, isso será feito no efeito do debouncedSearchTerm
  };

  const totalPages = Math.ceil(totalCustomers / ITEMS_PER_PAGE);

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(prev => prev + 1);
    }
  };

  // Função para limpar todos os filtros
  const clearFilters = () => {
    setSelectedFunnelId(null);
    setSelectedStageId(null);
    setSelectedTagIds([]);
    setCurrentPage(1);
    // O useEffect cuidará de recarregar os clientes
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
    setCurrentPage(1);
  };

  if (!currentOrganization) {
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
    <div className="p-4 md:p-6 max-w-full overflow-hidden">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
          {t('customers:title')}
        </h1>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowColumnSelector(!showColumnSelector)}
            className={`inline-flex items-center px-3 py-1.5 md:px-4 md:py-2 border rounded-md shadow-sm text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
              showColumnSelector
                ? "border-blue-500 text-white bg-blue-500 hover:bg-blue-600"
                : "border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
            }`}
            title={t('customers:configureColumns')}
          >
            <Settings className="w-4 h-4 md:w-5 md:h-5 mr-1 md:mr-2" />
            <span className="whitespace-nowrap">{t('customers:columns')}</span>
          </button>
          <Link
            to="/app/crm"
            className="inline-flex items-center px-3 py-1.5 md:px-4 md:py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <GitMerge className="w-4 h-4 md:w-5 md:h-5 mr-1 md:mr-2" />
            <span className="whitespace-nowrap">{t('customers:viewCRM')}</span>
          </Link>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`inline-flex items-center px-3 py-1.5 md:px-4 md:py-2 border rounded-md shadow-sm text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
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
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center px-3 py-1.5 md:px-4 md:py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Plus className="w-4 h-4 md:w-5 md:h-5 mr-1 md:mr-2" />
            <span className="whitespace-nowrap">{t('customers:addCustomer')}</span>
          </button>
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
                    setCurrentPage(1);
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
                      setCurrentPage(1);
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
                onClick={resetColumnConfigs}
                className="text-sm text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
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
                      setCurrentPage(1);
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
                      setCurrentPage(1);
                    }}
                    className="text-blue-500 hover:text-blue-700 dark:text-blue-300 dark:hover:text-blue-100"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
              
              {selectedTagIds.length > 0 && (
                <div className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 dark:bg-blue-800/40 text-blue-800 dark:text-blue-200">
                  <span className="mr-1">{t('customers:tags')}: {selectedTagIds.length}</span>
                  <button 
                    onClick={() => {
                      setSelectedTagIds([]);
                      setCurrentPage(1);
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
                          {sortConfig?.column === 'name' && (
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
                              {sortConfig?.column === column.id && (
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
                                  {!loadingCRM && funnels.length > 0 && stages.length > 0 && (
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
                                  <CustomerContacts contacts={customer.contacts} />
                                </div>
                              )}
                              
                              {column.isCustomField && column.field_id && (
                                <div className="text-sm text-gray-900 dark:text-white">
                                  {getCustomFieldValue(customer.id, column.field_id) || '-'}
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
              <div className="grid grid-cols-1 gap-4 p-4">
                {sortedCustomers.map((customer) => (
                  <div 
                    key={customer.id} 
                    className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm overflow-hidden"
                  >
                    <div className="p-4">
                      <div className="flex justify-between items-start mb-3">
                        <h3 className="text-base font-semibold text-gray-900 dark:text-white truncate pr-2">
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
                      
                      {/* Funil e estágio */}
                      <div className="mb-3">
                        <StageProgressBar 
                          customer={customer} 
                          funnels={funnels} 
                          stages={stages}
                          onStageChange={handleStageChange}
                        />
                      </div>
                      
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
        <CustomerRegistrationModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => loadCustomers(true)}
        />
      )}

      {/* Edit Customer Modal */}
      {showEditModal && selectedCustomer && (
        <CustomerEditModal
          customer={selectedCustomer as any}
          onClose={() => {
            setShowEditModal(false);
            setSelectedCustomer(null);
          }}
          onSuccess={() => {
            loadCustomers(true)
          }}
        />
      )}

      {/* Delete Customer Modal */}
      {showDeleteModal && selectedCustomer && (
        <CustomerDeleteModal
          customer={selectedCustomer as any}
          onClose={() => {
            setShowDeleteModal(false);
            setSelectedCustomer(null);
          }}
          onSuccess={() => loadCustomers(true)}
        />
      )}

      {/* Contact Channel Modal */}
      {showContactModal && contactModalState && (
        <ContactChannelModal
          contactType={contactModalState.type}
          contactValue={contactModalState.value}
          onClose={() => {
            setShowContactModal(false);
            setContactModalState(null);
          }}
        />
      )}
    </div>
  );
}