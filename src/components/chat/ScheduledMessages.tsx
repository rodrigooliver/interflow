import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabase';
import { MessageBubble } from './MessageBubble';
import { ChevronDown, ChevronUp, Calendar, Clock } from 'lucide-react';
import { Chat, Message } from '../../types/database';

interface ChannelFeatures {
  canReplyToMessages: boolean;
  canSendAudio: boolean;
  canSendTemplates: boolean;
  has24HourWindow: boolean;
  canSendAfter24Hours: boolean;
  canDeleteMessages: boolean;
  canEditMessages: boolean;
}

interface ScheduledMessagesProps {
  chatId: string;
  channelFeatures: ChannelFeatures;
  chat: Chat | undefined;
}

export function ScheduledMessages({ chatId, channelFeatures, chat }: ScheduledMessagesProps) {
  const { t } = useTranslation('chats');
  const [scheduledMessages, setScheduledMessages] = useState<Message[]>([]);
  const [loadingScheduledMessages, setLoadingScheduledMessages] = useState(false);
  const [scheduledMessagesExpanded, setScheduledMessagesExpanded] = useState(false);

  // Função para carregar mensagens agendadas
  const loadScheduledMessages = async () => {
    if (!chatId || loadingScheduledMessages) return;
    
    setLoadingScheduledMessages(true);
    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender_agent:messages_sender_agent_id_fkey(
            id,
            full_name,
            avatar_url
          ),
          response_to:response_message_id(
            id,
            content,
            type,
            sender_type,
            sender_agent_response:messages_sender_agent_id_fkey(
              id,
              full_name
            )
          )
        `)
        .eq('chat_id', chatId)
        .eq('status', 'scheduled')
        .not('scheduled_at', 'is', null)
        .order('scheduled_at', { ascending: true });

      if (error) throw error;
      
      setScheduledMessages(data || []);
    } catch (error) {
      console.error('Erro ao carregar mensagens agendadas:', error);
    } finally {
      setLoadingScheduledMessages(false);
    }
  };

  // Função para agrupar mensagens agendadas por data
  const groupScheduledMessagesByDate = (messages: Message[]) => {
    const groups: { [key: string]: Message[] } = {};
    
    messages.forEach(message => {
      if (message.scheduled_at) {
        const date = new Date(message.scheduled_at).toDateString();
        if (!groups[date]) {
          groups[date] = [];
        }
        groups[date].push(message);
      }
    });
    
    // Transformar em um array ordenado por data (mais próxima para mais distante)
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
  };

  // Função para formatear data das mensagens agendadas
  const formatScheduledMessageDate = (date: string) => {
    const messageDate = new Date(date);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayAfterTomorrow = new Date(today);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);

    if (messageDate.toDateString() === today.toDateString()) {
      return t('dateHeaders.today');
    } else if (messageDate.toDateString() === tomorrow.toDateString()) {
      return t('dateHeaders.tomorrow');
    } else if (messageDate.toDateString() === dayAfterTomorrow.toDateString()) {
      return t('dateHeaders.dayAfterTomorrow');
    } else {
      // Para datas mais distantes, mostrar o dia da semana e data
      return messageDate.toLocaleDateString('pt-BR', {
        weekday: 'long',
        day: '2-digit',
        month: '2-digit'
      });
    }
  };

  // Função para excluir mensagem agendada
  const handleDeleteScheduledMessage = async (message: Message) => {
    try {
      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('id', message.id);

      if (error) {
        throw error;
      }

      // Remover da lista local
      setScheduledMessages(prev => prev.filter(msg => msg.id !== message.id));
      
      // Disparar evento customizado para notificar outras partes da aplicação
      window.dispatchEvent(new CustomEvent('scheduled-message-deleted', {
        detail: { messageId: message.id }
      }));
    } catch (error) {
      console.error('Erro ao excluir mensagem agendada:', error);
      throw error;
    }
  };

  // Função para obter próxima mensagem agendada
  const getNextScheduledMessage = () => {
    if (scheduledMessages.length === 0) return null;
    
    const now = new Date();
    const upcomingMessage = scheduledMessages.find(msg => 
      new Date(msg.scheduled_at!).getTime() > now.getTime()
    );
    
    return upcomingMessage || scheduledMessages[0];
  };

  // Carregar mensagens agendadas ao montar o componente
  useEffect(() => {
    if (chatId) {
      loadScheduledMessages();
    }
  }, [chatId]);

  // Subscription para mudanças em tempo real
  useEffect(() => {
    if (!chatId) return;

    const subscription = supabase
      .channel(`scheduled-messages-${chatId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `chat_id=eq.${chatId}`,
        },
        (payload) => {
          const message = payload.new as Message;
          const previousMessage = payload.old as Message;
          
          // Se mensagem foi deletada ou se tornou agendada
          if (payload.eventType === 'DELETE' || (message && 'status' in message && message.status === 'scheduled')) {
            loadScheduledMessages();
          }
          // Se a mensagem mudou de agendada para outro status, remover da lista local
          else if (payload.eventType === 'UPDATE' && 
                   previousMessage && 'status' in previousMessage && previousMessage.status === 'scheduled' && 
                   message && 'status' in message && message.status !== 'scheduled') {
            setScheduledMessages(prev => prev.filter(msg => msg.id !== message.id));
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [chatId]);

  // Listener para evento customizado de mensagem enviada
  useEffect(() => {
    const handleScheduledMessageSent = (event: CustomEvent) => {
      const { messageId } = event.detail;
      setScheduledMessages(prev => prev.filter(msg => msg.id !== messageId));
    };

    window.addEventListener('scheduled-message-sent', handleScheduledMessageSent as EventListener);

    return () => {
      window.removeEventListener('scheduled-message-sent', handleScheduledMessageSent as EventListener);
    };
  }, []);

  // Listener para evento customizado de mensagem excluída
  useEffect(() => {
    const handleScheduledMessageDeleted = (event: CustomEvent) => {
      const { messageId } = event.detail;
      setScheduledMessages(prev => prev.filter(msg => msg.id !== messageId));
    };

    window.addEventListener('scheduled-message-deleted', handleScheduledMessageDeleted as EventListener);

    return () => {
      window.removeEventListener('scheduled-message-deleted', handleScheduledMessageDeleted as EventListener);
    };
  }, []);

  // Timer para atualizar contadores em tempo real
  useEffect(() => {
    const timer = setInterval(() => {
      if (scheduledMessages.length > 0) {
        // Force re-render para atualizar contadores de tempo
        setScheduledMessages(prev => [...prev]);
      }
    }, 60000); // Atualiza a cada minuto

    return () => clearInterval(timer);
  }, [scheduledMessages.length]);

  // Se não há mensagens agendadas, não renderizar nada
  if (scheduledMessages.length === 0) return null;

  const nextMessage = getNextScheduledMessage();

  return (
    <div className="sticky top-0 z-40 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-700 shadow-lg mb-4 rounded-lg overflow-hidden">
      {/* Cabeçalho sempre visível */}
              <div 
          className="flex items-center justify-between p-3 border-b border-amber-200 dark:border-amber-700 cursor-pointer hover:bg-gradient-to-r hover:from-amber-100 hover:to-orange-100 dark:hover:from-amber-900/30 dark:hover:to-orange-900/30 transition-colors"
        onClick={() => setScheduledMessagesExpanded(!scheduledMessagesExpanded)}
      >
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-amber-200 dark:bg-amber-700 rounded-full">
            <Calendar className="w-4 h-4 text-amber-700 dark:text-amber-300" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-200">
                {t('scheduledMessage.title')}
              </h3>
              <span className="bg-amber-500 text-white text-xs px-2 py-0.5 rounded-full font-medium">
                {scheduledMessages.length}
              </span>
            </div>
            {nextMessage && (
              <div className="flex items-center space-x-1 mt-1">
                <Clock className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                <span className="text-xs text-amber-600 dark:text-amber-400">
                  {t('scheduledMessage.nextMessage')}: {new Date(nextMessage.scheduled_at!).toLocaleString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
          {scheduledMessagesExpanded ? (
            <ChevronUp className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          )}
        </div>
      </div>

      {/* Conteúdo expansível */}
      {scheduledMessagesExpanded && (
        <div className="bg-amber-25 dark:bg-amber-900/10">
          {loadingScheduledMessages ? (
            <div className="flex items-center justify-center p-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-amber-500"></div>
              <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                {t('scheduledMessage.loading')}
              </span>
            </div>
          ) : (
            <div className="max-h-80 overflow-y-auto p-2">
              {Object.entries(groupScheduledMessagesByDate(scheduledMessages)).map(([date, dateMessages]) => (
                <div key={date} className="mb-4">
                  {/* Cabeçalho da data */}
                  <div className="sticky top-0 z-10 flex justify-center mb-3">
                    <span className="bg-amber-100 dark:bg-amber-800 px-3 py-1 rounded-full text-sm text-amber-700 dark:text-amber-300 shadow-sm font-medium">
                      {formatScheduledMessageDate(dateMessages[0].scheduled_at!)}
                    </span>
                  </div>
                  
                  {/* Mensagens do dia */}
                  <div className="space-y-3">
                    {dateMessages.map((message) => (
                      <div key={message.id} className="relative">
                        {/* MessageBubble com estilo adaptado para agendadas */}
                        <div className="opacity-80 scale-95 transform">
                            <MessageBubble
                             message={{
                               ...message,
                               created_at: message.scheduled_at || message.created_at
                             }}
                             chatStatus="scheduled"
                             isHighlighted={false}
                             channelFeatures={channelFeatures}
                             onDeleteMessage={handleDeleteScheduledMessage}
                             onRetry={undefined}
                             isDeleting={false}
                             chat={chat}
                           />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
} 