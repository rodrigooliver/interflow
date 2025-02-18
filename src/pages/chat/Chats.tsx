import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Filter, MessageSquare, Users, UserCheck, UserMinus, Loader2 } from 'lucide-react';
import { useOrganization } from '../../hooks/useOrganization';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import { ChatList } from '../../components/chat/ChatList';
import { ChatMessages } from '../../components/chat/ChatMessages';
import { Chat } from '../../types/database';


export default function Chats() {
  const { t } = useTranslation(['chats', 'common']);
  const { currentOrganization } = useOrganization();
  const { session } = useAuth();
  const [selectedFilter, setSelectedFilter] = useState<string>('assigned-to-me');
  const [showFilters, setShowFilters] = useState(false);
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedChat, setSelectedChat] = useState<string | null>(null);

  const filters = [
    { id: 'unassigned', label: t('chats:filters.unassigned'), icon: UserMinus },
    { id: 'assigned-to-me', label: t('chats:filters.assignedToMe'), icon: UserCheck },
    { id: 'team', label: t('chats:filters.assignedToTeam'), icon: Users },
  ];

  useEffect(() => {
    if (currentOrganization && session?.user) {
      loadChats();
      subscribeToChats();
    }
  }, [currentOrganization, session?.user, selectedFilter, searchTerm]);

  const subscribeToChats = () => {
    const subscription = supabase
      .channel('chats')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'messages',
        filter: `organization_id=eq.${currentOrganization?.id}`
      }, () => {
        // Reload chats when new messages arrive
        loadChats();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  };

  async function loadChats() {
    if (!currentOrganization || !session?.user) return;

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
          last_message:messages!chats_last_message_id_fkey(
            content,
            status,
            error_message,
            created_at,
            sender_type
          )
        `)
        .eq('organization_id', currentOrganization.id)
        .order('last_message_at', { ascending: false });

      // Apply filter
      let teamMembers;
      let teamIds;
      switch (selectedFilter) {
        case 'unassigned':
          query = query.eq('status', 'pending');
          break;
        case 'assigned-to-me':
          query = query
            .eq('assigned_to', session.user.id)
            .eq('status', 'in_progress');
          break;
        case 'team': {
          const { data } = await supabase
            .from('service_team_members')
            .select('team_id')
            .eq('user_id', session.user.id);
          
          teamMembers = data;
          teamIds = teamMembers?.map(tm => tm.team_id) || [];
          
          query = query
            .in('team_id', teamIds)
            .neq('assigned_to', session.user.id)
            .eq('status', 'in_progress');
          break;
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
      {/* Left Column - Chat List & Filters */}
      <div className="w-80 flex-shrink-0 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col h-full">
        {/* Header */}
        <div className="flex-shrink-0 p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('chats:title')}
            </h2>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
            >
              <Filter className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </button>
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

        {/* Filters */}
        {showFilters && (
          <div className="flex-shrink-0 p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
              {t('chats:filters.title')}
            </h3>
            <div className="space-y-2">
              {filters.map((filter) => {
                const Icon = filter.icon;
                return (
                  <button
                    key={filter.id}
                    onClick={() => setSelectedFilter(filter.id)}
                    className={`w-full flex items-center px-3 py-2 rounded-lg text-sm ${
                      selectedFilter === filter.id
                        ? 'bg-blue-50 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    <Icon className="w-4 h-4 mr-3" />
                    {filter.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Chat List */}
        <div onClick={(e) => {
          const target = e.target as HTMLElement;
          const chatItem = target.closest('a');
          if (chatItem) {
            e.preventDefault();
            const chatId = chatItem.getAttribute('data-chat-id');
            if (chatId) {
              setSelectedChat(chatId);
            }
          }
        }}>
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
            />
          )}
        </div>
      </div>

      {/* Right Column - Chat Area */}
      <div className="flex-1 flex flex-col bg-gray-50 dark:bg-gray-900 h-full">
        {selectedChat ? (
          <ChatMessages 
            chatId={selectedChat}
            organizationId={currentOrganization?.id || ''}
          />
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