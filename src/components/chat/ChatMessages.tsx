import React, { useRef, useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Message, ClosureType } from '../../types/database';
import { supabase } from '../../lib/supabase';
import { useTranslation } from 'react-i18next';
import { MessageInput } from './MessageInput';
import { MessageBubble } from './MessageBubble';
import { CustomerEditModal } from '../customers/CustomerEditModal';
import { ChatResolutionModal } from './ChatResolutionModal';
import { ChatAvatar } from './ChatAvatar';
import { WhatsAppTemplateModal } from './WhatsAppTemplateModal';
import { toast } from 'react-hot-toast';
import api from '../../lib/api';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { ArrowDown, UserPlus, UserCheck, RefreshCw, Pause } from 'lucide-react';
import './styles.css';
import { useClosureTypes } from '../../hooks/useQueryes';
import { getChannelIcon } from '../../utils/channel';
import { FlowModal } from './FlowModal';
import { ApiError } from 'axios';

// Interface para tags do cliente
interface CustomerTag {
  tag_id: string;
  tags?: {
    id: string;
    name: string;
    color: string;
  };
}

// Componente de Tooltip personalizado
interface CustomTooltipProps {
  content: string;
  children: React.ReactNode;
  color?: string;
}

function CustomTooltip({ content, children, color }: CustomTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const tooltipRef = useRef<HTMLDivElement>(null);
  const childRef = useRef<HTMLDivElement>(null);

  const showTooltip = () => {
    if (childRef.current) {
      const rect = childRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + window.scrollY + 5,
        left: rect.left + window.scrollX + rect.width / 2
      });
      setIsVisible(true);
    }
  };

  const hideTooltip = () => {
    setIsVisible(false);
  };

  return (
    <>
      <div 
        ref={childRef}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        onFocus={showTooltip}
        onBlur={hideTooltip}
      >
        {children}
      </div>
      {isVisible && (
        <div
          ref={tooltipRef}
          className="fixed z-50 px-2 py-1 text-xs font-medium text-white bg-gray-800 dark:bg-gray-700 rounded shadow-lg pointer-events-none transform -translate-x-1/2"
          style={{ 
            top: `${position.top}px`, 
            left: `${position.left}px`,
            backgroundColor: color ? `${color}` : undefined,
            maxWidth: '200px',
            wordBreak: 'break-word'
          }}
        >
          {content}
          <div 
            className="absolute w-2 h-2 transform rotate-45 -top-1 left-1/2 -ml-1"
            style={{ backgroundColor: color ? `${color}` : '#1F2937' }}
          />
        </div>
      )}
    </>
  );
}

interface ChatMessagesProps {
  chatId: string;
  organizationId: string;
  onBack?: () => void;
}

// Definir interface para o objeto chat
interface Chat {
  id: string;
  status: 'pending' | 'in_progress' | 'closed';
  customer?: {
    id: string;
    name: string;
    [key: string]: any;
  };
  channel_details?: {
    id: string;
    type: string;
    [key: string]: any;
  };
  profile_picture?: string;
  ticket_number?: string;
  assigned_to?: string;
  assigned_agent?: {
    id: string;
    full_name: string;
    avatar_url?: string;
  };
  start_time?: string;
  end_time?: string;
  closure_type_id?: string;
  title?: string;
  last_customer_message_at?: string;
  [key: string]: any;
}

// Interface para colaboradores do chat
interface ChatCollaborator {
  id: string;
  chat_id: string;
  user_id: string;
  organization_id: string;
  joined_at: string;
  left_at: string | null;
  user?: {
    id: string;
    full_name: string;
    avatar_url?: string;
  };
}

// Interface para configurações de funcionalidades por canal
interface ChannelFeatures {
  canReplyToMessages: boolean;
  canSendAudio: boolean;
  canSendTemplates: boolean;
  has24HourWindow: boolean;
  canSendAfter24Hours: boolean;
  canDeleteMessages: boolean;
}

