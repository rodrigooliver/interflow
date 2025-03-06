import React, { useRef, useEffect, useState } from 'react';
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

interface ChatMessagesProps {
  chatId: string;
  organizationId: string;
}

export function ChatMessages({ chatId, organizationId }: ChatMessagesProps) {
  const { t } = useTranslation('chats');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [chat, setChat] = useState<Chat | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isSubscriptionReady, setIsSubscriptionReady] = useState(false);
  const [showEditCustomer, setShowEditCustomer] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [showResolutionModal, setShowResolutionModal] = useState(false);
  const [closureTypes, setClosureTypes] = useState<ClosureType[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const MESSAGES_PER_PAGE = 20;
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [headerLoading, setHeaderLoading] = useState(true);
  const [footerLoading, setFooterLoading] = useState(true);
  const [isMessageWindowClosed, setIsMessageWindowClosed] = useState(false);
  const [canSendMessage, setCanSendMessage] = useState(true);
  const [showTemplateModal, setShowTemplateModal] = useState(false);

  useEffect(() => {
    let subscription: ReturnType<typeof supabase.channel>;

    if (chatId) {
      setLoading(true);
      setHeaderLoading(true);
      setFooterLoading(true);
      setMessages([]);
      setPage(1);
      setHasMore(true);
      setError('');
      
      loadChat();
      loadMessages(1, false);
      subscription = subscribeToMessages();
    }

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [chatId]);

  useEffect(() => {
    if (page === 1) {
      scrollToBottom();
    }
  }, [messages, page]);

  useEffect(() => {
    loadClosureTypes();
  }, []);

  useEffect(() => {
    if (!chat) return;
    
    const isInstagramChannel = chat?.channel_details?.type === 'instagram';
    const isWhatsAppChannel = chat?.channel_details?.type === 'whatsapp_official';
    const lastCustomerMessageAt = chat?.last_customer_message_at;
    
    if (isInstagramChannel || isWhatsAppChannel) {
      if (!lastCustomerMessageAt) {
        setCanSendMessage(false);
        return;
      }
      
      const lastMessageTime = new Date(lastCustomerMessageAt).getTime();
      const currentTime = new Date().getTime();
      const hoursDifference = (currentTime - lastMessageTime) / (1000 * 60 * 60);
      
      if (hoursDifference > 24) {
        setIsMessageWindowClosed(true);
        setCanSendMessage(false);
      } else {
        setIsMessageWindowClosed(false);
        setCanSendMessage(true);
      }
    } else {
      setCanSendMessage(true);
      setIsMessageWindowClosed(false);
    }
  }, [chat]);

  const subscribeToMessages = () => {
    const subscription = supabase
      .channel('messages')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'messages',
        filter: `chat_id=eq.${chatId}`
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          // console.log('payload', payload);
          setMessages(prev => [...prev, payload.new as Message]);
        } else if (payload.eventType === 'UPDATE') {
          setMessages(prev => prev.map(msg => 
            msg.id === payload.new.id ? payload.new as Message : msg
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
        .order('created_at', { ascending: false })
        .range((pageNumber - 1) * MESSAGES_PER_PAGE, pageNumber * MESSAGES_PER_PAGE - 1);

      if (error) throw error;

      const newMessages = data || [];
      setHasMore(newMessages.length === MESSAGES_PER_PAGE);
      
      if (append) {
        setMessages(prev => [...newMessages.reverse(), ...prev]);
      } else {
        setMessages(newMessages.reverse());
      }
    } catch (error) {
      console.error('Error loading messages:', error);
      setError(t('errors.loading'));
    } finally {
      setLoading(false);
    }
    return;
  };

  const loadChat = async () => {
    setHeaderLoading(true);
    setFooterLoading(true);
    try {
      const { data, error } = await supabase
        .from('chats')
        .select(`
          *,
          customer:customer_id(*),
          channel_details:channel_id(*),
          assigned_agent:assigned_to(*)
        `)
        .eq('id', chatId)
        .single();

      if (error) throw error;
      setChat(data);
    } catch (error) {
      console.error('Erro ao carregar chat:', error);
      setError(t('errors.loadingChat'));
    } finally {
      setHeaderLoading(false);
      setFooterLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
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

  const loadClosureTypes = async () => {
    try {
      const { data, error } = await supabase
        .from('closure_types')
        .select('*')
        .eq('organization_id', organizationId);

      if (error) throw error;
      setClosureTypes(data || []);
    } catch (error) {
      console.error('Erro ao carregar tipos de fechamento:', error);
    }
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
      
      setChat(prev => prev ? {
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
      setChat(prev => prev ? {
        ...prev,
        status: 'in_progress',
        assigned_to: user.data.user.id,
        start_time: new Date().toISOString()
      } : null);

      // Recarrega as mensagens
      loadMessages();

    } catch (error) {
      console.error('Error attending chat:', error);
      setError(error.message || t('errors.attend'));
    }
  };

  const handleScroll = () => {
    const container = messagesContainerRef.current;
    if (!container || !hasMore) return;

    if (container.scrollTop === 0) {
      // Salva a altura do primeiro elemento antes de carregar mais
      const oldScrollHeight = container.scrollHeight;

      setPage(prev => {
        const newPage = prev + 1;
        loadMessages(newPage, true).then(() => {
          // Após o conteúdo ser carregado, mantém a posição anterior
          if (container) {
            requestAnimationFrame(() => {
              container.scrollTop = container.scrollHeight - oldScrollHeight;
            });
          }
        });
        return newPage;
      });
    }
  };

  const isWhatsAppChat = chat?.channel_details?.type === 'whatsapp_official';

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

  if (loading) {
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
    <>
      <div className="border-b border-gray-200 dark:border-gray-700 p-2">
        <div className="flex items-center justify-between">
          <div 
            className="flex items-center space-x-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 p-2 rounded-lg transition-colors"
            onClick={() => setShowEditCustomer(true)}
          >
            {headerLoading ? (
              <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
            ) : (
              <ChatAvatar 
                id={chatId}
                name={chat?.customer?.name || 'Anônimo'}
                profilePicture={chat?.profile_picture}
                channel={chat?.channel_details}
              />
            )}
            <div>
              {headerLoading ? (
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 animate-pulse" />
                  {chat?.ticket_number && (
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-16 animate-pulse" />
                  )}
                </div>
              ) : (
                <>
                  <div className="font-medium text-gray-900 dark:text-gray-100">
                    {chat?.customer?.name || t('unnamed')}
                  </div>
                  {chat?.ticket_number && (
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      #{chat.ticket_number}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
          {chat?.status === 'in_progress' && (
            <button
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors"
              onClick={() => setShowResolutionModal(true)}
            >
              {t('resolve')}
            </button>
          )}
        </div>
      </div>

      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 relative"
        onScroll={handleScroll}
      >
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
              <div key={date}>
                <div className="sticky top-2 flex justify-center mb-4 z-10">
                  <span className="bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full text-sm text-gray-600 dark:text-gray-400 shadow-sm">
                    {formatMessageDate(dateMessages[0].created_at)}
                  </span>
                </div>
                
                <div className="space-y-4">
                  {dateMessages.map((message) => (
                    <MessageBubble
                      key={message.id}
                      message={message}
                      chatStatus={chat?.status}
                      onReply={(message) => {
                        setReplyingTo(message);
                      }}
                    />
                  ))}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {footerLoading ? (
        <div className="border-t border-gray-200 dark:border-gray-700 p-4">
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        </div>
      ) : (
        <>
          {chat?.status === 'in_progress' && canSendMessage && (
            <MessageInput
              chatId={chatId}
              organizationId={organizationId}
              onMessageSent={() => {}}
              replyTo={
                replyingTo ? {
                  message: replyingTo,
                  onClose: () => setReplyingTo(null)
                } : undefined
              }
              isSubscriptionReady={isSubscriptionReady}
            />
          )}

          {chat?.status === 'in_progress' && !canSendMessage && (
            <div className="border-t border-gray-200 dark:border-gray-700 p-4">
              <div className="p-3 bg-yellow-50 dark:bg-yellow-900/50 text-yellow-600 dark:text-yellow-400 rounded-md">
                {isWhatsAppChat ? (
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

          {chat?.status === 'pending' && (
            <div className="border-t border-gray-200 dark:border-gray-700 p-4">
              <button
                onClick={handleAttend}
                className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
              >
                {t('attend')}
              </button>
            </div>
          )}

          {chat?.status === 'closed' && (
            <div className="border-t border-gray-200 dark:border-gray-700 p-4">
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
          customer={chat.customer}
          onClose={() => setShowEditCustomer(false)}
          onSuccess={() => {
            setShowEditCustomer(false);
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
      />

      {showTemplateModal && (
        <WhatsAppTemplateModal
          isOpen={showTemplateModal}
          onClose={() => setShowTemplateModal(false)}
          channelId={chat?.channel_details?.id || ''}
          onSendTemplate={handleSendTemplate}
        />
      )}
    </>
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