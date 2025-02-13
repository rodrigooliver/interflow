import React, { useRef, useEffect, useState } from 'react';
import { Message } from '../../types/database';
import { supabase } from '../../lib/supabase';
import { useTranslation } from 'react-i18next';
import { MessageInput } from './MessageInput';
import { MessageBubble } from './MessageBubble';
import { Loader2 } from 'lucide-react';

interface ChatMessagesProps {
  chatId: string;
  organizationId: string;
}

export function ChatMessages({ chatId, organizationId }: ChatMessagesProps) {
  const { t } = useTranslation('chats');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let subscription: ReturnType<typeof supabase.channel>;

    if (chatId) {
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

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSendMessage = async (content: string, attachments?: { url: string; type: string; name: string }[]) => {
    setSending(true);
    try {
      // Create message data with or without content
      const messageData = {
        chat_id: chatId,
        organization_id: organizationId,
        content: content || '', // Empty string if no content
        sender_type: 'agent',
        sender_id: organizationId,
        status: 'pending',
        attachments: attachments || []
      };

      const { data: newMsg, error } = await supabase
        .from('messages')
        .insert([messageData])
        .select()
        .single();

      if (error) throw error;
      
      if (newMsg) {
        setMessages(prev => [...prev, newMsg]);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setError(t('errors.sending'));
    } finally {
      setSending(false);
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
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {error && (
          <div className="bg-red-50 dark:bg-red-900/50 text-red-600 dark:text-red-400 p-3 rounded-md text-center">
            {error}
          </div>
        )}
        
        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            content={message.content}
            timestamp={message.created_at}
            isAgent={message.sender_type === 'agent'}
            status={message.sender_type === 'agent' ? message.status : undefined}
            errorMessage={message.error_message}
            attachments={message.attachments}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>

      <MessageInput
        onSend={handleSendMessage}
        sending={sending}
        organizationId={organizationId}
      />
    </>
  );
}