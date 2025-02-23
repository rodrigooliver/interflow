import React, { useRef, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Message, Customer } from '../../types/database';
import { supabase } from '../../lib/supabase';
import { useTranslation } from 'react-i18next';
import { MessageInput } from './MessageInput';
import { MessageBubble } from './MessageBubble';
import { CustomerEditModal } from '../customers/CustomerEditModal';

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
  const [showEditCustomer, setShowEditCustomer] = useState(false);

  useEffect(() => {
    let subscription: ReturnType<typeof supabase.channel>;

    if (chatId) {
      loadChat();
      loadMessages();
      subscription = subscribeToMessages();
    }

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [chatId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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
          setMessages(prev => [...prev, payload.new as Message]);
        } else if (payload.eventType === 'UPDATE') {
          setMessages(prev => prev.map(msg => 
            msg.id === payload.new.id ? payload.new as Message : msg
          ));
        }
      })
      .subscribe();

    return subscription;
  };

  const loadMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('chat_id', chatId)
        .order('created_at');

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error loading messages:', error);
      setError(t('errors.loading'));
    } finally {
      setLoading(false);
    }
  };

  const loadChat = async () => {
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

  const getRandomColor = (name: string) => {
    const colors = [
      'bg-blue-500',
      'bg-green-500',
      'bg-yellow-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-indigo-500',
      'bg-red-500',
      'bg-teal-500'
    ];
    
    const index = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[index % colors.length];
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleResolveChat = async () => {
    try {
      const { error } = await supabase
        .from('chats')
        .update({ 
          status: 'closed',
          end_time: new Date().toISOString()
        })
        .eq('id', chatId);

      if (error) throw error;
      
      // Atualiza o estado local do chat
      setChat(prev => prev ? {
        ...prev,
        status: 'closed',
        end_time: new Date().toISOString()
      } : null);
      
    } catch (error) {
      console.error('Erro ao resolver chat:', error);
      setError(t('errors.resolving'));
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
            <div className={`w-10 h-10 rounded-full ${getRandomColor(chat?.customer?.name || 'Anônimo')} flex items-center justify-center`}>
              <span className="text-white font-medium">
                {getInitials(chat?.customer?.name || 'Anônimo')}
              </span>
            </div>
            <div>
              <div className="font-medium text-gray-900 dark:text-gray-100">
                {chat?.customer?.name || t('unnamed')}
              </div>
              {chat?.ticket_number && (
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  #{chat.ticket_number}
                </div>
              )}
            </div>
          </div>
          {chat?.status === 'in_progress' && (
            <button
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors"
              onClick={handleResolveChat}
            >
              {t('resolve')}
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 relative">
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
                />
              ))}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {chat?.status === 'in_progress' && (
        <MessageInput
          chatId={chatId}
          organizationId={organizationId}
          onMessageSent={() => {}}
        />
      )}

      {chat?.status === 'pending' && (
        <div className="border-t border-gray-200 dark:border-gray-700 p-4">
          <button
            onClick={() => {/* Adicionar lógica para atender */}}
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
    </>
  );
}