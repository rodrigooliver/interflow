import React, { useState, useEffect, useRef } from 'react';
import { X, Loader2, Mail, Tag, Plus, Trash2, Phone, Instagram, Facebook, MessageSquare, Edit, Settings } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabase';
import { Customer, ContactType, CustomerContact, CustomFieldFormData } from '../../types/database';
import { useOrganizationContext } from '../../contexts/OrganizationContext';
import { CRMFunnel, CRMStage } from '../../types/crm';
import { Tag as TagType } from '../../types/database';
import { updateCustomerTags } from '../../services/customerService';
import * as Tooltip from '@radix-ui/react-tooltip';
import { CustomFieldsSection } from '../custom-fields/CustomFieldsSection';

interface CustomerEditModalProps {
  customer: Customer;
  onClose: () => void;
  onSuccess: (silentRefresh?: boolean) => void;
}

const countryCodes = [
  { code: 'BR', name: 'Brazil', dial_code: '+55' },
  { code: 'US', name: 'United States', dial_code: '+1' },
  { code: 'PT', name: 'Portugal', dial_code: '+351' },
  { code: 'ES', name: 'Spain', dial_code: '+34' },
  { code: 'FR', name: 'France', dial_code: '+33' },
  { code: 'UK', name: 'United Kingdom', dial_code: '+44' },
];

// Interface para contato no formulário
interface ContactFormData {
  id?: string;
  type: ContactType;
  value: string;
  label?: string | null;
  isNew?: boolean;
}

