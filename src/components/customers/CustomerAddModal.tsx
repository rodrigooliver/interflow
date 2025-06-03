import React, { useState, useEffect, useRef } from 'react';
import { X, Loader2, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabase';
import { useAuthContext } from '../../contexts/AuthContext';
import { ContactType } from '../../types/database';
import { ContactsFormSection, ContactFormData, formatContactValue } from './ContactsFormSection';
import { useFunnels, useTags } from '../../hooks/useQueryes';
import { CustomFieldsSection } from '../custom-fields/CustomFieldsSection';
import { CustomFieldFormData } from '../../types/database';
import api from '../../lib/api';
import { CustomerEditModal } from './CustomerEditModal';
import { useQueryClient } from '@tanstack/react-query';

interface CustomerAddModalProps {
  onClose: () => void;
  onSuccess: (silentRefresh?: boolean, customerId?: string) => void;
  initialFunnelId?: string;
}

export function CustomerAddModal({ onClose, onSuccess, initialFunnelId }: CustomerAddModalProps) {
  const { t } = useTranslation(['customers', 'crm', 'common']);
  const { currentOrganizationMember } = useAuthContext();
  const [loading, setLoading] = useState(false);
  const { profile } = useAuthContext();
  const queryClient = useQueryClient();
  
  // Estado para controlar o modo do modal
  const [mode, setMode] = useState<'create' | 'edit'>('create');
  const [createdCustomerId, setCreatedCustomerId] = useState<string | null>(null);
  
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
  
  const [formData, setFormData] = useState({
    name: '',
    funnelId: initialFunnelId || '',
    stageId: '',
    salePrice: undefined as number | undefined
  });
  
  const [contacts, setContacts] = useState<ContactFormData[]>([
    { type: ContactType.WHATSAPP, value: '', label: null, isNew: true, countryCode: 'BR', showTypeDropdown: false }
  ]);
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [customFields, setCustomFields] = useState<CustomFieldFormData[]>([]);
  
  // Referências para detectar cliques fora dos dropdowns
  const dropdownRef = useRef<HTMLDivElement>(null);
  const tagsDropdownRef = useRef<HTMLDivElement>(null);
  
  // Referência para controlar operações de tag em andamento
  const tagOperationInProgress = useRef(false);

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

  // Efeito para inicializar o funil e estágio quando os dados são carregados
  useEffect(() => {
    if (!loadingFunnels && funnels.length > 0) {
      // Se temos um initialFunnelId, usamos ele
      if (initialFunnelId) {
        const funnelId = initialFunnelId;
        if (funnelId) {
          // Encontrar o primeiro estágio do funil selecionado
          const filteredStages = stages.filter(stage => stage.funnel_id === funnelId);
          const firstStage = filteredStages.length > 0 ? filteredStages.sort((a, b) => a.position - b.position)[0] : null;
          
          setFormData(prev => ({ 
            ...prev, 
            funnelId,
            stageId: firstStage ? firstStage.id : ''
          }));
        }
      } else {
        // Se não temos initialFunnelId, procurar pelo funil padrão
        const defaultFunnel = funnels.find(f => f.default === true);
        const funnelToUse = defaultFunnel || funnels[0]; // Se não houver funil padrão, usar o primeiro
        
        if (funnelToUse) {
          // Encontrar o primeiro estágio do funil selecionado
          const filteredStages = stages.filter(stage => stage.funnel_id === funnelToUse.id);
          const firstStage = filteredStages.length > 0 ? filteredStages.sort((a, b) => a.position - b.position)[0] : null;
          
          setFormData(prev => ({ 
            ...prev, 
            funnelId: funnelToUse.id,
            stageId: firstStage ? firstStage.id : ''
          }));
        }
      }
    }
  }, [funnels, stages, initialFunnelId, loadingFunnels]);

  // Se estiver no modo de edição, renderizar o CustomerEditModal
  if (mode === 'edit' && createdCustomerId) {
    return (
      <CustomerEditModal
        customerId={createdCustomerId}
        onClose={onClose}
        onSuccess={onSuccess}
      />
    );
  }

  // Função para lidar com a seleção de estágio na barra de progressão
  const handleStageSelect = (stageId: string) => {
    setFormData(prev => ({ ...prev, stageId }));
  };

  const handleTagToggle = (tagId: string) => {
    // Evitar múltiplas operações simultâneas
    if (tagOperationInProgress.current) {
      return;
    }
    
    tagOperationInProgress.current = true;
    
    setSelectedTags(prev => {
      const isSelected = prev.includes(tagId);
      const newSelectedTags = isSelected
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId];
      
      // Liberar o bloqueio após um pequeno atraso para evitar cliques rápidos
      setTimeout(() => {
        tagOperationInProgress.current = false;
      }, 300);
      
      return newSelectedTags;
    });
  };

  const handleCreateTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrganizationMember || !newTagName.trim()) return;
    
    // Evitar múltiplas operações simultâneas
    if (tagOperationInProgress.current) {
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
        setSelectedTags(prev => [...prev, data.id]);
      }
      
      // Limpar o formulário
      setNewTagName('');
      setNewTagColor('#3B82F6');
      setShowNewTagForm(false);
      
      // Mostrar feedback visual temporário
      const feedbackElement = document.createElement('div');
      feedbackElement.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded shadow-lg z-50';
      feedbackElement.textContent = 'Tag criada com sucesso';
      document.body.appendChild(feedbackElement);
      
      setTimeout(() => {
        feedbackElement.remove();
      }, 1500);
      
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
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    if (!currentOrganizationMember) {
      setError(t('common:error'));
      setLoading(false);
      return;
    }

    try {
      // Validar se pelo menos um contato tem valor
      const hasValidContact = contacts.some(contact => contact.value.trim() !== '');
      if (!hasValidContact) {
        setError(t('customers:contactRequired'));
        setLoading(false);
        return;
      }

      // Preparar dados para envio
      const customerData = {
        name: formData.name,
        stageId: formData.stageId || null,
        salePrice: formData.salePrice || null,
        contacts: contacts
          .filter(contact => contact.value.trim() !== '')
          .map(contact => ({
            ...contact,
            value: formatContactValue(contact)
          })),
        selectedTags,
        customFields: customFields.filter(field => field.value && field.value.trim() !== '')
      };

      // Enviar para o backend
      const response = await api.post(`/api/${currentOrganizationMember.organization.id}/customers`, customerData);

      if (!response.data.success) {
        throw new Error(response.data.error || 'Falha ao criar cliente');
      }

      const customerCreated = response.data.data;

      setSuccess(t('customers:addSuccess'));
      
      // Invalidar cache organization após 5 segundos
      queryClient.invalidateQueries({ queryKey: ['organization', profile?.id] });
      // setTimeout(() => {
      // }, 5000);
      
      // Aguardar um momento para mostrar a mensagem de sucesso
      setTimeout(() => {
        // Salvar o ID do cliente criado e mudar para modo de edição
        setCreatedCustomerId(customerCreated.id);
        setMode('edit');
        setLoading(false);
        
        // Chamar onSuccess para atualizar a lista de clientes
        // onSuccess(true, customerCreated.id);
      }, 10);
    } catch (err: unknown) {
      console.error('Erro no handleSubmit:', err);
      
      // Tratar erros específicos da API
      if (err && typeof err === 'object' && 'response' in err) {
        const apiError = err as { response?: { data?: { error?: string } }; message?: string };
        setError(apiError.response?.data?.error || apiError.message || t('common:error'));
      } else {
        setError(t('common:error'));
      }
      
      // Só desativar loading em caso de erro
      setLoading(false);
    }
  };

  if (loadingFunnels) {
    return (
      <div className="fixed inset-0 bg-gray-500 bg-opacity-45 flex md:items-stretch z-50">
        <div className="hidden md:block flex-1" onClick={onClose}></div>
        <div className="bg-white dark:bg-gray-800 w-full md:max-w-md shadow-xl flex flex-col">
          <div className="flex justify-between items-center p-6 border-b dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              {t('customers:addCustomer')}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-6">
            <div className="flex justify-center items-center min-h-[200px]">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-45 flex md:items-stretch z-50">
      <div className="hidden md:block flex-1" onClick={onClose}></div>
      <div className="bg-white dark:bg-gray-800 w-full md:max-w-md shadow-xl flex flex-col" ref={dropdownRef}>
        <div className="flex justify-between items-center p-6 border-b dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            {t('customers:addCustomer')}
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
              {funnels.length > 0 && (
                <div className="mb-6">
                  <div className="relative">
                    <div 
                      className="text-sm text-gray-700 dark:text-gray-300 mb-2 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 flex items-center"
                    >
                      <span className="font-medium mr-1">{t('crm:funnel')}:</span>
                      <div className="relative inline-block">
                        <select
                          id="funnel"
                          className="appearance-none bg-transparent border-none text-sm font-medium text-blue-600 dark:text-blue-400 pr-8 py-0 focus:outline-none focus:ring-0"
                          value={formData.funnelId}
                          onChange={(e) => {
                            const newFunnelId = e.target.value;
                            // Encontrar o primeiro estágio do novo funil
                            const filteredStages = stages.filter(stage => stage.funnel_id === newFunnelId);
                            const firstStage = filteredStages.length > 0 ? 
                              filteredStages.sort((a, b) => a.position - b.position)[0] : null;
                            
                            setFormData({ 
                              ...formData, 
                              funnelId: newFunnelId, 
                              stageId: firstStage ? firstStage.id : '' 
                            });
                          }}
                        >
                          {funnels.map(funnel => (
                            <option key={funnel.id} value={funnel.id}>
                              {funnel.name}
                            </option>
                          ))}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center">
                          <svg className="h-4 w-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {stages.length > 0 && (
                    <div className="mt-3">
                      <div className="h-8 bg-gray-100 dark:bg-gray-700 rounded-md overflow-hidden flex">
                        {stages
                          .filter(stage => stage.funnel_id === formData.funnelId)
                          .sort((a, b) => a.position - b.position)
                          .map((stage, index, filteredStages) => {
                            const isSelected = formData.stageId === stage.id;
                            const isCompleted = filteredStages.findIndex(s => s.id === formData.stageId) > index;
                            const width = `${100 / filteredStages.length}%`;
                            
                            return (
                              <div
                                key={stage.id}
                                onClick={() => handleStageSelect(stage.id)}
                                className="h-full flex items-center justify-center transition-all relative group cursor-pointer"
                                style={{
                                  width,
                                  backgroundColor: isSelected 
                                    ? stage.color 
                                    : isCompleted 
                                      ? `${stage.color}80` // Cor com opacidade para estágios completados
                                      : 'transparent'
                                }}
                              >
                                {/* Efeito de hover para simular seleção */}
                                <div 
                                  className="absolute inset-0 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                                  style={{ 
                                    backgroundColor: isSelected ? stage.color : `${stage.color}60`,
                                  }}
                                >
                                  <span className="text-xs font-medium text-white z-10 px-1 truncate">
                                    {stage.name}
                                  </span>
                                </div>
                                
                                {/* Texto visível apenas no estágio atual */}
                                {isSelected && (
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
                      
                      {/* Mensagem quando não há estágio selecionado */}
                      {!formData.stageId && (
                        <div className="mt-2 text-sm text-gray-500 dark:text-gray-400 text-center">
                          {t('crm:stages.clickToSelect')}
                        </div>
                      )}
                    </div>
                  )}
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

                {/* Seção de Contatos */}
                <ContactsFormSection 
                  contacts={contacts}
                  setContacts={setContacts}
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
                        value={formData.salePrice || ''}
                        onChange={(e) => {
                          const value = e.target.value ? parseFloat(e.target.value) : undefined;
                          setFormData(prev => ({ ...prev, salePrice: value }));
                        }}
                        placeholder="0,00"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Seção de Campos Personalizados */}
              {currentOrganizationMember && (
                <CustomFieldsSection 
                  customerId=""
                  organizationId={currentOrganizationMember.organization.id}
                  onFieldsChange={(fields) => {
                    setCustomFields(fields);
                  }}
                />
              )}

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  {t('common:cancel')}
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {t('common:saving')}
                    </>
                  ) : (
                    t('customers:addCustomer')
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