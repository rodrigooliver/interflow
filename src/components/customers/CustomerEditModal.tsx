import React, { useState, useEffect, useRef } from 'react';
import { X, Loader2, Tag, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabase';
import { Customer, ContactType } from '../../types/database';
import { useOrganizationContext } from '../../contexts/OrganizationContext';
import { updateCustomerTags } from '../../services/customerService';
import * as Tooltip from '@radix-ui/react-tooltip';
import { CustomFieldsSection } from '../custom-fields/CustomFieldsSection';
import { countryCodes } from '../../utils/countryCodes';
import { ContactsFormSection, ContactFormData, formatContactValue } from './ContactsFormSection';
import { useFunnels, useTags } from '../../hooks/useQueryes';

// Interface para contatos do cliente
interface CustomerContact {
  id: string;
  type: string;
  value: string;
  label: string | null;
  customer_id: string;
}

interface CustomerEditModalProps {
  customer: Customer;
  onClose: () => void;
  onSuccess: (silentRefresh?: boolean) => void;
}

// Adicionar a interface Tag
interface Tag {
  id: string;
  name: string;
  color: string;
}

export function CustomerEditModal({ customer, onClose, onSuccess }: CustomerEditModalProps) {
  // Log para depuração
  // console.log('CustomerEditModal - Cliente recebido:', customer);
  
  const { t } = useTranslation(['customers', 'common', 'crm']);
  const { currentOrganization } = useOrganizationContext();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Usando o hook useFunnels para carregar funis e estágios
  const { data: funnelsData, isLoading: loadingFunnels } = useFunnels(currentOrganization?.id);
  const funnels = funnelsData || [];
  const stages = React.useMemo(() => {
    return funnels.flatMap(funnel => funnel.stages || []);
  }, [funnels]);
  
  // Usando o hook useTags para carregar tags
  const { data: tagsData, isLoading: loadingTags } = useTags(currentOrganization?.id);
  const tags = tagsData || [];
  
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#3B82F6');
  const [showNewTagForm, setShowNewTagForm] = useState(false);
  const [creatingTag, setCreatingTag] = useState(false);
  
  // Estado para gerenciar os contatos
  const [contacts, setContacts] = useState<ContactFormData[]>([]);
  
  // Referência para detectar cliques fora do dropdown
  const dropdownRef = useRef<HTMLDivElement>(null);
  
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
      setSelectedTags(tagIds);
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
      if (currentOrganization && customer.id) {
        // Verificar se a operação está em andamento
        const feedbackElement = document.createElement('div');
        feedbackElement.className = 'fixed top-4 right-4 bg-blue-500 text-white px-4 py-2 rounded shadow-lg z-50';
        feedbackElement.textContent = isSelected ? 'Removendo tag...' : 'Adicionando tag...';
        document.body.appendChild(feedbackElement);
        
        // Atualizar as tags no banco de dados
        updateCustomerTags(customer.id, newSelectedTags, currentOrganization.id)
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

  const handleCreateTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrganization || !newTagName.trim()) return;
    
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
            organization_id: currentOrganization.id
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
            await updateCustomerTags(customer.id, newSelectedTags, currentOrganization.id);
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
    
    if (!currentOrganization) {
      setError('Organização não encontrada');
      return;
    }
    
    if (!formData.name.trim()) {
      setError('Nome do cliente é obrigatório');
      return;
    }
    
    setLoading(true);
    setError('');
    setSuccess(''); // Limpar mensagem de sucesso anterior
    
    try {
      // Determinar o ID do estágio a ser usado
      const stageId = overrideStageId || formData.stageId;
      
      // Atualizar informações básicas do cliente
      const { error: updateError } = await supabase
        .from('customers')
        .update({
          name: formData.name.trim(),
          stage_id: stageId || null
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
            organization_id: currentOrganization.id
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
        // Operação normal - mostrar feedback visual
        setSuccess(t('common:saved'));
        setTimeout(() => {
          setSuccess('');
          onSuccess();
        }, 2000);
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
    if (!customer.id || !currentOrganization?.id) return;
    
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
          .eq('organization_id', currentOrganization.id)
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
  }, [customer.id, currentOrganization?.id, stages, funnels]);

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

        <div className="flex-1 overflow-y-auto">
          {isLoadingCustomerData ? (
            <div className="flex flex-col items-center justify-center h-full p-6">
              <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
              <p className="text-gray-500 dark:text-gray-400">Carregando dados do cliente...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="p-6">
              <div className="">
                {error && (
                  <div className="mt-4 mb-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 p-3 rounded-md">
                    {error}
                  </div>
                )}
                
                {success && (
                  <div className="mb-4 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 p-3 rounded-md">
                    {success}
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
                    />
                  </div>

                  {/* Seção de Contatos - Substituída pelo componente */}
                  <ContactsFormSection 
                    contacts={contacts}
                    setContacts={setContacts}
                    dropdownRef={dropdownRef}
                  />

                  {/* Seção de Tags */}
                  <div className="border-t dark:border-gray-700 pt-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center">
                        <Tag className="w-5 h-5 mr-2 text-blue-600 dark:text-blue-400" />
                        <h4 className="text-base font-medium text-gray-900 dark:text-white">
                          {t('customers:tags.title')}
                        </h4>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowNewTagForm(!showNewTagForm)}
                        className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 flex items-center"
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        {t('customers:tags.addNew')}
                      </button>
                    </div>

                    {/* Tags selecionadas */}
                    <div className="mb-4">
                      <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Tags do cliente
                      </h5>
                      {selectedTags.length === 0 ? (
                        <p className="text-sm text-gray-500 dark:text-gray-400 py-2">
                          Nenhuma tag atribuída a este cliente
                        </p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {selectedTags.map(tagId => {
                            const tag = tags.find(t => t.id === tagId);
                            if (!tag) return null;
                            
                            return (
                              <div 
                                key={tag.id}
                                className="px-3 py-1.5 rounded-full text-sm flex items-center bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 ring-1 ring-blue-500 dark:ring-blue-400"
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
                          })}
                        </div>
                      )}
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

                    {/* Seletor de tags existentes */}
                    <div className="mt-4">
                      <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Adicionar tags existentes
                      </h5>
                      {loadingTags ? (
                        <div className="flex justify-center py-4">
                          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-2 max-h-[200px] overflow-y-auto p-1">
                          {tags
                            .filter(tag => !selectedTags.includes(tag.id))
                            .length === 0 ? (
                            <p className="text-sm text-gray-500 dark:text-gray-400 py-2">
                              Todas as tags já foram adicionadas
                            </p>
                          ) : (
                            tags
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
                              ))
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Seção de Campos Personalizados */}
                {!isLoadingCustomerData && (
                  <CustomFieldsSection 
                    customerId={customer.id}
                    organizationId={currentOrganization?.id}
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
        </div>
      </div>
    </div>
  );
}