export function ChatMessages({ chatId, organizationId, onBack }: ChatMessagesProps) {
  const { t } = useTranslation('chats');
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [chat, setChat] = useState<Chat | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState('');
  const [isSubscriptionReady, setIsSubscriptionReady] = useState(false);
  const [showEditCustomer, setShowEditCustomer] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [showResolutionModal, setShowResolutionModal] = useState(false);
  const { data: closureTypes = [] } = useClosureTypes(organizationId);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const MESSAGES_PER_PAGE = 20;
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [headerLoading, setHeaderLoading] = useState(false);
  const [footerLoading, setFooterLoading] = useState(false);
  const [isMessageWindowClosed, setIsMessageWindowClosed] = useState(false);
  const [canSendMessage, setCanSendMessage] = useState(true);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [isMobileView, setIsMobileView] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const [isLoadingSpecificMessage, setIsLoadingSpecificMessage] = useState(false);
  const [showScrollToHighlighted, setShowScrollToHighlighted] = useState(false);
  const previousChatIdRef = useRef<string | null>(null);
  const isFirstLoadRef = useRef(true);
  const messagesLoadedRef = useRef(false);
  const initialRenderRef = useRef(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [collaborators, setCollaborators] = useState<ChatCollaborator[]>([]);
  const [isCollaborator, setIsCollaborator] = useState(false);
  const [isAssignedAgent, setIsAssignedAgent] = useState(false);
  const [canInteract, setCanInteract] = useState(false);
  const [isAddingCollaborator, setIsAddingCollaborator] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);
  const [isLeavingCollaboration, setIsLeavingCollaboration] = useState(false);
  const [isLeavingChat, setIsLeavingChat] = useState(false);
  const [isAttending, setIsAttending] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const scrollDebounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialScrollDoneRef = useRef(false);
  const [channelFeatures, setChannelFeatures] = useState<ChannelFeatures>({
    canReplyToMessages: true,
    canSendAudio: false,
    canSendTemplates: false,
    has24HourWindow: false,
    canSendAfter24Hours: false,
    canDeleteMessages: false
  });
  const [showFlowModal, setShowFlowModal] = useState(false);

  // Função para verificar se o componente está sendo montado pela primeira vez
  const isInitialRender = useCallback(() => {
    if (initialRenderRef.current) {
      initialRenderRef.current = false;
      return true;
    }
    return false;
  }, []);

  // Função para determinar as funcionalidades disponíveis com base no tipo de canal
  const updateChannelFeatures = useCallback((channelType: string | undefined) => {
    if (!channelType) {
      // Configuração padrão se não houver tipo de canal
      setChannelFeatures({
        canReplyToMessages: true,
        canSendAudio: false,
        canSendTemplates: false,
        has24HourWindow: false,
        canSendAfter24Hours: false,
        canDeleteMessages: false
      });
      return;
    }

    switch (channelType) {
      case 'whatsapp_official':
        setChannelFeatures({
          canReplyToMessages: false, // Não permite responder mensagens específicas
          canSendAudio: true,        // Permite enviar áudio
          canSendTemplates: true,    // Permite enviar templates
          has24HourWindow: true,     // Tem janela de 24 horas
          canSendAfter24Hours: true, // Pode enviar após 24h (com templates)
          canDeleteMessages: false   // Não permite excluir mensagens
        });
        break;
      case 'whatsapp_wapi':
      case 'whatsapp_zapi':
      case 'whatsapp_evo':
        setChannelFeatures({
          canReplyToMessages: true,  // Permite responder mensagens específicas
          canSendAudio: true,        // Permite enviar áudio
          canSendTemplates: false,   // Não permite enviar templates
          has24HourWindow: false,    // Não tem janela de 24 horas
          canSendAfter24Hours: true, // Pode enviar a qualquer momento
          canDeleteMessages: true    // Permite excluir mensagens
        });
        break;
      case 'instagram':
      case 'facebook':
        setChannelFeatures({
          canReplyToMessages: false, // Não permite responder mensagens específicas
          canSendAudio: false,       // Não permite enviar áudio
          canSendTemplates: false,   // Não permite enviar templates
          has24HourWindow: true,     // Tem janela de 24 horas
          canSendAfter24Hours: false, // Não pode enviar após 24h
          canDeleteMessages: false    // Permite excluir mensagens
        });
        break;
      default:
        // Configuração padrão para outros canais
        setChannelFeatures({
          canReplyToMessages: false,
          canSendAudio: false,
          canSendTemplates: false,
          has24HourWindow: false,
          canSendAfter24Hours: true,
          canDeleteMessages: false
        });
    }
  }, []);

  useEffect(() => {
    const checkFiltersVisibility = () => {
      const filtersElement = document.querySelector('[data-filters-sidebar]');
      setShowFilters(!!filtersElement);
    };
    
    checkFiltersVisibility();
    const interval = setInterval(checkFiltersVisibility, 500);
    
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const checkMobileView = () => {
      // Em telas menores que 900px, sempre mostrar o botão de voltar
      // Entre 900px e 1300px, mostrar o botão apenas se os filtros estiverem visíveis
      setIsMobileView(window.innerWidth < 900 || (showFilters && window.innerWidth < 1300));
    };

    checkMobileView();
    window.addEventListener('resize', checkMobileView);
    return () => window.removeEventListener('resize', checkMobileView);
  }, [showFilters]);

  // A função que torna o container visível após o carregamento
  const showMessagesContainer = () => {
    if (messagesContainerRef.current) {
      // Primeiro garantir que o scroll está na posição final
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: "auto" });
      }
      
      // Pequeno atraso para garantir que a rolagem já foi aplicada
      setTimeout(() => {
        if (messagesContainerRef.current) {
          messagesContainerRef.current.style.opacity = '1';
          initialScrollDoneRef.current = true;
        }
      }, 50);
    }
  };

  // Modifico useEffect para usar a nova função
  useEffect(() => {
    let subscription: ReturnType<typeof supabase.channel>;

    // Verificar se o chatId mudou realmente
    const isChatIdChanged = chatId !== previousChatIdRef.current;
    
    // Só atualizar o previousChatIdRef se o chatId realmente mudou
    if (isChatIdChanged) {
      console.log(`ChatMessages: chatId mudou de ${previousChatIdRef.current || 'null'} para ${chatId}`);
      previousChatIdRef.current = chatId;
      // Resetar o flag de rolagem inicial quando o chat mudar
      initialScrollDoneRef.current = false;
      
      // Adicionar um estilo para esconder o contêiner até que tudo esteja carregado
      if (messagesContainerRef.current) {
        messagesContainerRef.current.style.opacity = '0';
      }
    } else {
      console.log(`ChatMessages: chatId não mudou (${chatId}), provavelmente apenas os filtros foram alterados`);
    }

    if (chatId) {
      // Só mostrar loading e recarregar mensagens se o chatId realmente mudou ou se for o primeiro carregamento
      if (isChatIdChanged || isInitialRender()) {
        console.log('ChatMessages: Carregando mensagens para novo chat ou primeiro carregamento');
        setLoading(true);
        setInitialLoading(true);
        setHeaderLoading(true);
        setFooterLoading(true);
        setMessages([]);
        setPage(1);
        setHasMore(true);
        setError('');
        messagesLoadedRef.current = false;
        
        // Verificar se há um messageId na URL
        const messageId = searchParams.get('messageId');
        
        // Promise para garantir que todas as operações de carregamento sejam concluídas
        Promise.all([
          // Carregar mensagens
          messageId 
            ? (setHighlightedMessageId(messageId), loadSpecificMessage(messageId).catch(err => {
                console.error('Erro ao carregar mensagem específica:', err);
                // Em caso de erro, tentar carregar mensagens normais
                return loadMessages(1, false);
              }))
            : loadMessages(1, false),
          
          // Carregar detalhes do chat
          loadChat()
        ])
        .finally(() => {
          // Garantir que o contêiner seja mostrado após o carregamento, mesmo se houver erro
          showMessagesContainer();
          isFirstLoadRef.current = false;
          messagesLoadedRef.current = true;
        });
      }
      
      // Sempre nos inscrevemos para atualizações de mensagens
      subscription = subscribeToMessages();
      
      // Inscrever para atualizações de colaboradores
      const collaboratorsSubscription = subscribeToCollaborators();
      
      // Inscrever para atualizações do chat
      const chatSubscription = subscribeToChat();
      
      return () => {
        if (subscription) {
          subscription.unsubscribe();
        }
        if (collaboratorsSubscription) {
          collaboratorsSubscription.unsubscribe();
        }
        if (chatSubscription) {
          chatSubscription.unsubscribe();
        }
      };
    }

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [chatId, searchParams]);

  useEffect(() => {
    if (page === 1 && messages.length > 0 && !initialScrollDoneRef.current && !loading) {
      // Usar setTimeout apenas se o carregamento inicial já estiver concluído
      if (!isFirstLoadRef.current) {
        scrollToBottom();
      }
    }
  }, [messages, page, loading]);

  useEffect(() => {
    if (!chat) return;
    
    // Atualizar as funcionalidades do canal com base no tipo
    updateChannelFeatures(chat?.channel_details?.type);
    
    const isInstagramChannel = chat?.channel_details?.type === 'instagram';
    const isFacebookChannel = chat?.channel_details?.type === 'facebook';
    const isWhatsAppOfficialChannel = chat?.channel_details?.type === 'whatsapp_official';
    const lastCustomerMessageAt = chat?.last_customer_message_at;
    
    // Verificar se o canal tem janela de 24 horas
    const hasTimeWindow = isInstagramChannel || isFacebookChannel || isWhatsAppOfficialChannel;
    
    if (hasTimeWindow) {
      if (!lastCustomerMessageAt) {
        setCanSendMessage(false);
        return;
      }
      
      const lastMessageTime = new Date(lastCustomerMessageAt).getTime();
      const currentTime = new Date().getTime();
      const hoursDifference = (currentTime - lastMessageTime) / (1000 * 60 * 60);
      
      if (hoursDifference > 24) {
        setIsMessageWindowClosed(true);
        
        // WhatsApp Official pode enviar templates após 24h
        if (isWhatsAppOfficialChannel) {
          setCanSendMessage(false); // Não pode enviar mensagem normal, mas pode enviar template
        } else {
          setCanSendMessage(false); // Instagram e Facebook não podem enviar nada após 24h
        }
      } else {
        setIsMessageWindowClosed(false);
        setCanSendMessage(true);
      }
    } else {
      // Outros canais não têm restrição de tempo
      setCanSendMessage(true);
      setIsMessageWindowClosed(false);
    }
  }, [chat, updateChannelFeatures]);

  // Efeito para remover o destaque após alguns segundos
  useEffect(() => {
    if (highlightedMessageId) {
      const timer = setTimeout(() => {
        setHighlightedMessageId(null);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [highlightedMessageId]);

  const subscribeToMessages = () => {
    const subscription = supabase
      .channel('messages')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'messages',
        filter: `chat_id=eq.${chatId}`
      }, async (payload) => {
        if (payload.eventType === 'INSERT') {
          const newMessage = payload.new as Message;
          
          // Se for mensagem do sistema, buscar informações adicionais do agente
          if (newMessage.sender_type === 'system' && newMessage.sender_agent_id) {
            try {
              const { data: agentData } = await supabase
                .from('profiles')
                .select('id, full_name, avatar_url')
                .eq('id', newMessage.sender_agent_id)
                .single();
                
              if (agentData) {
                // Adicionar informações do agente à mensagem
                // @ts-expect-error - Simplificando o tipo para corresponder ao que é usado na função loadMessages
                newMessage.sender_agent = {
                  id: agentData.id,
                  full_name: agentData.full_name,
                  avatar_url: agentData.avatar_url
                };
              }
            } catch (error) {
              console.error('Erro ao buscar informações do agente:', error);
            }
          }
          
          setMessages(prev => [...prev, newMessage]);
          
          // Verificar se o usuário está próximo do final para rolar automaticamente
          setTimeout(() => {
            const container = messagesContainerRef.current;
            if (container) {
              // Se o usuário estiver a menos de 300px do final ou o chat acabou de ser carregado
              const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 300;
              if (isNearBottom) {
                scrollToBottom();
              }
            }
          }, 100);
        } else if (payload.eventType === 'UPDATE') {
          const updatedMessage = payload.new as Message;
          
          // Se a mensagem foi deletada, removê-la da lista
          if (updatedMessage.status === 'deleted') {
            setMessages(prev => prev.filter(msg => msg.id !== updatedMessage.id));
            return;
          }
          
          // Se for mensagem do sistema, buscar informações adicionais do agente
          if (updatedMessage.sender_type === 'system' && updatedMessage.sender_agent_id) {
            try {
              const { data: agentData } = await supabase
                .from('profiles')
                .select('id, full_name, avatar_url')
                .eq('id', updatedMessage.sender_agent_id)
                .single();
                
              if (agentData) {
                // Adicionar informações do agente à mensagem
                // @ts-expect-error - Simplificando o tipo para corresponder ao que é usado na função loadMessages
                updatedMessage.sender_agent = {
                  id: agentData.id,
                  full_name: agentData.full_name,
                  avatar_url: agentData.avatar_url
                };
              }
            } catch (error) {
              console.error('Erro ao buscar informações do agente:', error);
            }
          }
          
          setMessages(prev => prev.map(msg => 
            msg.id === updatedMessage.id ? updatedMessage : msg
          ));
        }
      })
      .subscribe((status) => {
        console.log('Subscription status:', status);
        if(status === 'SUBSCRIBED') {
          setTimeout(() => {
            setIsSubscriptionReady(true);
          }, 2000);
        }
      });
    return subscription;
  };

  const loadMessages = async (pageNumber = 1, append = false) => {
    try {
      if (append) {
        setIsLoadingMore(true);
      }
      
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender_agent:messages_sender_agent_id_fkey(
            id,
            full_name
          ),
          response_to:response_message_id(
            id,
            content,
            sender_type,
            sender_agent_response:messages_sender_agent_id_fkey(
              id,
              full_name
            )
          )
        `)
        .eq('chat_id', chatId)
        .neq('status', 'deleted')
        .order('created_at', { ascending: false })
        .range((pageNumber - 1) * MESSAGES_PER_PAGE, pageNumber * MESSAGES_PER_PAGE - 1);

      if (error) throw error;

      const newMessages = data || [];
      setHasMore(newMessages.length === MESSAGES_PER_PAGE);
      
      if (append) {
        // Adicionar as novas mensagens ao estado
        setMessages(prev => [...newMessages.reverse(), ...prev]);
        
        // Aplicar classe de animação às novas mensagens após um pequeno delay
        setTimeout(() => {
          const container = messagesContainerRef.current;
          if (container) {
            // Para resolver problemas de referência, calcular o número exato de novas mensagens
            const messageCount = newMessages.length; 
            // Selecionar apenas as novas mensagens
            const newMessageElements = Array.from(container.querySelectorAll('[id^="message-"]')).slice(0, messageCount);
            
            // Aplicar animação a cada elemento
            newMessageElements.forEach(el => {
              el.classList.add('message-fade-in');
              // Remover a classe após a animação para evitar problemas em carregamentos futuros
              setTimeout(() => {
                if (el) {
                  el.classList.remove('message-fade-in');
                }
              }, 500);
            });
          }
        }, 100);
      } else {
        setMessages(newMessages.reverse());
        
        // Se for o primeiro carregamento e temos mensagens, rolar para o fim
        if (pageNumber === 1 && newMessages.length > 0) {
          initialScrollDoneRef.current = false; // Resetar para permitir o scroll inicial
        }
      }
    } catch (error) {
      console.error('Error loading messages:', error);
      setError(t('errors.loading'));
    } finally {
      setLoading(false);
      setInitialLoading(false);
      // Definir isLoadingMore como falso apenas se não estiver sendo chamado pelo handleScroll
      // pois o handleScroll já cuida disso no finally
      if (!append) {
        setIsLoadingMore(false);
      }
    }
    return;
  };

  const loadChat = async () => {
    try {
      const { data, error } = await supabase
        .from('chats')
        .select(`
          *,
          customer:customer_id(*,
            tags:customer_tags(
              tag_id,
              tags:tags(
                id,
                name,
                color
              )
            )
          ),
          channel_details:channel_id(*),
          assigned_agent:assigned_to(
            id,
            full_name,
            avatar_url
          ),
          collaborators:chat_collaborators(
            id,
            user_id,
            joined_at,
            left_at,
            user:user_id(
              id,
              full_name,
              avatar_url
            )
          )
        `)
        .eq('id', chatId)
        .single();

      if (error) throw error;
      
      // Atualizar o estado do chat
      setChat(data);
      
      // Atualizar o estado dos colaboradores
      if (data?.collaborators) {
        setCollaborators(data.collaborators.filter((collab: ChatCollaborator) => !collab.left_at));
      }
    } catch (error) {
      console.error('Erro ao carregar chat:', error);
      setError(t('errors.loadingChat'));
    } finally {
      setHeaderLoading(false);
      setFooterLoading(false);
    }
  };

  const scrollToBottom = () => {
    // Para o carregamento inicial, já estamos posicionando corretamente no momento de exibir
    // Para mensagens subsequentes, usamos o método mais direto
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "auto" });
      
      // Garantir que o contêiner esteja visível após qualquer scrollToBottom
      if (messagesContainerRef.current && messagesContainerRef.current.style.opacity === '0') {
        messagesContainerRef.current.style.opacity = '1';
      }
    }
  };

  const formatMessageDate = (date: string) => {
    const messageDate = new Date(date);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (messageDate.toDateString() === today.toDateString()) {
      return t('dateHeaders.today');
    } else if (messageDate.toDateString() === yesterday.toDateString()) {
      return t('dateHeaders.yesterday');
    } else {
      return messageDate.toLocaleDateString();
    }
  };

  const groupMessagesByDate = (messages: Message[]) => {
    const groups: { [key: string]: Message[] } = {};
    
    messages.forEach(message => {
      const date = new Date(message.created_at).toDateString();
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(message);
    });
    
    return groups;
  };

  const handleResolveChat = async ({ closureTypeId, title }: { closureTypeId: string; title: string }) => {
    try {
      // Primeiro insere a mensagem de sistema
      const user = await supabase.auth.getUser();
      if (!user.data.user?.id) {
        throw new Error(t('errors.unauthenticated'));
      }

      const { error: messageError } = await supabase
        .from('messages')
        .insert({
          chat_id: chatId,
          type: 'user_closed',
          sender_type: 'system',
          sender_agent_id: user.data.user.id,
          organization_id: organizationId,
          created_at: new Date().toISOString()
        });

      if (messageError) throw messageError;

      // Depois atualiza o status do chat
      const { error: chatError } = await supabase
        .from('chats')
        .update({ 
          status: 'closed',
          end_time: new Date().toISOString(),
          closure_type_id: closureTypeId,
          title: title
        })
        .eq('id', chatId);

      if (chatError) throw chatError;
      
      setChat((prev: Chat | null) => prev ? {
        ...prev,
        status: 'closed',
        end_time: new Date().toISOString(),
        closure_type_id: closureTypeId,
        title: title
      } : null);
      
      setShowResolutionModal(false);
    } catch (error) {
      console.error('Erro ao resolver chat:', error);
      setError(t('errors.resolving'));
    }
  };

  const handleAttend = async () => {
    setIsAttending(true);
    
    try {
      const user = await supabase.auth.getUser();
      
      if (!user.data.user?.id) {
        throw new Error(t('errors.unauthenticated'));
      }

      // Insere a mensagem de sistema
      const { error: messageError } = await supabase
        .from('messages')
        .insert({
          chat_id: chatId,
          type: 'user_start',
          sender_type: 'system',
          sender_agent_id: user.data.user.id,
          organization_id: organizationId,
          created_at: new Date().toISOString()
        });

      if (messageError) throw messageError;

      // Atualiza o status do chat
      const { error: chatError } = await supabase
        .from('chats')
        .update({
          status: 'in_progress',
          assigned_to: user.data.user.id,
          start_time: new Date().toISOString()
        })
        .eq('id', chatId);

      if (chatError) throw chatError;

      // Atualiza o estado local
      setChat((prev: Chat | null) => prev ? {
        ...prev,
        status: 'in_progress',
        assigned_to: user.data.user.id,
        start_time: new Date().toISOString()
      } : null);

      // Recarrega as mensagens
      loadMessages();

    } catch (error) {
      console.error('Error attending chat:', error);
      setError(error instanceof Error ? error.message : t('errors.attend'));
    } finally {
      setIsAttending(false);
    }
  };

  // Verificar se a mensagem destacada está visível
  const checkHighlightedMessageVisibility = () => {
    if (!highlightedMessageId) {
      setShowScrollToHighlighted(false);
      return;
    }

    const messageElement = document.getElementById(`message-${highlightedMessageId}`);
    if (!messageElement) {
      setShowScrollToHighlighted(false);
      return;
    }

    const container = messagesContainerRef.current;
    if (!container) {
      setShowScrollToHighlighted(false);
      return;
    }

    const messageRect = messageElement.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();

    // Verificar se a mensagem está visível no container
    const isVisible = 
      messageRect.top >= containerRect.top && 
      messageRect.bottom <= containerRect.bottom;

    setShowScrollToHighlighted(!isVisible);
  };

  // Adicionar evento de scroll para verificar visibilidade da mensagem destacada
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container || !highlightedMessageId) return;

    const handleScroll = () => {
      checkHighlightedMessageVisibility();
    };

    container.addEventListener('scroll', handleScroll);
    // Verificar inicialmente
    checkHighlightedMessageVisibility();

    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, [highlightedMessageId, messages]);

  // Modificar a função handleScroll para preservar o destaque
  const handleScroll = () => {
    const container = messagesContainerRef.current;
    if (!container || !hasMore || isLoadingSpecificMessage || isLoadingMore || !initialScrollDoneRef.current) return;

    // Somente carregar mais quando chegar exatamente no topo (scrollTop = 0)
    if (container.scrollTop === 0) {
      // Evitar carregamentos múltiplos usando debounce
      if (scrollDebounceTimerRef.current) {
        clearTimeout(scrollDebounceTimerRef.current);
      }
      
      scrollDebounceTimerRef.current = setTimeout(() => {
        // Salva a altura do primeiro elemento antes de carregar mais
        const oldScrollHeight = container.scrollHeight;
        const oldScrollTop = container.scrollTop;
        
        // Identificar a primeira mensagem visível antes de carregar mais
        const firstMessageElement = container.querySelector('[id^="message-"]') as HTMLElement;
        let firstMessageId = null;
        let firstMessageDistanceFromTop = 0;
        
        if (firstMessageElement) {
          firstMessageId = firstMessageElement.id;
          // Salvar a distância do elemento ao topo para referência futura
          firstMessageDistanceFromTop = firstMessageElement.getBoundingClientRect().top - container.getBoundingClientRect().top;
        }
        
        setIsLoadingMore(true);
        const newPage = page + 1;
        setPage(newPage);
        
        // Adicionar uma classe de transição ao container
        container.classList.add('messages-loading-transition');
        // Adicionar um pequeno deslocamento para evitar oscilações visuais
        container.style.transform = 'translateY(5px)';
        
        loadMessages(newPage, true)
          .then(() => {
            // Após o conteúdo ser carregado, mantém a posição de referência
            setTimeout(() => {
              if (container) {
                // Restaurar a posição do container
                container.style.transform = 'translateY(0)';
                
                if (firstMessageId && document.getElementById(firstMessageId)) {
                  // Mantém a mesma distância do topo que o elemento tinha antes
                  const messageElement = document.getElementById(firstMessageId);
                  if (messageElement) {
                    const newTop = messageElement.getBoundingClientRect().top - container.getBoundingClientRect().top;
                    // Ajusta o scroll para manter a mesma posição relativa com uma pequena margem de segurança
                    container.scrollTop = oldScrollTop + (newTop - firstMessageDistanceFromTop) + 5; // +5px de margem
                  }
                } else {
                  // Fallback: usa a diferença de altura como referência
                  const newScrollHeight = container.scrollHeight;
                  const scrollDiff = newScrollHeight - oldScrollHeight;
                  container.scrollTop = oldScrollTop + scrollDiff + 5; // +5px de margem
                }
                
                // Verificar visibilidade da mensagem destacada após carregar mais mensagens
                checkHighlightedMessageVisibility();
                
                // Remover a classe de transição após um pequeno atraso
                setTimeout(() => {
                  container.classList.remove('messages-loading-transition');
                }, 300);
              }
            }, 0);
          })
          .catch((error) => {
            console.error('Erro ao carregar mais mensagens:', error);
            // Exibir mensagem de erro
            setError(t('errors.loading'));
            // Remover a classe de transição em caso de erro
            container.classList.remove('messages-loading-transition');
            // Restaurar a posição do container
            if (container) {
              container.style.transform = 'translateY(0)';
            }
          })
          .finally(() => {
            // Garantir que o estado de carregamento seja limpo mesmo em caso de erro
            setIsLoadingMore(false);
            scrollDebounceTimerRef.current = null;
          });
      }, 100); // 100ms debounce
    }
  };

  const handleSendTemplate = async (template: WhatsAppTemplate, variables: { [key: string]: string }) => {
    try {
      // Enviar o template via API
      const response = await api.post(`/api/${organizationId}/chat/${chatId}/send-template`, {
        templateId: template.id,
        variables
      });

      if (!response.data.success) {
        throw new Error(response.data.error);
      }

      toast.success(t('channels:form.whatsapp.templateSent'));
      setShowTemplateModal(false);
    } catch (error) {
      console.error('Erro ao enviar template:', error);
      toast.error(t('channels:form.whatsapp.errorSendingTemplate'));
    }
  };

  const handleBackClick = () => {
    // Verificar a rota atual para determinar para onde navegar
    const currentPath = window.location.pathname;
    
    if (onBack) {
      onBack();
    } else if (currentPath.startsWith('/app/chats/')) {
      // Se estiver na rota /app/chats/[id], voltar para /app/chats
      navigate('/app/chats');
    } else if (currentPath.startsWith('/app/chat/')) {
      // Se estiver na rota /app/chat/[id], voltar para /app/chats
      navigate('/app/chats');
    } else {
      // Caso padrão
      navigate('/app/chats');
    }
  };

  // Função para carregar uma mensagem específica e seu contexto
  const loadSpecificMessage = async (messageId: string) => {
    setIsLoadingSpecificMessage(true);
    try {
      // Primeiro, buscar a mensagem específica para obter sua data
      const { data: specificMessage, error: specificError } = await supabase
        .from('messages')
        .select('*')
        .eq('id', messageId)
        .single();
      
      if (specificError) throw specificError;
      if (!specificMessage) throw new Error('Mensagem não encontrada');
      
      // Buscar mensagens ao redor da mensagem específica (antes e depois)
      const { data: contextMessages, error: contextError } = await supabase
        .from('messages')
        .select(`
          *,
          sender_agent:messages_sender_agent_id_fkey(
            id,
            full_name
          ),
          response_to:response_message_id(
            id,
            content,
            sender_type,
            sender_agent_response:messages_sender_agent_id_fkey(
              id,
              full_name
            )
          )
        `)
        .eq('chat_id', chatId)
        .order('created_at', { ascending: false })
        .limit(MESSAGES_PER_PAGE);
      
      if (contextError) throw contextError;
      
      if (contextMessages) {
        // Verificar se a mensagem específica está no conjunto de resultados
        const hasSpecificMessage = contextMessages.some(msg => msg.id === messageId);
        
        if (hasSpecificMessage) {
          // Se a mensagem estiver nos resultados, usar este conjunto
          setMessages(contextMessages.reverse());
          
          // Rolar para a mensagem após o carregamento
          setTimeout(() => {
            scrollToMessage(messageId);
          }, 100);
        } else {
          // Se a mensagem não estiver nos resultados, precisamos buscar mais mensagens
          // Isso pode acontecer se a mensagem for muito antiga
          
          // Buscar mais mensagens antes da data da mensagem específica
          const { data: olderMessages, error: olderError } = await supabase
            .from('messages')
            .select(`
              *,
              sender_agent:messages_sender_agent_id_fkey(
                id,
                full_name
              ),
              response_to:response_message_id(
                id,
                content,
                sender_type,
                sender_agent_response:messages_sender_agent_id_fkey(
                  id,
                  full_name
                )
              )
            `)
            .eq('chat_id', chatId)
            .lte('created_at', specificMessage.created_at)
            .order('created_at', { ascending: false })
            .limit(MESSAGES_PER_PAGE);
          
          if (olderError) throw olderError;
          
          if (olderMessages) {
            setMessages(olderMessages.reverse());
            
            // Rolar para a mensagem após o carregamento
            setTimeout(() => {
              scrollToMessage(messageId);
            }, 100);
          }
        }
      }
    } catch (error) {
      console.error('Erro ao carregar mensagem específica:', error);
      setError(t('errors.loading'));
      // Carregar mensagens normalmente como fallback
      await loadMessages(1, false);
    } finally {
      setIsLoadingSpecificMessage(false);
      setLoading(false);
      setInitialLoading(false);
    }
  };

  // Função para rolar até uma mensagem específica
  const scrollToMessage = (messageId: string) => {
    const messageElement = document.getElementById(`message-${messageId}`);
    if (messageElement) {
      messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  // Carregar o ID do usuário atual
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        setCurrentUserId(data.user.id);
      }
    };
    
    getCurrentUser();
  }, []);

  // Verificar permissões do usuário atual no chat
  useEffect(() => {
    if (!chat || !currentUserId) return;
    
    // Verificar se o usuário é o atendente designado
    const isUserAssigned = chat.assigned_to === currentUserId;
    setIsAssignedAgent(isUserAssigned);
    
    // Verificar se o usuário é um colaborador ativo
    const isUserCollaborator = collaborators.some(
      collab => collab.user_id === currentUserId && !collab.left_at
    );
    setIsCollaborator(isUserCollaborator);
    
    // Usuário pode interagir se for o atendente ou um colaborador
    setCanInteract(isUserAssigned || isUserCollaborator);
  }, [chat, currentUserId, collaborators]);

  // Atualizar a função subscribeToCollaborators para usar o novo formato
  const subscribeToCollaborators = () => {
    const subscription = supabase
      .channel('collaborators')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'chat_collaborators',
        filter: `chat_id=eq.${chatId}`
      }, () => {
        // Recarregar o chat para obter os colaboradores atualizados
        loadChat();
      })
      .subscribe();
    
    return subscription;
  };

  // Inscrever para atualizações do chat
  const subscribeToChat = () => {
    const subscription = supabase
      .channel('chat_updates')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'chats',
        filter: `id=eq.${chatId}`
      }, (payload) => {
        console.log('Chat atualizado:', payload);
        
        if (payload.eventType === 'UPDATE') {
          const updatedChat = payload.new as Chat;
          const previousChat = payload.old as Chat;
          
          // Verificar se houve mudança no responsável
          if (updatedChat.assigned_to !== previousChat.assigned_to) {
            console.log(`Responsável alterado: de ${previousChat.assigned_to || 'ninguém'} para ${updatedChat.assigned_to || 'ninguém'}`);
            
            // Se o chat foi atribuído a outro usuário e o usuário atual era o responsável
            if (previousChat.assigned_to === currentUserId && updatedChat.assigned_to !== currentUserId) {
              toast.error(t('chatReassigned'));
            }
            
            // Se o chat foi atribuído ao usuário atual
            if (updatedChat.assigned_to === currentUserId && previousChat.assigned_to !== currentUserId) {
              toast.success(t('chatAssignedToYou'));
            }
            
            // Buscar informações do novo agente atribuído se necessário
            if (updatedChat.assigned_to && updatedChat.assigned_to !== previousChat.assigned_to) {
              supabase
                .from('profiles')
                .select('id, full_name, avatar_url')
                .eq('id', updatedChat.assigned_to)
                .single()
                .then(({ data: agentData }) => {
                  if (agentData) {
                    setChat(prevChat => {
                      if (!prevChat) return null;
                      return {
                        ...prevChat,
                        assigned_to: updatedChat.assigned_to,
                        assigned_agent: agentData
                      };
                    });
                  }
                });
            } else {
              // Atualizar apenas o campo assigned_to
              setChat(prevChat => {
                if (!prevChat) return null;
                return {
                  ...prevChat,
                  assigned_to: updatedChat.assigned_to,
                  assigned_agent: updatedChat.assigned_to ? prevChat.assigned_agent : undefined
                };
              });
            }
          }
          
          // Verificar se houve mudança no status
          if (updatedChat.status !== previousChat.status) {
            console.log(`Status alterado: de ${previousChat.status} para ${updatedChat.status}`);
            
            // Se o chat foi fechado
            if (updatedChat.status === 'closed' && previousChat.status !== 'closed') {
              toast.success(t('chatClosed'));
            }
            
            // Se o chat foi reaberto
            if (updatedChat.status === 'in_progress' && previousChat.status === 'closed') {
              toast.success(t('chatReopened'));
            }
            
            // Atualizar apenas o campo status
            setChat(prevChat => {
              if (!prevChat) return null;
              return {
                ...prevChat,
                status: updatedChat.status,
                end_time: updatedChat.end_time || prevChat.end_time
              };
            });
          }
          
          // Atualizar outros campos importantes sem substituir relacionamentos
          setChat(prevChat => {
            if (!prevChat) return null;
            return {
              ...prevChat,
              title: updatedChat.title || prevChat.title,
              start_time: updatedChat.start_time || prevChat.start_time,
              last_customer_message_at: updatedChat.last_customer_message_at || prevChat.last_customer_message_at
            };
          });
        }
      })
      .subscribe();
    
    return subscription;
  };

  // Função para se tornar colaborador
  const handleBecomeCollaborator = async () => {
    if (!currentUserId || !chatId || !organizationId) return;
    
    setIsAddingCollaborator(true);
    
    try {
      // Inserir registro de colaborador
      const { error } = await supabase
        .from('chat_collaborators')
        .insert({
          chat_id: chatId,
          user_id: currentUserId,
          organization_id: organizationId,
          joined_at: new Date().toISOString()
        });
        
      if (error) throw error;
      
      // Inserir mensagem de sistema
      await supabase
        .from('messages')
        .insert({
          chat_id: chatId,
          type: 'user_join',
          sender_type: 'system',
          sender_agent_id: currentUserId,
          organization_id: organizationId,
          created_at: new Date().toISOString()
        });
      
      // Recarregar colaboradores
      await loadChat();
      
      toast.success(t('collaborator.joinedSuccess'));
    } catch (error) {
      console.error('Erro ao se tornar colaborador:', error);
      toast.error(t('collaborator.joinError'));
    } finally {
      setIsAddingCollaborator(false);
    }
  };
  
  // Função para transferir o chat para si
  const handleTransferToMe = async () => {
    if (!currentUserId || !chatId) return;
    
    setIsTransferring(true);
    
    try {
      // Atualizar o chat para o novo atendente
      const { error } = await supabase
        .from('chats')
        .update({
          assigned_to: currentUserId
        })
        .eq('id', chatId);
        
      if (error) throw error;
      
      // Inserir mensagem de sistema
      await supabase
        .from('messages')
        .insert({
          chat_id: chatId,
          type: 'user_transferred',
          sender_type: 'system',
          sender_agent_id: currentUserId,
          organization_id: organizationId,
          created_at: new Date().toISOString()
        });
      
      // Atualizar o estado local
      setChat(prev => prev ? {
        ...prev,
        assigned_to: currentUserId
      } : null);
      
      // Recarregar o chat para obter informações atualizadas
      loadChat();
      
      toast.success(t('collaborator.transferSuccess'));
    } catch (error) {
      console.error('Erro ao transferir chat:', error);
      toast.error(t('collaborator.transferError'));
    } finally {
      setIsTransferring(false);
    }
  };
  
  // Função para sair da colaboração
  const handleLeaveCollaboration = async () => {
    if (!currentUserId || !chatId) return;
    
    setIsLeavingCollaboration(true);
    
    try {
      // Encontrar o registro de colaboração do usuário atual
      const { data: collaboratorData, error: findError } = await supabase
        .from('chat_collaborators')
        .select('id')
        .eq('chat_id', chatId)
        .eq('user_id', currentUserId)
        .is('left_at', null)
        .single();
        
      if (findError) throw findError;
      
      if (!collaboratorData) {
        throw new Error('Registro de colaboração não encontrado');
      }
      
      // Atualizar o registro com a data de saída
      const { error: updateError } = await supabase
        .from('chat_collaborators')
        .update({
          left_at: new Date().toISOString()
        })
        .eq('id', collaboratorData.id);
        
      if (updateError) throw updateError;
      
      // Inserir mensagem de sistema
      await supabase
        .from('messages')
        .insert({
          chat_id: chatId,
          type: 'user_left',
          sender_type: 'system',
          sender_agent_id: currentUserId,
          organization_id: organizationId,
          created_at: new Date().toISOString()
        });
      
      // Atualizar o estado local
      setIsCollaborator(false);
      setCanInteract(false);
      
      // Recarregar colaboradores
      await loadChat();
      
      toast.success(t('collaborator.leaveSuccess'));
    } catch (error) {
      console.error('Erro ao sair da colaboração:', error);
      toast.error(t('collaborator.leaveError'));
    } finally {
      setIsLeavingCollaboration(false);
    }
  };

  // Função para o atendente responsável sair do atendimento
  const handleLeaveChat = async () => {
    if (!currentUserId || !chatId) return;
    
    setIsLeavingChat(true);
    
    try {
      // Inserir mensagem de sistema
      await supabase
        .from('messages')
        .insert({
          chat_id: chatId,
          type: 'user_left',
          sender_type: 'system',
          sender_agent_id: currentUserId,
          organization_id: organizationId,
          created_at: new Date().toISOString()
        });
      
      // Atualizar o status do chat para "pending"
      const { error: chatError } = await supabase
        .from('chats')
        .update({
          status: 'pending',
          assigned_to: null as unknown as string // Corrigindo o tipo
        })
        .eq('id', chatId);
        
      if (chatError) throw chatError;
      
      // Atualizar o estado local
      setChat(prev => prev ? {
        ...prev,
        status: 'pending',
        assigned_to: undefined // Usando undefined em vez de null
      } : null);
      
      toast.success(t('collaborator.leaveAttendanceSuccess'));
    } catch (error) {
      console.error('Erro ao sair do atendimento:', error);
      toast.error(t('collaborator.leaveAttendanceError'));
    } finally {
      setIsLeavingChat(false);
    }
  };

  const handleDeleteMessage = async (message: Message) => {
    try {
      const response = await api.delete(`/api/${organizationId}/chat/${chatId}/message/${message.id}`);

      if (!response.data.success) {
        throw new Error(response.data.error || t('errors.deleteMessage'));
      }

      // Atualizar o estado local removendo a mensagem
      setMessages(prev => prev.filter(msg => msg.id !== message.id));
      
      toast.success(t('messageDeleted'));
    } catch (error: unknown) {
      const apiError = error as ApiError;
      const errorMessage = apiError.response?.data?.error || apiError.message || t('errors.deleteMessage');
      toast.error(errorMessage);
      console.error('Error deleting message:', error);
    }
  };

  if (!chatId) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-gray-500 dark:text-gray-400">
          <p>{t('selectChat.title')}</p>
          <p className="text-sm mt-2">{t('selectChat.description')}</p>
        </div>
      </div>
    );
  }

  if (initialLoading && !messagesLoadedRef.current) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="space-y-4 w-full max-w-lg">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-start space-x-4 animate-pulse">
              <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full relative">
      <div className="border-b border-gray-200 dark:border-gray-700 p-2">
        <div className="grid grid-cols-[auto_1fr_auto] items-center w-full">
          {/* Botão de voltar (apenas em mobile) */}
          <div className="flex-shrink-0">
            {isMobileView && (
              <button 
                onClick={handleBackClick}
                className="mr-2 flex items-center justify-center text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 self-center p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                aria-label={t('backToList')}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span className="sr-only">{t('backToList')}</span>
              </button>
            )}
          </div>
          
          {/* Informações do cliente */}
          <div 
            className="flex items-center space-x-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 p-2 rounded-lg transition-colors overflow-hidden"
            onClick={() => setShowEditCustomer(true)}
          >
            {headerLoading ? (
              <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse flex-shrink-0" />
            ) : (
              <ChatAvatar 
                id={chatId}
                name={chat?.customer?.name || 'Anônimo'}
                profilePicture={chat?.profile_picture || chat?.customer?.profile_picture}
                channel={chat?.channel_details}
              />
            )}
            <div className="truncate">
              {headerLoading ? (
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 animate-pulse" />
                  {chat?.ticket_number && (
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-16 animate-pulse" />
                  )}
                </div>
              ) : (
                <>
                  <div className="font-medium text-gray-900 dark:text-gray-100 truncate ">
                    {chat?.customer?.name || t('unnamed')}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                  {chat?.external_id && (
                      <span className="truncate flex items-center">
                        {/* <img 
                          src={getChannelIcon(chat.channel_details?.type || 'whatsapp_official')} 
                          alt="Canal" 
                          className="w-3.5 h-3.5 mr-1"
                        /> */}
                        {chat.external_id}
                      </span>
                    )}
                    {chat?.ticket_number && (
                      <span className="truncate">
                        #{chat.ticket_number}
                      </span>
                    )}
                    
                    {/* Tags do cliente */}
                    {chat?.customer?.tags && chat.customer.tags.length > 0 && (
                      <div className="flex items-center gap-1">
                        {chat.customer.tags.slice(0, 2).map((tagItem: CustomerTag) => (
                          <CustomTooltip 
                            key={tagItem.tag_id}
                            content={tagItem.tags?.name || ''}
                            color={tagItem.tags?.color ? tagItem.tags.color : '#3B82F6'}
                          >
                            <span 
                              className="inline-flex items-center px-1.5 py-0.5 text-xs rounded-full whitespace-nowrap overflow-hidden max-w-[50px]"
                              style={{ 
                                backgroundColor: tagItem.tags?.color ? `${tagItem.tags.color}20` : '#3B82F620',
                                color: tagItem.tags?.color || '#3B82F6'
                              }}
                            >
                              <span className="truncate">{tagItem.tags?.name || ''}</span>
                            </span>
                          </CustomTooltip>
                        ))}
                        {chat.customer.tags.length > 2 && (
                          <CustomTooltip 
                            content={chat.customer.tags.slice(2).map((tag: CustomerTag) => 
                              tag.tags?.name || ''
                            ).join(', ')}
                            color="#4B5563"
                          >
                            <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700">
                              +{chat.customer.tags.length - 2}
                            </span>
                          </CustomTooltip>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* Mostrar quem está atendendo */}
                  {chat?.status === 'in_progress' && chat?.assigned_agent && !isAssignedAgent && !isCollaborator && (
                    <div className="text-xs text-blue-600 dark:text-blue-400 mt-1 flex items-center">
                      <UserCheck className="w-3 h-3 mr-1" />
                      {t('collaborator.attendedBy', { name: chat.assigned_agent.full_name })}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
          
          {/* Botões de ação */}
          <div className="flex-shrink-0 justify-self-end flex items-center space-x-2">
            {/* Botão de Play para Fluxos */}
            {(chat?.status === 'pending' || chat?.status === 'in_progress') && (
              <button
                className={`p-2 ${
                  chat?.flow_session_id 
                    ? 'bg-yellow-500 hover:bg-yellow-600' 
                    : 'bg-purple-600 hover:bg-purple-700'
                } text-white rounded-md transition-colors flex items-center justify-center`}
                onClick={() => setShowFlowModal(true)}
                title={chat?.flow_session_id ? t('flows.pauseFlow') : t('flows.startFlow')}
              >
                {chat?.flow_session_id ? (
                  <>
                    <Pause className="w-5 h-5" />
                    <span className="hidden xs:inline md:hidden ml-2">{t('flows.pauseShort')}</span>
                    <span className="hidden md:inline ml-2">{t('flows.pauseFlow')}</span>
                  </>
                ) : (
                  <>
                    <svg 
                      className="w-5 h-5" 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24" 
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={2} 
                        d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" 
                      />
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={2} 
                        d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
                      />
                    </svg>
                    <span className="hidden xs:inline md:hidden ml-2">{t('flows.startShort')}</span>
                    <span className="hidden md:inline ml-2">{t('flows.startFlow')}</span>
                  </>
                )}
              </button>
            )}

            {/* Botões para colaboradores */}
            {chat?.status === 'in_progress' && isCollaborator && !isAssignedAgent && (
              <>
                <button
                  className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors flex items-center justify-center"
                  onClick={handleTransferToMe}
                  disabled={isTransferring}
                  title={t('collaborator.transfer')}
                >
                  {isTransferring ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span className="hidden xs:inline md:hidden ml-2">{t('loading')}</span>
                      <span className="hidden md:inline ml-2">{t('loading')}</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-5 h-5" />
                      <span className="hidden xs:inline md:hidden ml-2">{t('collaborator.transferShort')}</span>
                      <span className="hidden md:inline ml-2">{t('collaborator.transfer')}</span>
                    </>
                  )}
                </button>
                
                <button
                  className="p-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md transition-colors flex items-center justify-center"
                  onClick={handleLeaveCollaboration}
                  disabled={isLeavingCollaboration}
                  title={t('collaborator.leave')}
                >
                  {isLeavingCollaboration ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span className="hidden xs:inline md:hidden ml-2">{t('loading')}</span>
                      <span className="hidden md:inline ml-2">{t('loading')}</span>
                    </>
                  ) : (
                    <>
                      <svg 
                        className="w-5 h-5" 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24" 
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path 
                          strokeLinecap="round" 
                          strokeLinejoin="round" 
                          strokeWidth={2} 
                          d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" 
                        />
                      </svg>
                      <span className="hidden xs:inline md:hidden ml-2">{t('collaborator.leaveShort')}</span>
                      <span className="hidden md:inline ml-2">{t('collaborator.leave')}</span>
                    </>
                  )}
                </button>
              </>
            )}
            
            {/* Botões para usuários que não são atendentes nem colaboradores */}
            {chat?.status === 'in_progress' && !isAssignedAgent && !isCollaborator && (
              <>
                <button
                  className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors flex items-center justify-center"
                  onClick={handleBecomeCollaborator}
                  disabled={isAddingCollaborator}
                  title={t('collaborator.join')}
                >
                  {isAddingCollaborator ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span className="hidden xs:inline md:hidden ml-2">{t('loading')}</span>
                      <span className="hidden md:inline ml-2">{t('loading')}</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-5 h-5" />
                      <span className="hidden xs:inline md:hidden ml-2">{t('collaborator.joinShort')}</span>
                      <span className="hidden md:inline ml-2">{t('collaborator.join')}</span>
                    </>
                  )}
                </button>
                
                <button
                  className="p-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors flex items-center justify-center"
                  onClick={handleTransferToMe}
                  disabled={isTransferring}
                >
                  {isTransferring ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span className="hidden xs:inline">{t('loading')}</span>
                      <span className="xs:hidden inline">{t('loading')}</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      <span className="hidden xs:inline">{t('collaborator.transfer')}</span>
                      <span className="xs:hidden inline">{t('collaborator.transferShort')}</span>
                    </>
                  )}
                </button>
              </>
            )}
            
            {/* Botão de resolver (apenas para o atendente designado) */}
            {chat?.status === 'in_progress' && isAssignedAgent && (
              <>
                <button
                  className="md:px-4 md:py-2 p-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md transition-colors flex items-center justify-center"
                  onClick={handleLeaveChat}
                  disabled={isLeavingChat}
                  aria-label={t('collaborator.leaveAttendance')}
                >
                  {isLeavingChat ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span className="hidden xs:inline md:hidden ml-2">{t('loading')}</span>
                      <span className="hidden md:inline">{t('loading')}</span>
                    </>
                  ) : (
                    <>
                      <svg 
                        className="w-5 h-5 md:hidden" 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24" 
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path 
                          strokeLinecap="round" 
                          strokeLinejoin="round" 
                          strokeWidth={2} 
                          d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" 
                        />
                      </svg>
                      <span className="hidden xs:inline md:hidden ml-2">{t('collaborator.leaveShort')}</span>
                      <span className="hidden md:inline">{t('collaborator.leaveAttendance')}</span>
                    </>
                  )}
                </button>

                <button
                  className="md:px-4 md:py-2 p-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors flex items-center justify-center"
                  onClick={() => setShowResolutionModal(true)}
                  aria-label={t('resolve')}
                >
                  <span className="hidden md:inline">{t('resolve')}</span>
                  <svg 
                    className="w-5 h-5 md:hidden" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24" 
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M5 13l4 4L19 7" 
                    />
                  </svg>
                </button>
              </>
            )}
          </div>
        </div>
        
        {/* Lista de colaboradores */}
        {collaborators.length > 0 && (
          <div className="px-2 py-1 text-xs text-gray-500 dark:text-gray-400 flex flex-wrap items-center">
            <span className="mr-2">{t('collaborator.collaborators')}:</span>
            {collaborators.map((collab) => (
              <span key={collab.id} className="bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full mr-1 mb-1">
                {collab.user?.full_name}
              </span>
            ))}
          </div>
        )}
      </div>

      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 relative overflow-x-hidden w-full pb-2 custom-scrollbar opacity-0 transition-opacity duration-300"
        onScroll={handleScroll}
      >
        {/* Indicador de carregamento relativo ao contêiner de mensagens */}
        {isLoadingMore && (
          <div className="absolute top-4 left-[40%] transform -translate-x-1/2 bg-white dark:bg-gray-900 bg-opacity-95 dark:bg-opacity-95 backdrop-blur-sm rounded-lg py-2 px-4 shadow-lg z-50 loading-indicator-enter border border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
              <div className="animate-spin w-5 h-5 border-2 border-gray-300 dark:border-gray-600 border-t-blue-500 rounded-full mr-2"></div>
              <span className="text-gray-700 dark:text-gray-300 text-sm font-medium">{t('loading')}</span>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="space-y-4 w-full max-w-lg">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-start space-x-4 animate-pulse">
                  <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
            {error && (
              <div className="bg-red-50 dark:bg-red-900/50 text-red-600 dark:text-red-400 p-3 rounded-md text-center">
                {error}
              </div>
            )}
            
            {Object.entries(groupMessagesByDate(messages)).map(([date, dateMessages]) => (
              <div key={date} className="w-full">
                <div className="sticky top-2 flex justify-center mb-4 z-10">
                  <span className="bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full text-sm text-gray-600 dark:text-gray-400 shadow-sm">
                    {formatMessageDate(dateMessages[0].created_at)}
                  </span>
                </div>
                
                <div className="flex flex-col gap-2 w-full">
                  {dateMessages.map((message) => (
                    <MessageBubble
                      key={message.id}
                      message={message}
                      chatStatus={chat?.status || ''}
                      onReply={channelFeatures.canReplyToMessages ? (message) => {
                        setReplyingTo(message);
                      } : undefined}
                      isHighlighted={message.id === highlightedMessageId}
                      channelFeatures={channelFeatures}
                      onDeleteMessage={handleDeleteMessage}
                    />
                  ))}
                </div>
              </div>
            ))}
            
            {/* Adicionar título do chat quando fechado */}
            {chat?.status === 'closed' && chat?.title && (
              <div className="w-full mt-4">
                <div className="flex justify-center">
                  <div className="bg-gray-100 dark:bg-gray-800 px-4 py-2 rounded-lg text-sm text-gray-600 dark:text-gray-400">
                    <span className="font-medium">{t('resolutionTitle')}:</span> {chat.title}
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Botão para rolar até a mensagem destacada */}
      {showScrollToHighlighted && highlightedMessageId && (
        <button 
          className="scroll-to-highlighted"
          onClick={() => scrollToMessage(highlightedMessageId)}
          aria-label={t('scrollToHighlightedMessage')}
        >
          <ArrowDown className="w-5 h-5" />
        </button>
      )}

      {footerLoading ? (
        <div className="border-t border-gray-200 dark:border-gray-700 p-4 pb-4">
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        </div>
      ) : (
        <>
          {chat?.status === 'in_progress' && canSendMessage && canInteract && (
            <MessageInput
              chatId={chatId}
              organizationId={organizationId}
              onMessageSent={() => {}}
              replyTo={
                replyingTo && channelFeatures.canReplyToMessages ? {
                  message: replyingTo,
                  onClose: () => setReplyingTo(null)
                } : undefined
              }
              isSubscriptionReady={isSubscriptionReady}
              channelFeatures={channelFeatures}
            />
          )}

          {chat?.status === 'in_progress' && !canSendMessage && canInteract && (
            <div className="border-t border-gray-200 dark:border-gray-700 p-4 pb-4">
              <div className="p-3 bg-yellow-50 dark:bg-yellow-900/50 text-yellow-600 dark:text-yellow-400 rounded-md">
                {channelFeatures.canSendTemplates ? (
                  <div className="flex flex-col space-y-3">
                    <p>{t('channels:form.whatsapp.24HourWindow')}</p>
                    <button
                      onClick={() => setShowTemplateModal(true)}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
                    >
                      {t('channels:form.whatsapp.useTemplate')}
                    </button>
                  </div>
                ) : (
                  isMessageWindowClosed 
                    ? t('errors.instagram24HourWindow')
                    : t('errors.instagramNoCustomerMessage')
                )}
              </div>
            </div>
          )}

          {/* Mensagem para usuários que não podem interagir */}
          {chat?.status === 'in_progress' && !canInteract && (
            <div className="border-t border-gray-200 dark:border-gray-700 p-4 pb-4">
              <div className="p-3 bg-blue-50 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-md flex flex-col space-y-3">
                <p>{t('collaborator.cannotInteract')}</p>
                <div className="flex space-x-2">
                  <button
                    onClick={handleBecomeCollaborator}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors flex items-center"
                    disabled={isAddingCollaborator}
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    <span className="hidden xs:inline">{t('collaborator.join')}</span>
                    <span className="xs:hidden inline">{t('collaborator.joinShort')}</span>
                  </button>
                  
                  <button
                    onClick={handleTransferToMe}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors flex items-center"
                    disabled={isTransferring}
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    <span className="hidden xs:inline">{t('collaborator.transfer')}</span>
                    <span className="xs:hidden inline">{t('collaborator.transferShort')}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {chat?.status === 'pending' && (
            <div className="border-t border-gray-200 dark:border-gray-700 p-4 pb-4">
              <button
                onClick={handleAttend}
                disabled={isAttending}
                className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors flex items-center justify-center"
              >
                {isAttending ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {t('loading')}
                  </>
                ) : (
                  t('attend')
                )}
              </button>
            </div>
          )}

          {chat?.status === 'closed' && (
            <div className="border-t border-gray-200 dark:border-gray-700 p-4 pb-4">
              <div className="text-center text-gray-500 dark:text-gray-400">
                <span className="inline-block mr-2">✓</span>
                {t('chatClosed')}
                {chat.end_time && (
                  <div className="text-sm mt-1">
                    {new Date(chat.end_time).toLocaleString()}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {showEditCustomer && chat?.customer && createPortal(
        <CustomerEditModal
          // @ts-expect-error - Tipo do customer não corresponde exatamente ao esperado
          customer={chat.customer}
          onClose={() => setShowEditCustomer(false)}
          onSuccess={() => {
            loadChat(); // Recarrega os dados do chat para atualizar as informações do cliente
          }}
        />,
        document.body
      )}

      <ChatResolutionModal
        isOpen={showResolutionModal}
        onClose={() => setShowResolutionModal(false)}
        onConfirm={handleResolveChat}
        closureTypes={closureTypes}
        chatId={chatId}
      />

      {showTemplateModal && (
        <WhatsAppTemplateModal
          isOpen={showTemplateModal}
          onClose={() => setShowTemplateModal(false)}
          channelId={chat?.channel_details?.id || ''}
          onSendTemplate={handleSendTemplate}
        />
      )}

      {/* Modal de Fluxos */}
      <FlowModal
        isOpen={showFlowModal}
        onClose={() => setShowFlowModal(false)}
        chatId={chatId}
        organizationId={organizationId}
        onFlowStarted={(sessionId) => {
          setChat(prev => prev ? {
            ...prev,
            flow_session_id: sessionId,
            status: 'in_progress'
          } : null);
        }}
        onFlowPaused={() => {
          setChat(prev => prev ? {
            ...prev,
            flow_session_id: null
          } : null);
        }}
        currentFlowSessionId={chat?.flow_session_id}
      />
    </div>
  );
}

interface WhatsAppTemplate {
  id: string;
  name: string;
  components: {
    type: string;
    text?: string;
    example?: {
      header_text?: string[];
      body_text?: string[][];
    };
  }[];
}