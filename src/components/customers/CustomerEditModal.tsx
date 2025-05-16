import React, { useState, useEffect, useRef } from 'react';
import { X, Loader2, Plus, Calendar } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabase';
import { Customer, ContactType, Chat } from '../../types/database';
import { useAuthContext } from '../../contexts/AuthContext';
import { updateCustomerTags } from '../../services/customerService';
import * as Tooltip from '@radix-ui/react-tooltip';
import { CustomFieldsSection } from '../custom-fields/CustomFieldsSection';
import { countryCodes } from '../../utils/countryCodes';
import { ContactsFormSection, ContactFormData, formatContactValue } from './ContactsFormSection';
import { useFunnels, useTags } from '../../hooks/useQueryes';
import { CustomerChatsList } from '../../components/chat/CustomerChatsList';
import { useTasksByCustomer } from '../../hooks/useTasks';
import { TaskCard } from '../tasks/TaskCard';
import { TaskModal } from '../tasks/TaskModal';
import { TaskWithRelations } from '../../types/tasks';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';

// Interface para contatos do cliente
interface CustomerContact {
  id: string;
  type: string;
  value: string;
  label: string | null;
  customer_id: string;
}

// Interface para agendamentos
interface Appointment {
  id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  customer_id: string;
  created_by: string;
  status: 'scheduled' | 'completed' | 'cancelled' | 'no_show';
  created_at: string;
}

interface CustomerEditModalProps {
  customer: Customer;
  onClose: () => void;
  onSuccess: (silentRefresh?: boolean) => void;
}

