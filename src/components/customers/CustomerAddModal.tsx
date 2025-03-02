import React, { useState, useEffect, useRef } from 'react';
import { X, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabase';
import { useOrganizationContext } from '../../contexts/OrganizationContext';
import { ContactType } from '../../types/database';
import { ContactsFormSection, ContactFormData, formatContactValue } from './ContactsFormSection';
import { useFunnels } from '../../hooks/useQueryes';

interface CustomerAddModalProps {
  onClose: () => void;
  onSuccess: (silentRefresh?: boolean) => void;
  initialFunnelId?: string;
}

export function CustomerAddModal({ onClose, onSuccess, initialFunnelId }: CustomerAddModalProps) {
  const { t } = useTranslation(['customers', 'crm', 'common']);
  const { currentOrganization } = useOrganizationContext();
  const [loading, setLoading] = useState(false);
  
  // Usando o hook useFunnels para carregar funis e estágios
  const { data: funnelsData, isLoading: loadingFunnels } = useFunnels(currentOrganization?.id);
  const funnels = funnelsData || [];
  const stages = React.useMemo(() => {
    return funnels.flatMap(funnel => funnel.stages || []);
  }, [funnels]);
  
  const [formData, setFormData] = useState({
    name: '',
    funnelId: initialFunnelId || '',
    stageId: ''
  });
  
  const [contacts, setContacts] = useState<ContactFormData[]>([
    { type: ContactType.WHATSAPP, value: '', label: null, isNew: true, countryCode: 'BR', showTypeDropdown: false }
  ]);
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  // Estados para pesquisa de países - usados apenas no efeito de clique fora
  const [, setCountrySearch] = useState('');
  const [, setShowCountryDropdown] = useState<number | null>(null);
  
  // Referência para detectar cliques fora do dropdown
  const dropdownRef = useRef<HTMLDivElement>(null);

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
        setShowCountryDropdown(null);
        setCountrySearch('');
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
      // Se temos um initialFunnelId, usamos ele; caso contrário, usamos o primeiro funil
      const funnelId = initialFunnelId || funnels[0].id;
      
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
    }
  }, [funnels, stages, initialFunnelId, loadingFunnels]);

  // Função para lidar com a seleção de estágio na barra de progressão
  const handleStageSelect = (stageId: string) => {
    setFormData(prev => ({ ...prev, stageId }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    if (!currentOrganization) {
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

      // Create customer with stage_id directly
      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .insert([{
          name: formData.name,
          organization_id: currentOrganization.id,
          stage_id: formData.stageId || null // Salvar o estágio diretamente na tabela customers
        }])
        .select()
        .single();

      if (customerError) throw customerError;

      // Adicionar contatos do cliente
      if (customer) {
        const validContacts = contacts.filter(contact => contact.value.trim() !== '');
        
        if (validContacts.length > 0) {
          const contactsToInsert = validContacts.map(contact => ({
            customer_id: customer.id,
            type: contact.type,
            value: formatContactValue(contact),
            label: contact.label
          }));

          const { error: contactsError } = await supabase
            .from('customer_contacts')
            .insert(contactsToInsert);

          if (contactsError) throw contactsError;
        }
      }

      setSuccess(t('customers:addSuccess'));
      setTimeout(() => {
        onSuccess();
      }, 1500);
    } catch (err) {
      console.error('Error:', err);
      setError(t('common:error'));
    } finally {
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

                {/* Seção de Contatos - Substituída pelo componente */}
                <ContactsFormSection 
                  contacts={contacts}
                  setContacts={setContacts}
                  dropdownRef={dropdownRef}
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
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