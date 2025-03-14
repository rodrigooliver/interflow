import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Filter, MessageSquare, Users, UserCheck, Loader2, Bot, Share2, Tags, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { ChatList } from '../../components/chat/ChatList';
import { ChatMessages } from '../../components/chat/ChatMessages';
import { Chat } from '../../types/database';
import { useAuthContext } from '../../contexts/AuthContext';
import { useAgents, useTeams, useChannels, useTags, useFunnels } from '../../hooks/useQueryes';

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
        label: agent.full_name
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

  useEffect(() => {
    const checkMobileView = () => {
      setIsMobileView(window.innerWidth < 768); // 768px é o breakpoint md do Tailwind
    };

    checkMobileView();
    window.addEventListener('resize', checkMobileView);
    return () => window.removeEventListener('resize', checkMobileView);
  }, []);

  const subscribeToChats = () => {
    const messagesSubscription = supabase
      .channel('messages-status-changes')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'messages',
        filter: `organization_id=eq.${currentOrganizationMember?.organization.id}`
      }, async (payload) => {
        await updateChatInList(payload.new.chat_id);
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
        await updateChatInList(payload.new.id);
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
      console.log('chatData', chatData);
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

  return (
    <div className="h-screen flex bg-gray-100 dark:bg-gray-900">
      {/* Filters Sidebar */}
      {showFilters && (
        <div className="fixed md:relative inset-0 md:inset-auto md:w-72 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 overflow-y-auto z-30">
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
                              setSelectedFilter(e.target.value);
                              break;
                            case 'agent':
                              setSelectedAgent(e.target.value);
                              break;
                            case 'team':
                              setSelectedTeam(e.target.value);
                              break;
                            case 'channel':
                              setSelectedChannel(e.target.value);
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
        isMobileView && selectedChat ? 'hidden' : 'w-full md:w-80'
      } flex-shrink-0 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col h-full`}>
        {/* Header */}
        <div className="flex-shrink-0 p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('chats:title')}
            </h2>
            <div className="flex items-center space-x-2">
              {isMobileView && selectedChat && (
                <button
                  onClick={() => setSelectedChat(null)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
                >
                  <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                </button>
              )}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
              >
                <Filter className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>
          </div>
          <div className="relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t('chats:searchPlaceholder')}
              className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-700 border-0 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
            />
            <Search className="absolute left-3 top-2.5 w-5 h-5 text-gray-400 dark:text-gray-500" />
          </div>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto">
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
              onSelectChat={setSelectedChat} 
            />
          )}
        </div>
      </div>

      {/* Right Column - Chat Area */}
      <div className={`${
        isMobileView && !selectedChat ? 'hidden' : 'flex-1'
      } flex flex-col bg-gray-50 dark:bg-gray-900 h-full`}>
        {selectedChat ? (
          <div className="flex flex-col h-full">
            {isMobileView && (
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setSelectedChat(null)}
                  className="flex items-center text-gray-500 dark:text-gray-400"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  {t('chats:backToList')}
                </button>
              </div>
            )}
            <ChatMessages 
              chatId={selectedChat}
              organizationId={currentOrganizationMember?.organization.id || ''}
            />
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
            <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
              <MessageSquare className="w-10 h-10 text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2">
              {t('chats:selectChat.title')}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm">
              {t('chats:selectChat.description')}
            </p>
          </div>
        )}
      </div>
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