export function CustomerEditModal({ customer, onClose, onSuccess }: CustomerEditModalProps) {
  // Log para depuração
  console.log('CustomerEditModal - Cliente recebido:', customer);
  
  const { t } = useTranslation(['customers', 'common', 'crm']);
  const { currentOrganization } = useOrganizationContext();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [funnels, setFunnels] = useState<CRMFunnel[]>([]);
  const [stages, setStages] = useState<CRMStage[]>([]);
  const [loadingFunnels, setLoadingFunnels] = useState(true);
  const [tags, setTags] = useState<TagType[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [loadingTags, setLoadingTags] = useState(true);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#3B82F6');
  const [showNewTagForm, setShowNewTagForm] = useState(false);
  const [creatingTag, setCreatingTag] = useState(false);
  
  // Estado para gerenciar os contatos
  const [contacts, setContacts] = useState<ContactFormData[]>([]);
  const [showContactForm, setShowContactForm] = useState(false);
  const [newContact, setNewContact] = useState<ContactFormData>({
    type: ContactType.EMAIL,
    value: '',
    label: ''
  });
  
  // Estado para campos personalizados
  const [customFields, setCustomFields] = useState<CustomFieldFormData[]>([]);
  
  // Referência para controlar operações de tag em andamento
  const tagOperationInProgress = useRef(false);
  
  // Função movida para antes do uso no estado inicial
  const formatWhatsAppNumber = (value: string) => {
    const digits = value.replace(/\D/g, '');
    
    if (digits.length <= 2) {
      return digits;
    } else if (digits.length <= 7) {
      return `${digits.slice(0, 2)} ${digits.slice(2)}`;
    } else {
      return `${digits.slice(0, 2)} ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
    }
  };

  const getInitialWhatsAppData = () => {
    if (!customer.whatsapp) {
      return { countryCode: 'BR', whatsappNumber: '' };
    }

    const countryCode = countryCodes.find(cc => customer.whatsapp?.startsWith(cc.dial_code));
    if (countryCode) {
      const whatsappNumber = customer.whatsapp.slice(countryCode.dial_code.length);
      return {
        countryCode: countryCode.code,
        whatsappNumber: formatWhatsAppNumber(whatsappNumber)
      };
    }

    return { countryCode: 'BR', whatsappNumber: '' };
  };
  
  const [formData, setFormData] = useState({
    name: customer.name || '',
    email: customer.email || '',
    facebookId: customer.facebook_id || '',
    instagramId: customer.instagram_id || '',
    funnelId: '',
    stageId: customer.stage_id || '',
    showFunnelSelector: false,
    showFunnelDropdown: false,
    ...getInitialWhatsAppData()
  });

  useEffect(() => {
    if (currentOrganization) {
      loadFunnels();
      loadTags();
    }
  }, [currentOrganization, customer.id]);

  const loadFunnels = async () => {
    try {
      setLoadingFunnels(true);
      const { data: funnelsData, error: funnelsError } = await supabase
        .from('crm_funnels')
        .select('*')
        .eq('organization_id', currentOrganization?.id)
        .order('name');

      if (funnelsError) throw funnelsError;
      setFunnels(funnelsData || []);

      // Load all stages for all funnels
      const { data: stagesData, error: stagesError } = await supabase
        .from('crm_stages')
        .select('*')
        .order('position');

      if (stagesError) throw stagesError;
      setStages(stagesData || []);
    } catch (error) {
      console.error('Error loading funnels and stages:', error);
    } finally {
      setLoadingFunnels(false);
    }
  };

  const loadTags = async () => {
    if (!currentOrganization || !customer.id) return;
    
    try {
      setLoadingTags(true);
      
      // Abordagem 1: Carregar todas as tags da organização
      const { data: allTags, error: tagsError } = await supabase
        .from('tags')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .order('name');

      if (tagsError) throw tagsError;
      setTags(allTags || []);
      
      // Abordagem 2: Carregar as tags associadas ao cliente
      const { data: customerTags, error: customerTagsError } = await supabase
        .from('customer_tags')
        .select('tag_id')
        .eq('customer_id', customer.id);
        
      if (customerTagsError) throw customerTagsError;
      
      // Definir as tags selecionadas
      if (customerTags && customerTags.length > 0) {
        const selectedTagIds = customerTags.map(ct => ct.tag_id);
        console.log('Tags do cliente encontradas:', selectedTagIds);
        setSelectedTags(selectedTagIds);
      } else {
        console.log('Nenhuma tag encontrada para o cliente');
        setSelectedTags([]);
      }
      
    } catch (error) {
      console.error('Erro ao carregar tags:', error);
    } finally {
      setLoadingTags(false);
    }
  };

  // Find the current funnel based on the customer's stage
  useEffect(() => {
    if (customer.stage_id && stages.length > 0) {
      const customerStage = stages.find(stage => stage.id === customer.stage_id);
      if (customerStage) {
        setFormData(prev => ({ ...prev, funnelId: customerStage.funnel_id, stageId: customer.stage_id || '' }));
      }
    } else if (funnels.length > 0 && stages.length > 0) {
      // Se o cliente não tem estágio, mostrar o primeiro funil, mas não selecionar nenhum estágio
      console.log('Cliente sem estágio, mostrando primeiro funil sem selecionar estágio');
      setFormData(prev => ({ 
        ...prev, 
        funnelId: funnels[0].id,
        stageId: '' // Não selecionar nenhum estágio
      }));
    }
  }, [customer.stage_id, stages, funnels]);

  const handleWhatsAppChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formattedValue = formatWhatsAppNumber(e.target.value);
    setFormData(prev => ({ ...prev, whatsappNumber: formattedValue }));
  };

  const handleTagToggle = (tagId: string) => {
    // Evitar múltiplas operações simultâneas
    if (tagOperationInProgress.current) {
      console.log('Operação de tag em andamento, ignorando nova solicitação');
      return;
    }
    
    tagOperationInProgress.current = true;
    
    setSelectedTags(prev => {
      const isSelected = prev.includes(tagId);
      const newSelectedTags = isSelected
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId];
      
      console.log(`Tag ${tagId} ${isSelected ? 'removida' : 'adicionada'}. Tags selecionadas:`, newSelectedTags);
      
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
            console.log('Tags atualizadas com sucesso');
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
      console.log('Operação de tag em andamento, ignorando nova solicitação');
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
      
      // Adicionar a nova tag à lista de tags
      setTags(prev => [...prev, data]);
      
      // Verificar se a tag já está selecionada antes de adicioná-la
      if (!selectedTags.includes(data.id)) {
        // Adicionar a nova tag às tags selecionadas
        const newSelectedTags = [...selectedTags, data.id];
        setSelectedTags(newSelectedTags);
        
        console.log('Nova tag criada e selecionada:', data);
        
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
          } catch (updateError: any) {
            console.error('Erro ao adicionar novas tags:', updateError);
            
            // Mostrar mensagem de erro
            const feedbackElement = document.createElement('div');
            feedbackElement.className = 'fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded shadow-lg z-50';
            feedbackElement.textContent = `Erro ao adicionar novas tags: ${updateError.message || 'Tente novamente'}`;
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
    } catch (error: any) {
      console.error('Erro ao criar tag:', error);
      setError(t('common:error'));
      
      // Mostrar mensagem de erro
      const feedbackElement = document.createElement('div');
      feedbackElement.className = 'fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded shadow-lg z-50';
      feedbackElement.textContent = `Erro ao criar tag: ${error.message || 'Tente novamente'}`;
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

  // Carregar os contatos do cliente
  useEffect(() => {
    if (customer.contacts) {
      // Converter os contatos do cliente para o formato do formulário
      const formattedContacts = customer.contacts.map(contact => ({
        id: contact.id,
        type: contact.type,
        value: contact.value,
        label: contact.label
      }));
      setContacts(formattedContacts);
    } else {
      // Se não houver contatos, inicializar com array vazio
      setContacts([]);
      
      // Migrar dados antigos para a nova estrutura, se existirem
      const oldContacts: ContactFormData[] = [];
      
      if (customer.email) {
        oldContacts.push({
          type: ContactType.EMAIL,
          value: customer.email,
          label: 'Email principal',
          isNew: true
        });
      }
      
      if (customer.whatsapp) {
        oldContacts.push({
          type: ContactType.WHATSAPP,
          value: customer.whatsapp,
          label: 'WhatsApp principal',
          isNew: true
        });
      }
      
      if (customer.facebook_id) {
        oldContacts.push({
          type: ContactType.FACEBOOK_ID,
          value: customer.facebook_id,
          label: 'Facebook ID',
          isNew: true
        });
      }
      
      if (customer.instagram_id) {
        oldContacts.push({
          type: ContactType.INSTAGRAM_ID,
          value: customer.instagram_id,
          label: 'Instagram ID',
          isNew: true
        });
      }
      
      if (oldContacts.length > 0) {
        setContacts(oldContacts);
      }
    }
  }, [customer]);

  // Função para adicionar um novo contato
  const handleAddContact = () => {
    if (!newContact.value.trim()) return;
    
    setContacts(prev => [...prev, { ...newContact, isNew: true }]);
    setNewContact({
      type: ContactType.EMAIL,
      value: '',
      label: ''
    });
    setShowContactForm(false);
  };

  // Função para remover um contato
  const handleRemoveContact = (index: number) => {
    setContacts(prev => prev.filter((_, i) => i !== index));
  };

  // Função para obter o ícone do tipo de contato
  const getContactIcon = (type: ContactType) => {
    switch (type) {
      case ContactType.EMAIL:
        return <Mail className="w-4 h-4" />;
      case ContactType.WHATSAPP:
      case ContactType.PHONE:
        return <Phone className="w-4 h-4" />;
      case ContactType.INSTAGRAM:
      case ContactType.INSTAGRAM_ID:
        return <Instagram className="w-4 h-4" />;
      case ContactType.FACEBOOK:
      case ContactType.FACEBOOK_ID:
        return <Facebook className="w-4 h-4" />;
      case ContactType.TELEGRAM:
        return <MessageSquare className="w-4 h-4" />;
      default:
        return <Mail className="w-4 h-4" />;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); // Garantir que a página não seja recarregada
    console.log('CustomerEditModal - handleSubmit chamado, preventDefault aplicado');
    await saveCustomer();
  };

  // Função para salvar o cliente, com parâmetros opcionais para o estágio
  const saveCustomer = async (overrideStageId?: string, isSilent: boolean = false) => {
    console.log('CustomerEditModal - saveCustomer chamado');
    
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
      const { data: updatedCustomer, error: updateError } = await supabase
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
        
        if (contact.id) {
          // Contato existente - atualizar
          contactsToKeep.add(contact.id);
          
          const { error: updateContactError } = await supabase
            .from('customer_contacts')
            .update({
              type: contact.type,
              value: contact.value,
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
              value: contact.value,
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
        console.log('Operação silenciosa realizada com sucesso, chamando onSuccess(true)');
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
          <form onSubmit={handleSubmit} className="p-6">
            <div className="p-4">
              {error && (
                <div className="mb-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 p-3 rounded-md">
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
              {!loadingFunnels && formData.funnelId && (
                <div className="mb-4">
                  <div className="relative">
                    <div 
                      className="text-sm text-gray-700 dark:text-gray-300 mb-2 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 flex items-center"
                      onClick={() => setFormData(prev => ({ ...prev, showFunnelDropdown: !prev.showFunnelDropdown }))}
                    >
                      <span className="font-medium">{funnels.find(f => f.id === formData.funnelId)?.name}</span>
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
                              funnel.id === formData.funnelId 
                                ? 'bg-blue-500 text-white dark:bg-blue-600 dark:text-white' 
                                : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                            }`}
                            onClick={() => {
                              console.log('funnel', funnel);
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
                                  console.log('Chamando saveCustomer para troca de funil com isSilent=true');
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
                        {filteredStages.map((stage, index) => {
                          const isCurrentStage = stage.id === formData.stageId;
                          const width = `${100 / filteredStages.length}%`;
                          
                          // Determinar a posição do estágio no funil
                          const stagePosition = filteredStages.findIndex(s => s.id === formData.stageId);
                          const isCompleted = stagePosition > -1 && index < stagePosition;
                          
                          return (
                            <div 
                              key={stage.id}
                              className="h-full flex items-center justify-center transition-all relative group"
                              style={{ 
                                width,
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
                                  setFormData(prev => ({ ...prev, stageId: stage.id }));
                                  // Mudança de estágio também silenciosa
                                  console.log('Chamando saveCustomer para mudança de estágio com isSilent=true');
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
                              {index < filteredStages.length - 1 && (
                                <div className="absolute right-0 top-0 h-full w-0.5 bg-white dark:bg-gray-800 z-10"></div>
                              )}
                            </div>
                          );
                        })}
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

              {/* Mostrar mensagem se nenhum estágio estiver selecionado */}
              {!loadingFunnels && !formData.funnelId && (
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
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>

                {/* Seção de Contatos */}
                <div className="border-t dark:border-gray-700 pt-4">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-base font-medium text-gray-900 dark:text-white">
                      Contatos
                    </h4>
                    <button
                      type="button"
                      onClick={() => setShowContactForm(!showContactForm)}
                      className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 flex items-center"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Adicionar contato
                    </button>
                  </div>

                  {/* Lista de contatos existentes */}
                  {contacts.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400 py-2">
                      Nenhum contato cadastrado
                    </p>
                  ) : (
                    <div className="space-y-2 mb-4">
                      {contacts.map((contact, index) => (
                        <div 
                          key={index} 
                          className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                        >
                          <div className="flex items-center">
                            <div className="mr-3 text-gray-500 dark:text-gray-400">
                              {getContactIcon(contact.type)}
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900 dark:text-white">
                                {contact.value}
                              </div>
                              {contact.label && (
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                  {contact.label}
                                </div>
                              )}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveContact(index)}
                            className="text-red-500 hover:text-red-700 dark:hover:text-red-300 p-1"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Formulário para adicionar novo contato */}
                  {showContactForm && (
                    <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                        Novo contato
                      </h5>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                            Tipo
                          </label>
                          <select
                            value={newContact.type}
                            onChange={(e) => setNewContact(prev => ({ 
                              ...prev, 
                              type: e.target.value as ContactType 
                            }))}
                            className="w-full h-9 rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 text-sm"
                          >
                            <option value={ContactType.EMAIL}>Email</option>
                            <option value={ContactType.WHATSAPP}>WhatsApp</option>
                            <option value={ContactType.PHONE}>Telefone</option>
                            <option value={ContactType.INSTAGRAM}>Instagram</option>
                            <option value={ContactType.FACEBOOK}>Facebook</option>
                            <option value={ContactType.TELEGRAM}>Telegram</option>
                            <option value={ContactType.OTHER}>Outro</option>
                          </select>
                        </div>
                        
                        <div>
                          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                            Valor
                          </label>
                          <input
                            type="text"
                            value={newContact.value}
                            onChange={(e) => setNewContact(prev => ({ 
                              ...prev, 
                              value: e.target.value 
                            }))}
                            className="w-full h-9 rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 text-sm"
                            placeholder={
                              newContact.type === ContactType.EMAIL ? "email@exemplo.com" :
                              newContact.type === ContactType.WHATSAPP ? "+5511999999999" :
                              newContact.type === ContactType.PHONE ? "+5511999999999" :
                              newContact.type === ContactType.INSTAGRAM ? "@usuario" :
                              newContact.type === ContactType.FACEBOOK ? "@usuario" :
                              "Valor do contato"
                            }
                          />
                        </div>
                        
                        <div>
                          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                            Rótulo (opcional)
                          </label>
                          <input
                            type="text"
                            value={newContact.label || ''}
                            onChange={(e) => setNewContact(prev => ({ 
                              ...prev, 
                              label: e.target.value 
                            }))}
                            className="w-full h-9 rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 text-sm"
                            placeholder="Ex: Trabalho, Pessoal, etc."
                          />
                        </div>
                        
                        <div className="flex justify-end space-x-2">
                          <button
                            type="button"
                            onClick={() => setShowContactForm(false)}
                            className="px-3 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            onClick={handleAddContact}
                            disabled={!newContact.value.trim()}
                            className="px-3 py-1.5 text-xs border border-transparent rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Adicionar
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

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
              <CustomFieldsSection 
                customerId={customer.id}
                organizationId={currentOrganization?.id}
                onFieldsChange={(fields) => {
                  // Atualizar os campos personalizados no estado local
                  // Isso é importante para que os campos sejam salvos corretamente
                  // quando o usuário clicar em Salvar
                  setCustomFields(fields);
                  console.log('Campos personalizados atualizados no CustomerEditModal:', fields);
                }}
              />

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
                    console.log('Botão Salvar cliente clicado');
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
        </div>
      </div>
    </div>
  );
}