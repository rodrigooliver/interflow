import React, { useState, useEffect, useRef } from 'react';
import { X, Loader2, Mail, User, ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuthContext } from '../../contexts/AuthContext';
import { ChatChannel, ContactType } from '../../types/database';
import { countryCodes } from '../../utils/countryCodes';
import { getChannelIcon } from '../../utils/channel';

interface StartChatModalProps {
  onClose: () => void;
}

interface ServiceTeam {
  id: string;
  organization_id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export function StartChatModal({ onClose }: StartChatModalProps) {
  const { t } = useTranslation(['channels', 'common', 'customers']);
  const navigate = useNavigate();
  const { session, currentOrganizationMember } = useAuthContext();
  
  // Estados para os passos do modal
  const [step, setStep] = useState<'select-channel' | 'enter-contact' | 'create-customer'>('select-channel');
  
  // Estados para canais e equipes
  const [channels, setChannels] = useState<ChatChannel[]>([]);
  const [userTeams, setUserTeams] = useState<ServiceTeam[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<ChatChannel | null>(null);
  
  // Estados para contato
  const [contactValue, setContactValue] = useState('');
  const [countryCode, setCountryCode] = useState('BR');
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  const [highlightedCountryIndex, setHighlightedCountryIndex] = useState(-1);
  
  // Refs para elementos DOM
  const countryDropdownRef = useRef<HTMLDivElement>(null);
  const countrySearchInputRef = useRef<HTMLInputElement>(null);
  
  // Estados para cliente
  const [customerName, setCustomerName] = useState('');
  
  // Estados de UI
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [startingChat, setStartingChat] = useState(false);
  const [error, setError] = useState('');

  // Carregar canais e equipes ao iniciar
  useEffect(() => {
    if (currentOrganizationMember && session?.user) {
      loadChannels();
      loadUserTeams();
    }
  }, [currentOrganizationMember, session?.user]);

  // Carregar canais disponíveis
  async function loadChannels() {
    try {
      const { data, error } = await supabase
        .from('chat_channels')
        .select('*')
        .eq('organization_id', currentOrganizationMember?.organization.id)
        .eq('status', 'active');

      if (error) throw error;
      setChannels(data || []);
    } catch (error) {
      console.error('Erro ao carregar canais:', error);
      setError(t('common:error'));
    } finally {
      setLoading(false);
    }
  }

  // Carregar equipes do usuário
  async function loadUserTeams() {
    try {
      const { data, error } = await supabase
        .from('service_teams')
        .select('*')
        .eq('organization_id', currentOrganizationMember?.organization.id);

      if (error) throw error;
      setUserTeams(data || []);
    } catch (error) {
      console.error('Erro ao carregar equipes do usuário:', error);
    }
  }

  // Selecionar um canal e avançar para o próximo passo
  const handleSelectChannel = (channel: ChatChannel) => {
    setSelectedChannel(channel);
    setStep('enter-contact');
  };

  // Verificar se o cliente existe e avançar para o próximo passo
  const handleCheckCustomer = async () => {
    if (!contactValue.trim()) {
      setError(t('customers:contactRequired'));
      return;
    }

    setSearching(true);
    setError('');

    try {
      // Determinar o tipo de contato com base no canal selecionado
      const contactType = getContactTypeFromChannel(selectedChannel?.type || '');
      
      // Formatar o valor do contato
      const formattedValue = formatContactValue(contactType, contactValue, countryCode);

      // Verificar se existe um cliente com este contato
      const { data: contacts, error: contactsError } = await supabase
        .from('customer_contacts')
        .select('customer_id')
        .eq('type', contactType)
        .eq('value', formattedValue);

      if (contactsError) throw contactsError;

      if (contacts && contacts.length > 0) {
        // Cliente encontrado, buscar detalhes
        const { data: customer, error: customerError } = await supabase
          .from('customers')
          .select('*')
          .eq('id', contacts[0].customer_id)
          .single();

        if (customerError) throw customerError;

        // Verificar se existe um chat ativo para este cliente e canal
        checkExistingChat(customer.id, formattedValue);
      } else {
        // Cliente não encontrado, ir para o passo de criação
        setStep('create-customer');
      }
    } catch (error) {
      console.error('Erro ao verificar cliente:', error);
      setError(t('common:error'));
    } finally {
      setSearching(false);
    }
  };

  // Verificar se existe um chat ativo para o cliente e canal
  const checkExistingChat = async (customerId: string, formattedValue: string) => {
    try {
      const { data: existingChats, error: chatsError } = await supabase
        .from('chats')
        .select('*')
        .eq('organization_id', currentOrganizationMember?.organization.id)
        .eq('channel_id', selectedChannel?.id)
        .eq('customer_id', customerId)
        .in('status', ['in_progress', 'pending']);

      if (chatsError) throw chatsError;

      if (existingChats && existingChats.length > 0) {
        // Chat ativo encontrado, redirecionar
        navigate(`/app/chats/${existingChats[0].id}`);
        onClose();
      } else {
        // Não há chat ativo, criar um novo
        createChat(customerId, formattedValue);
      }
    } catch (error) {
      console.error('Erro ao verificar chat existente:', error);
      setError(t('common:error'));
    }
  };

  // Criar um novo cliente e iniciar chat
  const handleCreateCustomer = async () => {
    if (!customerName.trim()) {
      setError(t('customers:nameRequired'));
      return;
    }

    setStartingChat(true);
    setError('');

    try {
      // Determinar o tipo de contato com base no canal selecionado
      const contactType = getContactTypeFromChannel(selectedChannel?.type || '');
      
      // Formatar o valor do contato
      const formattedValue = formatContactValue(contactType, contactValue, countryCode);

      // Criar novo cliente
      const { data: newCustomer, error: createError } = await supabase
        .from('customers')
        .insert([{
          organization_id: currentOrganizationMember?.organization.id,
          name: customerName.trim()
        }])
        .select()
        .single();

      if (createError) throw createError;

      // Adicionar contato ao cliente
      const { error: contactError } = await supabase
        .from('customer_contacts')
        .insert([{
          customer_id: newCustomer.id,
          type: contactType,
          value: formattedValue,
          label: contactType === 'email' ? 'Email principal' : 'WhatsApp principal'
        }]);

      if (contactError) throw contactError;

      // Criar chat para o novo cliente
      createChat(newCustomer.id, formattedValue);
    } catch (error) {
      console.error('Erro ao criar cliente:', error);
      setError(t('common:error'));
      setStartingChat(false);
    }
  };

  // Criar um novo chat
  const createChat = async (customerId: string, formattedValue: string) => {
    setStartingChat(true);
    try {
      // Obter equipe do usuário (usar a primeira equipe se pertencer a várias)
      const teamId = userTeams.length > 0 ? userTeams[0].id : null;

      // Criar novo chat
      const { data: newChat, error: createError } = await supabase
        .from('chats')
        .insert([{
          organization_id: currentOrganizationMember?.organization.id,
          channel_id: selectedChannel?.id,
          customer_id: customerId,
          external_id: formattedValue,
          status: 'pending',
          assigned_to: session?.user?.id,
          team_id: teamId,
          arrival_time: new Date().toISOString(),
          start_time: new Date().toISOString()
        }])
        .select()
        .single();

      if (createError) throw createError;

      // Redirecionar para o novo chat
      navigate(`/app/chats/${newChat.id}`);
      onClose();
    } catch (error) {
      console.error('Erro ao criar chat:', error);
      setError(t('common:error'));
      setStartingChat(false);
    }
  };

  // Obter o tipo de contato com base no tipo de canal
  const getContactTypeFromChannel = (channelType: string): ContactType => {
    if (channelType.includes('whatsapp')) {
      return ContactType.WHATSAPP;
    } else if (channelType === 'email') {
      return ContactType.EMAIL;
    } else if (channelType === 'instagram') {
      return ContactType.INSTAGRAM;
    } else if (channelType === 'facebook') {
      return ContactType.FACEBOOK;
    } else if (channelType === 'telegram') {
      return ContactType.TELEGRAM;
    }
    return ContactType.OTHER;
  };

  // Formatar o valor do contato
  const formatContactValue = (contactType: ContactType, value: string, countryCodeValue: string): string => {
    if (contactType === ContactType.WHATSAPP || contactType === ContactType.PHONE) {
      // Remover caracteres não numéricos
      const cleanNumber = value.replace(/\D/g, '');
      
      // Adicionar código do país
      const country = countryCodes.find(cc => cc.code === countryCodeValue);
      if (country) {
        return `${country.dial_code}${cleanNumber}`;
      }
      return cleanNumber;
    }
    return value;
  };

  // Obter o rótulo do tipo de canal
  const getChannelTypeLabel = (type: string) => {
    switch (type) {
      case 'whatsapp_official':
        return t('channels:types.whatsapp_official');
      case 'whatsapp_wapi':
        return t('channels:types.whatsapp_wapi');
      case 'whatsapp_zapi':
        return t('channels:types.whatsapp_zapi');
      case 'whatsapp_evo':
        return t('channels:types.whatsapp_evo');
      case 'instagram':
        return t('channels:types.instagram');
      case 'facebook':
        return t('channels:types.facebook');
      case 'email':
        return t('channels:types.email');
      case 'telegram':
        return t('channels:types.telegram');
      default:
        return type;
    }
  };

  // Filtrar países com base na pesquisa
  const filteredCountries = countrySearch 
    ? countryCodes.filter(country => 
        country.name.toLowerCase().includes(countrySearch.toLowerCase()) || 
        country.dial_code.includes(countrySearch) ||
        country.code.toLowerCase().includes(countrySearch.toLowerCase()) ||
        (country.local_name && country.local_name.toLowerCase().includes(countrySearch.toLowerCase()))
      )
    : countryCodes;

  // Efeito para fechar o dropdown quando clicar fora dele
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (countryDropdownRef.current && !countryDropdownRef.current.contains(event.target as Node)) {
        setShowCountryDropdown(false);
      }
    }

    // Adicionar event listener quando o dropdown estiver aberto
    if (showCountryDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      // Focar no input de pesquisa quando o dropdown abrir
      if (countrySearchInputRef.current) {
        countrySearchInputRef.current.focus();
      }
    }

    // Limpar event listener
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showCountryDropdown]);

  // Resetar o índice destacado quando a pesquisa mudar
  useEffect(() => {
    setHighlightedCountryIndex(-1);
  }, [countrySearch]);

  // Função para lidar com teclas de navegação no dropdown
  const handleCountryKeyDown = (e: React.KeyboardEvent) => {
    if (!showCountryDropdown) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedCountryIndex(prev => 
          prev < filteredCountries.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedCountryIndex(prev => prev > 0 ? prev - 1 : 0);
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedCountryIndex >= 0 && highlightedCountryIndex < filteredCountries.length) {
          const selectedCountry = filteredCountries[highlightedCountryIndex];
          setCountryCode(selectedCountry.code);
          setShowCountryDropdown(false);
          setCountrySearch('');
        }
        break;
      case 'Escape':
        e.preventDefault();
        setShowCountryDropdown(false);
        break;
    }
  };

  // Renderizar o conteúdo com base no passo atual
  const renderContent = () => {
    switch (step) {
      case 'select-channel':
        return (
          <>
            <div className="flex justify-between items-center p-6 border-b dark:border-gray-700">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                {t('channels:selectChannel')}
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

              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                </div>
              ) : channels.length === 0 ? (
                <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                  {t('channels:noChannelsYet')}
                </div>
              ) : (
                <div className="space-y-3">
                  {channels.map((channel) => (
                    <button
                      key={channel.id}
                      onClick={() => handleSelectChannel(channel)}
                      className="w-full flex items-center p-4 bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                      <div className="mr-3">
                        <img 
                          src={getChannelIcon(channel.type)} 
                          alt={channel.type} 
                          className="w-8 h-8"
                        />
                      </div>
                      <div className="flex-1 text-left">
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                          {channel.name}
                        </h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {getChannelTypeLabel(channel.type)}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </>
        );

      case 'enter-contact':
        return (
          <>
            <div className="flex justify-between items-center p-6 border-b dark:border-gray-700">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                {selectedChannel?.type.includes('whatsapp') 
                  ? t('customers:enterWhatsApp') 
                  : selectedChannel?.type === 'email'
                  ? t('customers:enterEmail')
                  : t('customers:enterContact')}
              </h3>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setStep('select-channel')}
                  className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6">
              {error ? (
                <div className="mb-4 text-red-600 dark:text-red-400">{error}</div>
              ) : null}

              <div className="mb-6">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  {selectedChannel?.type.includes('whatsapp') 
                    ? t('customers:enterWhatsAppDescription') 
                    : selectedChannel?.type === 'email'
                    ? t('customers:enterEmailDescription')
                    : t('customers:enterContactDescription')}
                </p>

                <div className="flex items-start mb-4">
                  {selectedChannel?.type.includes('whatsapp') ? (
                    <div className="flex flex-col w-full">
                      <div className="flex">
                        <div className="relative" ref={countryDropdownRef}>
                          <button
                            type="button"
                            className="h-10 px-3 border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white rounded-l-md flex items-center justify-between min-w-[100px]"
                            onClick={() => setShowCountryDropdown(!showCountryDropdown)}
                          >
                            {countryCodes.find(c => c.code === countryCode)?.code} 
                            {countryCodes.find(c => c.code === countryCode)?.dial_code || '+?'}
                          </button>
                          
                          {showCountryDropdown && (
                            <div className="absolute z-10 mt-1 w-72 max-h-60 overflow-auto bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg">
                              <div className="sticky top-0 bg-white dark:bg-gray-800 p-2 border-b border-gray-200 dark:border-gray-700">
                                <input
                                  ref={countrySearchInputRef}
                                  type="text"
                                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                  placeholder={t('common:searchCountry')}
                                  value={countrySearch}
                                  onChange={(e) => setCountrySearch(e.target.value)}
                                  onKeyDown={handleCountryKeyDown}
                                />
                              </div>
                              <div>
                                {filteredCountries.length > 0 ? (
                                  filteredCountries.map((country, index) => (
                                    <button
                                      key={country.code}
                                      type="button"
                                      className={`w-full text-left px-3 py-2 flex items-center text-gray-900 dark:text-white ${
                                        index === highlightedCountryIndex 
                                          ? 'bg-blue-100 dark:bg-blue-900' 
                                          : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                                      }`}
                                      onClick={() => {
                                        setCountryCode(country.code);
                                        setShowCountryDropdown(false);
                                        setCountrySearch('');
                                      }}
                                    >
                                      <span className="mr-2">{country.code}</span>
                                      <span className="mr-2">{country.dial_code}</span>
                                      <span className="text-sm">
                                        {country.name}
                                        {country.local_name && country.local_name !== country.name && (
                                          <span className="text-gray-500 dark:text-gray-400 ml-1">
                                            ({country.local_name})
                                          </span>
                                        )}
                                      </span>
                                    </button>
                                  ))
                                ) : (
                                  <div className="px-3 py-2 text-gray-500 dark:text-gray-400 text-center">
                                    {t('common:noCountriesFound')}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                        
                        <input
                          type="text"
                          className="flex-1 h-10 rounded-r-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3"
                          placeholder="999999999"
                          value={contactValue}
                          onChange={(e) => setContactValue(e.target.value)}
                        />
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {t('customers:whatsappFormatHint')}
                      </p>
                    </div>
                  ) : selectedChannel?.type === 'email' ? (
                    <div className="w-full">
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Mail className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          type="email"
                          className="block w-full pl-10 pr-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          placeholder="email@exemplo.com"
                          value={contactValue}
                          onChange={(e) => setContactValue(e.target.value)}
                        />
                      </div>
                    </div>
                  ) : (
                    <input
                      type="text"
                      className="w-full h-10 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3"
                      placeholder={t('customers:contactPlaceholder')}
                      value={contactValue}
                      onChange={(e) => setContactValue(e.target.value)}
                    />
                  )}
                </div>

                <button
                  onClick={handleCheckCustomer}
                  disabled={searching || !contactValue.trim()}
                  className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-md transition-colors"
                >
                  {searching ? (
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  ) : (
                    <ArrowRight className="w-5 h-5 mr-2" />
                  )}
                  {t('common:continue')}
                </button>
              </div>
            </div>
          </>
        );

      case 'create-customer':
        return (
          <>
            <div className="flex justify-between items-center p-6 border-b dark:border-gray-700">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                {t('customers:createNewCustomer')}
              </h3>
              <button
                onClick={() => setStep('enter-contact')}
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
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  {t('customers:customerNotFound')}
                </p>

                <div className="mb-4">
                  <label htmlFor="customerName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('customers:name')} *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      id="customerName"
                      className="block w-full pl-10 pr-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      placeholder={t('customers:namePlaceholder')}
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                    />
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {selectedChannel?.type.includes('whatsapp') 
                      ? t('customers:whatsapp') 
                      : selectedChannel?.type === 'email'
                      ? t('customers:email')
                      : t('customers:contact')}
                  </label>
                  <div className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300">
                    {selectedChannel?.type.includes('whatsapp') ? (
                      <div className="flex items-center">
                        <span className="mr-2">
                          {countryCodes.find(c => c.code === countryCode)?.code}
                        </span>
                        <span>
                          {countryCodes.find(c => c.code === countryCode)?.dial_code || '+?'} {contactValue}
                        </span>
                      </div>
                    ) : (
                      contactValue
                    )}
                  </div>
                </div>

                <button
                  onClick={handleCreateCustomer}
                  disabled={startingChat || !customerName.trim()}
                  className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-md transition-colors"
                >
                  {startingChat ? (
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  ) : (
                    <ArrowRight className="w-5 h-5 mr-2" />
                  )}
                  {t('customers:createAndStartChat')}
                </button>
              </div>
            </div>
          </>
        );
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
        {renderContent()}
      </div>
    </div>
  );
} 