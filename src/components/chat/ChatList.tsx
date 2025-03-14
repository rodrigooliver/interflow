import React from 'react';
import { format, isToday, isYesterday, isThisWeek } from 'date-fns';
import { ptBR, enUS, es } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import { Chat } from '../../types/database';
import { ChatAvatar } from './ChatAvatar';
import { MessageStatus } from './MessageStatus';

const locales = {
  pt: ptBR,
  en: enUS,
  es: es
};

interface ChatListProps {
  chats: Chat[];
  selectedChat: string | null;
  onSelectChat: (chatId: string) => void;
}

export function ChatList({ chats, selectedChat, onSelectChat }: ChatListProps) {
  const { t, i18n } = useTranslation('chats');

  const formatLastMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const locale = locales[i18n.language as keyof typeof locales] || enUS;
    
    if (isToday(date)) {
      // Se for hoje, mostra apenas o horário
      return format(date, 'HH:mm', { locale });
    } else if (isYesterday(date)) {
      // Se for ontem, mostra "Ontem"
      return t('time.yesterday');
    } else if (isThisWeek(date)) {
      // Se for esta semana, mostra o dia da semana
      return format(date, 'EEEE', { locale });
    } else {
      // Se for anterior à semana atual, mostra a data completa
      return format(date, 'dd/MM/yyyy', { locale });
    }
  };

  const getStatusBadge = (chat: Chat) => {
    switch (chat.status) {
      case 'pending':
        return (
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
            {t('status.pending')}
          </span>
        );
      case 'in_progress':
        return (
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
            {t('status.in_progress')}
          </span>
        );
      case 'closed':
        return (
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
            {t('status.closed')}
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex-1 overflow-y-auto"> 
      {chats.map((chat) => (
        <a
          key={chat.id}
          href="#"
          onClick={(e) => {
            e.preventDefault();
            onSelectChat(chat.id);
          }}
          data-chat-id={chat.id}
          className={`block p-4 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 ${
            selectedChat === chat.id ? 'bg-blue-50 dark:bg-blue-900/50' : ''
          }`}
        >
          <div className="flex items-start space-x-3">
            <ChatAvatar 
              id={chat.id}
              name={chat.customer?.name || 'Anônimo'}
              profilePicture={chat.profile_picture}
              channel={chat.channel_id}
            />
            
            <div className="flex-1 truncate">
              <div className="flex justify-between items-center w-full mb-1">
                <span className="font-medium text-gray-900 dark:text-white truncate">
                  {chat.customer?.name || 'Sem nome'}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400 ml-2 flex-shrink-0">
                  {formatLastMessageTime(chat.last_message?.created_at || chat.created_at)}
                </span>
              </div>
              
              {chat.last_message && (
                <div className="flex items-center gap-1 mb-1">
                  {chat.last_message.sender_type === 'agent' && (
                    <MessageStatus 
                      status={chat.last_message.status || 'pending'} 
                      errorMessage={chat.last_message.error_message}
                    />
                  )}
                  <div className="text-sm text-gray-600 dark:text-gray-300 truncate">
                    {chat.last_message.content}
                  </div>
                </div>
              )}
              
              <div className="flex items-center gap-2">
                {getStatusBadge(chat)}
              </div>
            </div>
          </div>
        </a>
      ))}
    </div>
  );
}