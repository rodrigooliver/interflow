import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Filter, MessageSquare, Users, UserCheck, Loader2, Bot, Share2, Tags, X, Plus } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { ChatList } from '../../components/chat/ChatList';
import { ChatMessages } from '../../components/chat/ChatMessages';
import { Chat } from '../../types/database';
import { useAuthContext } from '../../contexts/AuthContext';
import { useAgents, useTeams, useChannels, useTags, useFunnels } from '../../hooks/useQueryes';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChatFlowModal } from '../../components/chat/ChatFlowModal';
import { useNavbarVisibility } from '../../contexts/NavbarVisibilityContext';

// Novos tipos para os filtros
type FilterOption = {
  id: string;
  label: string;
  icon: LucideIcon;
  type?: 'select' | 'multi-select';
  options?: { id: string; label: string }[];
};

export default function Chats() {
  const { t } = useTranslation(['chats', 'common']);
  const { session, currentOrganizationMember } = useAuthContext();
  const [selectedFilter, setSelectedFilter] = useState<string>('assigned-to-me');
  const [selectedAgent, setSelectedAgent] = useState<string>('');
  const [selectedTeam, setSelectedTeam] = useState<string>('');
  const [selectedChannel, setSelectedChannel] = useState<string>('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedFunnel, setSelectedFunnel] = useState<string>('');
  const [selectedStage, setSelectedStage] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [isMobileView, setIsMobileView] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const [showStartChatModal, setShowStartChatModal] = useState(false);
  const { showNavbar } = useNavbarVisibility();

  // Hooks para buscar dados dos filtros
  const { data: agents } = useAgents(currentOrganizationMember?.organization.id);
  const { data: teams } = useTeams(currentOrganizationMember?.organization.id);
  const { data: channels } = useChannels(currentOrganizationMember?.organization.id);
  const { data: tags } = useTags(currentOrganizationMember?.organization.id);
  const { data: funnels } = useFunnels(currentOrganizationMember?.organization.id);

  const filters: FilterOption[] = [
    { 
      id: 'status', 
      label: t('chats:filters.status'),
      icon: MessageSquare,
      type: 'select',
      options: [
        { id: 'unassigned', label: t('chats:filters.unassigned') },
        { id: 'assigned-to-me', label: t('chats:filters.assignedToMe') },
        { id: 'team', label: t('chats:filters.assignedToTeam') },
        { id: 'completed', label: t('chats:filters.completed') },
        { id: 'spam', label: t('chats:filters.spam') },
      ]
    },
    {
      id: 'automation',
      label: t('chats:filters.automation'),
      icon: Bot,
      type: 'select',
      options: [
        { id: 'active', label: t('chats:filters.automationActive') },
        { id: 'inactive', label: t('chats:filters.automationInactive') },
      ]
    },
    {
      id: 'agent',
      label: t('chats:filters.agent'),
      icon: UserCheck,
      type: 'select',
      options: agents?.map(agent => ({
        id: agent.id,
        label: agent.profile?.full_name || t('chats:unnamed')
      })) || []
    },
    {
      id: 'team',
      label: t('chats:filters.team'),
      icon: Users,
      type: 'select',
      options: teams?.map(team => ({
        id: team.id,
        label: team.name
      })) || []
    },
    {
      id: 'channel',
      label: t('chats:filters.channel'),
      icon: Share2,
      type: 'select',
      options: channels?.map(channel => ({
        id: channel.id,
        label: channel.name
      })) || []
    },
    {
      id: 'tags',
      label: t('chats:filters.tags'),
      icon: Tags,
      type: 'multi-select',
      options: tags?.map(tag => ({
        id: tag.id,
        label: tag.name
      })) || []
    },
    {
      id: 'funnel',
      label: t('chats:filters.funnel'),
      icon: Filter,
      type: 'select',
      options: funnels?.map(funnel => ({
        id: funnel.id,
        label: funnel.name
      })) || []
    }
  ];

  useEffect(() => {
    if (currentOrganizationMember && session?.user) {
      loadChats();
      subscribeToChats();
    }
  }, [currentOrganizationMember, session?.user, selectedFilter, searchTerm]);

  // Efeito para verificar o ID do chat na URL
  useEffect(() => {
    // Verificar se há um ID de chat na URL (formato: /app/chats/:chatId)
    const chatIdFromUrl = location.pathname.match(/\/app\/chats\/([^/]+)/)?.[1];
    
    if (chatIdFromUrl && chatIdFromUrl !== selectedChat) {
      // Se houver um ID na URL e for diferente do chat selecionado atualmente
      setSelectedChat(chatIdFromUrl);
      
      // Verificar se o chat já está carregado na lista
      const chatExists = chats.some(chat => chat.id === chatIdFromUrl);
      
      // Se o chat não estiver na lista atual, carregá-lo individualmente
      if (!chatExists && !loading) {
        loadChatById(chatIdFromUrl);
      }
    }
  }, [location.pathname, chats, loading, selectedChat]);

  useEffect(() => {
    const checkMobileView = () => {
      // Em telas menores que 900px, sempre considerar como mobile
      // Entre 900px e 1300px, considerar como mobile apenas se os filtros estiverem visíveis
      setIsMobileView(window.innerWidth < 900 || (showFilters && window.innerWidth < 1300));
    };

    checkMobileView();
    window.addEventListener('resize', checkMobileView);
    return () => window.removeEventListener('resize', checkMobileView);
  }, [showFilters]);

  const subscribeToChats = () => {
    const messagesSubscription = supabase
      .channel('messages-status-changes')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'messages',
        filter: `organization_id=eq.${currentOrganizationMember?.organization.id}`
      }, async (payload) => {
        if (payload.new && 'chat_id' in payload.new) {
          await updateChatInList(payload.new.chat_id as string);
        }
      })
      .subscribe();

    const chatsSubscription = supabase
      .channel('chats-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'chats',
        filter: `organization_id=eq.${currentOrganizationMember?.organization.id}`
      }, async (payload) => {
        if (payload.new && 'id' in payload.new) {
          await updateChatInList(payload.new.id as string);
        }
      })
      .subscribe();

    return () => {
      messagesSubscription.unsubscribe();
      chatsSubscription.unsubscribe();
    };
  };

  // Função auxiliar para atualizar um chat específico na lista
  const updateChatInList = async (chatId: string) => {
    const { data: chatData } = await supabase
      .from('chats')
      .select(`
        *,
        customer:customers(
          name,
          email,
          whatsapp
        ),
        channel:chat_channels(
          type,
          is_connected,
          name
        ),
        last_message:messages!chats_last_message_id_fkey(
          content,
          status,
          error_message,
          created_at,
          sender_type
        )
      `)
      .eq('id', chatId)
      .single();

    if (chatData) {
      // console.log('chatData', chatData);
      // Verificar se o chat corresponde aos filtros atuais
      const shouldIncludeChat = () => {
        switch (selectedFilter) {
          case 'unassigned':
            return chatData.status === 'pending';
          case 'assigned-to-me':
            return chatData.status === 'in_progress' && chatData.assigned_to === session?.user?.id;
          case 'team':
            return chatData.team_id === selectedTeam && chatData.assigned_to !== session?.user?.id;
          case 'completed':
            return chatData.status === 'closed';
          case 'spam':
            return chatData.status === 'spam';
          default:
            return true;
        }
      };

      // Verificar filtros adicionais
      const matchesAdditionalFilters = () => {
        if (selectedAgent && chatData.assigned_to !== selectedAgent) return false;
        if (selectedTeam && chatData.team_id !== selectedTeam) return false;
        if (selectedChannel && chatData.channel_id !== selectedChannel) return false;
        if (selectedTags.length > 0 && !selectedTags.every(tag => chatData.tags?.includes(tag))) return false;
        if (selectedFunnel && chatData.funnel_id !== selectedFunnel) return false;
        if (selectedStage && chatData.funnel_stage_id !== selectedStage) return false;
        
        // Verificar termo de busca
        if (searchTerm) {
          const searchLower = searchTerm.toLowerCase();
          const matchesSearch = 
            chatData.customer?.name?.toLowerCase().includes(searchLower) ||
            chatData.customer?.email?.toLowerCase().includes(searchLower) ||
            chatData.customer?.whatsapp?.toLowerCase().includes(searchLower);
          if (!matchesSearch) return false;
        }
        
        return true;
      };

      setChats(prev => {
        // Remover o chat atual da lista
        const newChats = prev.filter(chat => chat.id !== chatId);
        
        // Se o chat não corresponder aos filtros, retornar a lista sem ele
        if (!shouldIncludeChat() || !matchesAdditionalFilters()) {
          return newChats;
        }

        // Caso contrário, adicionar o chat atualizado e ordenar
        const processedChat = {
          ...chatData,
          channel_id: chatData.channel,
          last_message: chatData.last_message ? {
            content: chatData.last_message.content,
            status: chatData.last_message.status,
            error_message: chatData.last_message.error_message,
            created_at: chatData.last_message.created_at,
            sender_type: chatData.last_message.sender_type
          } : undefined
        };

        return [processedChat, ...newChats].sort((a, b) => {
          const dateA = a.last_message?.created_at || '';
          const dateB = b.last_message?.created_at || '';
          return dateB.localeCompare(dateA);
        });
      });
    }
  };

  async function loadChats() {
    if (!currentOrganizationMember || !session?.user) return;

    setLoading(true);
    try {
      let query = supabase
        .from('chats')
        .select(`
          *,
          customer:customers(
            name,
            email,
            whatsapp
          ),
          channel:chat_channels(
            type,
            is_connected,
            name
          ),
          last_message:messages!chats_last_message_id_fkey(
            content,
            status,
            error_message,
            created_at,
            sender_type
          )
        `)
        .eq('organization_id', currentOrganizationMember.organization.id)
        .order('last_message(created_at)', { ascending: false });

      // Mover declarações para fora do switch
      let teamMembers;
      let teamIds;

      // Aplicar filtros
      switch (selectedFilter) {
        case 'unassigned':
          query = query.eq('status', 'pending');
          break;
        case 'assigned-to-me':
          query = query
            .eq('assigned_to', session.user.id)
            .eq('status', 'in_progress');
          break;
        case 'team':
          // Get user's teams first
          teamMembers = await supabase
            .from('service_team_members')
            .select('team_id')
            .eq('user_id', session.user.id);

          teamIds = teamMembers?.data?.map(tm => tm.team_id) || [];
          
          // Filter chats by team and exclude those assigned to the current user
          query = query
            .in('team_id', teamIds)
            .neq('assigned_to', session.user.id);
          break;
        case 'completed':
          query = query.eq('status', 'closed');
          break;
        case 'spam':
          query = query.eq('status', 'spam');
          break;
      }

      if (selectedAgent) {
        query = query.eq('assigned_to', selectedAgent);
      }

      if (selectedTeam) {
        query = query.eq('team_id', selectedTeam);
      }

      if (selectedChannel) {
        query = query.eq('channel_id', selectedChannel);
      }

      if (selectedTags.length > 0) {
        query = query.contains('tags', selectedTags);
      }

      if (selectedFunnel) {
        query = query.eq('funnel_id', selectedFunnel);
        if (selectedStage) {
          query = query.eq('funnel_stage_id', selectedStage);
        }
      }

      // Apply search if there's a term
      if (searchTerm) {
        query = query.or(`customer.name.ilike.%${searchTerm}%,customer.email.ilike.%${searchTerm}%,customer.whatsapp.ilike.%${searchTerm}%`);
      }

      const { data, error: chatsError } = await query;

      if (chatsError) throw chatsError;

      const processedChats = (data || []).map(chat => ({
        ...chat,
        // channel_type: chat.channel?.type,
        channel_id: chat.channel,
        last_message: chat.last_message ? {
          content: chat.last_message.content,
          status: chat.last_message.status,
          error_message: chat.last_message.error_message,
          created_at: chat.last_message.created_at,
          sender_type: chat.last_message.sender_type
        } : undefined
      }));

      setChats(processedChats);
    } catch (error) {
      console.error('Error loading chats:', error);
      setError(t('common:error'));
    } finally {
      setLoading(false);
    }
  }

  // Função para carregar um chat específico pelo ID
  async function loadChatById(chatId: string) {
    try {
      const { data: chatData, error: chatError } = await supabase
        .from('chats')
        .select(`
          *,
          customer:customers(
            name,
            email,
            whatsapp
          ),
          channel:chat_channels(
            type,
            is_connected,
            name
          ),
          last_message:messages!chats_last_message_id_fkey(
            content,
            status,
            error_message,
            created_at,
            sender_type
          )
        `)
        .eq('id', chatId)
        .single();

      if (chatError) throw chatError;

      if (chatData) {
        const processedChat = {
          ...chatData,
          channel_id: chatData.channel,
          last_message: chatData.last_message ? {
            content: chatData.last_message.content,
            status: chatData.last_message.status,
            error_message: chatData.last_message.error_message,
            created_at: chatData.last_message.created_at,
            sender_type: chatData.last_message.sender_type
          } : undefined
        };

        // Adicionar o chat à lista se ele não existir
        setChats(prev => {
          // Verificar se o chat já existe na lista
          if (prev.some(chat => chat.id === chatId)) {
            return prev;
          }
          // Adicionar o novo chat à lista
          return [processedChat, ...prev];
        });
      }
    } catch (error) {
      console.error('Error loading chat by ID:', error);
      setError(t('common:error'));
    }
  }

  // Função para lidar com a alteração de filtros
  const handleFilterChange = (filterId: string, value: string | string[]) => {
    // Atualizar o estado do filtro correspondente
    switch (filterId) {
      case 'status':
        setSelectedFilter(value as string);
        break;
      case 'agent':
        setSelectedAgent(value as string);
        break;
      case 'team':
        setSelectedTeam(value as string);
        break;
      case 'channel':
        setSelectedChannel(value as string);
        break;
      case 'tags':
        setSelectedTags(value as string[]);
        break;
      case 'funnel':
        setSelectedFunnel(value as string);
        break;
      case 'stage':
        setSelectedStage(value as string);
        break;
    }

    // Se a tela for menor que 1300px e um chat estiver selecionado, voltar para a lista
    if (window.innerWidth < 1300 && selectedChat) {
      setSelectedChat(null);
    }
  };

  // Atualizar a URL quando um chat for selecionado
  const handleSelectChat = (chatId: string | null) => {
    setSelectedChat(chatId);
    
    // Atualizar a URL sem recarregar a página
    if (chatId) {
      navigate(`/app/chats/${chatId}`, { replace: true });
    } else {
      navigate('/app/chats', { replace: true });
    }
  };

  // Garantir que a barra de navegação seja exibida quando o componente for montado
  useEffect(() => {
    showNavbar();
  }, [showNavbar]);

  return (
    <div className="h-screen flex bg-gray-100 dark:bg-gray-900">
      {/* Filters Sidebar */}
      {showFilters && (
        <div 
          data-filters-sidebar
          className="fixed md:relative inset-0 md:inset-auto md:w-72 lg:w-80 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 overflow-y-auto z-30"
        >
          <div className="p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                {t('chats:filters.title')}
              </h3>
              <button
                onClick={() => setShowFilters(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
              >
                <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              </button>
            </div>
            <div className="space-y-4">
              {filters.map((filter) => {
                const Icon = filter.icon;
                if (filter.type === 'select') {
                  return (
                    <div key={filter.id} className="space-y-2">
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center">
                        <Icon className="w-4 h-4 mr-2" />
                        {filter.label}
                      </label>
                      <select
                        className="w-full h-10 px-3 rounded-lg border border-gray-300 dark:border-gray-600 
                          bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                          cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                          value={selectedFilter}
                        onChange={(e) => {
                          switch (filter.id) {
                            case 'status':
                              handleFilterChange('status', e.target.value);
                              break;
                            case 'agent':
                              handleFilterChange('agent', e.target.value);
                              break;
                            case 'team':
                              handleFilterChange('team', e.target.value);
                              break;
                            case 'channel':
                              handleFilterChange('channel', e.target.value);
                              break;
                          }
                        }}
                      >
                        <option value="" className="bg-white dark:bg-gray-700">
                          {t('common:all')}
                        </option>
                        {filter.options?.map(option => (
                          <option 
                            key={option.id} 
                            value={option.id}
                            className="bg-white dark:bg-gray-700"
                          >
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                }
                return null;
              })}
            </div>
          </div>
        </div>
      )}

      {/* Chat List Column */}
      <div className={`${
        (isMobileView && selectedChat) || (showFilters && selectedChat && window.innerWidth < 1300) ? 'hidden' : 'w-full md:w-80 lg:w-96'
      } flex-shrink-0 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col h-full`}>
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t('chats:title')}
          </h2>
          <div className="flex space-x-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2 rounded-md ${
                showFilters ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              <Filter className="w-5 h-5" />
            </button>
            <button
              onClick={() => setShowStartChatModal(true)}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-md"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search input */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="relative">
            <input
              type="text"
              placeholder={t('chats:searchPlaceholder')}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                if (window.innerWidth < 1300 && selectedChat) {
                  setSelectedChat(null);
                }
              }}
            />
            <Search className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
          </div>
        </div>

        {/* Status Filter Buttons */}
        <div className="mt-3 overflow-x-auto pb-1 flex space-x-2 scrollbar-hide">
          <button
            onClick={() => handleFilterChange('status', '')}
            className={`flex-shrink-0 px-3 py-1 text-sm rounded-full whitespace-nowrap ${
              selectedFilter === '' 
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' 
                : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {t('common:all')}
          </button>
          <button
            onClick={() => handleFilterChange('status', 'unassigned')}
            className={`flex-shrink-0 px-3 py-1 text-sm rounded-full whitespace-nowrap ${
              selectedFilter === 'unassigned' 
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' 
                : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {t('chats:filters.unassigned')}
          </button>
          <button
            onClick={() => handleFilterChange('status', 'assigned-to-me')}
            className={`flex-shrink-0 px-3 py-1 text-sm rounded-full whitespace-nowrap ${
              selectedFilter === 'assigned-to-me' 
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' 
                : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {t('chats:filters.assignedToMe')}
          </button>
          <button
            onClick={() => handleFilterChange('status', 'team')}
            className={`flex-shrink-0 px-3 py-1 text-sm rounded-full whitespace-nowrap ${
              selectedFilter === 'team' 
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' 
                : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {t('chats:filters.assignedToTeam')}
          </button>
          <button
            onClick={() => handleFilterChange('status', 'completed')}
            className={`flex-shrink-0 px-3 py-1 text-sm rounded-full whitespace-nowrap ${
              selectedFilter === 'completed' 
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' 
                : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {t('chats:filters.completed')}
          </button>
          <button
            onClick={() => handleFilterChange('status', 'spam')}
            className={`flex-shrink-0 px-3 py-1 text-sm rounded-full whitespace-nowrap ${
              selectedFilter === 'spam' 
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' 
                : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {t('chats:filters.spam')}
          </button>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto scrollbar-hide pb-16 md:pb-0">
          {error ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <p className="text-red-500 dark:text-red-400">
                {error}
              </p>
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
            </div>
          ) : chats.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <MessageSquare className="w-12 h-12 text-gray-400 dark:text-gray-500 mb-4" />
              <p className="text-gray-500 dark:text-gray-400">
                {t('chats:noChatsFound')}
              </p>
            </div>
          ) : (
            <ChatList 
              chats={chats}
              selectedChat={selectedChat}
              onSelectChat={handleSelectChat} 
            />
          )}
        </div>
      </div>

      {/* Right Column - Chat Area */}
      <div className={`${
        isMobileView && !selectedChat ? 'hidden' : 'flex-1'
      } flex flex-col bg-gray-50 dark:bg-gray-900 h-full`}>
        {selectedChat ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            <ChatMessages 
              chatId={selectedChat}
              organizationId={currentOrganizationMember?.organization.id || ''}
              onBack={() => handleSelectChat(null)}
            />
          </div>
        ) : (
          <div className="hidden md:flex flex-1 items-center justify-center bg-gray-50 dark:bg-gray-900">
            <div className="text-center max-w-md p-8">
              <MessageSquare className="w-16 h-16 text-gray-300 dark:text-gray-700 mx-auto mb-4" />
              <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2">
                {t('chats:selectChat.title')}
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-6">
                {t('chats:selectChat.description')}
              </p>
              <button
                onClick={() => setShowStartChatModal(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md flex items-center mx-auto"
              >
                <Plus className="w-5 h-5 mr-1" />
                {t('chats:startNewChat')}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal para iniciar nova conversa */}
      {showStartChatModal && (
        <ChatFlowModal onClose={() => setShowStartChatModal(false)} />
      )}
    </div>
  );
}

export const handleAtendimentoSequencial = async (chatId: string) => {
  const user = await supabase.auth.getUser();
  
  if (!user.data.user?.id) {
    throw new Error('Usuário não autenticado');
  }

  // Primeiro insere a mensagem
  const { error: messageError } = await supabase
    .from('messages')
    .insert({
      chat_id: chatId,
      type: 'user_entered',
      sender_type: 'system',
      sender_agent_id: user.data.user.id
    });

  if (messageError) throw new Error(messageError.message);

  // Depois atualiza o chat
  const { error: chatError } = await supabase
    .from('chats')
    .update({
      status: 'in_progress',
      assigned_to: user.data.user.id,
      start_time: new Date().toISOString()
    })
    .eq('id', chatId);

  if (chatError) throw new Error(chatError.message);
};