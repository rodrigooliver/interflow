import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Filter, MessageSquare, Users, UserCheck, Bot, Share2, Tags, X, Plus, GitMerge, Mail, Clock, CheckCircle, AlertTriangle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { ChatList } from '../../components/chat/ChatList';
import { ChatMessages } from '../../components/chat/ChatMessages';
import '../../components/chat/styles.css';
import { Chat } from '../../types/database';
import { useAuthContext } from '../../contexts/AuthContext';
import { useAgents, useTeams, useChannels, useTags, useFunnels } from '../../hooks/useQueryes';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChatFlowModal } from '../../components/chat/ChatFlowModal';
import { useNavbarVisibility } from '../../contexts/NavbarVisibilityContext';
import { SearchModal } from '../../components/chat/SearchModal';

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
  const [selectedAutomation, setSelectedAutomation] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [isMobileView, setIsMobileView] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const [showStartChatModal, setShowStartChatModal] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const { showNavbar } = useNavbarVisibility();
  
  // Referência para o elemento de observação no final da lista
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  
  // Estados para controle de paginação
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const PAGE_SIZE = 20;
  
  // Referência para o último timestamp de carregamento e filtros
  const [lastLoadTime, setLastLoadTime] = useState<number>(0);
  const CACHE_EXPIRY_TIME = 60000; // 1 minuto em milissegundos
  
  // Referência para controlar montagem inicial e mudança de tabs
  const isInitialMountRef = useRef(true);
  const isTabChangeRef = useRef(false);
  
  // Função para verificar se deve recarregar com base no timestamp
  const shouldReload = useCallback(() => {
    const now = Date.now();
    return (now - lastLoadTime) > CACHE_EXPIRY_TIME;
  }, [lastLoadTime]);

  // Hooks para buscar dados dos filtros
  const { data: agents } = useAgents(currentOrganizationMember?.organization.id);
  const { data: teams } = useTeams(currentOrganizationMember?.organization.id);
  const { data: channels } = useChannels(currentOrganizationMember?.organization.id);
  const { data: tags } = useTags(currentOrganizationMember?.organization.id);
  const { data: funnels } = useFunnels(currentOrganizationMember?.organization.id);

  // Obter os estágios do funil selecionado
  const selectedFunnelStages = useMemo(() => {
    if (!selectedFunnel || !funnels) return [];
    const funnel = funnels.find(f => f.id === selectedFunnel);
    return funnel?.stages || [];
  }, [selectedFunnel, funnels]);

  const filters: FilterOption[] = [
    { 
      id: 'status', 
      label: t('chats:filters.status'),
      icon: MessageSquare,
      type: 'select',
      options: [
        { id: 'unassigned', label: t('chats:filters.unassigned') },
        { id: 'assigned-to-me', label: t('chats:filters.assignedToMe') },
        { id: 'collaborating', label: t('chats:filters.collaborating') },
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

  // Adicionar filtro de estágio dinamicamente se um funil estiver selecionado
  if (selectedFunnel && selectedFunnelStages.length > 0) {
    filters.push({
      id: 'stage',
      label: t('chats:filters.stage'),
      icon: GitMerge,
      type: 'select',
      options: selectedFunnelStages.map(stage => ({
        id: stage.id,
        label: stage.name
      }))
    });
  }

  // Setup intersection observer para carregar mais chats quando o usuário rolar até o final da lista
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading && !loadingMore) {
          loadMoreChats();
        }
      },
      { threshold: 0.1 }
    );

    observerRef.current = observer;
    
    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [hasMore, loading, loadingMore, page]);

  // Efeito para verificar visibilidade da página e timestamp
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Marcar que estamos vindo de uma mudança de tab
        isTabChangeRef.current = true;
        
        if (page === 1 && shouldReload()) {
          setPage(1);
          setChats([]);
          setHasMore(true);
          loadChats(false, 1);
        }
      } else if (document.visibilityState === 'hidden') {
        // Quando o usuário sai da aba, atualizar o timestamp
        setLastLoadTime(Date.now());
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [page, shouldReload, lastLoadTime]);

  useEffect(() => {
    if (currentOrganizationMember && session?.user) {
      // Verificar se é a montagem inicial ou se estamos retornando de uma tab
      if (isInitialMountRef.current) {
        // É a primeira montagem do componente
        isInitialMountRef.current = false;
        setPage(1);
        setChats([]);
        setHasMore(true);
        loadChats(false, 1);
        subscribeToChats();
      } else if (isTabChangeRef.current) {
        // Estamos retornando de uma mudança de tab, não recarregar se não for necessário
        isTabChangeRef.current = false;
      } else {
        // É uma mudança genuína nos filtros
        setPage(1);
        setChats([]);
        setHasMore(true);
        loadChats(false, 1);
        subscribeToChats();
      }
    }
  }, [
    currentOrganizationMember, 
    session?.user, 
    selectedFilter, 
    selectedAgent, 
    selectedTeam, 
    selectedChannel, 
    selectedTags, 
    selectedFunnel, 
    selectedStage,
    selectedAutomation,
    showUnreadOnly
  ]);

  // Efeito para verificar o ID do chat na URL
  useEffect(() => {
    // Verificar se há um ID de chat na URL (formato: /app/chats/:chatId)
    const chatIdFromUrl = location.pathname.match(/\/app\/chats\/([^/]+)/)?.[1];
    
    if (chatIdFromUrl && chatIdFromUrl !== selectedChat) {
      // Se houver um ID na URL e for diferente do chat selecionado atualmente
      setSelectedChat(chatIdFromUrl);
      
      // Não vamos mais adicionar o chat à lista automaticamente
      // Apenas selecionamos o chat da URL, mesmo que ele não esteja na lista atual
      // Isso permite visualizar um chat específico mesmo que ele não corresponda aos filtros atuais
    }
  }, [location.pathname, selectedChat]);

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
    const chatsSubscription = supabase
      .channel('chats-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'chats',
        filter: `organization_id=eq.${currentOrganizationMember?.organization.id}`
      }, async (payload) => {
        // console.log('payload', payload);
        if (payload.new && 'id' in payload.new) {
          await updateChatInList(payload.new.id as string);
        }
      })
      .subscribe();

    return () => {
      chatsSubscription.unsubscribe();
    };
  };

  // Função auxiliar para atualizar um chat específico na lista
  const updateChatInList = async (chatId: string) => {
    // Evitar atualizações se o usuário acabou de voltar para a aba
    if (!shouldReload() && page > 1) {
      return;
    }
    
    let query;
    
    if (selectedFilter === 'collaborating') {
      query = supabase
        .from('chats')
        .select(`
          *,
          customer:customers(
            id,
            name,
            email,
            whatsapp,
            stage_id,
            is_spam,
            tags:customer_tags(
              tag_id,
              tags:tags(
                id,
                name,
                color
              )
            ),
            stage:crm_stages!customers_stage_id_fkey(
              id,
              name,
              funnel_id,
              color
            )
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
            sender_type,
            type
          ),
          team:service_teams!inner(
              id,
              name,
              members:service_team_members!inner(
                id,
                user_id
            )
          ),
          collaborators:chat_collaborators!inner(
            id,
            user_id
          )
        `)
        .eq('id', chatId) 
        .eq('organization_id', currentOrganizationMember?.organization.id)
        .eq('team.members.user_id', session?.user?.id)
        .eq('collaborators.user_id', session?.user?.id);
    } else {
      query = supabase
        .from('chats')
        .select(`
          *,
          customer:customers(
            id,
            name,
            email,
            whatsapp,
            stage_id,
            is_spam,
            tags:customer_tags(
              tag_id,
              tags:tags(
                id,
                name,
                color
              )
            ),
            stage:crm_stages!customers_stage_id_fkey(
              id,
              name,
              funnel_id,
              color
            )
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
            sender_type,
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
        .eq('id', chatId) 
        .eq('organization_id', currentOrganizationMember?.organization.id)
        .eq('team.members.user_id', session?.user?.id);
    }

    const { data: chatData } = await query.maybeSingle();

    // console.log('chatData', chatData, chatError);

    if (chatData) {
      // console.log('chatData', chatData);
      // Verificar se o chat corresponde aos filtros atuais
      
      const shouldIncludeChat = () => {
        switch (selectedFilter) {
          case 'unassigned':
            return chatData.status === 'pending';
          case 'assigned-to-me':
            return chatData.status === 'in_progress' && chatData.assigned_to === session?.user?.id;
          case 'collaborating':
            return chatData.status === 'in_progress' && chatData.collaborators && chatData.collaborators.length > 0;
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
      // console.log('selectedFilter', selectedFilter, shouldIncludeChat());

      // Verificar filtros adicionais
      const matchesAdditionalFilters = async () => {
        if (selectedAgent && chatData.assigned_to !== selectedAgent) return false;
        if (selectedTeam && chatData.team_id !== selectedTeam) return false;
        if (selectedChannel && chatData.channel_id !== selectedChannel) return false;
        
        // Verificar filtro de não lidos
        if (showUnreadOnly && (!chatData.unread_count || chatData.unread_count <= 0)) return false;
        
        // Verificação de tags usando os dados obtidos diretamente
        if (selectedTags.length > 0) {
          const customerTags = chatData.customer?.tags || [];
          return selectedTags.every(tagId => 
            customerTags.some((tag: { tag_id: string }) => tag.tag_id === tagId)
          );
        }
        
        // Verificação de funil e estágio
        if (selectedFunnel) {
          const customerStageId = chatData.customer?.stage_id;
          
          // Se temos um estágio específico selecionado
          if (selectedStage) {
            return customerStageId === selectedStage;
          } 
          // Se temos apenas o funil selecionado, verificar se o estágio do cliente pertence a este funil
          else if (customerStageId) {
            // Agora podemos acessar o funnel_id diretamente do stage do customer
            return chatData.customer?.stage?.funnel_id === selectedFunnel;
          }
          
          return false;
        }
        
        if (selectedAutomation === 'active' && chatData.flow_session_id === null) return false;
        if (selectedAutomation === 'inactive' && chatData.flow_session_id !== null) return false;
        
        return true;
      };

      // console.log('matchesAdditionalFilters', await matchesAdditionalFilters());

      // Como matchesAdditionalFilters agora é assíncrono, precisamos chamar de forma diferente
      const additionalFiltersMatch = await matchesAdditionalFilters();
      
      // Processar o chat apenas se estiver na primeira página ou se for o chat selecionado atualmente
      if (page === 1 || selectedChat === chatId) {
        setChats(prev => {
          // Remover o chat atual da lista
          const newChats = prev.filter(chat => chat.id !== chatId);
          
          // Se o chat não corresponder aos filtros, retornar a lista sem ele
          if (!shouldIncludeChat() || !additionalFiltersMatch) {
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
              sender_type: chatData.last_message.sender_type,
              type: chatData.last_message.type
            } : undefined
          };

          // Ordenar a lista mantendo a consistência com a ordenação do banco
          return [...newChats, processedChat].sort((a, b) => {
            // Primeiro ordena por is_fixed
            if (a.is_fixed !== b.is_fixed) {
              return a.is_fixed ? -1 : 1;
            }
            // Se ambos são fixados ou não fixados, ordena por data da última mensagem
            const dateA = a.last_message?.created_at || '';
            const dateB = b.last_message?.created_at || '';
            return dateB.localeCompare(dateA);
          });
        });
      }
    }
  };

  // Função para carregar mais chats
  const loadMoreChats = useCallback(async () => {
    if (!hasMore || loadingMore || loading) return;
    
    setLoadingMore(true);
    const nextPage = page + 1;
    
    try {
      await loadChats(true, nextPage);
      setPage(nextPage);
    } catch (error) {
      console.error('Error loading more chats:', error);
    } finally {
      setLoadingMore(false);
    }
  }, [page, hasMore, loadingMore, loading]);

  // Função para carregar os chats
  const loadChats = async (silentRefresh: boolean = false, currentPage: number = page) => {
    if (!silentRefresh && currentPage === 1) {
      setLoading(true);
    }
    setError('');
    
    if (!currentOrganizationMember || !session?.user) {
      return;
    }

    try {
      let query;
      
      if (selectedFilter === 'collaborating') {
        query = supabase
          .from('chats')
          .select(`
            *,
            customer:customers!chats_customer_id_fkey(
              id,
              name,
              email,
              whatsapp,
              stage_id,
              is_spam,
              profile_picture,
              tags:customer_tags(
                tag_id,
                tags:tags(
                  id,
                  name,
                  color
                )
              ),
              stage:crm_stages!customers_stage_id_fkey(
                id,
                name,
                funnel_id,
                color
              )
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
              sender_type,
              type
            ),
            team:service_teams!inner(
              id,
              name,
              members:service_team_members!inner(
                id,
                user_id
              )
            ),
            collaborators:chat_collaborators!inner(
              id,
              user_id
            )
          `)
          .eq('organization_id', currentOrganizationMember.organization.id)
          .eq('team.members.user_id', session.user.id)
          .eq('collaborators.user_id', session.user.id)
          .eq('status', 'in_progress')
          .order('is_fixed', { ascending: false })
          .order('last_message_at', { ascending: false })
          .range((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE - 1);
      } else {
        query = supabase
          .from('chats')
          .select(`
            *,
            customer:customers!chats_customer_id_fkey(
              id,
              name,
              email,
              whatsapp,
              stage_id,
              is_spam,
              profile_picture,
              tags:customer_tags(
                tag_id,
                tags:tags(
                  id,
                  name,
                  color
                )
              ),
              stage:crm_stages!customers_stage_id_fkey(
                id,
                name,
                funnel_id,
                color
              )
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
              sender_type,
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
          .eq('organization_id', currentOrganizationMember.organization.id)
          .eq('team.members.user_id', session.user.id)
          .order('is_fixed', { ascending: false })
          .order('last_message_at', { ascending: false })
          .range((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE - 1);

        // Aplicar filtros apenas se não for o filtro "collaborating"
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
            query = query
              .eq('status', 'in_progress')
              .neq('assigned_to', session.user.id);
            break;
          case 'completed':
            query = query.eq('status', 'closed');
            break;
        }
      }

      if(selectedFilter === 'spam') {
        query = query.not('customer', 'is', null)
          .eq('customer.is_spam', true);
      } else {
        query = query.not('customer', 'is', null)
          .eq('customer.is_spam', false);
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

      // Filtro para mensagens não lidas
      if (showUnreadOnly) {
        query = query.gt('unread_count', 0);
      }

      if (selectedTags.length > 0) {
        // Não precisamos fazer uma consulta separada, pois vamos filtrar os resultados após obter os dados
        // Deixamos a consulta sem filtro de tags e filtramos depois de receber os resultados
      }

      if (selectedFunnel) {
        // Primeiro, garantir que o cliente não seja nulo
        query = query.not('customer', 'is', null);
        
        // Se temos um funil selecionado, mas não temos um estágio específico,
        // precisamos obter todos os estágios desse funil e filtrar por eles
        if (!selectedStage) {
          // Filtrar diretamente pelo funnel_id do stage do customer
          query = query.eq('customer.stage.funnel_id', selectedFunnel)
            .not('customer.stage', 'is', null);
        } else {
          // Se temos um estágio específico selecionado, filtrar diretamente por ele
          query = query.eq('customer.stage_id', selectedStage);
        }
      }

      // Aplicar filtro de automação
      if (selectedAutomation) {
        switch (selectedAutomation) {
          case 'active':
            query = query.not('flow_session_id', 'is', null);
            break;
          case 'inactive':
            query = query.is('flow_session_id', null);
            break;
        }
      }

      const { data, error: chatsError } = await query;

      if (chatsError) throw chatsError;

      // Filtrar os chats com base nas tags selecionadas, se houver
      let filteredData = data || [];
      if (selectedTags.length > 0 && filteredData.length > 0) {
        filteredData = filteredData.filter(chat => {
          // Verificar se o cliente tem todas as tags selecionadas
          const customerTags = chat.customer?.tags || [];
          return selectedTags.every(tagId => 
            customerTags.some((tag: { tag_id: string }) => tag.tag_id === tagId)
          );
        });
      }

      const processedChats = (filteredData).map(chat => ({
        ...chat,
        channel_id: chat.channel,
        last_message: chat.last_message ? {
          content: chat.last_message.content,
          status: chat.last_message.status,
          error_message: chat.last_message.error_message,
          created_at: chat.last_message.created_at,
          sender_type: chat.last_message.sender_type,
          type: chat.last_message.type
        } : undefined
      }));
      
      // Verificar se temos mais dados
      setHasMore(processedChats.length === PAGE_SIZE);
      
      // Atualizar a lista de chats (concatenar com os existentes se for carregamento de mais itens)
      if (currentPage === 1) {
        setChats(processedChats);
      } else {
        setChats(prev => {
          // Filtrar chats duplicados
          const existingIds = new Set(prev.map(chat => chat.id));
          const newChats = processedChats.filter(chat => !existingIds.has(chat.id));
          return [...prev, ...newChats];
        });
      }
    } catch (error) {
      console.error('Error loading chats:', error);
      setError(t('common:error'));
    } finally {
      if (currentPage === 1) {
        setLoading(false);
      }
    }
  };

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
        // Limpar o estágio selecionado quando o funil muda
        setSelectedStage('');
        break;
      case 'stage':
        setSelectedStage(value as string);
        break;
      case 'automation':
        setSelectedAutomation(value as string);
        break;
    }

    // Não vamos mais limpar o chat selecionado em telas menores
    // Isso evita que o componente ChatMessages seja remontado desnecessariamente
    // Se o usuário quiser voltar para a lista, ele pode usar o botão de voltar no ChatMessages
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
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    setSelectedFilter('');
                    setSelectedAgent('');
                    setSelectedTeam('');
                    setSelectedChannel('');
                    setSelectedTags([]);
                    setSelectedFunnel('');
                    setSelectedStage('');
                    setSelectedAutomation('');
                  }}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                >
                  {t('common:resetFilters')}
                </button>
                <button
                  onClick={() => setShowFilters(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
                >
                  <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                </button>
              </div>
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
                          value={
                            filter.id === 'status' ? selectedFilter :
                            filter.id === 'agent' ? selectedAgent :
                            filter.id === 'team' ? selectedTeam :
                            filter.id === 'channel' ? selectedChannel :
                            filter.id === 'funnel' ? selectedFunnel :
                            filter.id === 'stage' ? selectedStage :
                            filter.id === 'automation' ? selectedAutomation :
                            ''
                          }
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
                            case 'funnel':
                              handleFilterChange('funnel', e.target.value);
                              break;
                            case 'stage':
                              handleFilterChange('stage', e.target.value);
                              break;
                            case 'automation':
                              handleFilterChange('automation', e.target.value);
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
                } else if (filter.type === 'multi-select' && filter.id === 'tags') {
                  return (
                    <div key={filter.id} className="space-y-2">
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center">
                        <Icon className="w-4 h-4 mr-2" />
                        {t('chats:filters.tags')}
                      </label>
                      <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-2 bg-white dark:bg-gray-700">
                        {/* Tags selecionadas */}
                        <div className="flex flex-wrap gap-2 mb-2">
                          {selectedTags.length === 0 && (
                            <div className="text-sm text-gray-500 dark:text-gray-400 py-1 px-2">
                              {t('common:all')}
                            </div>
                          )}
                          {selectedTags.map(tagId => {
                            const tagOption = filter.options?.find(opt => opt.id === tagId);
                            return tagOption ? (
                              <div 
                                key={tagId} 
                                className="flex items-center bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 px-2 py-1 rounded-md text-sm"
                              >
                                <span>{tagOption.label}</span>
                                <button
                                  onClick={() => {
                                    const newTags = selectedTags.filter(id => id !== tagId);
                                    handleFilterChange('tags', newTags);
                                  }}
                                  className="ml-1 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ) : null;
                          })}
                        </div>
                        
                        {/* Lista de tags disponíveis */}
                        <div className="max-h-40 overflow-y-auto custom-scrollbar">
                          {filter.options?.filter(opt => !selectedTags.includes(opt.id)).map(option => (
                            <div 
                              key={option.id}
                              onClick={() => {
                                const newTags = [...selectedTags, option.id];
                                handleFilterChange('tags', newTags);
                              }}
                              className="px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer rounded-md text-sm text-gray-800 dark:text-gray-200"
                            >
                              {option.label}
                            </div>
                          ))}
                          {filter.options?.filter(opt => !selectedTags.includes(opt.id)).length === 0 && (
                            <div className="px-2 py-1 text-sm text-gray-500 dark:text-gray-400 italic">
                              {t('chats:noChatsFound')}
                            </div>
                          )}
                        </div>
                      </div>
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
              onClick={() => setShowUnreadOnly(!showUnreadOnly)}
              className={`p-2 rounded-md ${
                showUnreadOnly ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
              title={t('chats:filters.unreadOnly')}
            >
              <Mail className="w-5 h-5" />
            </button>
            <button
              onClick={() => setShowSearchModal(true)}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-md"
            >
              <Search className="w-5 h-5" />
            </button>
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

        {/* Status Filter Buttons */}
        <div className=" border-b border-gray-200 dark:border-gray-700">
          <div className="px-4 py-2 flex items-center justify-start space-x-1 overflow-x-auto  custom-scrollbar">
            {/* Botão Não Atribuídos */}
            <div className="relative group flex-shrink-0">
              <button
                onClick={() => handleFilterChange('status', 'unassigned')}
                className={`flex items-center rounded-lg transition-all duration-200 ease-out ${
                  selectedFilter === 'unassigned' 
                    ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 shadow-sm px-3 py-2 space-x-2' 
                    : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 hover:bg-orange-50 hover:text-orange-600 dark:hover:bg-orange-900/20 dark:hover:text-orange-400 p-2 hover:px-3 group-hover:shadow-sm'
                }`}
                title={t('chats:filters.unassigned')}
              >
                <Clock className="w-4 h-4 flex-shrink-0" />
                {selectedFilter === 'unassigned' ? (
                  <span className="text-sm font-medium whitespace-nowrap ml-2">
                    {t('chats:filters.unassigned')}
                  </span>
                ) : (
                  <span className="text-sm font-medium whitespace-nowrap ml-0 group-hover:ml-2 max-w-0 group-hover:max-w-xs overflow-hidden transition-all duration-200 ease-out">
                    {t('chats:filters.unassigned')}
                  </span>
                )}
              </button>
            </div>

            {/* Botão Atribuídos a Mim */}
            <div className="relative group flex-shrink-0">
              <button
                onClick={() => handleFilterChange('status', 'assigned-to-me')}
                className={`flex items-center rounded-lg transition-all duration-200 ease-out ${
                  selectedFilter === 'assigned-to-me' 
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 shadow-sm px-3 py-2 space-x-2' 
                    : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-900/20 dark:hover:text-blue-400 p-2 hover:px-3 group-hover:shadow-sm'
                }`}
                title={t('chats:filters.assignedToMe')}
              >
                <UserCheck className="w-4 h-4 flex-shrink-0" />
                {selectedFilter === 'assigned-to-me' ? (
                  <span className="text-sm font-medium whitespace-nowrap ml-2">
                    {t('chats:filters.assignedToMe')}
                  </span>
                ) : (
                  <span className="text-sm font-medium whitespace-nowrap ml-0 group-hover:ml-2 max-w-0 group-hover:max-w-xs overflow-hidden transition-all duration-200 ease-out">
                    {t('chats:filters.assignedToMe')}
                  </span>
                )}
              </button>
            </div>

            {/* Botão Colaborando */}
            <div className="relative group flex-shrink-0">
              <button
                onClick={() => handleFilterChange('status', 'collaborating')}
                className={`flex items-center rounded-lg transition-all duration-200 ease-out ${
                  selectedFilter === 'collaborating' 
                    ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 shadow-sm px-3 py-2 space-x-2' 
                    : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 hover:bg-purple-50 hover:text-purple-600 dark:hover:bg-purple-900/20 dark:hover:text-purple-400 p-2 hover:px-3 group-hover:shadow-sm'
                }`}
                title={t('chats:filters.collaborating')}
              >
                <Users className="w-4 h-4 flex-shrink-0" />
                {selectedFilter === 'collaborating' ? (
                  <span className="text-sm font-medium whitespace-nowrap ml-2">
                    {t('chats:filters.collaborating')}
                  </span>
                ) : (
                  <span className="text-sm font-medium whitespace-nowrap ml-0 group-hover:ml-2 max-w-0 group-hover:max-w-xs overflow-hidden transition-all duration-200 ease-out">
                    {t('chats:filters.collaborating')}
                  </span>
                )}
              </button>
            </div>

            {/* Botão Equipe */}
            <div className="relative group flex-shrink-0">
              <button
                onClick={() => handleFilterChange('status', 'team')}
                className={`flex items-center rounded-lg transition-all duration-200 ease-out ${
                  selectedFilter === 'team' 
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 shadow-sm px-3 py-2 space-x-2' 
                    : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 hover:bg-green-50 hover:text-green-600 dark:hover:bg-green-900/20 dark:hover:text-green-400 p-2 hover:px-3 group-hover:shadow-sm'
                }`}
                title={t('chats:filters.assignedToTeam')}
              >
                <Users className="w-4 h-4 flex-shrink-0" />
                {selectedFilter === 'team' ? (
                  <span className="text-sm font-medium whitespace-nowrap ml-2">
                    {t('chats:filters.assignedToTeam')}
                  </span>
                ) : (
                  <span className="text-sm font-medium whitespace-nowrap ml-0 group-hover:ml-2 max-w-0 group-hover:max-w-xs overflow-hidden transition-all duration-200 ease-out">
                    {t('chats:filters.assignedToTeam')}
                  </span>
                )}
              </button>
            </div>

            {/* Botão Concluídos */}
            <div className="relative group flex-shrink-0">
              <button
                onClick={() => handleFilterChange('status', 'completed')}
                className={`flex items-center rounded-lg transition-all duration-200 ease-out ${
                  selectedFilter === 'completed' 
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 shadow-sm px-3 py-2 space-x-2' 
                    : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-900/20 dark:hover:text-emerald-400 p-2 hover:px-3 group-hover:shadow-sm'
                }`}
                title={t('chats:filters.completed')}
              >
                <CheckCircle className="w-4 h-4 flex-shrink-0" />
                {selectedFilter === 'completed' ? (
                  <span className="text-sm font-medium whitespace-nowrap ml-2">
                    {t('chats:filters.completed')}
                  </span>
                ) : (
                  <span className="text-sm font-medium whitespace-nowrap ml-0 group-hover:ml-2 max-w-0 group-hover:max-w-xs overflow-hidden transition-all duration-200 ease-out">
                    {t('chats:filters.completed')}
                  </span>
                )}
              </button>
            </div>

            {/* Botão Spam */}
            <div className="relative group flex-shrink-0">
              <button
                onClick={() => handleFilterChange('status', 'spam')}
                className={`flex items-center rounded-lg transition-all duration-200 ease-out ${
                  selectedFilter === 'spam' 
                    ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 shadow-sm px-3 py-2 space-x-2' 
                    : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400 p-2 hover:px-3 group-hover:shadow-sm'
                }`}
                title={t('chats:filters.spam')}
              >
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                {selectedFilter === 'spam' ? (
                  <span className="text-sm font-medium whitespace-nowrap ml-2">
                    {t('chats:filters.spam')}
                  </span>
                ) : (
                  <span className="text-sm font-medium whitespace-nowrap ml-0 group-hover:ml-2 max-w-0 group-hover:max-w-xs overflow-hidden transition-all duration-200 ease-out">
                    {t('chats:filters.spam')}
                  </span>
                )}
              </button>
            </div>

            {/* Botão Todos */}
            <div className="relative group flex-shrink-0">
              <button
                onClick={() => handleFilterChange('status', '')}
                className={`flex items-center rounded-lg transition-all duration-200 ease-out ${
                  selectedFilter === '' 
                    ? 'bg-gray-200 text-gray-800 dark:bg-gray-600 dark:text-gray-200 shadow-sm px-3 py-2 space-x-2' 
                    : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200 hover:text-gray-700 dark:hover:bg-gray-600 dark:hover:text-gray-300 p-2 hover:px-3 group-hover:shadow-sm'
                }`}
                title={t('common:all')}
              >
                <MessageSquare className="w-4 h-4 flex-shrink-0" />
                {selectedFilter === '' ? (
                  <span className="text-sm font-medium whitespace-nowrap ml-2">
                    {t('common:all')}
                  </span>
                ) : (
                  <span className="text-sm font-medium whitespace-nowrap ml-0 group-hover:ml-2 max-w-0 group-hover:max-w-xs overflow-hidden transition-all duration-200 ease-out">
                    {t('common:all')}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto scrollbar-hide pb-16 md:pb-0">
          {error ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <p className="text-red-500 dark:text-red-400">
                {error}
              </p>
            </div>
          ) : (
            <>
              <ChatList 
                chats={chats}
                selectedChat={selectedChat}
                onSelectChat={handleSelectChat}
                isLoading={loading}
                selectedFilter={selectedFilter}
                // onUpdateChat={updateChatInList}
              />
              
              {/* Elemento de observação para carregamento infinito */}
              {!loading && hasMore && (
                <div 
                  ref={loadMoreRef} 
                  className="w-full py-4 flex justify-center"
                >
                  {loadingMore && (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin w-5 h-5 border-2 border-gray-300 dark:border-gray-600 border-t-blue-500 rounded-full"></div>
                      <span className="text-sm text-gray-500 dark:text-gray-400">{t('common:loading')}</span>
                    </div>
                  )}
                </div>
              )}
            </>
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
              key={`chat-messages-${selectedChat}`}
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

      {/* Modal de pesquisa */}
      <SearchModal 
        isOpen={showSearchModal} 
        onClose={() => setShowSearchModal(false)} 
      />
    </div>
  );
}