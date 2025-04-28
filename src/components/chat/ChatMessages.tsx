import React, { useRef, useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Message as BaseMessage } from '../../types/database';
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
import { ArrowDown, UserPlus, UserCheck, RefreshCw, Pause, Loader2, History, Image } from 'lucide-react';
import './styles.css';
import { useClosureTypes } from '../../hooks/useQueryes';
import { FlowModal } from './FlowModal';
import { AxiosError } from 'axios';
import { LeaveAttendanceModal } from './LeaveAttendanceModal';

// Estendendo a interface Message para incluir a propriedade response_to
interface Message extends BaseMessage {
  response_to?: Message;
  chats?: {
    id: string;
    ticket_number?: string;
    customer_id: string;
    channel_id: string;
    start_time?: string;
    end_time?: string;
    status?: string;
  };
}

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
  status: 'pending' | 'in_progress' | 'closed' | 'await_closing';
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

// Interface para recursos do canal
interface ChannelFeatures {
  canReplyToMessages: boolean;
  canSendAudio: boolean;
  canSendTemplates: boolean;
  has24HourWindow: boolean;
  canSendAfter24Hours: boolean;
  canDeleteMessages: boolean;
}

// Interfaces para agrupamento de mensagens
interface ChatInfo {
  id: string;
  ticket_number?: string;
  customer_id: string;
  channel_id: string;
  start_time?: string;
  status?: string;
}

interface ChatGroup {
  chatInfo: ChatInfo | null;
  messages: Message[];
}

interface ChatGroupResult {
  chatInfo: ChatInfo | null;
  dateGroups: Record<string, Message[]>;
}