export function CustomerEditModal({ customer, onClose, onSuccess }: CustomerEditModalProps) {
  // Log para depuração
  // console.log('CustomerEditModal - Cliente recebido:', customer);
  
  const { t } = useTranslation(['customers', 'common', 'crm', 'chats', 'tasks', 'schedules', 'appointments']);
  const { currentOrganizationMember } = useAuthContext();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Estado para controlar a tab ativa
  const [activeTab, setActiveTab] = useState<'general' | 'chats' | 'tasks' | 'schedules'>('general');
  
  // Estado para armazenar os atendimentos do cliente
  const [chats, setChats] = useState<Chat[]>([]);
  const [loadingChats, setLoadingChats] = useState(false);
  const [chatsError, setChatsError] = useState('');
  
  // Estado para tarefas - modal
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  
  // Usando o hook useFunnels para carregar funis e estágios
  const { data: funnelsData, isLoading: loadingFunnels } = useFunnels(currentOrganizationMember?.organization.id);
  const funnels = funnelsData || [];
  const stages = React.useMemo(() => {
    return funnels.flatMap(funnel => funnel.stages || []);
  }, [funnels]);
  
  // Usando o hook useTags para carregar tags
  const { data: tagsData, isLoading: loadingTags } = useTags(currentOrganizationMember?.organization.id);
  const tags = tagsData || [];
  
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#3B82F6');
  const [showNewTagForm, setShowNewTagForm] = useState(false);
  const [showAvailableTags, setShowAvailableTags] = useState(false);
  const [creatingTag, setCreatingTag] = useState(false);
  
  // Estado para gerenciar os contatos
  const [contacts, setContacts] = useState<ContactFormData[]>([]);
  
  // Referência para detectar cliques fora do dropdown
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Referência para o dropdown de tags disponíveis
  const tagsDropdownRef = useRef<HTMLDivElement>(null);
  
  // Referência para controlar operações de tag em andamento
  const tagOperationInProgress = useRef(false);
  
  const [isLoadingCustomerData, setIsLoadingCustomerData] = useState(false);
  const [customerData, setCustomerData] = useState<Customer | null>(null);
  
  // Efeito para fechar dropdowns quando clicar fora deles
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        // Fechar todos os dropdowns
        setContacts(prevContacts => 
          prevContacts.map(contact => ({
            ...contact,
            showTypeDropdown: false
          }))
        );
      }

      // Fechar dropdown de tags disponíveis
      if (tagsDropdownRef.current && !tagsDropdownRef.current.contains(event.target as Node)) {
        setShowAvailableTags(false);
        setShowNewTagForm(false);
      }
    }

    // Adicionar event listener
    document.addEventListener('mousedown', handleClickOutside);
    
    // Limpar event listener
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // Função para extrair o código do país de um número de WhatsApp
  const getWhatsAppCountryCode = (value: string): string => {
    for (const country of countryCodes) {
      if (value.startsWith(country.dial_code)) {
        return country.code;
      }
    }
    return 'BR'; // Padrão para Brasil
  };

  // Função para extrair o número sem o código do país
  const getWhatsAppNumberWithoutCode = (value: string): string => {
    for (const country of countryCodes) {
      if (value.startsWith(country.dial_code)) {
        return value.slice(country.dial_code.length);
      }
    }
    return value;
  };
  
  // Estado para o formulário
  const [formData, setFormData] = useState({
    name: customer.name,
    funnelId: '',
    stageId: customer.stage_id || '',
    whatsappNumber: '',
    showFunnelDropdown: false,
    showFunnelSelector: false
  });

  // Efeito para inicializar as tags selecionadas
  useEffect(() => {
    if (customer.tags) {
      const tagIds = customer.tags.map(tagRelation => tagRelation.tag_id);
      // Só atualizar as tags se não houver tags selecionadas
      if (selectedTags.length === 0) {
        setSelectedTags(tagIds);
      }
    }
  }, [customer.tags]);

  // Efeito para inicializar os contatos
  useEffect(() => {
    if (customer.contacts) {
      const formattedContacts = customer.contacts.map(contact => {
        const isWhatsApp = contact.type === ContactType.WHATSAPP;
        const countryCode = isWhatsApp ? getWhatsAppCountryCode(contact.value) : 'BR';
        
        return {
          id: contact.id,
          type: contact.type as ContactType,
          value: isWhatsApp ? getWhatsAppNumberWithoutCode(contact.value) : contact.value,
          label: contact.label || null,
          isNew: false,
          countryCode,
          showTypeDropdown: false
        };
      });
      
      setContacts(formattedContacts);
    }
  }, [customer.contacts]);

  // Efeito para definir o funil com base no estágio do cliente
  useEffect(() => {
    if (!loadingFunnels && stages.length > 0 && customer.stage_id) {
      const customerStage = stages.find(stage => stage.id === customer.stage_id);
      if (customerStage) {
        const funnel = funnels.find(f => f.id === customerStage.funnel_id);
        if (funnel) {
          setFormData(prev => ({ ...prev, funnelId: funnel.id }));
        }
      }
    }
  }, [customer.stage_id, stages, funnels, loadingFunnels]);

  const handleTagToggle = (tagId: string) => {
    // Evitar múltiplas operações simultâneas
    if (tagOperationInProgress.current) {
      // console.log('Operação de tag em andamento, ignorando nova solicitação');
      return;
    }
    
    tagOperationInProgress.current = true;
    
    setSelectedTags(prev => {
      const isSelected = prev.includes(tagId);
      const newSelectedTags = isSelected
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId];
      
      // console.log(`Tag ${tagId} ${isSelected ? 'removida' : 'adicionada'}. Tags selecionadas:`, newSelectedTags);
      
      // Salvar silenciosamente após alterar as tags
      if (currentOrganizationMember && customer.id) {
        // Verificar se a operação está em andamento
        const feedbackElement = document.createElement('div');
        feedbackElement.className = 'fixed top-4 right-4 bg-blue-500 text-white px-4 py-2 rounded shadow-lg z-50';
        feedbackElement.textContent = isSelected ? 'Removendo tag...' : 'Adicionando tag...';
        document.body.appendChild(feedbackElement);
        
        // Atualizar as tags no banco de dados
        updateCustomerTags(customer.id, newSelectedTags, currentOrganizationMember.organization.id)
          .then(() => {
            // console.log('Tags atualizadas com sucesso');
            // Chamar onSuccess com silentRefresh=true para atualizar a lista de clientes sem fechar o modal
            onSuccess(true);
            
            // Atualizar feedback visual
            feedbackElement.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded shadow-lg z-50';
            feedbackElement.textContent = isSelected ? 'Tag removida' : 'Tag adicionada';
            
            setTimeout(() => {
              feedbackElement.remove();
            }, 1500);
          })
          .catch(error => {
            console.error('Erro ao atualizar tags:', error);
            
            // Reverter a alteração no estado local
            setSelectedTags(isSelected ? [...prev, tagId] : prev.filter(id => id !== tagId));
            
            // Mostrar mensagem de erro
            feedbackElement.className = 'fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded shadow-lg z-50';
            feedbackElement.textContent = `Erro ao ${isSelected ? 'remover' : 'adicionar'} tag: ${error.message || 'Tente novamente'}`;
            
            setTimeout(() => {
              feedbackElement.remove();
            }, 3000);
          })
          .finally(() => {
            // Liberar o bloqueio após um pequeno atraso para evitar cliques rápidos
            setTimeout(() => {
              tagOperationInProgress.current = false;
            }, 300);
          });
      } else {
        // Se não houver organização ou cliente, liberar o bloqueio imediatamente
        tagOperationInProgress.current = false;
      }
      
      return newSelectedTags;
    });
  };

  // Função para lidar com tecla Enter nos campos
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      saveCustomer();
    }
  };

  const handleCreateTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrganizationMember || !newTagName.trim()) return;
    
    // Evitar múltiplas operações simultâneas
    if (tagOperationInProgress.current) {
      // console.log('Operação de tag em andamento, ignorando nova solicitação');
      return;
    }
    
    tagOperationInProgress.current = true;
    setCreatingTag(true);
    
    try {
      const { data, error } = await supabase
        .from('tags')
        .insert([
          {
            name: newTagName.trim(),
            color: newTagColor,
            organization_id: currentOrganizationMember.organization.id
          }
        ])
        .select()
        .single();

      if (error) throw error;
      
      // Verificar se a tag já está selecionada antes de adicioná-la
      if (!selectedTags.includes(data.id)) {
        // Adicionar a nova tag às tags selecionadas
        const newSelectedTags = [...selectedTags, data.id];
        setSelectedTags(newSelectedTags);
        
        // console.log('Nova tag criada e selecionada:', data);
        
        // Salvar silenciosamente após criar a tag
        if (customer.id) {
          try {
            await updateCustomerTags(customer.id, newSelectedTags, currentOrganizationMember.organization.id);
            onSuccess(true);
            
            // Mostrar feedback visual temporário
            const feedbackElement = document.createElement('div');
            feedbackElement.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded shadow-lg z-50';
            feedbackElement.textContent = 'Tag criada e adicionada';
            document.body.appendChild(feedbackElement);
            
            setTimeout(() => {
              feedbackElement.remove();
            }, 1500);
          } catch (updateError: unknown) {
            console.error('Erro ao adicionar novas tags:', updateError);
            
            // Mostrar mensagem de erro
            const feedbackElement = document.createElement('div');
            feedbackElement.className = 'fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded shadow-lg z-50';
            feedbackElement.textContent = `Erro ao adicionar novas tags: ${updateError instanceof Error ? updateError.message : 'Tente novamente'}`;
            document.body.appendChild(feedbackElement);
            
            setTimeout(() => {
              feedbackElement.remove();
            }, 3000);
          }
        }
      }
      
      // Limpar o formulário
      setNewTagName('');
      setNewTagColor('#3B82F6');
      setShowNewTagForm(false);
    } catch (error: unknown) {
      console.error('Erro ao criar tag:', error);
      setError(t('common:error'));
      
      // Mostrar mensagem de erro
      const feedbackElement = document.createElement('div');
      feedbackElement.className = 'fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded shadow-lg z-50';
      feedbackElement.textContent = `Erro ao criar tag: ${error instanceof Error ? error.message : 'Tente novamente'}`;
      document.body.appendChild(feedbackElement);
      
      setTimeout(() => {
        feedbackElement.remove();
      }, 3000);
    } finally {
      setCreatingTag(false);
      // Liberar o bloqueio após um pequeno atraso
      setTimeout(() => {
        tagOperationInProgress.current = false;
      }, 300);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); // Garantir que a página não seja recarregada
    // console.log('CustomerEditModal - handleSubmit chamado, preventDefault aplicado');
    await saveCustomer();
  };

  // Função para salvar o cliente, com parâmetros opcionais para o estágio
  const saveCustomer = async (overrideStageId?: string, isSilent: boolean = false) => {
    // console.log('CustomerEditModal - saveCustomer chamado');
    
    if (!currentOrganizationMember) {
      setError('Organização não encontrada');
      return;
    }
    
    if (!formData.name.trim()) {
      setError('Nome do cliente é obrigatório');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      // Determinar o ID do estágio a ser usado
      const stageId = overrideStageId || formData.stageId;
      
      // Atualizar informações básicas do cliente
      const { error: updateError } = await supabase
        .from('customers')
        .update({
          name: formData.name.trim(),
          stage_id: stageId || null,
          sale_price: customerData?.sale_price === undefined ? null : customerData?.sale_price
        })
        .eq('id', customer.id)
        .select()
        .single();
        
      if (updateError) throw updateError;
      
      // Gerenciar contatos do cliente
      const existingContactIds = new Set<string>();
      const contactsToKeep = new Set<string>();
      
      // Buscar contatos existentes
      const { data: existingContacts, error: contactsError } = await supabase
        .from('customer_contacts')
        .select('id, type, value')
        .eq('customer_id', customer.id);
        
      if (contactsError) throw contactsError;
      
      // Mapear IDs de contatos existentes
      existingContacts?.forEach(contact => {
        existingContactIds.add(contact.id);
      });
      
      // Processar cada contato do formulário
      for (const contact of contacts) {
        if (!contact.value.trim()) continue;
        
        // Formatar o valor do contato com o código do país se necessário
        const formattedValue = formatContactValue(contact);
        
        if (contact.id) {
          // Contato existente - atualizar
          contactsToKeep.add(contact.id);
          
          const { error: updateContactError } = await supabase
            .from('customer_contacts')
            .update({
              type: contact.type,
              value: formattedValue,
              label: contact.label
            })
            .eq('id', contact.id)
            .eq('customer_id', customer.id);
            
          if (updateContactError) throw updateContactError;
        } else {
          // Novo contato - inserir
          const { error: insertContactError } = await supabase
            .from('customer_contacts')
            .insert({
              customer_id: customer.id,
              type: contact.type,
              value: formattedValue,
              label: contact.label
            });
            
          if (insertContactError) throw insertContactError;
        }
      }
      
      // Excluir contatos que não estão mais presentes
      for (const existingId of existingContactIds) {
        if (!contactsToKeep.has(existingId)) {
          const { error: deleteContactError } = await supabase
            .from('customer_contacts')
            .delete()
            .eq('id', existingId)
            .eq('customer_id', customer.id);
            
          if (deleteContactError) throw deleteContactError;
        }
      }

      // If stage changed and a stage is selected, record in history
      if (stageId && stageId !== customer.stage_id) {
        const { error: historyError } = await supabase
          .from('customer_stage_history')
          .insert({
            customer_id: customer.id,
            stage_id: stageId,
            organization_id: currentOrganizationMember.organization.id
          });
          
        if (historyError) throw historyError;
      }
      
      // Processar campos personalizados
      // Nota: A maior parte do processamento de campos personalizados agora é feita
      // diretamente no componente CustomFieldsSection, que atualiza os valores em tempo real
      
      // Todas as chamadas de onSuccess agora são silenciosas (true)
      // Verificar se a operação deve ser silenciosa para feedback visual
      if (isSilent) {
        // Operação silenciosa - apenas atualizar o cliente sem feedback visual
        // console.log('Operação silenciosa realizada com sucesso, chamando onSuccess(true)');
        // Chamar onSuccess com parâmetro silentRefresh=true
        onSuccess(true);
      } else {
        // Operação normal - mostrar feedback visual flutuante
        const feedbackElement = document.createElement('div');
        feedbackElement.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded shadow-lg z-50';
        feedbackElement.textContent = t('common:saved');
        document.body.appendChild(feedbackElement);
        
        setTimeout(() => {
          feedbackElement.remove();
        }, 1500);
        
        onSuccess();
      }
    } catch (error) {
      console.error('Erro ao salvar cliente:', error);
      setError(t('common:error'));
      setTimeout(() => {
        setError('');
      }, 3000);
    } finally {
      setLoading(false);
    }
  };

  // Get stages for the selected funnel
  const filteredStages = stages.filter(stage => stage.funnel_id === formData.funnelId);

  // Efeito para carregar os dados do cliente em uma única consulta
  // Esta abordagem melhora a performance ao:
  // 1. Reduzir o número de requisições ao banco de dados (de várias para apenas uma)
  // 2. Carregar todos os dados relacionados em uma única consulta (cliente, contatos, campos personalizados e tags)
  // 3. Evitar consultas adicionais para contatos e campos personalizados
  // 4. Aproveitar o cache do React Query para os dados que não mudam com frequência
  // 5. Melhorar a experiência do usuário com carregamento mais rápido
  useEffect(() => {
    if (!customer.id || !currentOrganizationMember?.organization.id) return;
    
    const loadCustomerData = async () => {
      setIsLoadingCustomerData(true);
      
      try {
        // Fazer uma única consulta para obter o cliente com contatos e campos personalizados
        const { data, error } = await supabase
          .from('customers')
          .select(`
            *,
            contacts:customer_contacts(*),
            field_values:customer_field_values(
              id,
              field_definition_id,
              value,
              updated_at,
              field_definition:custom_fields_definition(*)
            ),
            tags:customer_tags(
              tag_id,
              tags:tags(*)
            )
          `)
          .eq('id', customer.id)
          .eq('organization_id', currentOrganizationMember.organization.id)
          .single();
          
        if (error) throw error;
        
        // Atualizar o estado com os dados carregados
        if (data) {
          // console.log('Dados do cliente carregados:', data);
          setCustomerData(data);
          
          // Inicializar contatos
          if (data.contacts) {
            const formattedContacts = data.contacts.map((contact: CustomerContact) => {
              const isWhatsApp = contact.type === ContactType.WHATSAPP;
              const countryCode = isWhatsApp ? getWhatsAppCountryCode(contact.value) : 'BR';
              
              return {
                id: contact.id,
                type: contact.type as ContactType,
                value: isWhatsApp ? getWhatsAppNumberWithoutCode(contact.value) : contact.value,
                label: contact.label || null,
                isNew: false,
                countryCode,
                showTypeDropdown: false
              };
            });
            
            setContacts(formattedContacts);
          }
          
          // Inicializar tags
          if (data.tags) {
            const tagIds = data.tags.map((tag: { tag_id: string }) => tag.tag_id);
            setSelectedTags(tagIds);
          }
          
          // Inicializar estágio e funil
          if (data.stage_id) {
            setFormData(prev => ({ ...prev, stageId: data.stage_id }));
            
            // Encontrar o funil correspondente ao estágio
            const customerStage = stages.find(stage => stage.id === data.stage_id);
            if (customerStage) {
              const funnel = funnels.find(f => f.id === customerStage.funnel_id);
              if (funnel) {
                setFormData(prev => ({ ...prev, funnelId: funnel.id }));
              }
            }
          }
          
          // Atualizar o nome do cliente
          setFormData(prev => ({ ...prev, name: data.name }));
        }
      } catch (error) {
        console.error('Erro ao carregar dados do cliente:', error);
      } finally {
        setIsLoadingCustomerData(false);
      }
    };
    
    loadCustomerData();
  }, [customer.id, currentOrganizationMember?.organization.id, stages, funnels]);

  // Função para carregar os atendimentos do cliente
  const loadCustomerChats = async () => {
    if (!customer.id || !currentOrganizationMember?.organization.id) return;
    
    setLoadingChats(true);
    setChatsError('');
    
    try {
      // Carregar os atendimentos do cliente com detalhes do agente e última mensagem
      const { data: chatsData, error: chatsError } = await supabase
        .from('chats')
        .select(`
          *,
          assigned_agent:profiles(
            full_name,
            email
          ),
          last_message:messages!chats_last_message_id_fkey(
            content,
            status,
            error_message,
            created_at
          ),
          channel_details:chat_channels(
            id,
            name,
            type
          ),
          team:service_teams!inner(
            id,
            name,
            members:service_team_members!inner(
              id,
              user_id
            )
          )
        `)
        .eq('customer_id', customer.id)
        .eq('team.members.user_id', currentOrganizationMember?.profile_id)
        .order('created_at', { ascending: false });

      if (chatsError) throw chatsError;

      // Processar os atendimentos para manter a estrutura existente
      const processedChats = (chatsData || []).map(chat => ({
        ...chat,
        last_message: chat.last_message ? {
          content: chat.last_message.content,
          status: chat.last_message.status,
          error_message: chat.last_message.error_message,
          created_at: chat.last_message.created_at
        } : undefined
      }));

      setChats(processedChats);
    } catch (error) {
      console.error('Erro ao carregar atendimentos do cliente:', error);
      setChatsError(t('common:error'));
    } finally {
      setLoadingChats(false);
    }
  };

  // Efeito para carregar os atendimentos quando a tab de atendimentos for selecionada
  useEffect(() => {
    if (activeTab === 'chats') {
      loadCustomerChats();
    }
  }, [activeTab, customer.id]);

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-45 flex md:items-stretch z-50">
      <div className="hidden md:block flex-1" onClick={onClose}></div>
      <div className="bg-white dark:bg-gray-800 w-full md:max-w-md shadow-xl flex flex-col">
        <div className="flex justify-between items-center p-6 border-b dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            {t('customers:edit.title')}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs de navegação */}
        <div className="flex border-b dark:border-gray-700 overflow-x-auto">
          <button
            className={`flex-1 py-3 px-4 text-center font-medium text-sm transition-colors ${
              activeTab === 'general'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
            onClick={() => setActiveTab('general')}
          >
            {t('customers:tabs.general')}
          </button>
          <button
            className={`flex-1 py-3 px-4 text-center font-medium text-sm transition-colors ${
              activeTab === 'chats'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
            onClick={() => setActiveTab('chats')}
          >
            {t('customers:tabs.chats')}
          </button>
          <button
            className={`flex-1 py-3 px-4 text-center font-medium text-sm transition-colors ${
              activeTab === 'tasks'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
            onClick={() => setActiveTab('tasks')}
          >
            {t('customers:tabs.tasks')}
          </button>
          <button
            className={`flex-1 py-3 px-4 text-center font-medium text-sm transition-colors ${
              activeTab === 'schedules'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
            onClick={() => setActiveTab('schedules')}
          >
            {t('customers:tabs.schedules')}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoadingCustomerData ? (
            <div className="flex flex-col items-center justify-center h-full p-6">
              <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
              <p className="text-gray-500 dark:text-gray-400">Carregando dados do cliente...</p>
            </div>
          ) : (
            <>
              {/* Tab de informações gerais */}
              {activeTab === 'general' && (
                <form onSubmit={handleSubmit} className="p-6">
                  <div className="">
                    {error && (
                      <div className="mt-4 mb-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 p-3 rounded-md">
                        {error}
                      </div>
                    )}
                  </div>

                  <div className="space-y-6">
                    {/* Barra de progresso do funil - Movida para o início */}
                    {!loadingFunnels && (formData.funnelId || funnels.length > 0) && (
                      <div className="mb-4">
                        <div className="relative">
                          <div 
                            className="text-sm text-gray-700 dark:text-gray-300 mb-2 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 flex items-center"
                            onClick={() => setFormData(prev => ({ ...prev, showFunnelDropdown: !prev.showFunnelDropdown }))}
                          >
                            <span className="font-medium">
                              {funnels.find(f => f.id === formData.funnelId)?.name || (funnels.length > 0 ? funnels[0].name : '')}
                            </span>
                            <svg 
                              xmlns="http://www.w3.org/2000/svg" 
                              className={`h-4 w-4 ml-1 transition-transform ${formData.showFunnelDropdown ? 'rotate-180' : ''}`}
                              fill="none" 
                              viewBox="0 0 24 24" 
                              stroke="currentColor"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                          
                          {/* Dropdown para seleção rápida de funil */}
                          {formData.showFunnelDropdown && (
                            <div className="absolute z-50 mt-1 w-full bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700">
                              {funnels.map(funnel => (
                                <div 
                                  key={funnel.id}
                                  className={`px-4 py-2 text-sm cursor-pointer ${
                                    funnel.id === (formData.funnelId || (funnels.length > 0 ? funnels[0].id : ''))
                                      ? 'bg-blue-500 text-white dark:bg-blue-600 dark:text-white' 
                                      : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                                  }`}
                                  onClick={() => {
                                    // Se selecionou um funil diferente
                                    if (funnel.id !== formData.funnelId) {
                                      // Pegar o primeiro estágio do funil selecionado
                                      const firstStage = stages.find(s => s.funnel_id === funnel.id && s.position === 0);
                                      
                                      if (firstStage) {
                                        // Atualizar o funil e o estágio
                                        setFormData(prev => ({ 
                                          ...prev, 
                                          funnelId: funnel.id, 
                                          stageId: firstStage.id,
                                          showFunnelDropdown: false 
                                        }));
                                        
                                        // Salvar automaticamente com o novo estágio, passando true para isSilent
                                        saveCustomer(firstStage.id, true);
                                      }
                                    } else {
                                      // Apenas fechar o dropdown se clicou no mesmo funil
                                      setFormData(prev => ({ ...prev, showFunnelDropdown: false }));
                                    }
                                  }}
                                >
                                  {funnel.name}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        
                        {/* Barra de progresso simplificada com tooltips do Radix UI */}
                        <Tooltip.Provider delayDuration={200}>
                          <div className="relative">
                            <div className="h-8 bg-gray-100 dark:bg-gray-700 rounded-md overflow-hidden flex">
                              {(() => {
                                // Determinar quais estágios exibir
                                const stagesToShow = formData.funnelId 
                                  ? filteredStages 
                                  : funnels.length > 0 
                                    ? stages.filter(stage => stage.funnel_id === funnels[0].id)
                                    : [];
                                    
                                // Calcular largura corretamente com base nos estágios que serão exibidos
                                const stageWidth = stagesToShow.length > 0 ? `${100 / stagesToShow.length}%` : '100%';
                                
                                return stagesToShow.map((stage, index) => {
                                  const isCurrentStage = stage.id === formData.stageId;
                                  
                                  // Determinar a posição do estágio no funil
                                  const stagePosition = stagesToShow.findIndex(s => s.id === formData.stageId);
                                  const isCompleted = stagePosition > -1 && index < stagePosition;
                                  
                                  return (
                                    <div 
                                      key={stage.id}
                                      className="h-full flex items-center justify-center transition-all relative group"
                                      style={{ 
                                        width: stageWidth,
                                        backgroundColor: isCurrentStage 
                                          ? stage.color 
                                          : isCompleted 
                                            ? `${stage.color}80` // Cor com opacidade para estágios completados
                                            : 'transparent',
                                        cursor: 'pointer'
                                      }}
                                      onClick={() => {
                                        // Se não for o estágio atual, atualizar e salvar
                                        if (!isCurrentStage) {
                                          // Se não tinha funil selecionado antes, definir o funil também
                                          const funnelId = formData.funnelId || stage.funnel_id;
                                          
                                          setFormData(prev => ({ 
                                            ...prev, 
                                            funnelId: funnelId,
                                            stageId: stage.id 
                                          }));
                                          
                                          // Mudança de estágio também silenciosa
                                          saveCustomer(stage.id, true);
                                        }
                                      }}
                                    >
                                      {/* Efeito de hover para simular seleção */}
                                      <div 
                                        className="absolute inset-0 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                                        style={{ 
                                          backgroundColor: isCurrentStage ? stage.color : `${stage.color}60`,
                                        }}
                                      >
                                        <span className="text-xs font-medium text-white z-10 px-1 truncate">
                                          {stage.name}
                                        </span>
                                      </div>
                                      
                                      {/* Texto visível apenas no estágio atual */}
                                      {isCurrentStage && (
                                        <span className="text-xs font-medium text-white z-10 px-1 truncate">
                                          {stage.name}
                                        </span>
                                      )}
                                      
                                      {/* Divisor entre estágios */}
                                      {index < stagesToShow.length - 1 && (
                                        <div className="absolute right-0 top-0 h-full w-0.5 bg-white dark:bg-gray-800 z-10"></div>
                                      )}
                                    </div>
                                  );
                                });
                              })()}
                            </div>
                          </div>
                        </Tooltip.Provider>
                        
                        {/* Mensagem quando não há estágio selecionado */}
                        {!formData.stageId && (
                          <div className="mt-2 text-sm text-gray-500 dark:text-gray-400 text-center">
                            {t('crm:stages.clickToSelect')}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Mostrar mensagem se nenhum estágio estiver selecionado - Remover esta seção já que agora mostramos o primeiro funil */}
                    {!loadingFunnels && funnels.length === 0 && (
                      <div className="mb-6 bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 text-center">
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {t('crm:stages.noFunnelSelected')}
                        </p>
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, showFunnelSelector: true }))}
                          className="mt-2 px-3 py-1.5 text-xs border border-transparent rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
                        >
                          {t('crm:stages.selectFunnel')}
                        </button>
                      </div>
                    )}

                    {/* Campos de informações do cliente */}
                    <div className="space-y-4">
                      <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          {t('customers:name')} *
                        </label>
                        <input
                          type="text"
                          id="name"
                          required
                          className="w-full h-10 rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          onKeyDown={handleKeyPress}
                        />
                      </div>

                      {/* Seção de Contatos - Substituída pelo componente */}
                      <ContactsFormSection 
                        contacts={contacts}
                        setContacts={setContacts}
                        customer={customer}
                        onChatModalClose={onClose}
                      />

                      {/* Seção de Tags */}
                      <div className="border-t dark:border-gray-700 pt-4">
                        {/* Tags selecionadas com scroll horizontal */}
                        <div className="relative">
                          <div className="flex items-center">
                            <div className="flex-1 overflow-x-auto scrollbar-hide">
                              <div className="flex gap-2 min-w-min">
                                {selectedTags.length === 0 ? (
                                  <p className="text-sm text-gray-500 dark:text-gray-400 py-2">
                                    {t('customers:noTags')}
                                  </p>
                                ) : (
                                  selectedTags.map(tagId => {
                                    const tag = tags.find(t => t.id === tagId);
                                    if (!tag) return null;
                                    
                                    return (
                                      <div 
                                        key={tag.id}
                                        className="flex-shrink-0 px-3 py-1.5 rounded-full text-sm flex items-center bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300"
                                      >
                                        <div
                                          className="w-2.5 h-2.5 rounded-full mr-1.5"
                                          style={{ backgroundColor: tag.color }}
                                        />
                                        {tag.name}
                                        <button
                                          type="button"
                                          onClick={() => handleTagToggle(tag.id)}
                                          className="ml-1.5 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                                        >
                                          <X className="w-3 h-3" />
                                        </button>
                                      </div>
                                    );
                                  })
                                )}
                              </div>
                            </div>
                            
                            {/* Botão de adicionar tags */}
                            {!loadingTags && tags.filter(tag => !selectedTags.includes(tag.id)).length > 0 && (
                              <div className="relative flex-shrink-0 ml-2" ref={tagsDropdownRef}>
                                <button
                                  type="button"
                                  onClick={() => setShowAvailableTags(!showAvailableTags)}
                                  className="inline-flex items-center justify-center w-8 h-8 rounded-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600"
                                >
                                  <Plus className="w-4 h-4" />
                                </button>
                                
                                {/* Tags disponíveis para adicionar */}
                                {showAvailableTags && (
                                  <div className="absolute z-10 right-0 mt-1 w-64 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700">
                                    <div className="p-2 border-b border-gray-200 dark:border-gray-700">
                                      <div className="flex justify-between items-center">
                                        <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                          Tags disponíveis
                                        </h5>
                                        <button
                                          type="button"
                                          onClick={() => setShowNewTagForm(!showNewTagForm)}
                                          className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 flex items-center"
                                        >
                                          <Plus className="w-4 h-4 mr-1" />
                                          Nova tag
                                        </button>
                                      </div>
                                    </div>
                                    
                                    <div className="max-h-[200px] overflow-y-auto p-2">
                                      {loadingTags ? (
                                        <div className="flex justify-center py-4">
                                          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                                        </div>
                                      ) : (
                                        <div className="flex flex-wrap gap-2">
                                          {tags
                                            .filter(tag => !selectedTags.includes(tag.id))
                                            .map(tag => (
                                              <button
                                                key={tag.id}
                                                type="button"
                                                onClick={() => handleTagToggle(tag.id)}
                                                className="px-3 py-1.5 rounded-full text-sm flex items-center bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                                              >
                                                <div
                                                  className="w-2.5 h-2.5 rounded-full mr-1.5"
                                                  style={{ backgroundColor: tag.color }}
                                                />
                                                {tag.name}
                                                <Plus className="w-3 h-3 ml-1.5 text-gray-500" />
                                              </button>
                                            ))}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Formulário para adicionar nova tag */}
                        {showNewTagForm && (
                          <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                            <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                              {t('customers:tags.createNew')}
                            </h5>
                            <div className="flex flex-col space-y-3">
                              <input
                                type="text"
                                placeholder={t('customers:tags.name')}
                                value={newTagName}
                                onChange={(e) => setNewTagName(e.target.value)}
                                className="w-full h-9 rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 text-sm"
                              />
                              <div className="flex items-center">
                                <label className="text-xs text-gray-500 dark:text-gray-400 mr-2">
                                  {t('customers:tags.color')}:
                                </label>
                                <input
                                  type="color"
                                  value={newTagColor}
                                  onChange={(e) => setNewTagColor(e.target.value)}
                                  className="w-8 h-8 rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 shadow-sm"
                                />
                              </div>
                              <div className="flex justify-end space-x-2">
                                <button
                                  type="button"
                                  onClick={() => setShowNewTagForm(false)}
                                  className="px-3 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                                >
                                  {t('common:cancel')}
                                </button>
                                <button
                                  type="button"
                                  onClick={handleCreateTag}
                                  disabled={!newTagName.trim() || creatingTag}
                                  className="px-3 py-1.5 text-xs border border-transparent rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                                >
                                  {creatingTag && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                                  {t('common:save')}
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Campo de Preço de Vendas */}
                      <div className="border-t dark:border-gray-700 pt-4">
                        <div>
                          <label htmlFor="sale_price" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            {t('customers:salePrice')}
                          </label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <span className="text-gray-500 dark:text-gray-400 sm:text-sm">R$</span>
                            </div>
                            <input
                              type="number"
                              id="sale_price"
                              step="0.01"
                              min="0"
                              className="w-full h-10 rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 pl-8 pr-3"
                              value={customerData?.sale_price || ''}
                              onChange={(e) => {
                                const value = e.target.value ? parseFloat(e.target.value) : undefined;
                                setCustomerData(prev => prev ? { ...prev, sale_price: value } : null);
                              }}
                              onKeyDown={handleKeyPress}
                              placeholder="0,00"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Seção de Campos Personalizados */}
                    {!isLoadingCustomerData && (
                      <CustomFieldsSection 
                        customerId={customer.id}
                        organizationId={currentOrganizationMember?.organization.id}
                        preloadedFieldValues={customerData?.field_values}
                        onFieldsChange={() => {
                          // Não precisamos mais fazer nada aqui, apenas indicar que o callback existe
                          // Os campos são gerenciados diretamente pelo CustomFieldsSection
                        }}
                      />
                    )}

                    <div className="flex justify-end space-x-3">
                      <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        {t('cancel', { ns: 'common' })}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          // console.log('Botão Salvar cliente clicado');
                          saveCustomer();
                        }}
                        disabled={loading}
                        className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {loading ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            {t('saving', { ns: 'common' })}
                          </>
                        ) : (
                          t('save', { ns: 'common' })
                        )}
                      </button>
                    </div>
                  </div>
                </form>
              )}

              {/* Tab de atendimentos */}
              {activeTab === 'chats' && (
                <div className="p-6">
                  <CustomerChatsList 
                    chats={chats}
                    loadingChats={loadingChats}
                    errorMessage={chatsError}
                    organizationId={currentOrganizationMember?.organization.id || ''}
                    isModal={true}
                    onCloseModal={onClose}
                  />
                </div>
              )}

              {/* Tab de tarefas */}
              {activeTab === 'tasks' && (
                <CustomerTasksTab 
                  customer={customer}
                  organizationId={currentOrganizationMember?.organization.id || ''}
                />
              )}

              {/* Tab de agendamentos */}
              {activeTab === 'schedules' && (
                <CustomerAppointmentsTab 
                  customer={customer}
                  organizationId={currentOrganizationMember?.organization.id || ''}
                />
              )}
            </>
          )}
        </div>
      </div>

      {/* Modal para criar/editar tarefas */}
      {showTaskModal && (
        <TaskModal
          onClose={() => {
            setShowTaskModal(false);
            setSelectedTaskId(null);
          }}
          organizationId={currentOrganizationMember?.organization.id}
          taskId={selectedTaskId || undefined}
          mode={selectedTaskId ? 'edit' : 'create'}
          initialCustomerId={customer.id}
        />
      )}
    </div>
  );
}

// Componente separado para a aba de tarefas
function CustomerTasksTab({ customer, organizationId }: { customer: Customer, organizationId: string }) {
  const { t } = useTranslation(['tasks', 'common']);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskWithRelations | null>(null);
  const [showDeleteTaskModal, setShowDeleteTaskModal] = useState(false);
  const queryClient = useQueryClient();

  // Buscar tarefas do cliente usando o hook
  const { data: tasks = [], isLoading: tasksLoading } = useTasksByCustomer(
    organizationId,
    customer.id,
    false // não mostrar arquivadas por padrão
  );

  // Função para abrir modal de criação de tarefa
  const handleAddTask = () => {
    setSelectedTask(null);
    setShowTaskModal(true);
  };

  // Função para abrir modal de edição de tarefa
  const handleEditTask = (task: TaskWithRelations) => {
    setSelectedTask(task);
    setShowTaskModal(true);
  };

  // Função para tratar a exclusão de uma tarefa
  const handleDeleteTask = async () => {
    if (!selectedTask) return;

    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', selectedTask.id);

      if (error) throw error;
      
      // Atualizar a lista de tarefas
      queryClient.invalidateQueries({ queryKey: ['tasks-by-customer', organizationId, customer.id] });
      
      toast.success(t('success.deleted', { ns: 'tasks' }));
      setShowDeleteTaskModal(false);
      setSelectedTask(null);
    } catch (error) {
      console.error('Erro ao excluir tarefa:', error);
      toast.error(t('error.delete', { ns: 'tasks' }));
    }
  };

  // Função para arquivar/desarquivar tarefa
  const handleToggleArchived = async (task: TaskWithRelations) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({
          is_archived: !task.is_archived,
          updated_at: new Date().toISOString()
        })
        .eq('id', task.id);

      if (error) throw error;
      
      // Atualizar a lista de tarefas
      queryClient.invalidateQueries({ queryKey: ['tasks-by-customer', organizationId, customer.id] });
      
      toast.success(task.is_archived ? t('unarchived', { ns: 'tasks' }) : t('archived', { ns: 'tasks' }));
    } catch (error) {
      console.error('Erro ao arquivar tarefa:', error);
      toast.error(t('error.archiveToggle', { ns: 'tasks' }));
    }
  };

  // Função para atualizar o status de uma tarefa
  const handleUpdateTaskStatus = async (task: TaskWithRelations, status: 'pending' | 'in_progress' | 'completed' | 'cancelled') => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', task.id);

      if (error) throw error;
      
      // Atualizar a lista de tarefas
      queryClient.invalidateQueries({ queryKey: ['tasks-by-customer', organizationId, customer.id] });
      
      // Mostrar mensagem de sucesso com base no status
      const statusMessages: Record<string, string> = {
        'completed': t('statuses.markedAsCompleted', { ns: 'tasks' }),
        'pending': t('statuses.markedAsPending', { ns: 'tasks' }),
        'in_progress': t('statuses.markedAsInProgress', { ns: 'tasks' }),
        'cancelled': t('statuses.markedAsCancelled', { ns: 'tasks' })
      };
      
      toast.success(statusMessages[status] || t('success.updated', { ns: 'tasks' }));
    } catch (error) {
      console.error('Erro ao atualizar status da tarefa:', error);
      toast.error(t('error.updateStatus', { ns: 'tasks' }));
    }
  };

  return (
    <div className="p-6">
      <div className="mb-4 flex justify-end">
        <button
          onClick={handleAddTask}
          className="flex items-center px-2 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-1" />
          {t('addTask', { ns: 'tasks' })}
        </button>
      </div>

      {tasksLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 dark:bg-gray-800 rounded-md">
          <p className="text-gray-500 dark:text-gray-400">
            {t('noTasksForCustomer', { ns: 'tasks' })}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              onEdit={() => handleEditTask(task)}
              onRemove={() => {
                setSelectedTask(task);
                setShowDeleteTaskModal(true);
              }}
              onToggleArchived={() => handleToggleArchived(task)}
              onUpdateStatus={(taskId, status) => {
                handleUpdateTaskStatus(task, status);
              }}
            />
          ))}
        </div>
      )}

      {/* Modal para criar/editar tarefas */}
      {showTaskModal && (
        <TaskModal
          onClose={() => {
            setShowTaskModal(false);
            setSelectedTask(null);
          }}
          organizationId={organizationId}
          taskId={selectedTask?.id}
          mode={selectedTask ? 'edit' : 'create'}
          initialCustomerId={customer.id}
        />
      )}

      {/* Modal de confirmação para exclusão */}
      {showDeleteTaskModal && selectedTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl text-red-600 dark:text-red-400 font-semibold mb-4">{t('deleteTask', { ns: 'tasks' })}</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              {t('form.confirmDeleteTask', { ns: 'tasks' })}
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowDeleteTaskModal(false);
                  setSelectedTask(null);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                {t('form.cancel', { ns: 'tasks' })}
              </button>
              <button
                onClick={handleDeleteTask}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
              >
                {t('form.delete', { ns: 'tasks' })}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Componente separado para a aba de agendamentos
function CustomerAppointmentsTab({ customer, organizationId }: { customer: Customer, organizationId: string }) {
  const { t } = useTranslation(['schedules', 'common']);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadAppointments() {
      if (!customer.id || !organizationId) return;
      
      setIsLoading(true);
      setError('');
      
      try {
        const { data, error: fetchError } = await supabase
          .from('appointments')
          .select('*')
          .eq('customer_id', customer.id)
          .order('start_time', { ascending: false });
          
        if (fetchError) throw fetchError;
        
        setAppointments(data || []);
      } catch (err) {
        console.error('Erro ao carregar agendamentos:', err);
        setError(t('error.loading', { ns: 'schedules' }));
      } finally {
        setIsLoading(false);
      }
    }
    
    loadAppointments();
  }, [customer.id, organizationId, t]);

  // Formatação de data
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric'
    });
  };

  // Formatação de hora
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Função para obter a cor do status
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      case 'no_show':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
    }
  };

  // Função para traduzir o status
  const translateStatus = (status: string) => {
    return t(`statuses.${status}`, { ns: 'schedules' });
  };

  return (
    <div className="p-6">
      <div className="mb-4 flex justify-end">
        <button
          onClick={() => {
            // Implementar lógica para adicionar agendamento
            toast(t('createAppointmentFeature', { ns: 'schedules' }));
          }}
          className="flex items-center px-2 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          <Calendar className="w-4 h-4 mr-1" />
          {t('addAppointment', { ns: 'schedules' })}
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      ) : error ? (
        <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-md text-red-600 dark:text-red-400">
          {error}
        </div>
      ) : appointments.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 dark:bg-gray-800 rounded-md">
          <p className="text-gray-500 dark:text-gray-400">
            {t('noAppointmentsForCustomer', { ns: 'schedules' })}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {appointments.map(appointment => (
            <div 
              key={appointment.id} 
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-2">
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900 dark:text-white mb-1">
                    {appointment.title}
                  </h3>
                  
                  <div className="flex flex-col sm:flex-row sm:items-center text-sm text-gray-500 dark:text-gray-400 mb-2 gap-2">
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 mr-1" />
                      <span>{formatDate(appointment.start_time)}</span>
                    </div>
                    <div className="hidden sm:block text-gray-300 dark:text-gray-600">|</div>
                    <div>
                      {formatTime(appointment.start_time)} - {formatTime(appointment.end_time)}
                    </div>
                  </div>
                  
                  {appointment.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
                      {appointment.description}
                    </p>
                  )}
                </div>
                
                <div className="flex flex-row md:flex-col items-start md:items-end gap-2">
                  <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(appointment.status)}`}>
                    {translateStatus(appointment.status)}
                  </span>
                  
                  <button
                    onClick={() => {
                      // Implementar lógica para editar agendamento
                      toast(t('editAppointmentFeature', { ns: 'schedules' }));
                    }}
                    className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    {t('edit', { ns: 'common' })}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}