export function ChatMessages({ chatId, organizationId, onBack }: ChatMessagesProps) {
  const { t } = useTranslation('chats');
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  // Estado para armazenar mensagens otimistas temporárias
  interface OptimisticMessage {
    id: string;
    content: string | null;
    attachments?: { url: string; type: string; name: string }[];
    replyToMessageId?: string;
    isPending: boolean;
    created_at: string;
    sender_type: string;
    chat_id: string;
    status: string;
    error_message?: string;
  }
  const [optimisticMessages, setOptimisticMessages] = useState<OptimisticMessage[]>([]);
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
  const [newMessagesCount, setNewMessagesCount] = useState(0);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const [showNewMessagesIndicator, setShowNewMessagesIndicator] = useState(false);
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

  // Estado para mensagens que falharam e podem ser reenviadas
  const [failedMessages, setFailedMessages] = useState<OptimisticMessage[]>([]);
  // Estado para rastrear mensagens que estão sendo reenviadas
  const [retryingMessages, setRetryingMessages] = useState<string[]>([]);
  const [showLeaveModal, setShowLeaveModal] = useState(false);

  const [lastSubscriptionUpdate, setLastSubscriptionUpdate] = useState<Date | null>(null);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [isViewingAllCustomerMessages, setIsViewingAllCustomerMessages] = useState(false);

  // Vamos adicionar estados para controlar o carregamento específico do botão
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isLoadingCurrentChat, setIsLoadingCurrentChat] = useState(false);

  // Estado para armazenar os anexos que serão passados para o MessageInput
  const [droppedFiles, setDroppedFiles] = useState<File[]>([]);

  // Estados para controle de drag and drop
  const [isDragging, setIsDragging] = useState(false);

  // Estado para armazenar a posição e dimensões da área de conversa
  const [chatAreaRect, setChatAreaRect] = useState<DOMRect | null>(null);
  const chatAreaRef = useRef<HTMLDivElement>(null);

  // Função para atualizar as dimensões da área de chat quando o drag começa
  const updateChatAreaRect = useCallback(() => {
    if (chatAreaRef.current) {
      setChatAreaRect(chatAreaRef.current.getBoundingClientRect());
    }
  }, []);

  // Atualizar o estado do rect quando o componente monta e quando a janela é redimensionada
  useEffect(() => {
    updateChatAreaRect();
    
    const handleResize = () => {
      updateChatAreaRect();
    };
    
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [updateChatAreaRect]);

  // Funções para lidar com drag and drop
  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    updateChatAreaRect(); // Atualizar as dimensões quando o drag começa
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    // Verificar se o cursor saiu realmente da área de drop
    // e não apenas entrou em um elemento filho
    if (e.currentTarget.contains(e.relatedTarget as Node)) {
      return;
    }
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    // Garantir que o cursor indique que o drop é permitido
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    // Processar os arquivos soltos
    const files = Array.from(e.dataTransfer.files);
    
    if (files.length === 0) return;
    
    // Armazenar os arquivos para que o MessageInput possa usá-los
    setDroppedFiles(files);
  };

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

  useEffect(() => {
    let subscription: ReturnType<typeof supabase.channel>;

    // Verificar se o chatId mudou realmente
    const isChatIdChanged = chatId !== previousChatIdRef.current;
    
    // Só atualizar o previousChatIdRef se o chatId realmente mudou
    if (isChatIdChanged) {
      // console.log(`ChatMessages: chatId mudou de ${previousChatIdRef.current || 'null'} para ${chatId}`);
      previousChatIdRef.current = chatId;
      // Resetar o flag de rolagem inicial quando o chat mudar
      initialScrollDoneRef.current = false;
    } else {
      // console.log(`ChatMessages: chatId não mudou (${chatId}), provavelmente apenas os filtros foram alterados`);
    }

    if (chatId) {
      // Só mostrar loading e recarregar mensagens se o chatId realmente mudou ou se for o primeiro carregamento
      if (isChatIdChanged || isInitialRender()) {
        // console.log('ChatMessages: Carregando mensagens para novo chat ou primeiro carregamento');
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
        if (messageId) {
          setHighlightedMessageId(messageId);
          loadSpecificMessage(messageId);
        } else {
          // Só carregar mensagens se o chatId mudou ou se for o primeiro carregamento
          loadMessages(1, false);
          isFirstLoadRef.current = false;
          messagesLoadedRef.current = true;
        }
        
        // Sempre carregamos os detalhes do chat quando o chatId muda
        loadChat();
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
      scrollToBottom();
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

  // Adicionar função para verificar se está próximo do final
  const isNearBottom = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return true;
    
    const threshold = 300; // 300px do final
    return container.scrollHeight - container.scrollTop - container.clientHeight < threshold;
  }, []);

  // Efeito para lidar com mudanças de visibilidade
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Limpar timeout anterior se existir
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }

        // Aguardar 2 segundos antes de verificar reconexão
        reconnectTimeoutRef.current = setTimeout(async () => {
          // Verificar se há novas mensagens desde a última atualização
          const now = new Date();
          const lastUpdate = lastSubscriptionUpdate || new Date(0);
          const timeSinceLastUpdate = now.getTime() - lastUpdate.getTime();
          
          // Se passou mais de 30 segundos, recarregar completamente o chat
          console.log('timeSinceLastUpdate', timeSinceLastUpdate);
          if (timeSinceLastUpdate > 30000) {
            // Ativar o loading inicial para mostrar o skeleton
            setInitialLoading(true);
            messagesLoadedRef.current = false;
            
            // IMPORTANTE: Forçar o newMessagesCount a ser zero imediatamente
            const forceReset = true;
            
            // Resetar todos os estados relevantes
            setNewMessagesCount(0);
            setMessages([]);
            setOptimisticMessages([]);
            setFailedMessages([]);
            setPage(1);
            setHasMore(true);
            setUnreadMessagesCount(0);
            setShowNewMessagesIndicator(false);
            
            // Usar um timeout para garantir que o estado seja atualizado antes de seguir
            setTimeout(async () => {
              // Primeiro carregar o chat para obter informações atualizadas
              await loadChat();
              
              // Depois carregar as mensagens a partir da página 1, forçando newMessagesCount como 0
              await loadMessages(1, false, forceReset);
              
              // Atualizar timestamp de última atualização
              setLastSubscriptionUpdate(new Date());
            }, 0);
          } else {
            setLastSubscriptionUpdate(new Date());
          }
        }, 10);
      } else if (document.visibilityState === 'hidden') {
        // Atualizar o timestamp quando o usuário sai da aba
        setLastSubscriptionUpdate(new Date());
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [page, lastSubscriptionUpdate]);

  // Modificar o subscribeToMessages para atualizar o lastSubscriptionUpdate
  const subscribeToMessages = () => {
    const subscription = supabase
      .channel('messages')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'messages',
        filter: `chat_id=eq.${chatId}`
      }, async (payload) => {
        setLastSubscriptionUpdate(new Date());
        if (payload.eventType === 'INSERT') {
          setNewMessagesCount(prev => prev + 1);
          // console.log('payload INSERT', payload);
          
          const newMessage = payload.new as Message;
          
          // Verificar se o usuário está próximo do final
          const shouldAutoScroll = isNearBottom();
          
          if (!shouldAutoScroll) {
            setUnreadMessagesCount(prev => prev + 1);
            setShowNewMessagesIndicator(true);
          }
          
          // Se for mensagem do sistema, buscar informações adicionais do agente
          if (newMessage.sender_type === 'system' && newMessage.sender_agent_id) {
            try {
              // Verificar se já temos informações do agente
              const hasSenderAgent = !!newMessage.sender_agent?.id;
              
              if (!hasSenderAgent) {
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
              }
            } catch (error) {
              console.error('Erro ao buscar informações do agente:', error);
            }
          }
          
          // Verificar se é uma resposta a outra mensagem e buscar a mensagem original
          if (newMessage.response_message_id) {
            try {
              const { data: originalMessage, error: messageError } = await supabase
                .from('messages')
                .select(`
                  id, 
                  content, 
                  type, 
                  sender_type, 
                  status, 
                  created_at,
                  sender_agent_id,
                  sender_customer_id,
                  sender_agent:profiles!messages_sender_agent_id_fkey(
                    id, 
                    full_name, 
                    avatar_url
                  ),
                  sender_customer:customers!messages_sender_customer_id_fkey(
                    id, 
                    name
                  ),
                  attachments
                `)
                .eq('id', newMessage.response_message_id)
                .single();
              
              if (!messageError && originalMessage) {
                // @ts-expect-error - Adicionando propriedade response_to à mensagem
                newMessage.response_to = originalMessage;
              }
            } catch (error) {
              console.error('Erro ao buscar mensagem de referência:', error);
            }
          }
          
          // Verificar se esta mensagem substitui uma mensagem otimista existente
          let metadata: { tempId?: string } | null = null;
          
          // console.log(`Mensagem recebida:`, newMessage.metadata);
          try {
            metadata = newMessage.metadata ? 
              (typeof newMessage.metadata === 'string' ? 
                JSON.parse(newMessage.metadata) : newMessage.metadata) as { tempId?: string } : 
              null;
          } catch (e) {
            console.error('Erro ao processar metadata da mensagem:', e);
            metadata = null;
          }
          
          // console.log(`Verificando metadata para tempId:`, metadata);
          const tempId = metadata?.tempId;
          
          // Adicionar a nova mensagem à lista primeiro, antes de remover a otimista
          // console.log(`Adicionando nova mensagem à lista antes de remover a otimista. Total atual: ${messages.length}`);
          setMessages(prev => {
            // Verificar se já existe uma mensagem com o mesmo ID (evitar duplicação)
            if (!prev.some(m => m.id === newMessage.id)) {
              return [...prev, newMessage];
            }
            return prev;
          });
          
          // Agora tratamos a remoção da mensagem otimista
          if (tempId) {
            // console.log(`Encontrada mensagem real com tempId ${tempId}, removendo mensagem otimista após breve atraso`);
            
            // Força imediatamente a limpeza das mensagens otimistas com este tempId
            // Isso deve resolver problemas de estado React que podem atrasar a atualização
            // console.log('Forçando limpeza imediata de mensagens otimistas com este tempId');
            setOptimisticMessages(prev => {
              const filtered = prev.filter(msg => msg.id !== tempId);
              // console.log(`Limpeza imediata: Removendo mensagem otimista com ID ${tempId}`);
              return filtered;
            });
            
            // Pequeno atraso para garantir que a mensagem real já esteja visível
            setTimeout(() => {
              // Verificar se a mensagem otimista existe antes de tentar removê-la
              // console.log('Estado atual das mensagens otimistas:', optimisticMessages);
              
              const hasOptimisticMessage = optimisticMessages.some(msg => {
                // console.log(`Comparando tempId ${tempId} com mensagem id ${msg.id}`);
                return msg.id === tempId;
              });
              
              if (hasOptimisticMessage) {
                // console.log(`Mensagem otimista com ID ${tempId} encontrada, removendo...`);
                
                // Remover a mensagem otimista correspondente
                setOptimisticMessages(prev => {
                  const filtered = prev.filter(msg => msg.id !== tempId);
                  // console.log(`Mensagens otimistas antes: ${prev.length}, depois: ${filtered.length}`);
                  return filtered;
                });
              } else {
                // console.log(`Mensagem otimista com ID ${tempId} não encontrada no estado atual`);
                
                // Tentar procurar com uma busca mais flexível (ex: o início do ID pode corresponder)
                const possibleMatches = optimisticMessages.filter(msg => 
                  msg.id.includes(tempId) || tempId.includes(msg.id)
                );
                
                if (possibleMatches.length > 0) {
                  // console.log(`Encontradas possíveis correspondências por substring:`, possibleMatches);
                  
                  // Remover essas mensagens possíveis
                  setOptimisticMessages(prev => {
                    const newList = prev.filter(msg => 
                      !possibleMatches.some(match => match.id === msg.id)
                    );
                    // console.log(`Removendo ${possibleMatches.length} mensagens por correspondência parcial`);
                    return newList;
                  });
                }
              }
              
              // Verificar também na lista de mensagens falhas
              setFailedMessages(prev => {
                const hasFailed = prev.some(msg => msg.id === tempId);
                if (hasFailed) {
                  // console.log(`Mensagem falha com ID ${tempId} encontrada, removendo...`);
                  const filtered = prev.filter(msg => msg.id !== tempId);
                  // Atualizar o localStorage
                  saveFailedMessagesToStorage(filtered);
                  return filtered;
                }
                
                // Tentar busca flexível também para mensagens falhas
                const possibleFailedMatches = prev.filter(msg => 
                  msg.id.includes(tempId) || tempId.includes(msg.id)
                );
                
                if (possibleFailedMatches.length > 0) {
                  // console.log(`Encontradas possíveis mensagens falhas por substring:`, possibleFailedMatches);
                  const filtered = prev.filter(msg => 
                    !possibleFailedMatches.some(match => match.id === msg.id)
                  );
                  saveFailedMessagesToStorage(filtered);
                  return filtered;
                }
                
                return prev;
              });
            }, 300); // Atraso de 300ms para garantir que a UI tenha tempo de atualizar
          } else {
            // console.log('Mensagem sem tempId, adicionando normalmente');
          }
          
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
          // console.log('payload UPDATE', payload);
          const updatedMessage = payload.new as Message;
          
          // Se a mensagem foi deletada, removê-la da lista
          // if (updatedMessage.status === 'deleted') {
          //   setMessages(prev => prev.filter(msg => msg.id !== updatedMessage.id));
          //   return;
          // }
          
          // Se a mensagem falhou, adicioná-la à lista de mensagens falhas
          if (updatedMessage.status === 'failed') {
            // console.log(`Mensagem ${updatedMessage.id} falhou. Adicionando à lista de mensagens falhas.`);
            
            // Adicionar à lista de mensagens falhas (se ainda não estiver lá)
            setFailedMessages(prev => {
              // Verificar se a mensagem já está na lista
              if (!prev.some(msg => msg.id === updatedMessage.id)) {
                const updatedMessages = [...prev, {
                  ...updatedMessage as unknown as OptimisticMessage,
                  isPending: false
                }];
                // Salvar no localStorage
                saveFailedMessagesToStorage(updatedMessages);
                return updatedMessages;
              }
              return prev;
            });
          }
          
          // Se for mensagem do sistema, buscar informações adicionais do agente
          if (updatedMessage.sender_type === 'system' && updatedMessage.sender_agent_id) {
            try {
              // Verificar se já temos informações do agente
              const hasSenderAgent = !!updatedMessage.sender_agent?.id;
              
              if (!hasSenderAgent) {
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
              }
            } catch (error) {
              console.error('Erro ao buscar informações do agente:', error);
            }
          }
          
          // Verificar se é uma resposta a outra mensagem e buscar a mensagem original
          if (updatedMessage.response_message_id) {
            try {
              // Verificar se a mensagem já tem a propriedade response_to
              const hasResponseTo = !!updatedMessage.response_to;
              
              if (!hasResponseTo) {
                const { data: originalMessage, error: messageError } = await supabase
                  .from('messages')
                  .select(`
                    id, 
                    content, 
                    type, 
                    sender_type, 
                    status, 
                    created_at,
                    sender_agent_id,
                    sender_customer_id,
                    sender_agent:profiles!messages_sender_agent_id_fkey(
                      id, 
                      full_name, 
                      avatar_url
                    ),
                    sender_customer:customers!messages_sender_customer_id_fkey(
                      id, 
                      name
                    ),
                    attachments
                  `)
                  .eq('id', updatedMessage.response_message_id)
                  .single();
                
                if (!messageError && originalMessage) {
                  // @ts-expect-error - Adicionando propriedade response_to à mensagem
                  updatedMessage.response_to = originalMessage;
                }
              }
            } catch (error) {
              console.error('Erro ao buscar mensagem de referência:', error);
            }
          }
          
          // Atualizar a mensagem na lista primeiro
          setMessages(prev => prev.map(msg => 
            msg.id === updatedMessage.id ? updatedMessage : msg
          ));
          
          // Verificar se esta mensagem atualizada substitui uma mensagem otimista existente
          let metadata: { tempId?: string } | null = null;
          
          try {
            metadata = updatedMessage.metadata ? 
              (typeof updatedMessage.metadata === 'string' ? 
                JSON.parse(updatedMessage.metadata) : updatedMessage.metadata) as { tempId?: string } : 
              null;
          } catch (e) {
            console.error('Erro ao processar metadata da mensagem atualizada:', e);
            metadata = null;
          }
          
          const tempId = metadata?.tempId;
          
          if (tempId) {
            // console.log(`Encontrada mensagem atualizada com tempId ${tempId}, verificando mensagens otimistas`);
            // console.log('Estado atual das mensagens otimistas durante UPDATE:', optimisticMessages);
            
            // Pequeno atraso para garantir que a mensagem atualizada já esteja visível
            setTimeout(() => {
              // Verificar se a mensagem otimista existe antes de tentar removê-la
              const hasOptimisticMessage = optimisticMessages.some(msg => {
                // console.log(`UPDATE: Comparando tempId ${tempId} com mensagem id ${msg.id}`);
                return msg.id === tempId;
              });
              
              if (hasOptimisticMessage) {
                // console.log(`Mensagem otimista com ID ${tempId} encontrada, removendo durante UPDATE`);
                
                // Remover a mensagem otimista correspondente
                setOptimisticMessages(prev => prev.filter(msg => msg.id !== tempId));
              } else {
                // console.log(`Mensagem otimista com ID ${tempId} não encontrada durante UPDATE`);
                
                // Tentar procurar com uma busca mais flexível (ex: o início do ID pode corresponder)
                const possibleMatches = optimisticMessages.filter(msg => 
                  msg.id.includes(tempId) || tempId.includes(msg.id)
                );
                
                if (possibleMatches.length > 0) {
                  // console.log(`UPDATE: Encontradas possíveis correspondências por substring:`, possibleMatches);
                  
                  // Remover essas mensagens possíveis
                  setOptimisticMessages(prev => {
                    const newList = prev.filter(msg => 
                      !possibleMatches.some(match => match.id === msg.id)
                    );
                    // console.log(`UPDATE: Removendo ${possibleMatches.length} mensagens por correspondência parcial`);
                    return newList;
                  });
                }
              }
              
              // Verificar também na lista de mensagens falhas
              setFailedMessages(prev => {
                const hasFailed = prev.some(msg => msg.id === tempId);
                if (hasFailed) {
                  // console.log(`Mensagem falha com ID ${tempId} encontrada, removendo durante UPDATE`);
                  const filtered = prev.filter(msg => msg.id !== tempId);
                  // Atualizar o localStorage
                  saveFailedMessagesToStorage(filtered);
                  return filtered;
                }
                
                // Tentar busca flexível também para mensagens falhas
                const possibleFailedMatches = prev.filter(msg => 
                  msg.id.includes(tempId) || tempId.includes(msg.id)
                );
                
                if (possibleFailedMatches.length > 0) {
                  // console.log(`UPDATE: Encontradas possíveis mensagens falhas por substring:`, possibleFailedMatches);
                  const filtered = prev.filter(msg => 
                    !possibleFailedMatches.some(match => match.id === msg.id)
                  );
                  saveFailedMessagesToStorage(filtered);
                  return filtered;
                }
                
                return prev;
              });
            }, 300); // Atraso de 300ms para garantir que a UI tenha tempo de atualizar
          }
        }
      })
      .subscribe((status) => {
        // console.log('Subscription status:', status);
        if(status === 'SUBSCRIBED') {
          setLastSubscriptionUpdate(new Date());
          setTimeout(() => {
            setIsSubscriptionReady(true);
          }, 2000);
        }
      });
    return subscription;
  };

  const loadMessages = async (pageNumber = 1, append = false, forceReset = false) => {
    try {
      if (append) {
        setIsLoadingMore(true);
      }
      
      // Calcular o offset considerando as novas mensagens
      // Se forceReset for true, ignoramos newMessagesCount completamente
      const offset = forceReset ? (pageNumber - 1) * MESSAGES_PER_PAGE : (pageNumber - 1) * MESSAGES_PER_PAGE + newMessagesCount;
      
      // console.log(`loadMessages - pageNumber: ${pageNumber}, newMessagesCount: ${newMessagesCount}, forceReset: ${forceReset}, offset calculado: ${offset}`);
      
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
        // .neq('status', 'deleted')
        .order('created_at', { ascending: false })
        .range(offset, offset + MESSAGES_PER_PAGE - 1);
        
      if (error) throw error;
      
      // Verificar mensagens recebidas para remover otimistas correspondentes
      if (data && data.length > 0) {
        data.forEach((message) => {
          const metadata = message.metadata as { tempId?: string };
          const tempId = metadata?.tempId;
          
          if (tempId) {
            // Se encontrou uma mensagem com tempId, remover a mensagem otimista
            setOptimisticMessages(prev => prev.filter(msg => msg.id !== tempId));
            // console.log(`Removendo mensagem otimista com ID ${tempId} durante carregamento`);
          }
        });
      }
      
      const newMessages = data || [];
      setHasMore(newMessages.length === MESSAGES_PER_PAGE);

      // console.log('newMessages', newMessages);
        
      if (append) {
        setMessages(prev => [...newMessages.reverse(), ...prev]);
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
          ),
          flow_session:flow_sessions!flow_sessions_chat_id_fkey(
            flow:flows(
              id,
              name
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

  // Modificar a função scrollToBottom para resetar o contador
  const scrollToBottom = () => {
    setTimeout(() => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: "auto" });
        
        // Resetar o contador de mensagens não lidas
        setUnreadMessagesCount(0);
        setShowNewMessagesIndicator(false);
        
        if (!initialScrollDoneRef.current) {
          initialScrollDoneRef.current = true;
        }
      }
    }, 0);
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

  // Modificar a função para agrupar mensagens por chat_id também
  const groupMessagesByDate = (messages: Message[]) => {
    if (!isViewingAllCustomerMessages) {
      // Comportamento original - apenas agrupamento por data
      const groups: { [key: string]: Message[] } = {};
      
      messages.forEach(message => {
        const date = new Date(message.created_at).toDateString();
        if (!groups[date]) {
          groups[date] = [];
        }
        groups[date].push(message);
      });
      
      // Transformar em um array ordenado por data (mais antiga para mais recente)
      const sortedGroups = Object.entries(groups)
        .sort((a, b) => {
          const dateA = new Date(a[0]);
          const dateB = new Date(b[0]);
          return dateA.getTime() - dateB.getTime();
        });
      
      // Converter de volta para objeto preservando a ordem
      const orderedGroups: { [key: string]: Message[] } = {};
      sortedGroups.forEach(([date, msgs]) => {
        orderedGroups[date] = msgs;
      });
      
      return orderedGroups;
    } else {
      // Agrupar primeiro por chat_id e depois por data quando estiver vendo todo o histórico
      const chatGroups: Record<string, ChatGroup> = {};
      
      // Primeiro, agrupar mensagens por chat_id
      messages.forEach(message => {
        const chatId = message.chat_id;
        // Garante que chatId seja sempre uma string
        const chatIdStr = String(chatId);
        
        if (!chatGroups[chatIdStr]) {
          chatGroups[chatIdStr] = {
            chatInfo: null,
            messages: []
          };
          
          // Obter informações do chat da primeira mensagem
          if (message.chats) {
            chatGroups[chatIdStr].chatInfo = {
              id: chatIdStr,
              ticket_number: message.chats.ticket_number,
              customer_id: message.chats.customer_id,
              channel_id: message.chats.channel_id,
              start_time: message.chats.start_time,
              status: message.chats.status
            };
          }
        }
        chatGroups[chatIdStr].messages.push(message);
      });
      
      // Para cada chat, agrupar mensagens por data
      const result: Record<string, ChatGroupResult> = {};
      
      Object.entries(chatGroups).forEach(([chatId, chatData]) => {
        const dateGroups: Record<string, Message[]> = {};
        
        chatData.messages.forEach(message => {
          const date = new Date(message.created_at).toDateString();
          if (!dateGroups[date]) {
            dateGroups[date] = [];
          }
          dateGroups[date].push(message);
        });
        
        // Ordenar as datas (mais antiga para mais recente)
        const sortedDateGroups = Object.entries(dateGroups)
          .sort((a, b) => {
            const dateA = new Date(a[0]);
            const dateB = new Date(b[0]);
            return dateA.getTime() - dateB.getTime();
          });
        
        // Converter de volta para objeto preservando a ordem
        const orderedDateGroups: Record<string, Message[]> = {};
        sortedDateGroups.forEach(([date, msgs]) => {
          orderedDateGroups[date] = msgs;
        });
        
        result[chatId] = {
          chatInfo: chatData.chatInfo,
          dateGroups: orderedDateGroups
        };
      });
      
      return result;
    }
  };

  const handleResolveChat = async ({ closureTypeId, title }: { closureTypeId: string; title: string }) => {
    try {
      // Primeiro insere a mensagem de sistema
      const user = await supabase.auth.getUser();
      if (!user.data.user?.id) {
        throw new Error(t('errors.unauthenticated'));
      }

      // Iniciar flow associado ao tipo de encerramento
      const selectedClosureType = closureTypes.find(type => type.id === closureTypeId);

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

      const newStatus = (selectedClosureType?.flow_id ? 'await_closing' : 'closed');

      // Depois atualiza o status do chat
      const { error: chatError } = await supabase
        .from('chats')
        .update({ 
          status: newStatus,
          end_time: new Date().toISOString(),
          closure_type_id: closureTypeId,
          title: title
        })
        .eq('id', chatId);

      if (chatError) throw chatError;
      
      setChat((prev: Chat | null) => prev ? {
        ...prev,
        status: newStatus,
        end_time: new Date().toISOString(),
        closure_type_id: closureTypeId,
        title: title
      } : null);
      
      setShowResolutionModal(false);
      
      if (selectedClosureType?.flow_id) {
        try {
          // Iniciar o fluxo sem aguardar o retorno e sem fazer qualquer ação após
          api.post(`/api/${organizationId}/chat/${chatId}/start-flow`, {
            flowId: selectedClosureType.flow_id
          }).catch(error => {
            console.error('Erro ao iniciar flow após encerramento:', error);
          });
        } catch (error) {
          console.error('Erro ao iniciar flow após encerramento:', error);
        }
      }
    } catch (error) {
      console.error('Erro ao resolver chat:', error);
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

    // Carregar mais mensagens apenas quando chegar exatamente no topo
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
        
        // Decidir qual função de carregamento usar com base no modo de visualização
        const loadMorePromise = isViewingAllCustomerMessages 
          ? loadAllCustomerMessages(newPage, true)
          : loadMessages(newPage, true);
          
        loadMorePromise
          .then(() => {
            // Após o conteúdo ser carregado, mantém a posição de referência
            setTimeout(() => {
              if (container) {
                if (firstMessageId && document.getElementById(firstMessageId)) {
                  // Mantém a mesma distância do topo que o elemento tinha antes
                  const messageElement = document.getElementById(firstMessageId);
                  if (messageElement) {
                    const newTop = messageElement.getBoundingClientRect().top - container.getBoundingClientRect().top;
                    // Ajusta o scroll para manter a mesma posição relativa
                    container.scrollTop = oldScrollTop + (newTop - firstMessageDistanceFromTop);
                  }
                } else {
                  // Fallback: usa a diferença de altura como referência
                  const newScrollHeight = container.scrollHeight;
                  const scrollDiff = newScrollHeight - oldScrollHeight;
                  container.scrollTop = oldScrollTop + scrollDiff;
                }
                
                // Verificar visibilidade da mensagem destacada após carregar mais mensagens
                checkHighlightedMessageVisibility();
              }
            }, 0);
          })
          .catch((error) => {
            console.error('Erro ao carregar mais mensagens:', error);
            // Exibir mensagem de erro
            setError(t('errors.loading'));
          })
          .finally(() => {
            // Garantir que o estado de carregamento seja limpo mesmo em caso de erro
            setIsLoadingMore(false);
            scrollDebounceTimerRef.current = null;
          });
      }, 0); // 100ms debounce
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
          chats!messages_chat_id_fkey!inner(customer_id, channel_id, ticket_number),
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
          }, 500);
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
            }, 500);
          }
        }
      }
    } catch (error) {
      console.error('Erro ao carregar mensagem específica:', error);
      setError(t('errors.loading'));
      // Carregar mensagens normalmente como fallback
      loadMessages(1, false);
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
        // console.log('Chat atualizado:', payload);x
        
        if (payload.eventType === 'UPDATE') {
          const updatedChat = payload.new as Chat;
          const previousChat = payload.old as Chat;
          
          // Verificar se houve mudança no responsável
          if (updatedChat.assigned_to !== previousChat.assigned_to) {
            // console.log(`Responsável alterado: de ${previousChat.assigned_to || 'ninguém'} para ${updatedChat.assigned_to || 'ninguém'}`);
            
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
            // console.log(`Status alterado: de ${previousChat.status} para ${updatedChat.status}`);
            
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
          type: 'user_transferred_himself',
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
  const handleLeaveChat = () => {
    setShowLeaveModal(true);
  };

  const handleDeleteMessage = async (message: Message) => {
    try {
      // Se a mensagem é otimista ou falha, apenas remover do estado local
      const isOptimistic = optimisticMessages.some(msg => msg.id === message.id);
      const isFailed = failedMessages.some(msg => msg.id === message.id);

      if (isOptimistic || isFailed) {
        // Remover da lista de mensagens otimistas
        setOptimisticMessages(prev => prev.filter(msg => msg.id !== message.id));
        
        // Remover da lista de mensagens falhas e do localStorage
        setFailedMessages(prev => {
          const updated = prev.filter(msg => msg.id !== message.id);
          saveFailedMessagesToStorage(updated);
          return updated;
        });
        
        toast.success(t('messageDeleted'));
        return;
      }

      // Se não é otimista nem falha, proceder com a exclusão no servidor
      const response = await api.delete(`/api/${organizationId}/chat/${chatId}/message/${message.id}`);

      if (!response.data.success) {
        throw new Error(response.data.error || t('errors.deleteMessage'));
      }

      // Atualizar o estado local removendo a mensagem
      setMessages(prev => prev.filter(msg => msg.id !== message.id));
      
      toast.success(t('messageDeleted'));
    } catch (error: unknown) {
      const apiError = error as AxiosError;
      const errorMessage = apiError.response?.data?.error || apiError.message || t('errors.deleteMessage');
      toast.error(errorMessage);
      console.error('Error deleting message:', error);
    }
  };

  // Função para adicionar uma mensagem otimista ao estado
  const addOptimisticMessage = (message: {
    id: string;
    content: string | null;
    attachments?: { file: File; preview: string; type: string; name: string }[];
    replyToMessageId?: string;
    isPending: boolean;
  }) => {
    // Verificar se já existe uma mensagem otimista com esse ID
    const existingOptimisticMessage = optimisticMessages.find(msg => msg.id === message.id);
    if (existingOptimisticMessage) {
      console.log(`Mensagem otimista com ID ${message.id} já existe e não será duplicada`);
      return;
    }
    
    // Verificar se já existe uma mensagem real com esse ID
    const existingRealMessage = messages.find(msg => msg.id === message.id);
    if (existingRealMessage) {
      console.log(`Mensagem real com ID ${message.id} já existe, não adicionando versão otimista`);
      return;
    }
    
    // Verificar se existe uma mensagem real com conteúdo idêntico e criada nos últimos segundos
    // Isso ajuda a evitar duplicatas quando a mensagem real chega muito rapidamente
    const contentToCheck = message.content?.trim() || '';
    const recentRealMessage = messages.find(msg => {
      // Verificar se o conteúdo é idêntico
      if (msg.content?.trim() !== contentToCheck) return false;
      
      // Verificar se foi criada nos últimos segundos
      const msgDate = new Date(msg.created_at).getTime();
      const now = Date.now();
      const isRecent = (now - msgDate) < 5000; // 5 segundos
      
      return isRecent;
    });
    
    if (recentRealMessage) {
      // console.log(`Encontrada mensagem real recente com conteúdo idêntico (ID: ${recentRealMessage.id}). Não adicionando otimista.`);
      return;
    }
    
    // Verificar se esta mensagem está na lista de falhas
    const isFailedMessage = failedMessages.some(msg => msg.id === message.id);
    
    // console.log(`Adicionando nova mensagem otimista com ID ${message.id}, status: ${isFailedMessage ? 'failed' : 'pending'}`);
    
    // Criar uma mensagem temporária com os dados mínimos necessários
    const tempMessage: OptimisticMessage = {
      id: message.id,
      content: message.content,
      attachments: message.attachments?.map(att => ({
        url: att.preview,
        type: att.type,
        name: att.name
      })),
      replyToMessageId: message.replyToMessageId,
      isPending: !isFailedMessage && message.isPending, // Não mostrar como pendente se for uma mensagem falha
      created_at: new Date().toISOString(),
      sender_type: 'agent', // Assumindo que apenas agentes podem enviar mensagens pelo componente
      chat_id: chatId,
      status: isFailedMessage ? 'failed' : 'pending',
      error_message: isFailedMessage ? 'Falha ao enviar mensagem' : undefined
    };
    
    // Debug do estado antes de adicionar
    // console.log('Estado atual antes de adicionar mensagem otimista:', 
    //   { 
    //     otimistas: optimisticMessages.length, 
    //     reais: messages.length, 
    //     falhas: failedMessages.length 
    //   }
    // );
    
    // Adicionar a mensagem ao estado de mensagens otimistas
    setOptimisticMessages(prev => [...prev, tempMessage]);
    
    // Rolar para o final se necessário
    setTimeout(scrollToBottom, 100);
  };

  // Função para salvar mensagens falhas no localStorage
  const saveFailedMessagesToStorage = useCallback((messages: OptimisticMessage[]) => {
    try {
      // Usar o chatId como parte da chave para separar mensagens de diferentes chats
      const storageKey = `failed_messages_${chatId}`;
      localStorage.setItem(storageKey, JSON.stringify(messages));
      console.log(`Salvas ${messages.length} mensagens falhas no localStorage para o chat ${chatId}`);
    } catch (error) {
      console.error('Erro ao salvar mensagens falhas no localStorage:', error);
    }
  }, [chatId]);

  // Função para carregar mensagens falhas do localStorage
  const loadFailedMessagesFromStorage = useCallback(() => {
    try {
      const storageKey = `failed_messages_${chatId}`;
      const storedData = localStorage.getItem(storageKey);
      
      if (storedData) {
        const parsedData = JSON.parse(storedData) as OptimisticMessage[];
        // console.log(`Carregadas ${parsedData.length} mensagens falhas do localStorage para o chat ${chatId}`);
        return parsedData;
      }
    } catch (error) {
      console.error('Erro ao carregar mensagens falhas do localStorage:', error);
    }
    
    return [];
  }, [chatId]);

  // Carregar mensagens falhas do localStorage quando o chatId mudar
  useEffect(() => {
    if (chatId) {
      const storedMessages = loadFailedMessagesFromStorage();
      setFailedMessages(storedMessages);
    }
  }, [chatId, loadFailedMessagesFromStorage]);

  // Efeito para verificar e remover mensagens otimistas quando novas mensagens reais são adicionadas
  useEffect(() => {
    if (messages.length > 0 && optimisticMessages.length > 0) {
      // console.log('Verificando mensagens otimistas após atualização de mensagens reais');
      
      // Procurar por mensagens otimistas que precisam ser removidas
      const messagesToRemove: string[] = [];
      
      // Verificar baseado em tempId
      messages.forEach(realMsg => {
        try {
          let metadata: { tempId?: string } | null = null;
          
          if (realMsg.metadata) {
            metadata = typeof realMsg.metadata === 'string' 
              ? JSON.parse(realMsg.metadata) 
              : realMsg.metadata;
          }
          
          const tempId = metadata?.tempId;
          
          if (tempId) {
            const matchingOptimistic = optimisticMessages.find(optMsg => optMsg.id === tempId);
            
            if (matchingOptimistic) {
              console.log(`useEffect: Encontrada mensagem otimista ${matchingOptimistic.id} correspondente à mensagem real ${realMsg.id} com tempId ${tempId}`);
              messagesToRemove.push(matchingOptimistic.id);
            }
          }
        } catch (e) {
          console.error('Erro ao processar metadata em useEffect:', e);
        }
      });
      
      // Verificar baseado em conteúdo
      optimisticMessages.forEach(optMsg => {
        const optContent = optMsg.content?.trim() || '';
        
        messages.forEach(realMsg => {
          const realContent = realMsg.content?.trim() || '';
          
          if (optContent === realContent && optContent !== '') {
            const msgDate = new Date(realMsg.created_at).getTime();
            const now = Date.now();
            const isRecent = (now - msgDate) < 10000; // 10 segundos
            
            if (isRecent && !messagesToRemove.includes(optMsg.id)) {
              // console.log(`useEffect: Encontrada mensagem otimista ${optMsg.id} com conteúdo idêntico à mensagem real ${realMsg.id}`);
              messagesToRemove.push(optMsg.id);
            }
          }
        });
      });
      
      // Remover as mensagens identificadas
      if (messagesToRemove.length > 0) {
        // console.log(`useEffect: Removendo ${messagesToRemove.length} mensagens otimistas redundantes:`, messagesToRemove);
        setOptimisticMessages(prev => prev.filter(msg => !messagesToRemove.includes(msg.id)));
      }
    }
  }, [messages, optimisticMessages]);

  // Função para reenviar uma mensagem que falhou
  const handleRetryMessage = async (message: Message) => {
    if (!message.id) return;
    
    // Adicionar ID à lista de mensagens sendo reenviadas
    setRetryingMessages(prev => [...prev, message.id]);
    
    try {
      // console.log(`Tentando reenviar mensagem: ${message.id}`);
      
      // Criar FormData para enviar a mensagem
      const formData = new FormData();
      
      // Adicionar conteúdo da mensagem se houver
      if (message.content) {
        formData.append('content', message.content);
      }
      
      // Se havia um ID de resposta
      if (message.response_message_id) {
        formData.append('replyToMessageId', message.response_message_id);
      }

      // IMPORTANTE: Sempre usar o mesmo ID da mensagem original como tempId
      // Isso garante que a mensagem otimista possa ser removida quando a real chegar
      const tempId = message.id;
      // console.log(`Reenvio: Incluindo tempId ${tempId} nos metadados da mensagem a ser reenviada`);
      
      // Adicionar o metadata com o tempId para rastreamento
      let metadata: any = {};
      
      // Se a mensagem já tem metadata, preservar e adicionar ou atualizar o tempId
      if (message.metadata) {
        try {
          if (typeof message.metadata === 'string') {
            metadata = JSON.parse(message.metadata);
          } else {
            metadata = { ...message.metadata };
          }
        } catch (e) {
          console.error('Erro ao processar metadata da mensagem ao reenviar:', e);
          // Se houver erro, simplesmente criar um novo objeto
          metadata = {};
        }
      }
      
      // Garantir que o tempId seja incluído/atualizado no metadata
      metadata.tempId = tempId;
      
      // Adicionar o metadata atualizado ao formData
      // console.log(`Reenvio: Metadata final:`, metadata);
      formData.append('metadata', JSON.stringify(metadata));
      
      // Debug para verificar o que está sendo enviado
      // formData.forEach((value, key) => {
      //   console.log(`Reenvio: FormData ${key}:`, value);
      // });
      
      // Remover a mensagem falha da lista
      setFailedMessages(prev => {
        const updated = prev.filter(msg => msg.id !== message.id);
        // Salvar no localStorage
        saveFailedMessagesToStorage(updated);
        return updated;
      });
      
      // Marcar mensagem como pendente novamente
      setOptimisticMessages(prev => 
        prev.map(msg => 
          msg.id === message.id 
            ? { ...msg, isPending: true, status: 'pending' } 
            : msg
        )
      );
      
      // Enviar a mensagem
      const response = await api.post(`/api/${organizationId}/chat/${chatId}/message`, formData);
      
      // console.log(`Resposta ao reenviar mensagem:`, response.data);
      
      // Se chegou aqui, a mensagem foi enviada com sucesso
      // A mensagem real será recebida por websocket e a mensagem otimista será removida automaticamente
      // pelo código no subscribeToMessages
      
      // console.log(`Mensagem ${message.id} reenviada com sucesso. Esperando confirmação do servidor.`);
    } catch (error) {
      console.error(`Erro ao reenviar mensagem ${message.id}:`, error);
      
      // Manter na lista de mensagens falhas
      setFailedMessages(prev => {
        // Verificar se a mensagem já está na lista
        if (!prev.some(msg => msg.id === message.id)) {
          const updatedMessages = [...prev, {
            ...message as unknown as OptimisticMessage,
            isPending: false,
            status: 'failed'
          }];
          // Salvar no localStorage
          saveFailedMessagesToStorage(updatedMessages);
          return updatedMessages;
        }
        return prev;
      });
      
      // Atualizar a mensagem otimista para mostrar erro
      setOptimisticMessages(prev => 
        prev.map(msg => 
          msg.id === message.id 
            ? { ...msg, isPending: false, status: 'failed', error_message: 'Erro ao enviar mensagem' } 
            : msg
        )
      );
      
      toast.error(t('errors.sendingMessage'));
    } finally {
      // Remover da lista de mensagens sendo reenviadas
      setRetryingMessages(prev => prev.filter(id => id !== message.id));
    }
  };

  // Adicionar ouvinte para o evento de atualização de status de mensagem
  useEffect(() => {
    // Handler para o evento de atualização de status de mensagem
    const handleUpdateMessageStatus = (event: CustomEvent) => {
      const { id, status, error_message } = event.detail;
      // console.log(`Recebido evento para atualizar mensagem ${id} para status ${status}`);
      
      // Atualizar a mensagem otimista
      setOptimisticMessages(prev => 
        prev.map(msg => 
          msg.id === id 
            ? { ...msg, isPending: false, status, error_message } 
            : msg
        )
      );
      
      // Se for falha, adicionar à lista de mensagens falhas
      if (status === 'failed') {
        setFailedMessages(prev => {
          // Verificar se já existe na lista
          if (!prev.some(msg => msg.id === id)) {
            // Encontrar a mensagem otimista para adicionar à lista de falhas
            const failedMsg = optimisticMessages.find(msg => msg.id === id);
            if (failedMsg) {
              const updatedMessages = [...prev, {
                ...failedMsg,
                isPending: false,
                status: 'failed',
                error_message
              }];
              // Salvar no localStorage
              saveFailedMessagesToStorage(updatedMessages);
              return updatedMessages;
            }
          }
          return prev;
        });
      }
    };

    // Adicionar event listener
    window.addEventListener('update-message-status', handleUpdateMessageStatus as EventListener);
    
    // Limpar o listener quando o componente for desmontado
    return () => {
      window.removeEventListener('update-message-status', handleUpdateMessageStatus as EventListener);
    };
  }, [optimisticMessages, saveFailedMessagesToStorage]);

  // Adicionar um useEffect para resetar o contador quando o chatId mudar
  useEffect(() => {
    if (chatId) {
      setNewMessagesCount(0);
    }
  }, [chatId]);

  // Adicionar handler de scroll para esconder o indicador quando chegar ao final
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      if (isNearBottom()) {
        setUnreadMessagesCount(0);
        setShowNewMessagesIndicator(false);
      }
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [isNearBottom]);

  // Função para carregar todas as mensagens do cliente em todos os chats
  const loadAllCustomerMessages = async (pageNumber = 1, append = false) => {
    if (!chat?.customer?.id || !chat?.channel_details?.id) {
      toast.error(t('errors.customerOrChannelNotFound'));
      return;
    }

    try {
      if (!append) {
        setIsLoadingHistory(true);
        setIsViewingAllCustomerMessages(true);
        setNewMessagesCount(0);
        setShowNewMessagesIndicator(false);
      } else {
        setIsLoadingMore(true);
      }
      
      // Calcular o offset para paginação
      const offset = (pageNumber - 1) * MESSAGES_PER_PAGE;
      
      // Buscar mensagens de todos os chats deste cliente no mesmo canal
      const { data: allMessages, error: messagesError } = await supabase
        .from('messages')
        .select(`
          *,
          chats!messages_chat_id_fkey!inner(customer_id, channel_id, ticket_number),
          sender_agent:messages_sender_agent_id_fkey(
            id,
            full_name,
            avatar_url
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
        .eq('chats.customer_id', chat.customer.id)
        .eq('chats.channel_id', chat.channel_details.id)
        .order('created_at', { ascending: false })
        .range(offset, offset + MESSAGES_PER_PAGE - 1);
        
      if (messagesError) throw messagesError;
      
      const newMessages = allMessages || [];
      
      // Verificar se há mais mensagens para carregar
      setHasMore(newMessages.length === MESSAGES_PER_PAGE);
      
      if (append) {
        setMessages(prev => [...newMessages.reverse(), ...prev]);
      } else {
        setMessages(newMessages.reverse());
        
        // Se for o primeiro carregamento e temos mensagens, rolar para o fim
        if (pageNumber === 1 && newMessages.length > 0) {
          initialScrollDoneRef.current = false; // Resetar para permitir o scroll inicial
          // Rolar para o final após o carregamento
          setTimeout(() => {
            scrollToBottom();
          }, 0);
        }
      }
      
      if (newMessages.length === 0 && pageNumber === 1) {
        toast.error(t('noMessagesFound'));
      }
      
    } catch (error) {
      console.error('Erro ao carregar todas as mensagens do cliente:', error);
      toast.error(t('errors.loadingAllMessages'));
      // Em caso de erro, voltar para a visualização normal
      if (!append) {
        setIsViewingAllCustomerMessages(false);
      }
    } finally {
      if (!append) {
        setIsLoadingHistory(false);
      } else {
        setIsLoadingMore(false);
      }
    }
  };

  // Função para voltar à visualização normal do chat atual
  const resetToCurrentChat = async () => {
    setIsLoadingCurrentChat(true);
    setIsViewingAllCustomerMessages(false);
    setMessages([]);
    setNewMessagesCount(0);
    setShowNewMessagesIndicator(false);
    setPage(1);
    
    try {
      await loadMessages(1, false, true);
      // Rolar para o final após o carregamento
      setTimeout(() => {
        scrollToBottom();
      }, 300);
    } catch (error) {
      console.error('Erro ao recarregar mensagens do chat atual:', error);
      toast.error(t('errors.loading'));
    } finally {
      setIsLoadingCurrentChat(false);
    }
  };

  // Effect para limpar os arquivos após eles serem processados
  useEffect(() => {
    if (droppedFiles.length > 0) {
      // Limpar os arquivos após um pequeno delay para garantir que foram processados
      const timer = setTimeout(() => {
        setDroppedFiles([]);
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [droppedFiles]);

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

  if (!initialLoading || messagesLoadedRef.current) {
    // console.log('======= ESTADO ATUAL NO MOMENTO DA RENDERIZAÇÃO =======');
    // console.log('Mensagens reais:', messages.length);
    // console.log('Mensagens otimistas:', optimisticMessages.length, optimisticMessages);
    // console.log('Mensagens falhas:', failedMessages.length);
    // console.log('=======================================================');
  }

  return (
    <div 
      ref={chatAreaRef} 
      className="flex flex-col h-full overflow-hidden bg-[#f8f9fa] dark:bg-gray-900"
    >
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
                    {isViewingAllCustomerMessages && (
                      <span className="ml-2 text-xs text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900 px-2 py-0.5 rounded-full">
                        {t('viewingAllMessages')}
                      </span>
                    )}
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
            {/* Botão para visualizar todas as mensagens do cliente */}
            {chat?.customer?.id && chat?.channel_details?.id && (
              <button
                className={`p-2 ${
                  isViewingAllCustomerMessages 
                    ? 'bg-blue-600 hover:bg-blue-700' 
                    : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600'
                } ${
                  isViewingAllCustomerMessages 
                    ? 'text-white' 
                    : 'text-gray-700 dark:text-gray-300'
                } rounded-md transition-colors flex items-center justify-center md:px-3`}
                onClick={(e) => {
                  e.preventDefault();
                  if (isViewingAllCustomerMessages) {
                    resetToCurrentChat();
                  } else {
                    loadAllCustomerMessages(1, false);
                  }
                }}
                disabled={isLoadingHistory || isLoadingCurrentChat}
                title={isViewingAllCustomerMessages ? t('viewCurrentChat') : t('viewAllCustomerMessages')}
              >
                {isLoadingHistory || isLoadingCurrentChat ? (
                  <>
                    <svg className="animate-spin w-5 h-5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span className="hidden md:inline ml-2">{t('loading')}</span>
                  </>
                ) : (
                  <>
                    <History className="w-5 h-5" />
                    <span className="hidden md:inline ml-2">
                      {isViewingAllCustomerMessages ? t('viewCurrentChat') : t('viewAllCustomerMessages')}
                    </span>
                  </>
                )}
              </button>
            )}

            {/* Botão de Play para Fluxos */}
            {(chat?.status === 'pending' || chat?.status === 'in_progress') && (
              <button
                className={`p-2 ${
                  chat?.flow_session_id 
                    ? 'bg-yellow-500 hover:bg-yellow-600' 
                    : 'bg-purple-600 hover:bg-purple-700'
                } text-white rounded-md transition-colors flex items-center justify-center`}
                onClick={() => setShowFlowModal(true)}
                title={chat?.flow_session_id ? `${t('flows.pauseFlow')} ${chat?.flow_session?.[0]?.flow?.name}` : t('flows.startFlow')}
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
                  disabled={showLeaveModal}
                  aria-label={t('collaborator.leaveAttendance')}
                >
                  {showLeaveModal ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
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
        className="flex-1 overflow-y-auto p-4 relative scroll-smooth"
        onScroll={handleScroll}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Overlay para drag and drop independente do scroll */}
        {isDragging && chatAreaRect && createPortal(
          <div 
            className="fixed z-50 pointer-events-none"
            style={{
              top: `${chatAreaRect.top}px`,
              left: `${chatAreaRect.left}px`,
              width: `${chatAreaRect.width}px`,
              height: `${chatAreaRect.height}px`
            }}
          >
            <div className="absolute inset-0 bg-blue-100/70 dark:bg-blue-900/30 border-2 border-dashed border-blue-500 rounded-lg">
              <div className="flex items-center justify-center h-full">
                <div className="text-blue-600 dark:text-blue-400 font-medium flex flex-col items-center bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
                  <Image className="w-16 h-16 mb-2" />
                  <span className="text-lg">{t('attachments.dropHere', 'Solte aqui para anexar')}</span>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

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
            
            {/* Renderização das mensagens com base no modo de visualização */}
            {messages.length > 0 && (
              <>
                {!isViewingAllCustomerMessages ? (
                  // Modo de visualização normal - apenas agrupamento por data
                  Object.entries(groupMessagesByDate(messages)).map(([date, dateMessages]) => (
                    <div key={date} className="w-full">
                      <div className="sticky top-0 z-10 flex justify-center mb-4">
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
                            onRetry={handleRetryMessage}
                          />
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  // Modo de visualização de histórico completo - agrupamento por chat e por data
                  Object.entries(groupMessagesByDate(messages) as Record<string, ChatGroupResult>).map(([chatId, chatData]) => (
                    <div key={chatId} className="w-full mb-8 border-b border-gray-200 dark:border-gray-700 pb-4 relative">
                      {/* Cabeçalho do chat - sticky no topo */}
                      <div className="sticky top-0 z-20 bg-gray-50 dark:bg-gray-800 px-4 py-2 rounded-t-lg mb-4 flex justify-between items-center shadow-sm border-b border-gray-200 dark:border-gray-700">
                        <div className="font-medium text-gray-700 dark:text-gray-300">
                          <span className="flex items-center">
                            <span className="font-semibold mr-1">{t('ticketNumber')}:</span> 
                            <span className="bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded-md text-blue-600 dark:text-blue-400 font-mono">
                              #{chatData.chatInfo?.ticket_number}
                            </span>
                          </span>
                        </div>
                      </div>
                      
                      {/* Mensagens agrupadas por data dentro deste chat */}
                      {Object.entries(chatData.dateGroups).map(([date, msgs]) => (
                        <div key={`${chatId}-${date}`} className="w-full">
                          <div className="sticky top-14 z-10 flex justify-center mb-4">
                            <span className="bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full text-sm text-gray-600 dark:text-gray-400 shadow-sm">
                              {formatMessageDate(msgs[0].created_at)}
                            </span>
                          </div>
                          
                          <div className="flex flex-col gap-2 w-full">
                            {msgs.map((message: Message) => (
                              <MessageBubble
                                key={message.id}
                                message={message}
                                chatStatus={chatId === chat?.id ? (chat?.status || '') : 'closed'}
                                onReply={chatId === chat?.id && channelFeatures.canReplyToMessages ? (msg) => {
                                  setReplyingTo(msg);
                                } : undefined}
                                isHighlighted={message.id === highlightedMessageId}
                                channelFeatures={channelFeatures}
                                onDeleteMessage={chatId === chat?.id ? handleDeleteMessage : undefined}
                                onRetry={chatId === chat?.id ? handleRetryMessage : undefined}
                              />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ))
                )}
                
                {/* Adicionar título do chat quando fechado */}
                {!isViewingAllCustomerMessages && (chat?.status === 'closed' || chat?.status === 'await_closing') && chat?.title && (
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
            
            {/* Renderizar mensagens otimistas em seu próprio grupo */}
            {optimisticMessages.length > 0 && (
              <div className="w-full">
                <div className="flex flex-col gap-2 w-full">
                  {optimisticMessages
                    .filter(msg => {
                      // Filtrar mensagens otimistas que têm conteúdo idêntico a mensagens reais recentes
                      const contentToCheck = msg.content?.trim() || '';
                      const hasIdenticalRealMessage = messages.some(realMsg => {
                        // Verificar se o conteúdo é idêntico
                        if (realMsg.content?.trim() !== contentToCheck) return false;
                        
                        // Verificar se foi criada nos últimos segundos
                        const msgDate = new Date(realMsg.created_at).getTime();
                        const now = Date.now();
                        const isRecent = (now - msgDate) < 5000; // 5 segundos
                        
                        if (isRecent) {
                          // console.log(`Filtrando mensagem otimista ${msg.id} porque já existe mensagem real com conteúdo idêntico (${realMsg.id})`);
                        }
                        
                        return isRecent;
                      });
                      
                      // Manter apenas mensagens que NÃO têm correspondente real recente
                      // console.log(`Mensagem otimista ${msg.id} será ${!hasIdenticalRealMessage ? 'renderizada' : 'filtrada'}`);
                      return !hasIdenticalRealMessage;
                    })
                    .map(msg => (
                      <MessageBubble
                        key={msg.id}
                        message={msg as unknown as Message}
                        chatStatus={chat?.status || ''}
                        isPending={msg.isPending}
                        channelFeatures={channelFeatures}
                        onRetry={handleRetryMessage}
                        onDeleteMessage={handleDeleteMessage}
                      />
                    ))}
                </div>
              </div>
            )}

            {/* Adicionar aqui o bloco para mensagens falhas */}
            {failedMessages.length > 0 && (
              <div className="w-full">
                <div className="flex flex-col gap-2 w-full">
                  {failedMessages
                    .filter(failedMsg => !optimisticMessages.some(optMsg => optMsg.id === failedMsg.id))
                    .filter(msg => {
                      // Filtrar mensagens falhas que têm conteúdo idêntico a mensagens reais recentes
                      const contentToCheck = msg.content?.trim() || '';
                      const hasIdenticalRealMessage = messages.some(realMsg => {
                        // Verificar se o conteúdo é idêntico
                        if (realMsg.content?.trim() !== contentToCheck) return false;
                        
                        // Verificar se foi criada nos últimos segundos
                        const msgDate = new Date(realMsg.created_at).getTime();
                        const now = Date.now();
                        const isRecent = (now - msgDate) < 10000; // 10 segundos (um pouco mais que otimistas)
                        
                        if (isRecent) {
                          // console.log(`Filtrando mensagem falha ${msg.id} porque já existe mensagem real com conteúdo idêntico (${realMsg.id})`);
                        }
                        
                        return isRecent;
                      });
                      
                      // Manter apenas mensagens que NÃO têm correspondente real recente
                      return !hasIdenticalRealMessage;
                    })
                    .map(msg => (
                      <MessageBubble
                        key={msg.id}
                        message={msg as unknown as Message}
                        chatStatus={chat?.status || ''}
                        isPending={false}
                        channelFeatures={channelFeatures}
                        onRetry={handleRetryMessage}
                        onDeleteMessage={handleDeleteMessage}
                      />
                    ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Indicador de novas mensagens */}
      {showNewMessagesIndicator && unreadMessagesCount > 0 && (
        <div className="absolute bottom-24 left-1/2 transform -translate-x-1/2 z-50">
          <button 
            onClick={scrollToBottom}
            className="bg-blue-600 text-white px-4 py-2 rounded-full shadow-lg flex items-center space-x-2 hover:bg-blue-700 transition-colors animate-bounce"
            type="button"
            aria-label={t('scrollToNewMessages', { count: unreadMessagesCount })}
          >
            <ArrowDown className="w-4 h-4" />
            <span>
              {t('newMessages', { count: unreadMessagesCount })}
            </span>
          </button>
        </div>
      )}

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
              onMessageSent={() => {
                // Otimização para carregar apenas a mensagem mais recente
                // Isso será substituído pelo listener de tempo real
              }}
              replyTo={
                replyingTo && channelFeatures.canReplyToMessages ? {
                  message: replyingTo,
                  onClose: () => setReplyingTo(null)
                } : undefined
              }
              isSubscriptionReady={isSubscriptionReady}
              channelFeatures={channelFeatures}
              addOptimisticMessage={addOptimisticMessage}
              droppedFiles={droppedFiles}
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

          {(chat?.status === 'closed' || chat?.status === 'await_closing') && (
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

      {/* Adicionar o modal de sair do atendimento */}
      <LeaveAttendanceModal
        isOpen={showLeaveModal}
        onClose={() => {
          setShowLeaveModal(false);
          loadChat();
        }}
        chatId={chatId}
        organizationId={organizationId}
        currentTeamId={chat?.team_id}
        onLeave={() => {
          setChat(prev => prev ? {
            ...prev,
            status: 'pending',
            assigned_to: undefined
          } : null);
        }}
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